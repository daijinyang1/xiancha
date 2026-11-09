<script setup lang="ts">
import { levelClass, levelLabel } from '~/composables/useApi'

withDefaults(
  defineProps<{
    level?: string
    type?: string
    id?: string
    name?: string
    tone?: 'level' | 'gray'
  }>(),
  { tone: 'level' },
)
</script>

<template>
  <span
    v-if="tone === 'level' && level"
    class="inline-block whitespace-nowrap rounded-full border px-[7px] text-[11px] font-bold leading-[18px]"
    :class="levelClass(level)"
  >{{ levelLabel(level) }}</span>
  <span
    v-if="type"
    class="inline-block whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ type }}</span>
  <span
    v-if="id"
    class="inline-block whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ id }}</span>
  <span
    v-if="name"
    class="inline-block whitespace-nowrap rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"
  >{{ name }}</span>
</template>
