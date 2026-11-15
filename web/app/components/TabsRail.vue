<script setup lang="ts">
// 滑动指示条（sliding-indicator-tabs）
// 用法：把一排 chip 按钮放进 <TabsRail>，每颗按钮带 aria-pressed（true = 选中）。
// 指示条自己量测选中项的位置/宽度（getBoundingClientRect，参考 Header 的 nav-underline），
// 移动只有 180ms 的 transform/width 过渡，不用 JS 定时器。
//
// 降级：没有 JS 或量测失败时 .is-ready 不会加上，CSS 里选中态仍走原来的
// 「border-brand + bg-brand + 白字」，不会出现「看不出谁选中」的空窗。
const props = withDefaults(defineProps<{ dep?: string | number }>(), { dep: '' })

const rail = ref<HTMLElement | null>(null)
const ind = ref<HTMLElement | null>(null)
const ready = ref(false)

let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let rafId = 0

function measure() {
  const host = rail.value
  const bar = ind.value
  if (!host || !bar) return
  const active = host.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!active) {
    bar.style.width = '0px'
    ready.value = false
    return
  }
  const hostBox = host.getBoundingClientRect()
  const box = active.getBoundingClientRect()
  const left = box.left - hostBox.left
  const top = box.top - hostBox.top
  bar.style.width = `${Math.round(box.width)}px`
  bar.style.height = `${Math.round(box.height)}px`
  bar.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`
  ready.value = true
}

function schedule() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    measure()
  })
}

onMounted(() => {
  schedule()
  // 字体晚到、图片撑开、换行都会让 chip 移位：字体就绪后再量一次
  if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {})
  window.addEventListener('resize', schedule, { passive: true })

  if (typeof ResizeObserver !== 'undefined' && rail.value) {
    ro = new ResizeObserver(schedule)
    ro.observe(rail.value)
  }
  // 选中项换人（aria-pressed 变化）或列表重排（子节点增删）都要重量
  if (typeof MutationObserver !== 'undefined' && rail.value) {
    mo = new MutationObserver(schedule)
    mo.observe(rail.value, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-pressed'],
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', schedule)
  ro?.disconnect()
  ro = null
  mo?.disconnect()
  mo = null
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
})

// 外部筛选条件变化（比如「清除筛选」）时补一次量测
watch(() => props.dep, () => nextTick(schedule))
</script>

<template>
  <div ref="rail" class="tab-rail" :class="{ 'is-ready': ready }">
    <span ref="ind" class="tab-rail__indicator" aria-hidden="true" />
    <slot />
  </div>
</template>
