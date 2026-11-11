<script setup lang="ts">
// 404 / 出错兜底页。Nuxt 静态站必须自带这一页：没有它，Pages 对任何不存在的地址
// 只会返回 1452 字节的空壳，用户看到白屏，搜索引擎也拿不到任何内容。
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>()

const notFound = computed(() => props.error?.statusCode === 404)

useHead({
  title: notFound.value ? '页面不存在' : '出错了',
})

const entries = [
  { to: '/scan', icon: 'scan', title: '合同风险扫描', desc: '粘一份实习合同，本机逐句标出押金、培训贷、无薪试岗这些坑。', cta: '去扫描 →' },
  { to: '/traps', icon: 'traps', title: '避坑案例库', desc: '12 个脱敏改写的真实套路，按 8 类坑型筛选。', cta: '翻案例 →' },
  { to: '/rules', icon: 'rules', title: '规则词条', desc: '63 条规则，每条写清命中长什么样、依据哪一条法律、该怎么改。', cta: '查词条 →' },
  { to: '/', icon: 'certs', title: '回到首页', desc: '首页有即时查询框，输入你遇到的问题词就能直接分流。', cta: '回首页 →' },
]
</script>

<template>
  <div class="min-h-screen bg-page">
    <Header />
    <main class="wrap py-12">
      <p class="text-[52px] font-bold leading-none text-brand">{{ error?.statusCode || 500 }}</p>
      <h1 class="mt-2 !text-[26px]">{{ notFound ? '这个地址没有内容' : '页面没能加载出来' }}</h1>
      <p class="mt-2.5 max-w-[560px] text-ink-2">
        {{ notFound
          ? '可能是链接抄错了，也可能是我们还没做这一页。下面几个入口都能走通，直接点进去就行。'
          : '可能是本地数据没读上。刷新一次，或者先回首页从头找。' }}
      </p>

      <div class="mt-7 grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="e in entries"
          :key="e.to"
          :to="e.to"
          class="card-x group flex items-start gap-3.5 no-underline transition hover:border-brand-2"
        >
          <span class="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand">
            <EntryIcon :name="e.icon" />
          </span>
          <span class="min-w-0">
            <span class="block font-semibold text-ink">{{ e.title }}</span>
            <span class="mt-1 block text-[13px] leading-relaxed text-ink-3">{{ e.desc }}</span>
            <span class="mt-2 block text-[13px] font-medium text-brand-2">{{ e.cta }}</span>
          </span>
        </NuxtLink>
      </div>

      <div class="mt-7 rounded-xl border border-line bg-white p-5 text-[13.5px] text-ink-2">
        <p class="font-semibold text-ink">是不是在找某条规则？</p>
        <p class="mt-1.5">
          规则词条页的地址形如 <code class="rounded bg-page px-1.5 py-0.5 text-[12.5px]">/rules/R01</code>，R01 到 R63 都在，
          编号写错才会落到这个页面。去
          <NuxtLink to="/rules" class="font-medium text-brand-2">规则总目录</NuxtLink>
          按关键词搜一下更快。
        </p>
      </div>

      <p class="mt-6">
        <NuxtLink to="/" class="text-[13.5px] font-medium text-brand-2">← 回首页</NuxtLink>
      </p>
    </main>
    <Footer />
  </div>
</template>
