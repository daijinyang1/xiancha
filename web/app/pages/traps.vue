<script setup lang="ts">
import { RULE_TYPES } from '~/composables/useApi'
import type { Rule, Trap } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const { fetchTraps, fetchRules } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '避坑案例库',
  meta: [
    {
      name: 'description',
      content:
        '12 个脱敏改写的大学生实习踩坑案例，按押金、培训贷、无薪试岗、违约金、社保、加班、合同文本、离职 8 类筛选，支持搜索。',
    },
  ],
})

const all = ref<Trap[]>([])
const rules = ref<Rule[]>([])
const loading = ref(true)
const q = ref('')
const type = ref(String(route.query.type || ''))
const openIds = ref<string[]>([])

// 构建期取数：npm run generate 时把案例与规则写进 HTML；线上静态站不再请求后端
const { data: loaded } = await useAsyncData('xc-traps-page', async () => {
  const [list, rs] = await Promise.all([fetchTraps(), fetchRules()])
  return { list, rs }
})
all.value = loaded.value?.list || []
rules.value = loaded.value?.rs || []
loading.value = false

watch(type, (v) => {
  router.replace({ query: { ...route.query, type: v || undefined } })
})

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return all.value.filter((t) => {
    if (type.value && t.type !== type.value) return false
    if (!kw) return true
    const hay = [t.title, t.scene, t.type, t.consequence, t.advice, (t.signals || []).join(' ')].join(' ').toLowerCase()
    return hay.includes(kw)
  })
})

const countText = computed(() => {
  if (loading.value) return '正在读取案例数据…'
  if (q.value || type.value) return '筛选到 ' + filtered.value.length + ' 条 / 已收录 ' + all.value.length + ' 条'
  return '已收录 ' + all.value.length + ' 条'
})

function toggle(id: string) {
  openIds.value = openIds.value.includes(id) ? openIds.value.filter((x) => x !== id) : [...openIds.value, id]
}

function isOpen(id: string) {
  return openIds.value.includes(id)
}

function relatedRules(t: Trap) {
  return rules.value.filter((r) => r.type === t.type)
}
</script>

<template>
  <div class="wrap">
    <div class="mb-5">
      <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">案例库</span>
      <h1 class="!mb-2 text-[26px]">避坑案例库</h1>
      <p class="mb-0 max-w-[760px] text-ink-2">
        下面这些案例都来自公开报道与高校就业指导材料，已经隐去公司名与人名，只保留套路本身。看的时候重点看两栏：「当时有哪些信号」和「后来怎么处理」。
      </p>
    </div>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示内置案例快照。
    </div>

    <section class="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div class="mb-3.5 flex flex-wrap items-center gap-3">
        <div class="relative min-w-[220px] flex-1">
          <svg class="pointer-events-none absolute left-[11px] top-[11px] h-[18px] w-[18px] text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          <input
            v-model="q"
            type="search"
            class="h-10 w-full rounded-[9px] border border-line bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-2 focus:ring-[3px] focus:ring-brand-2/15"
            placeholder="搜索标题、场景、信号关键词，比如：押金、社保、加班费"
            autocomplete="off"
          >
        </div>
        <span class="text-[13px] text-ink-3">{{ countText }}</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="h-8 rounded-full border px-[13px] text-[13px] transition"
          :class="!type ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
          @click="type = ''"
        >全部</button>
        <button
          v-for="t in RULE_TYPES"
          :key="t"
          type="button"
          class="h-8 rounded-full border px-[13px] text-[13px] transition"
          :class="type === t ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
          @click="type = type === t ? '' : t"
        >{{ t }}</button>
      </div>
      <p class="mb-0 mt-2.5 text-xs text-ink-3">数据来源：后端 /api/traps（未连通时用内置快照）。点卡片展开详情。</p>
    </section>

    <div class="mt-4 grid gap-3.5 md:grid-cols-2">
      <p v-if="loading" class="col-span-full rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">正在读取案例数据……</p>
      <p v-else-if="!filtered.length" class="col-span-full rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">
        没有符合条件的案例。换个关键词，或点「全部」清掉筛选。
      </p>

      <article
        v-for="t in filtered"
        :key="t.id"
        class="rounded-xl border border-line bg-white p-4 shadow-sm transition hover:border-[#CBD8E6] hover:shadow"
      >
        <div class="mb-1.5 flex items-start justify-between gap-2.5">
          <h3 class="!mb-0 !text-[15.5px] !leading-normal">{{ t.title }}</h3>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <RuleBadge :level="t.level" />
          <RuleBadge :type="t.type" />
          <RuleBadge :id="t.id" />
        </div>
        <p class="mb-0 text-[13.5px] text-ink-2">{{ t.scene }}</p>

        <div v-if="isOpen(t.id)" class="mt-3 border-t border-dashed border-line pt-3 text-[13.5px] text-ink-2">
          <div class="mb-2">
            <b class="text-ink">当时有哪些信号</b>
            <ul class="mb-0 mt-1.5 list-disc pl-5">
              <li v-for="s in t.signals" :key="s">{{ s }}</li>
            </ul>
          </div>
          <div class="mb-2"><b class="text-ink">后来怎么样了</b><br>{{ t.consequence }}</div>
          <div class="mb-2"><b class="text-ink">怎么处理</b><br>{{ t.advice }}</div>
          <div class="mb-2">
            <b class="text-ink">来源</b><br>
            <span class="text-xs text-ink-3">{{ t.source }}</span>
          </div>
          <div>
            <b class="text-ink">对应的规则条</b>
            <div class="mt-1.5 flex flex-wrap gap-2">
              <NuxtLink
                v-for="r in relatedRules(t)"
                :key="r.id"
                :to="'/rules/' + r.id"
                class="inline-block rounded-full border border-line bg-white px-2.5 py-[3px] text-[13px] text-brand no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
                :title="r.name"
              >
                {{ r.id }} {{ r.ask }}
              </NuxtLink>
              <span v-if="!relatedRules(t).length" class="text-xs text-ink-3">（该坑型暂无对应规则条）</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-2.5 text-[13px] text-brand hover:underline"
          @click="toggle(t.id)"
        >
          {{ isOpen(t.id) ? '收起 ▴' : '展开详情 ▾' }}
        </button>
      </article>
    </div>

    <Card title="案例是怎么整理的" class="mt-4">
      <ul class="mb-0 list-none p-0">
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">全部脱敏。</b>不出现公司全称、不出现真实姓名，金额与时间做模糊处理，只保留套路本身。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">只收录能复现的。</b>一次性的个人纠纷不进库，只收那些「同样的话术在别处也出现过」的类型。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">每条都挂规则。</b>案例底部的规则链接指向同坑型的词条，故事与依据互相支撑。</li>
      </ul>
    </Card>
  </div>
</template>
