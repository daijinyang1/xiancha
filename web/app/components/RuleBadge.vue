<script setup lang="ts">
import { levelClass, levelLabel } from '~/composables/useApi'

const props = withDefaults(
  defineProps<{
    level?: string
    type?: string
    id?: string
    name?: string
    tone?: 'level' | 'gray'
  }>(),
  { tone: 'level' },
)

/**
 * 状态点形状：颜色之外再给一个形状信号。
 * 高风险 = 实心圆、中风险 = 空心圆、低风险 = 实心方块。
 * 这样色觉障碍用户、黑白打印、灰度截图都能区分。
 */
const dotClass = computed(() => {
  if (props.level === '高') return 'is-filled'
  if (props.level === '中') return 'is-hollow'
  if (props.level === '低') return 'is-square'
  return 'is-hollow'
})

const levelAria = computed(() =>
  props.level ? `风险等级：${levelLabel(props.level)}` : undefined,
)
</script>

<template>
  <span
    v-if="tone === 'level' && level"
    class="inline-flex items-center whitespace-nowrap rounded-full border px-[7px] text-[11px] font-bold leading-[18px]"
    :class="levelClass(level)"
    :aria-label="levelAria"
  >
    <span class="dot-status" :class="dotClass" aria-hidden="true" />
    {{ levelLabel(level) }}
  </span>
  <span
    v-if="type"
    class="inline-flex items-center whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ type }}</span>
  <span
    v-if="id"
    class="inline-flex items-center whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ id }}</span>
  <span
    v-if="name"
    class="inline-flex items-center whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ name }}</span>
</template>
