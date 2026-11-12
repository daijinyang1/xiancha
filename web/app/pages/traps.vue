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
        '12 个脱敏改写的大学生实习踩坑案例，按押金、培训贷、无薪试岗、违约金、社保、加班、合同文本、离职 8 类筛选，支持搜索。每案写清当时的信号、后来的结果与处理办法。',
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

// 从规则词条页跳进来时 URL 变了也要跟上
watch(
  () => route.query.type,
  (v) => {
    if (v !== undefined && String(v) !== type.value) type.value = String(v)
  },
)

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

/** 每个坑型收了几条案例 —— 用来提示「这一类我们有没有料」 */
const typeCounts = computed(() => {
  const map: Record<string, number> = {}
  for (const t of all.value) map[t.type] = (map[t.type] || 0) + 1
  return map
})

const coveredTypes = computed(() => Object.keys(typeCounts.value).length)

function toggle(id: string) {
  openIds.value = openIds.value.includes(id) ? openIds.value.filter((x) => x !== id) : [...openIds.value, id]
}

function isOpen(id: string) {
  return openIds.value.includes(id)
}

function relatedRules(t: Trap) {
  return rules.value.filter((r) => r.type === t.type)
}

function resetAll() {
  q.value = ''
  type.value = ''
}
</script>

<template>
  <div class="wrap">
    <Reveal>
      <div class="mb-5">
        <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">案例库</span>
        <h1 class="!mb-2 text-[26px]">避坑案例库</h1>
        <p class="mb-0 max-w-[760px] text-ink-2">
          下面这些案例都来自公开报道与高校就业指导材料，已经隐去公司名与人名，只保留套路本身。看的时候重点看两栏：「当时有哪些信号」和「后来怎么处理」。
        </p>
      </div>
    </Reveal>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示内置案例快照。
    </div>

    <!-- 三个概览数字：让人先知道这一页有多少料 -->
    <Reveal :delay="60">
      <div class="mb-3.5 grid gap-3.5 sm:grid-cols-3">
        <div class="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div class="text-xs text-ink-3">已收录案例</div>
          <div class="mt-1 text-[26px] font-bold leading-none text-brand"><CountUp :to="all.length" suffix=" 条" /></div>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div class="text-xs text-ink-3">覆盖坑型</div>
          <div class="mt-1 text-[26px] font-bold leading-none text-brand-2"><CountUp :to="coveredTypes" suffix=" 类" /></div>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div class="text-xs text-ink-3">可对照的规则</div>
          <div class="mt-1 text-[26px] font-bold leading-none text-ink"><CountUp :to="rules.length" suffix=" 条" /></div>
        </div>
      </div>
    </Reveal>

    <Reveal :delay="100">
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
          >
            {{ t }}<span class="ml-1 text-[11px] opacity-60">{{ typeCounts[t] || 0 }}</span>
          </button>
        </div>
        <p class="mb-0 mt-2.5 text-xs text-ink-3">数据来源：后端 /api/traps（未连通时用内置快照）。点卡片展开详情。</p>
      </section>
    </Reveal>

    <div class="mt-4 grid gap-3.5 md:grid-cols-2">
      <p v-if="loading" class="col-span-full rounded-xl border border-line bg-white px-4 py-14 text-center text-sm text-ink-3">正在读取案例数据……</p>
      <div v-else-if="!filtered.length" class="col-span-full rounded-xl border border-dashed border-line bg-[#FBFCFE] px-4 py-12 text-center">
        <p class="mb-1.5 text-sm font-bold text-ink">没有符合条件的案例</p>
        <p class="mb-3.5 text-[13px] text-ink-2">换个关键词，或者清掉筛选看看全部 {{ all.length }} 条。</p>
        <button
          type="button"
          class="inline-flex h-[34px] items-center rounded-[9px] border border-line bg-white px-3.5 text-[13px] text-ink-2 transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD]"
          @click="resetAll"
        >清除筛选</button>
      </div>

      <Reveal
        v-for="(t, i) in filtered"
        :key="t.id"
        :delay="Math.min(60 + i * 40, 240)"
        class="min-w-0"
      >
        <article class="h-full rounded-xl border border-line bg-white p-4 shadow-sm transition hover:border-[#CBD8E6] hover:shadow">
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
      </Reveal>
    </div>

    <!-- 看完案例之后能做什么 -->
    <Reveal :delay="120">
      <Card title="看完案例，接着能做三件事" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">一、拿自己的合同扫一遍。</b>案例里的信号句如果出现在你手上那份里，扫描页会直接标出来。
            <NuxtLink to="/scan" class="text-brand-2">去扫描 →</NuxtLink>
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">二、顺着坑型查规则。</b>每个案例底部都挂着同坑型的规则条，那里写了法律依据和怎么改。
            <NuxtLink to="/rules" class="text-brand-2">查词条 →</NuxtLink>
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">三、签之前留证据。</b>把合同原文、聊天记录、对方承诺的书面版本都存一份；真出事时，这些比记忆管用。
          </li>
        </ul>
      </Card>
    </Reveal>

    <Reveal :delay="160">
      <Card title="案例是怎么整理的" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">全部脱敏。</b>不出现公司全称、不出现真实姓名，金额与时间做模糊处理，只保留套路本身。</li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">只收录能复现的。</b>一次性的个人纠纷不进库，只收那些「同样的话术在别处也出现过」的类型。</li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">每条都挂规则。</b>案例底部的规则链接指向同坑型的词条，故事与依据互相支撑。</li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0"><b class="text-ink">不替你判断结果。</b>案例只说明「这类套路存在、当时的人怎么处理」，不承诺你照做就一定能拿回钱。</li>
        </ul>
      </Card>
    </Reveal>
  </div>
</template>
