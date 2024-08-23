import { getHint } from '../logic'
import { answers } from './list'

export function getAnswerOfDay(_day: number) {
  const answer = answers[Math.floor(Math.random() * answers.length)]

  const [word = '', hint = ''] = answer
  return {
    word,
    hint: hint || getHint(word),
  }
}
