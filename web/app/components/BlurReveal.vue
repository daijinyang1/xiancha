<script setup lang="ts">
// 散焦入场（blur-reveal）：filter blur(6px) → 0，配 4px 上移。
// 起点 opacity 0.001（不是 0），JS 完全不跑时内容仍在布局与 A11y 树里；
// `@media (scripting: none)` 与 `prefers-reduced-motion` 都会把它点亮（见 motion.css）。
const props = withDefaults(
  defineProps<{
    /** 延迟（毫秒） */
    delay?: number
    /** 渲染标签 */
    as?: string
  }>(),
  { delay: 0, as: 'div' },
)

const el = ref<HTMLElement | null>(null)
const shown = ref(false)
let observer: IntersectionObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  const node = el.value
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 减少动态：直接点亮，不做散焦
  if (!node || reduce || typeof IntersectionObserver === 'undefined') {
    shown.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          shown.value = true
          observer?.disconnect()
          observer = null
          if (timer) {
            clearTimeout(timer)
            timer = null
          }
          break
        }
      }
    },
    { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
  )
  observer.observe(node)

  // 兜底 1.6s：布局抖动导致没回调时也要亮出来
  timer = setTimeout(() => {
    shown.value = true
    observer?.disconnect()
    observer = null
    timer = null
  }, 1600)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  if (timer) clearTimeout(timer)
  timer = null
})
</script>

<template>
  <component
    :is="as"
    ref="el"
    class="blur-reveal"
    :class="{ 'is-in': shown }"
    :style="{ '--reveal-delay': `${props.delay}ms` }"
  >
    <slot />
  </component>
</template>
