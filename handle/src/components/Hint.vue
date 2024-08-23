<script setup lang="ts">
import { answer, hint, parseWord } from '~/state'
import { t } from '~/i18n'

const parsed = computed(() => parseWord(hint.value, answer.value.word)[0])
const masked = computed(() => ({
  ...parsed.value,
  char: '?',
}))
</script>

<template>
  <div>
    <div p8 flex="~ col gap-4" items-center>
      <div>{{ t('hint-note') }} <b>{{ t('ziyin') }}</b></div>
      <CharBlock :char="masked" />
    </div>
    <hr>
    <div p8 flex="~ col gap-4" items-center>
      <div>{{ t('hint-note') }} <b>{{ t('hanzi') }}</b></div>
      <CharBlock :char="parsed" />
    </div>
    <hr>
  </div>
</template>
