<script setup lang="ts">
// 滚动入场容器：进入视口后加 .is-in，由 main.css 里的 .reveal / .reveal.is-in 做
// opacity 0→1 + translateY(14px)→0 过渡。
// SSR 安全：observer 只在 onMounted 挂、onBeforeUnmount 断开；预渲染产物里只有内容和类名。
const props = withDefaults(
  defineProps<{
    /** 入场延迟（毫秒），用于同屏多元素的错峰 */
    delay?: number
    /** 渲染成什么标签，默认 div（可以是 li / section / p 等） */
    as?: string
    /** 走「纯淡入」档（无位移、360ms）：卡片网格这类成片出现的内容用它，节奏更轻 */
    soft?: boolean
  }>(),
  { delay: 0, as: 'div', soft: false },
)

const el = ref<HTMLElement | null>(null)
const shown = ref(false)
let observer: IntersectionObserver | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null

const revealDelay = computed(() => `${props.delay}ms`)

onMounted(() => {
  const node = el.value
  if (!node) return

  // 浏览器不支持 IntersectionObserver（或 SSR 早退）时直接点亮，别把内容锁成透明
  if (typeof IntersectionObserver === 'undefined') {
    shown.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          shown.value = true
          observer?.disconnect()
          observer = null
          if (fallbackTimer) {
            clearTimeout(fallbackTimer)
            fallbackTimer = null
          }
          break
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
  )
  observer.observe(node)

  // 兜底：1.8s 内还没触发（元素在视口内却因布局抖动没回调、或被 display:none 的容器包住）就直接显示
  fallbackTimer = setTimeout(() => {
    shown.value = true
    observer?.disconnect()
    observer = null
    fallbackTimer = null
  }, 1800)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  if (fallbackTimer) clearTimeout(fallbackTimer)
  fallbackTimer = null
})
</script>

<template>
  <component
    :is="as"
    ref="el"
    :class="[soft ? 'reveal-soft' : 'reveal', { 'is-in': shown }]"
    :style="{ '--reveal-delay': revealDelay }"
  >
    <slot />
  </component>
</template>
