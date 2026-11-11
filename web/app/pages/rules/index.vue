<script setup lang="ts">
import { RULE_TYPES, LEVELS } from '~/composables/useApi'
import type { Rule } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const { fetchRules } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '规则词条',
  meta: [
    {
      name: 'description',
      content:
        '把 63 条实习合同风险规则拆成可查的词条：每一条写清命中长什么样、为什么有风险、依据哪一条法律、该怎么改。支持关键词搜索与按坑型筛选。',
    },
  ],
})

const all = ref<Rule[]>([])
const loading = ref(true)
const q = ref(String(route.query.q || ''))
const type = ref(String(route.query.type || ''))
const level = ref(String(route.query.level || ''))

// 构建期取数：npm run generate 时把 63 条规则写进 HTML；搬到线上后不再请求后端
const { data: rulesData } = await useAsyncData('xc-rules-all', () => fetchRules())
all.value = rulesData.value || []
loading.value = false

watch(q, (v) => {
  router.replace({ query: { ...route.query, q: v || undefined } })
})
watch([type, level], () => {
  router.replace({ query: { ...route.query, type: type.value || undefined, level: level.value || undefined } })
})

// 从首页搜索框跳进来时 URL 变了也要跟上
watch(
  () => route.query,
  (nq) => {
    if (nq.q !== undefined && String(nq.q) !== q.value) q.value = String(nq.q)
  },
)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return all.value.filter((r) => {
    if (type.value && r.type !== type.value) return false
    if (level.value && r.level !== level.value) return false
    if (!kw) return true
    return [r.id, r.ask, r.verdict, r.name, r.type, r.why, r.law, r.fix].join(' ').toLowerCase().includes(kw)
  })
})

const countText = computed(() => {
  if (loading.value) return '正在读取规则库…'
  if (!all.value.length) return '规则库为空'
  if (q.value || type.value || level.value) return '共 ' + all.value.length + ' 条，当前显示 ' + filtered.value.length + ' 条'
  return '共 ' + all.value.length + ' 条'
})

function resetAll() {
  q.value = ''
  type.value = ''
  level.value = ''
}
</script>

<template>
  <div class="wrap">
    <div class="mb-5">
      <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">规则词条</span>
      <h1 class="!mb-2 text-[26px]">{{ all.length || 63 }} 条风险规则，一条一页</h1>
      <p class="mb-0 max-w-[760px] text-ink-2">
        这里是扫描引擎用的那份规则库，原样拆成可查的词条。想查一句话「这样写有没有坑」，搜关键词就行；想知道某条为什么有风险、依据哪一条法律、让对方怎么改，点开词条。命中的表述不等于一定违法，最终仍要以原句、上下文和实际情况核对。
      </p>
    </div>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示内置规则库快照。
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
            placeholder="搜风险名称或条款关键词，比如：押金、违约金、社保、加班费、竞业"
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

      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="h-8 rounded-full border px-[13px] text-[13px] transition"
          :class="!level ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
          @click="level = ''"
        >全部等级</button>
        <button
          v-for="l in LEVELS"
          :key="l"
          type="button"
          class="h-8 rounded-full border px-[13px] text-[13px] transition"
          :class="level === l ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
          @click="level = level === l ? '' : l"
        >{{ l }}风险</button>
      </div>

      <p class="mb-0 mt-2.5 text-xs text-ink-3">数据来源：后端 /api/rules（未连通时用内置快照，与扫描引擎同一份规则，不是另抄一遍）。</p>
    </section>

    <div class="mt-4 grid gap-3.5 md:grid-cols-2">
      <p v-if="loading" class="col-span-full rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">
        正在读取规则库……
      </p>
      <p v-else-if="!filtered.length" class="col-span-full rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">
        没有匹配的规则。换个关键词，或者点「全部」。
        <button type="button" class="ml-1 text-brand underline" @click="resetAll">清除筛选</button>
      </p>

      <article
        v-for="r in filtered"
        :key="r.id"
        class="rounded-xl border border-line bg-white p-4 shadow-sm transition hover:border-[#CBD8E6] hover:shadow"
      >
        <div class="mb-2 flex items-start justify-between gap-2.5">
          <h3 class="!mb-1.5 !text-[15.5px] !leading-normal">
            <NuxtLink :to="'/rules/' + r.id" class="text-ink hover:text-brand-2 hover:underline">
              {{ r.ask || r.name }}
            </NuxtLink>
          </h3>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <RuleBadge :level="r.level" />
          <RuleBadge :type="r.type" />
          <RuleBadge :id="r.id" />
          <RuleBadge :name="r.name" />
        </div>
        <p class="mb-0 text-[13.5px] text-ink-2">{{ r.verdict || r.why }}</p>
        <div class="mt-3">
          <NuxtLink
            :to="'/rules/' + r.id"
            class="inline-flex h-[30px] items-center rounded-[7px] border border-line bg-white px-2.5 text-[13px] text-ink-2 no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          >
            单独打开这一条 →
          </NuxtLink>
        </div>
      </article>
    </div>

    <Card title="这些词条是怎么来的" class="mt-4">
      <ul class="mb-0 list-none p-0">
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">来源一 · 真实合同。</b>同学、学长学姐签过的实习协议与三方协议，脱敏后逐条读，读到可疑的表述就记下来。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">来源二 · 公开裁判文书。</b>用中国裁判文书网检索「实习 违约金」「试岗 工资」，把被法院认定无效的条款抄出来。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">来源三 · 人社部门通报。</b>各地人社局公示的「重大劳动保障违法行为」，违法事实可以直接对应成规则。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">来源四 · 法条本身。</b>《劳动合同法》《劳动法》《社会保险法》《著作权法》《民法典》合同编，凡是带「不得」「应当」的条文，都能变成一条规则。</li>
        <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">一条规则十个字段：</b>编号、学生会搜的那个问题、一句判定、风险名称、坑型、等级、触发正则、为什么有风险、法律依据、怎么改。缺一个都不算合格。</li>
      </ul>
    </Card>

    <Card title="全部词条索引（固定链接，可直接收藏或引用）" class="mt-4">
      <template #head>
        <span class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2">固定链接</span>
      </template>
      <p class="mt-0 text-xs text-ink-3">每一条都有自己的地址（<code>/rules/R01</code> … <code>/rules/R63</code>），可直接引用。</p>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="r in all"
          :key="r.id"
          :to="'/rules/' + r.id"
          class="inline-block h-auto rounded-full border border-line bg-white px-2.5 py-[3px] text-[13px] text-ink-2 no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          :title="r.ask"
        >
          {{ r.id }} {{ r.name }}
        </NuxtLink>
      </div>
    </Card>
  </div>
</template>
