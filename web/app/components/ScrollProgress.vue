<script setup lang="ts">
// 顶部阅读进度条（scroll-progress）
// 绑 scrollY / (scrollHeight - innerHeight)，用 scaleX 而不是 width：只走合成层，不触发布局。
// SSR 安全：服务端只输出空条（scaleX 0），滚动才动；不参与正文可读性。
const bar = ref<HTMLElement | null>(null)
let rafId = 0
let ticking = false

function update() {
  const node = bar.value
  if (!node) return
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
  node.style.transform = `scaleX(${ratio.toFixed(4)})`
}

function onScroll() {
  if (ticking) return
  ticking = true
  rafId = requestAnimationFrame(() => {
    ticking = false
    rafId = 0
    update()
  })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
})
</script>

<template>
  <div class="scroll-progress" aria-hidden="true">
    <span ref="bar" class="scroll-progress__bar" />
  </div>
</template>
