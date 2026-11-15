<script setup lang="ts">
// 逐行/逐卡入场（line-reveal）
// 用法：<LineReveal :index="i">…</LineReveal>，第 i 项延迟 min(i,10)*40ms。
// 与 Reveal 的区别：Reveal 是自己观察自己；这个是「同一批结果」按序号错峰，适合扫描命中列表。
// SSR 安全：服务端输出 .line-reveal（opacity 0.001，内容仍在 HTML 里）；onMounted 后加 .is-in。
const props = withDefaults(
  defineProps<{
    /** 在列表里的序号，决定延迟 */
    index?: number
    /** 渲染标签 */
    as?: string
  }>(),
  { index: 0, as: 'div' },
)

const el = ref<HTMLElement | null>(null)
const shown = ref(false)
let observer: IntersectionObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let rafId = 0

const vars = computed(() => ({ '--line-i': String(Math.min(props.index, 10)) }))

onMounted(() => {
  const node = el.value
  if (!node || typeof IntersectionObserver === 'undefined') {
    shown.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          // 逐项错峰：只在首次进入时排一次队
          const wait = Math.min(Math.max(props.index, 0), 10) * 40
          rafId = window.setTimeout(() => {
            shown.value = true
            rafId = 0
          }, wait) as unknown as number
          observer?.disconnect()
          observer = null
          break
        }
      }
    },
    { threshold: 0.05, rootMargin: '0px 0px -4% 0px' },
  )
  observer.observe(node)

  // 兜底：1.6s 还没回调（容器在视口内但布局抖动、或被隐藏容器包住）就直接显示
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
  if (rafId) clearTimeout(rafId)
  rafId = 0
})
</script>

<template>
  <component :is="as" ref="el" class="line-reveal" :class="{ 'is-in': shown }" :style="vars">
    <slot />
  </component>
</template>
