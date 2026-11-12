<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'

const route = useRoute()

// 原有 6 项顺序保持不变，历史记录插在「考证日历」之后、关于我们之前
const nav = [
  { to: '/', label: '首页' },
  { to: '/scan', label: '合同扫描' },
  { to: '/traps', label: '避坑库' },
  { to: '/rules', label: '规则词条' },
  { to: '/certs', label: '考证日历' },
  { to: '/history', label: '历史记录' },
  { to: '/about', label: '关于我们' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

const open = ref(false)
watch(() => route.fullPath, () => { open.value = false })

/* ---------- 滚动状态：header 加 is-scrolled（阴影 + 更实的底） ---------- */
const scrolled = ref(false)

function onScroll() {
  scrolled.value = (typeof window !== 'undefined' ? window.scrollY : 0) > 8
}

/* ---------- 当前项下划线滑动指示 ---------- */
const navEl = ref<HTMLElement | null>(null)
const linkEls = ref<HTMLElement[]>([])
const bar = reactive({ left: 0, width: 0, ready: false })

function setLinkRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el && el instanceof HTMLElement) linkEls.value[index] = el
}

function measure() {
  const navNode = navEl.value
  if (!navNode) return
  const activeIdx = nav.findIndex((item) => isActive(item.to))
  const link = activeIdx >= 0 ? linkEls.value[activeIdx] : null
  if (!link) {
    bar.ready = false
    return
  }
  const navRect = navNode.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  // nav 是 relative，left 取相对内边距后的偏移
  bar.left = linkRect.left - navRect.left + navNode.scrollLeft
  bar.width = linkRect.width
  bar.ready = true
}

function scheduleMeasure() {
  nextTick(() => {
    measure()
    // 字体加载完成后宽度会变，补测一次
    if (typeof window !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => measure()).catch(() => {})
    }
  })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure)
  scheduleMeasure()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
})

watch(() => route.fullPath, () => scheduleMeasure())
</script>

<template>
  <header :class="{ 'is-scrolled': scrolled }" class="sticky top-0 z-50 border-b border-line backdrop-blur">
    <div class="header-shell bg-white/95">
      <div class="wrap flex min-h-[62px] flex-wrap items-center justify-between gap-3">
        <NuxtLink to="/" class="flex items-center gap-2.5 text-ink no-underline hover:no-underline">
          <span class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-brand text-[17px] font-bold text-white">查</span>
          <span class="flex flex-col text-base font-bold leading-[1.15]">
            先查
            <small class="text-[11px] font-normal tracking-wide text-ink-3">XIAN CHA</small>
          </span>
        </NuxtLink>

        <button
          type="button"
          class="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 md:hidden"
          :aria-expanded="open"
          aria-label="展开导航"
          @click="open = !open"
        >
          {{ open ? '收起' : '菜单' }}
        </button>

        <nav ref="navEl" class="relative hidden flex-wrap gap-1 md:flex">
          <NuxtLink
            v-for="(item, i) in nav"
            :key="item.to"
            :ref="(el) => setLinkRef(el, i)"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm no-underline transition-colors hover:bg-brand-soft hover:text-brand hover:no-underline"
            :class="isActive(item.to) ? 'font-bold text-brand' : 'text-ink-2'"
          >
            {{ item.label }}
          </NuxtLink>
          <!-- 滑动下划线：位置由 onMounted 量出来，SSR 期 opacity 0 -->
          <span
            v-show="bar.ready"
            class="nav-underline pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-brand"
            :style="{ left: bar.left + 'px', width: bar.width + 'px', opacity: bar.ready ? 1 : 0 }"
            aria-hidden="true"
          />
        </nav>
      </div>
    </div>

    <nav v-if="open" class="wrap grid gap-1 border-t border-line py-2 md:hidden">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="rounded-lg px-3 py-2 text-sm no-underline hover:bg-brand-soft hover:no-underline"
        :class="isActive(item.to) ? 'bg-brand-soft font-bold text-brand' : 'text-ink-2'"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </header>
</template>
