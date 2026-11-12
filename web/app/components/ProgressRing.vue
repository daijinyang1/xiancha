<script setup lang="ts">
// 环形进度：SVG circle + stroke-dasharray。
// SSR 期直接按 value 渲染弧长（预渲染的 HTML 里就是正确的环），
// 浏览器挂载后再从 0 过渡到目标值，避免静态产物里出现「空环」。
const props = withDefaults(
  defineProps<{
    /** 当前值 */
    value: number
    /** 满值，默认 100 */
    max?: number
    /** 直径（px），默认 132 */
    size?: number
    /** 环中心下方的小标签，如「风险分」 */
    label?: string
  }>(),
  { max: 100, size: 132, label: '' },
)

const STROKE = 10
const radius = computed(() => 50 - STROKE / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const ratio = computed(() => {
  const max = Number(props.max) || 100
  const v = Number(props.value) || 0
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, v / max))
})

// 挂载前 = 终值（SSR / 预渲染一致）；挂载后先归零再过渡
const animatedRatio = ref(ratio.value)

const dashoffset = computed(() => circumference.value * (1 - animatedRatio.value))

// 分档配色：与全站风险口径一致（高=红 / 中=琥珀 / 低=品牌蓝）
const tone = computed(() => {
  const p = ratio.value * 100
  if (p >= 70) return { stroke: 'var(--color-danger)', text: 'text-danger' }
  if (p >= 40) return { stroke: 'var(--color-amber)', text: 'text-amber' }
  return { stroke: 'var(--color-brand)', text: 'text-brand' }
})

const percentText = computed(() => `${Math.round(ratio.value * 100)}%`)
const boxStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))

let rafId = 0

onMounted(() => {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  animatedRatio.value = 0
  // 两帧之后再赋值，确保 CSS transition 拿到起始态
  rafId = requestAnimationFrame(() => {
    rafId = requestAnimationFrame(() => {
      animatedRatio.value = ratio.value
      rafId = 0
    })
  })
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
})

watch(ratio, (val) => {
  animatedRatio.value = val
})
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="boxStyle">
    <svg
      viewBox="0 0 100 100"
      class="h-full w-full -rotate-90"
      role="img"
      :aria-label="label ? `${label} ${percentText}` : percentText"
    >
      <circle cx="50" cy="50" :r="radius" fill="none" stroke="var(--color-line)" :stroke-width="STROKE" />
      <circle
        cx="50"
        cy="50"
        :r="radius"
        fill="none"
        :stroke="tone.stroke"
        :stroke-width="STROKE"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashoffset"
        style="transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 0.61, 0.36, 1)"
      />
    </svg>

    <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <b class="leading-none" :class="tone.text" :style="{ fontSize: `${Math.max(13, Math.round(size / 7))}px` }">
        {{ percentText }}
      </b>
      <span v-if="label" class="mt-1 text-[11px] leading-none text-ink-3">{{ label }}</span>
    </div>
  </div>
</template>
