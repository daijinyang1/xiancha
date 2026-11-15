<script setup lang="ts">
// 数字里程表（rolling-number-odometer）：每一位是一条 0–9 竖排带，靠 translateY 滚到位。
// 与 CountUp 的区别：CountUp 是「数值插值」，这个是「每位数字各自滚一格」，视觉上像里程表。
//
// SSR 安全（关键）：服务端直接渲染**终值**，每一列初始就停在自己的数字上，
// 因此预渲染 HTML 里的正文是真实数字，不依赖 JS；浏览器挂载后才先瞬移到 0 再滚上去。
const props = withDefaults(
  defineProps<{
    /** 目标整数 */
    to: number
    /** 后缀，如「 条」 */
    suffix?: string
  }>(),
  { suffix: '' },
)

const finalDigits = computed(() => {
  const n = Math.max(0, Math.round(Number(props.to) || 0))
  return String(n).split('').map((c) => Number(c))
})

// 千分位分隔符：按 3 位分组，让 63 / 1234 这类数读起来不吃力
const parts = computed(() => {
  const digits = finalDigits.value
  const out: { ch: string; digit: number; order: number; sep: boolean }[] = []
  digits.forEach((d, i) => {
    const fromRight = digits.length - 1 - i
    if (i > 0 && fromRight % 3 === 2) {
      out.push({ ch: ',', digit: -1, order: 0, sep: true })
    }
    out.push({ ch: String(d), digit: d, order: i, sep: false })
  })
  return out
})

const text = computed(() => {
  const n = Math.max(0, Math.round(Number(props.to) || 0))
  return n.toLocaleString('en-US') + props.suffix
})

// 初始 go = true：SSR 期每一列就停在自己的数字上（预渲染 HTML 里是真实数字，不依赖 JS）。
// 浏览器挂载后才先瞬移到 0，再滚上去。
const go = ref(true)
const liveDigits = ref<number[] | null>(null)

// 每列当前展示的数字：挂载后走 liveDigits（先 0 后终值），其余情况直接用终值
const shownDigit = (index: number) => {
  const arr = liveDigits.value
  if (arr && arr[index] != null) return arr[index]
  return finalDigits.value[index] ?? 0
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (reduceMotion()) return
  // 第一帧：所有列瞬移到 0（此时 go=false → 无过渡，看不见瞬移过程）
  go.value = false
  liveDigits.value = finalDigits.value.map(() => 0)
  // 之后两帧：开过渡 + 落到终值，数字往上滚
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      go.value = true
      liveDigits.value = [...finalDigits.value]
    })
  })
})
</script>

<template>
  <span class="odo" :class="{ 'odo--go': go }">
    <span class="sr-only">{{ text }}</span>
    <template v-for="(p, i) in parts" :key="i">
      <span v-if="p.sep" class="odo__sep" aria-hidden="true">{{ p.ch }}</span>
      <span
        v-else
        class="odo__col"
        aria-hidden="true"
        :style="{ '--odo-d': shownDigit(p.order), '--odo-i': p.order }"
      >
        <span class="odo__strip">
          <span v-for="n in 10" :key="n" class="odo__digit">{{ n - 1 }}</span>
        </span>
      </span>
    </template>
    <span v-if="suffix" class="odo__suffix" aria-hidden="true">{{ suffix }}</span>
  </span>
</template>
