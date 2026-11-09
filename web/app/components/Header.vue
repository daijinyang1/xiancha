<script setup lang="ts">
const route = useRoute()

const nav = [
  { to: '/', label: '首页' },
  { to: '/scan', label: '合同扫描' },
  { to: '/traps', label: '避坑库' },
  { to: '/rules', label: '规则词条' },
  { to: '/certs', label: '考证日历' },
  { to: '/about', label: '关于我们' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

const open = ref(false)
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
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

      <nav class="hidden flex-wrap gap-1 md:flex">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-brand-soft hover:text-brand hover:no-underline"
          :class="isActive(item.to) ? 'bg-brand-soft font-bold text-brand' : 'text-ink-2'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
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
