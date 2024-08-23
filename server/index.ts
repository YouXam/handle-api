import puppeteer, { Browser, Page } from "puppeteer";

import { Hono } from "hono";
import { validator } from 'hono/validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import { getExplanation, getIdiom, isIdiom } from "./idioms";


const newSchema = z.object({
    mode: z.enum(['sp-sougou', 'sp-xiaohe', 'py', 'zy']).default('py'),
    limit: z.number().min(1).default(6),
    strict: z.boolean().default(false)
});

const guessSchema = z.object({
    session: z.string(),
    guess: z.string()
})

type State = {
    idiom: string
    guesses: string[]
    start_time: number
    limit: z.infer<typeof newSchema>['limit']
    mode: z.infer<typeof newSchema>['mode']
    strict: boolean,
    page: Page
}

export class IdiObject {
    sessions: Map<string, State> = new Map()
    browser: Browser | null = null

    constructor() {
        setInterval(() => this.alarm(), 20 * 60 * 1000)
    }

    async alarm(): Promise<void> {
        const sessions = await this.sessions.entries()
        for (const [session, value] of sessions) {
            if (Date.now() - value.start_time > 20 * 60 * 1000) {
                this.sessions.get(session)?.page.close()
                this.sessions.delete(session)
            }
        }
    }

    async ensureBrowser() {
        if (!this.browser || !this.browser.connected) {
            console.log(`Browser: Starting new instance`);
            try {
                this.browser = await puppeteer.launch({
                    protocolTimeout: 20000,
                    args: ['--no-sandbox']
                });
            } catch (e) {
                console.log(
                    `Browser: Could not start browser instance. Error: ${e}`,
                );
            }
        }
    }

    async newPage(idiom: string, mode: z.infer<typeof newSchema>['mode'], limit: z.infer<typeof newSchema>['limit'], uuid: string) {
        await this.ensureBrowser()
        const page = await this.browser!.newPage()
        await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });
        await page.goto("https://handle.youxam.com/?" + new URLSearchParams({
            mode,
            limit: limit.toString(),
            uuid,
            word: idiom
        }), {
            waitUntil: 'domcontentloaded'
        })
        return page
    }

    async newSession(mode: z.infer<typeof newSchema>['mode'], limit: z.infer<typeof newSchema>['limit'], strict: boolean) {
        const uuid = uuidv4()
        const idiom = getIdiom()
        await this.ensureBrowser()
        const page = await this.newPage(idiom, mode, limit, uuid);
        const data: State = {
            idiom: idiom,
            guesses: [],
            start_time: Date.now(),
            limit,
            mode,
            strict,
            page
        }
        this.sessions.set(uuid, data)
        return {
            session: uuid,
            idiom: data.idiom
        }
    }

    async findPage(session: string): Promise<{ page: Page, data: State } | null> {
        const data = await this.sessions.get(session)
        if (!data) {
            return null
        }
        return { page: data.page, data }
    }

    async image(session: string, selector: string = '#words') {
        await this.ensureBrowser()
        const { page } = await this.findPage(session) || {}
        if (!page) {
            return new Response("Session not found", { status: 404 })
        }
        const element = await page.$(selector);
        if (element) {
            await page.bringToFront();
            const sc = await element.screenshot();
            return new Response(sc, {
                headers: {
                    "Content-Type": "image/jpeg"
                }
            })
        }
        return new Response("Internal error", { status: 500 })
    }

    async guess(session: string, guess: string) {
        await this.ensureBrowser()
        const { data, page } = await this.findPage(session) || {}
        if (!data || !page) {
            return { error: "Session not found", code: 404 }
        }
        if (data.guesses.length > data.limit) {
            return { error: "Session limit reached", code: 400 }
        }
        if (data.strict && !isIdiom(guess)) {
            return { error: `${guess} 不是一个成语`, code: 400 }
        }
        const result = await page.evaluate((guess: string) => {
            // @ts-ignore
            return window.enter(guess)
        }, guess)
        if (!result) {
            return { error: "输入不合法，请检查字数", code: 400 }
        }
        data.guesses.push(guess)
        this.sessions.set(session, data)
        await new Promise<void>(r => setTimeout(r, 100))
        if (guess === data.idiom) {
            return {
                success: true,
                time: Date.now() - data.start_time,
                idiom: data.idiom,
                explanation: await getExplanation(data.idiom),
                code: 200,
                guesses: data.guesses,
                attemptedTimes: data.guesses.length,
                remainingAttempts: data.limit - data.guesses.length
            }
        }
        if (data.guesses.length >= data.limit) {
            return {
                success: false,
                explanation: await getExplanation(data.idiom),
                idiom: data.idiom,
                code: 400,
                attemptedTimes: data.guesses.length,
                remainingAttempts: 0
            }
        }
        return {
            success: false,
            code: 200,
            guesses: data.guesses,
            remainingAttempts: data.limit - data.guesses.length,
            attemptedTimes: data.guesses.length
        }
    }
}

const idiObject = new IdiObject()

const hono = new Hono()
    .post("/new", validator('json', (value, c) => {
        const parsed = newSchema.safeParse(value)
        if (!parsed.success) {
            return c.json({ error: parsed.error, code: 401 }, 401)
        }
        return parsed.data
    }), async c => {
        const { mode, limit, strict } = c.req.valid('json')
        const res = await idiObject.newSession(mode, limit, strict)
        return c.json(res)
    })
    .post("/guess", validator('json', (value, c) => {
        const parsed = guessSchema.safeParse(value)
        if (!parsed.success) {
            return c.json({ error: parsed.error, code: 401 }, 401)
        }
        return parsed.data
    }), async c => {
        const { session, guess } = c.req.valid('json')
        const res = await idiObject.guess(session, guess)
        if (res instanceof Response) {
            return res
        }
        return c.json(res)
    })
    .get("/image/:session", async c => {
        const res = await idiObject.image(c.req.param('session'))
        return res
    })
    .get("/stat/:session", async c => {
        const { data } = await idiObject.findPage(c.req.param('session')) || {}
        if (!data) {
            return c.json({ error: "Session not found", code: 404 }, 404)
        }
        return c.json({
            guesses: data.guesses,
            remainingAttempts: data.limit - data.guesses.length,
            attemptedTimes: data.guesses.length
        })
    })
    .get("/hint/:session/:level", async c => {
        const session = c.req.param('session')
        const level = c.req.param('level')
        if (level !== '1' && level !== '2') {
            return c.json({ error: "Invalid level", code: 400 }, 400)
        }
        const { data } = await idiObject.findPage(session) || {}
        if (!data) {
            return c.json({ error: "Session not found", code: 404 }, 404)
        }
        return await idiObject.image(session, level === '1' ? '#hint-1' : '#hint-2')
    })

export default {
    hostname: Bun.env.HOSTNAME || 'localhost',
    port: Bun.env.PORT || 3000,
    fetch: hono.fetch.bind(hono)
}