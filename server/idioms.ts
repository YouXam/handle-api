// @ts-ignore
import idiomsText from './idioms.txt'


const idioms = (idiomsText as string).split("\n")
const idiomsSet = new Set(idioms)

export function getIdiom(): string {
	return idioms[Math.floor(Math.random() * idioms.length)]
}


type ExplanationResponse = {
	data: {
		name: string,
		source: string,
		definition: {
			definition: string[]
		}[]
	}
}

export function isIdiom(idiom: string): boolean {
	return idiomsSet.has(idiom)
}

export async function getExplanation(idiom: string): Promise<string> {
	const res = await fetch("https://hanyuapp.baidu.com/dictapp/swan/termdetail?" + new URLSearchParams({
		wd: idiom,
	}))
	const data = await res.json() as ExplanationResponse;
	if (!data.data.name || data.data.definition.length === 0) {
		return `${idiom}：未找到释义`
	}
	return `${data.data.name}：\n${data.data.definition[0].definition.join("\n")}\n——${data.data.source}`
}