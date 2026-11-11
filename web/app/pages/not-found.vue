<script setup lang="ts">
// 静态 404 页。
// 为什么不用 app/error.vue 就够了：Nuxt 静态产物里的 404.html 只是 SPA 入口壳（1072 字节、正文 0 字），
// error.vue 的内容要等 JS 跑起来才渲染。搜索引擎与无 JS 环境看到的是白页。
// 这里做成普通路由页并加进预渲染列表，产出带正文的静态 404.html。
useHead({ title: '页面不存在' })

const entries = [
  { to: '/scan', icon: 'scan', title: '合同风险扫描', desc: '粘一份实习合同，本机逐句标出押金、培训贷、无薪试岗这些坑。', cta: '去扫描 →' },
  { to: '/traps', icon: 'traps', title: '避坑案例库', desc: '12 个脱敏改写的真实套路，按 8 类坑型筛选。', cta: '翻案例 →' },
  { to: '/rules', icon: 'rules', title: '规则词条', desc: '63 条规则，每条写清命中长什么样、依据哪一条法律、该怎么改。', cta: '查词条 →' },
  { to: '/certs', icon: 'certs', title: '考证日历', desc: '六张大学生最常考的证，报名时间、费用、对口岗位一次说清。', cta: '看证书 →' },
]
</script>

<template>
  <div>
    <p class="text-[52px] font-bold leading-none text-brand">404</p>
    <h1 class="mt-2 !text-[26px]">这个地址没有内容</h1>
    <p class="mt-2.5 max-w-[560px] text-ink-2">
      可能是链接抄错了，也可能是我们还没做这一页。下面四个入口都能走通，直接点进去就行。
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
  </div>
</template>
