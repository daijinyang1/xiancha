<script setup lang="ts">
import { levelClass, levelLabel } from '~/composables/useApi'
import type { Rule, Trap } from '~/composables/useApi'

const route = useRoute()
const { fetchRule, fetchRules, fetchTraps } = useApi()
const apiStatus = useApiStatus()

const id = computed(() => String(route.params.id || '').toUpperCase())
const rule = ref<Rule | null>(null)
const rules = ref<Rule[]>([])
const traps = ref<Trap[]>([])
const loading = ref(true)

const idx = computed(() => rules.value.findIndex((r) => r.id === id.value))
const prev = computed(() => (idx.value > 0 ? rules.value[idx.value - 1] : null))
const next = computed(() => (idx.value >= 0 && idx.value < rules.value.length - 1 ? rules.value[idx.value + 1] : null))

const sameTypeRules = computed(() =>
  rule.value ? rules.value.filter((r) => r.type === rule.value!.type && r.id !== rule.value!.id) : [],
)
const sameTypeTraps = computed<Trap[]>(() =>
  rule.value ? traps.value.filter((t) => t.type === rule.value!.type) : [],
)

async function load() {
  loading.value = true
  const [r, rs, ts] = await Promise.all([fetchRule(id.value), fetchRules(), fetchTraps()])
  rule.value = r
  rules.value = rs
  traps.value = ts
  loading.value = false
}

// 构建期取数：npm run generate 会为每条规则单独预渲染一页，数据直接写进 HTML
const { data: loaded } = await useAsyncData('xc-rule-' + id.value, async () => {
  const [r, rs, ts] = await Promise.all([fetchRule(id.value), fetchRules(), fetchTraps()])
  return { r, rs, ts }
})
if (loaded.value) {
  rule.value = loaded.value.r
  rules.value = loaded.value.rs
  traps.value = loaded.value.ts
  loading.value = false
}

watch(id, load)

useHead({
  title: computed(() => (rule.value ? rule.value.ask : '规则词条')),
  meta: [
    {
      name: 'description',
      content: computed(() => (rule.value ? rule.value.verdict : '先查 · 规则词条')),
    },
  ],
})
</script>

<template>
  <div class="wrap">
    <p class="mb-2 text-xs text-ink-3">
      <NuxtLink to="/rules" class="text-ink-3 hover:text-brand">规则词条</NuxtLink>
      <span class="mx-1">/</span>
      <span>{{ rule?.type || '…' }}</span>
      <span class="mx-1">/</span>
      <span>{{ id }}</span>
    </p>

    <p v-if="loading" class="rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">正在读取词条……</p>

    <div v-else-if="!rule" class="rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">
      没有找到编号为 <b>{{ id }}</b> 的规则。
      <NuxtLink to="/rules" class="ml-1 text-brand underline">回到全部词条</NuxtLink>
    </div>

    <template v-else>
      <div class="mb-5">
        <h1 class="!mb-2.5 text-[26px]">{{ rule.ask }}</h1>
        <p class="mb-0 max-w-[760px] text-[15px] text-ink">{{ rule.verdict }}</p>
      </div>

      <div
        v-if="apiStatus.degraded"
        class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
      >
        <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示内置规则库快照。
      </div>

      <Card title="这条规则认的是什么">
        <template #head>
          <span class="flex flex-wrap items-center gap-1.5">
            <span class="inline-block whitespace-nowrap rounded-full border px-[7px] text-[11px] font-bold leading-[18px]" :class="levelClass(rule.level)">{{ levelLabel(rule.level) }}</span>
            <RuleBadge :type="rule.type" />
            <RuleBadge :id="rule.id" />
          </span>
        </template>
        <p class="mb-2"><b class="text-ink">{{ rule.name }}</b></p>
        <p class="mb-3 text-sm text-ink-2">{{ rule.why }}</p>
        <div class="mb-0 rounded-[10px] border border-[#EFCFC9] bg-danger-soft px-3.5 py-3 text-[13px] leading-relaxed text-[#8A2C21]">
          命中的表述不等于一定违法。同一条款放在不同上下文里结论可能不同，最终要以原句、上下文和实际情况核对。
        </div>
      </Card>

      <Card title="法律依据" class="mt-4">
        <p class="mb-0 text-sm text-ink-2">{{ rule.law }}</p>
      </Card>

      <Card title="该怎么改" class="mt-4">
        <p class="mb-0 text-sm text-ink-2">{{ rule.fix }}</p>
      </Card>

      <Card :title="'同坑型：' + rule.type" class="mt-4">
        <template #head>
          <NuxtLink
            :to="{ path: '/traps', query: { type: rule.type } }"
            class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2 no-underline hover:no-underline"
          >
            同类案例 {{ sameTypeTraps.length }} 条 →
          </NuxtLink>
        </template>

        <div v-if="sameTypeTraps.length" class="mb-4 space-y-2">
          <div v-for="t in sameTypeTraps.slice(0, 3)" :key="t.id" class="rounded-lg border border-line bg-[#FCFDFE] px-3.5 py-3">
            <p class="mb-1 text-sm font-bold text-ink">{{ t.title }}</p>
            <p class="mb-0 text-xs text-ink-3">信号：{{ (t.signals || []).join('；') }}</p>
          </div>
        </div>
        <p v-else class="mb-4 text-xs text-ink-3">该坑型暂无收录案例。</p>

        <p class="mb-1.5 text-sm font-bold text-ink">同坑型的其他规则（{{ sameTypeRules.length }} 条）</p>
        <div v-if="sameTypeRules.length" class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="r in sameTypeRules"
            :key="r.id"
            :to="'/rules/' + r.id"
            class="inline-block rounded-full border border-line bg-white px-2.5 py-[3px] text-[13px] text-ink-2 no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
            :title="r.name"
          >
            {{ r.id }} {{ r.ask }}
          </NuxtLink>
        </div>
        <p v-else class="mb-0 text-xs text-ink-3">该坑型暂无其他规则。</p>
      </Card>

      <Card title="拿你自己的合同试一遍" class="mt-4">
        <p class="mb-3.5 text-sm text-ink-2">
          把合同原文粘进「合同扫描」，这条规则会自动参与匹配：命中处标出，并给出完整说明。
        </p>
        <div class="flex flex-wrap gap-2.5">
          <NuxtLink
            to="/scan"
            class="inline-flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-4 text-sm font-bold text-white no-underline transition hover:bg-[#1A4368] hover:no-underline"
          >
            去扫描我的合同
          </NuxtLink>
          <NuxtLink
            to="/rules"
            class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          >
            回到 {{ rules.length }} 条总目录
          </NuxtLink>
        </div>
      </Card>

      <nav class="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:justify-between sm:gap-5">
        <div class="flex-1">
          <NuxtLink v-if="prev" :to="'/rules/' + prev.id" class="block no-underline hover:no-underline">
            <span class="block text-xs text-ink-3">上一条 · {{ prev.id }}</span>
            <span class="text-sm text-brand hover:underline">{{ prev.ask }}</span>
          </NuxtLink>
          <span v-else class="text-[13px] text-ink-3">已经是第一条</span>
        </div>
        <div class="flex-1 sm:text-right">
          <NuxtLink v-if="next" :to="'/rules/' + next.id" class="block no-underline hover:no-underline">
            <span class="block text-xs text-ink-3">下一条 · {{ next.id }}</span>
            <span class="text-sm text-brand hover:underline">{{ next.ask }}</span>
          </NuxtLink>
          <span v-else class="text-[13px] text-ink-3">已经是最后一条</span>
        </div>
      </nav>
    </template>
  </div>
</template>
