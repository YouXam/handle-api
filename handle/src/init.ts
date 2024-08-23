import { inputMode, markEnd, markStart, meta, pauseTimer, spMode } from './storage'
import { answer, dayNo, daySince, isFinished, isPassed, showCheatSheet } from './state'
import { t } from './i18n'
import { answers } from './answers/list'
import { START_DATE } from './logic/constants'
import { tryFixAnswer } from './logic/answer-fix'

useTitle(computed(() => `${t('name')} - ${t('description')}`))

watchEffect(() => {
  if (isPassed.value)
    meta.value.passed = true
})

watch(daySince, (n, o) => {
  // on day changed
  if (o === dayNo.value && isFinished.value)
    dayNo.value = n
})

watch([isFinished, meta], () => {
  if (isFinished.value)
    markEnd()
    // sendAnalytics()
}, { flush: 'post' })

watch(isFinished, (v) => {
  if (v)
    showCheatSheet.value = false
}, { flush: 'post' })

const visible = useDocumentVisibility()

let leaveTime = 0
const REFRESH_TIME = 1000 * 60 * 60 * 3 // 3 hours
watchEffect(() => {
  if (visible.value === 'visible') {
    // left for a long while, refresh the page for updates
    if (leaveTime && Date.now() - leaveTime > REFRESH_TIME)
      location.reload()

    // restart timer
    if (meta.value.duration)
      markStart()
  }
  else if (visible.value === 'hidden') {
    leaveTime = Date.now()
    pauseTimer()
  }
}, { flush: 'post' })

nextTick(() => {
  // if (acceptCollecting.value)
  //   sendAnalytics()

  tryFixAnswer(dayNo.value)
})

const theDate = new Date(+START_DATE + dayNo.value * 86400000)
// eslint-disable-next-line no-console
console.log(`D${dayNo.value}`, theDate.toLocaleDateString(), answer.value.word, answer.value.hint)

if (import.meta.hot) {
  // eslint-disable-next-line no-console
  console.log(`${answers.length} days prepared`)
  // eslint-disable-next-line no-console
  console.log(`${answers.length - dayNo.value} days left`)
  if ((answers.length - daySince.value) < 10)
    throw new Error('Not enough days left!')
}

const params = new URLSearchParams(window.location.search)
const preferredMode = params.get('mode')
if (preferredMode === 'py' || preferredMode === 'zy')
  inputMode.value = preferredMode

if (preferredMode === 'sp-sougou') {
  inputMode.value = 'sp'
  spMode.value = 'sougou'
}
else if (preferredMode === 'sp-xiaohe') {
  inputMode.value = 'sp'
  spMode.value = 'xiaohe'
}
