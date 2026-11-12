<script setup lang="ts">
// 数字滚动：SSR 期直接渲染终值（静态预渲染的 HTML 里不会出现 0），
// 浏览器挂载后才从 0 缓动到 to（easeOutCubic）。尊重 prefers-reduced-motion。
const props = withDefaults(
  defineProps<{
    /** 目标数字 */
    to: number
    /** 动画时长（毫秒） */
    duration?: number
    /** 数字后缀，如「 条」「%」「张」 */
    suffix?: string
    /** 小数位，默认 0 */
    decimals?: number
  }>(),
  { duration: 1100, suffix: '', decimals: 0 },
)

const format = (n: number) => {
  const fixed = n.toFixed(props.decimals)
  // 整数部分加千分位，小数部分原样保留
  const [intPart, decPart] = fixed.split('.')
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart ? `${withSep}.${decPart}` : withSep
}

// 初值 = 终值：保证预渲染产物与首次水合渲染一致，不会闪 0
const current = ref(props.to)
const text = computed(() => format(current.value) + props.suffix)

let rafId = 0

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function run() {
  const from = 0
  const to = Number(props.to) || 0
  const duration = Math.max(0, props.duration)
  if (!duration) {
    current.value = to
    return
  }
  const start = performance.now()

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    current.value = from + (to - from) * easeOutCubic(t)
    if (t < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      current.value = to
      rafId = 0
    }
  }
  rafId = requestAnimationFrame(step)
}

onMounted(() => {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  // 首帧先落回 0，再开始；用 rAF 推迟一帧，避免同一帧内被合并、看起来没动
  current.value = 0
  rafId = requestAnimationFrame(() => {
    rafId = 0
    run()
  })
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
})

watch(
  () => props.to,
  (val) => {
    // 数据后到时（例如后端返回与构建快照不同）平滑追一次，不再从 0 开始
    current.value = Number(val) || 0
  },
)
</script>

<template>
  <span class="tabular-nums">{{ text }}</span>
</template>
