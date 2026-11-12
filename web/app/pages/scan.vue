<script setup lang="ts">
import { RULE_TYPES, appendLocalHistory, scanLevelAdvice, scanLevelLabel, scoreToLevel } from '~/composables/useApi'
import type { ScanResult } from '~/composables/useApi'

const { scan, fetchRules } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '合同风险扫描',
  meta: [
    {
      name: 'description',
      content:
        '粘贴实习合同、三方协议原文，规则引擎逐条标出押金、培训贷、无薪试岗、加班、违约金等风险点，并给出法律依据与修改建议。',
    },
  ],
})

// 规则索引在构建期取一次：既让预渲染的 HTML 带上「本页在查什么」的真实条数，
// 也给扫描结果做「按坑型分组」时查 type 用（扫描结果里只回 id/ask/name/level）。
const { data: ruleIndex } = await useAsyncData('xc-scan-rule-index', async () => {
  const list = await fetchRules()
  return list.map((r) => ({ id: r.id, type: r.type, name: r.name, ask: r.ask }))
})

const rulesById = computed(() => {
  const m: Record<string, { type: string; name: string; ask: string }> = {}
  for (const r of ruleIndex.value || []) m[r.id] = { type: r.type, name: r.name, ask: r.ask }
  return m
})

/** 八类坑型各有多少条规则（构建期就有值，不依赖扫描） */
const typeCoverage = computed(() =>
  RULE_TYPES.map((t) => ({
    type: t as string,
    count: (ruleIndex.value || []).filter((r) => r.type === t).length,
  })),
)
const totalRules = computed(() => (ruleIndex.value || []).length)

const text = ref('')
const loading = ref(false)
const result = ref<ScanResult | null>(null)
const errorMsg = ref('')
const scanned = ref(false)
const recorded = ref(false)

const chars = computed(() => text.value.length)
/** 超过 20000 字后端会截断，输入框先给个软提示 */
const tooLong = computed(() => chars.value > 20000)

const demoText = `实习协议书

甲方（实习单位）：某科技有限公司
乙方（实习生）：张同学

一、实习期间，乙方向甲方一次性交纳实习押金 800 元，实习期满无息退还。
二、甲方安排乙方参加岗前技能培训，培训费用由乙方承担，共计 4980 元，可从实习补贴中扣除。
三、实习前三个月为试岗期，试岗期不发放任何补贴，仅提供工作餐。
四、乙方需服从甲方安排的加班，加班不另行支付加班费，调休另行安排。
五、实习期内乙方不得离职，如提前离职须支付违约金 5000 元。
六、甲方不为乙方缴纳社会保险，相关费用折现后计入补贴发放。
七、本协议一式两份，双方签字后生效，最终解释权归甲方所有。`

const counts = computed(() => {
  const hits = result.value?.hits || []
  return {
    high: hits.filter((h) => h.level === '高').length,
    mid: hits.filter((h) => h.level === '中').length,
    low: hits.filter((h) => h.level === '低').length,
  }
})

const riskLevel = computed(() => (result.value ? result.value.level : ''))
const levelText = computed(() => (result.value ? scanLevelLabel(result.value.level) : '等待扫描'))
const levelAdvice = computed(() => (result.value ? scanLevelAdvice(result.value.level) : '粘贴合同后点「开始扫描」，这里会给出分档结论'))

/** 命中按坑型分组：命中规则条数 + 条形宽度（相对最大值归一） */
const typeBreakdown = computed(() => {
  const tally: Record<string, number> = {}
  for (const h of result.value?.hits || []) {
    for (const r of h.rules) {
      const t = rulesById.value[r.id]?.type || '其他'
      tally[t] = (tally[t] || 0) + 1
    }
  }
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const max = rows.length ? rows[0][1] : 1
  return rows.map(([type, count]) => ({ type, count, width: Math.max(6, Math.round((count / max) * 100)) }))
})

async function run() {
  if (!text.value.trim()) {
    errorMsg.value = '请先粘贴合同原文，或点「填入示例合同」。'
    return
  }
  errorMsg.value = ''
  loading.value = true
  recorded.value = false
  try {
    const res = await scan(text.value)
    result.value = res
    scanned.value = true
    // 线上是静态站，服务器收不到这条记录；写进本机，/history 会与后端记录合并展示
    appendLocalHistory({
      sentenceHits: res.sentenceCount,
      ruleHits: res.ruleCount,
      score: res.score,
      level: scoreToLevel(res.score) === 'high' ? '高' : scoreToLevel(res.score) === 'mid' ? '中' : '低',
    })
    recorded.value = true
  } catch (e) {
    errorMsg.value = '扫描失败：' + (e as Error).message
  } finally {
    loading.value = false
  }
}

function fillDemo() {
  text.value = demoText
  errorMsg.value = ''
}

function clearAll() {
  text.value = ''
  result.value = null
  scanned.value = false
  recorded.value = false
  errorMsg.value = ''
}

async function copyList() {
  if (!result.value) return
  const lines = ['先查 · 合同风险清单', '风险分：' + result.value.score + '（' + levelText.value + '）', '']
  result.value.hits.forEach((h, i) => {
    lines.push(String(i + 1) + '. [' + h.level + '风险] ' + h.sentence)
    h.rules.forEach((r) => lines.push('   - ' + r.id + ' ' + r.name))
  })
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    toast('已复制风险清单')
  } catch {
    toast('复制失败，请手动选择文本')
  }
}

const { toast } = useToast()
</script>

<template>
  <div class="wrap">
    <Reveal>
      <div class="mb-5">
        <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">核心功能</span>
        <h1 class="!mb-2 text-[26px]">合同风险扫描</h1>
        <p class="mb-0 max-w-[760px] text-ink-2">
          把合同原文粘贴到左边，点「开始扫描」。命中的句子会逐条列出风险等级、原句、为什么有风险、法律依据和修改建议。点卡片标题可直接跳到对应规则词条。
        </p>
      </div>
    </Reveal>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前使用内置规则库在本机兜底扫描，结果口径与线上一致。
    </div>

    <Reveal :delay="60">
      <div class="mb-3.5 rounded-[10px] border border-[#D3E2F0] bg-brand-soft px-3.5 py-3 text-[13px] text-[#1B4266]">
        <b>隐私提示：</b>扫描结果只用于本页展示，不会写入任何第三方服务。请勿在公共电脑上粘贴含身份证号的完整合同。
      </div>
    </Reveal>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_440px]">
      <!-- 左：输入 -->
      <Reveal :delay="100" class="min-w-0">
        <section class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <h2 class="!mb-0 !text-[15px]">合同原文</h2>
            <span class="text-xs" :class="tooLong ? 'text-danger' : 'text-ink-3'">{{ chars }} 字{{ tooLong ? '（建议先删掉无关段落，过长会被截断）' : '' }}</span>
          </div>
          <textarea
            v-model="text"
            class="min-h-[260px] w-full resize-y rounded-[9px] border border-line bg-white p-3 text-sm leading-[1.8] outline-none transition focus:border-brand-2 focus:ring-[3px] focus:ring-brand-2/15"
            placeholder="把实习协议、三方协议或劳动合同的正文粘贴到这里。"
          />
          <div class="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              class="inline-flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-4 text-sm font-bold text-white transition hover:bg-[#1A4368] disabled:opacity-50"
              :disabled="loading"
              @click="run"
            >
              {{ loading ? '扫描中…' : '开始扫描' }}
            </button>
            <button
              type="button"
              class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD]"
              @click="fillDemo"
            >
              填入示例合同
            </button>
            <button
              type="button"
              class="inline-flex h-[38px] items-center justify-center rounded-[9px] px-4 text-sm text-ink-3 transition hover:bg-[#EDF1F6]"
              @click="clearAll"
            >
              清空
            </button>
          </div>
          <p v-if="errorMsg" class="mt-2.5 text-[13px] text-danger">{{ errorMsg }}</p>
          <p v-if="recorded" class="mt-2.5 text-[13px] text-ok">
            本次结果已记录 —— 只存在这台设备的浏览器里，可在
            <NuxtLink to="/history" class="font-bold">扫描历史</NuxtLink>
            查看，服务器不收这份合同原文。
          </p>
        </section>
      </Reveal>

      <!-- 右：概览 -->
      <Reveal :delay="160">
        <aside class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <h2 class="!mb-0 !text-[15px]">风险概览</h2>
            <div class="flex flex-wrap gap-2">
              <span class="rounded-full border border-[#EFCFC9] bg-danger-soft px-[7px] text-[11px] font-bold leading-[18px] text-danger">高 {{ counts.high }}</span>
              <span class="rounded-full border border-[#F0DDBC] bg-amber-soft px-[7px] text-[11px] font-bold leading-[18px] text-amber">中 {{ counts.mid }}</span>
              <span class="rounded-full border border-[#D3E2F0] bg-brand-soft px-[7px] text-[11px] font-bold leading-[18px] text-brand">低 {{ counts.low }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4 border-b border-dashed border-line pb-4 pt-1">
            <ProgressRing :value="result ? result.score : 0" :max="100" :size="116" label="风险分" />
            <div class="min-w-0">
              <div class="mb-1 text-[15px] font-bold" :class="riskLevel === 'high' ? 'text-danger' : riskLevel === 'mid' ? 'text-amber' : riskLevel ? 'text-ok' : 'text-ink-3'">
                {{ levelText }}
              </div>
              <p class="mb-0 text-[13px] leading-relaxed text-ink-2">{{ levelAdvice }}</p>
            </div>
          </div>

          <p class="mb-2.5 mt-3 text-xs text-ink-3">
            分数只用于排序提示，不是法律判断：一条「高」风险就值得你停下来问清楚。
          </p>
          <p v-if="result" class="mb-3 text-[13px] text-ink-2">
            <b>{{ result.sentenceCount }} 句话命中，共 {{ result.ruleCount }} 条规则</b>（一句可能同时踩中多条；耗时 {{ result.elapsedMs }} ms）
          </p>

          <!-- 按坑型分组：纯 CSS 条形，宽度相对最大命中数归一 -->
          <div v-if="typeBreakdown.length" class="mb-3 rounded-[10px] border border-line bg-[#FBFCFE] p-3">
            <p class="mb-2 text-xs font-bold text-ink-2">命中的坑型分布</p>
            <div class="space-y-1.5">
              <div v-for="row in typeBreakdown" :key="row.type" class="flex items-center gap-2">
                <span class="w-[62px] flex-none text-[12px] text-ink-2">{{ row.type }}</span>
                <span class="h-[7px] flex-1 overflow-hidden rounded-full bg-[#EDF1F6]">
                  <span class="block h-full rounded-full bg-brand-2 transition-[width] duration-700 ease-out" :style="{ width: row.width + '%' }" />
                </span>
                <span class="w-[30px] flex-none text-right text-[12px] tabular-nums text-ink-3">{{ row.count }}</span>
              </div>
            </div>
          </div>

          <div class="flex max-h-[520px] flex-col gap-3 overflow-auto pr-1">
            <div v-if="scanned && result && !result.hits.length" class="rounded-lg border border-[#CDE6D8] bg-ok-soft px-4 py-6 text-center text-[13px] text-ok">
              未命中任何规则。<br>这并不等于合同一定安全，建议把条款通读一遍，重点看押金、违约金、社保三项。
            </div>
            <div v-else-if="!scanned" class="px-2.5 py-14 text-center text-[13px] text-ink-3">
              扫描结果会显示在这里。<br>粘贴合同文本后点「开始扫描」。
            </div>

            <article
              v-for="(hit, i) in result?.hits || []"
              :key="i"
              class="rounded-[10px] border border-line bg-white px-3.5 py-3 transition hover:shadow-sm"
              :class="hit.level === '高' ? 'border-l-4 border-l-danger' : hit.level === '中' ? 'border-l-4 border-l-[#D08C21]' : 'border-l-4 border-l-brand-2'"
            >
              <div class="mb-1.5 flex flex-wrap items-center gap-2">
                <RuleBadge :level="hit.level" />
                <span class="text-xs text-ink-3">第 {{ i + 1 }} 句 · 命中 {{ hit.rules.length }} 条</span>
              </div>
              <p class="mb-1.5 rounded-[7px] border border-dashed border-[#DDE5EE] bg-[#F7F9FC] px-2.5 py-1.5 text-[13px] break-words">
                {{ hit.sentence }}
              </p>
              <ul class="mb-0 list-none space-y-1 p-0">
                <li v-for="r in hit.rules" :key="r.id">
                  <NuxtLink :to="'/rules/' + r.id" class="text-[13px] text-brand hover:underline">
                    <b>{{ r.id }}</b> {{ r.name }}
                  </NuxtLink>
                  <span class="ml-1.5 text-xs text-ink-3">{{ r.ask }}</span>
                </li>
              </ul>
            </article>
          </div>

          <div v-if="result && result.hits.length" class="mt-4 flex flex-wrap items-center gap-2.5 border-t border-line pt-3.5">
            <button
              type="button"
              class="inline-flex h-[30px] items-center justify-center rounded-[7px] bg-brand px-2.5 text-[13px] font-bold text-white transition hover:bg-[#1A4368]"
              @click="copyList"
            >
              一键复制风险清单
            </button>
            <NuxtLink to="/history" class="text-[13px] font-medium text-brand-2 hover:underline">
              查看历史记录 →
            </NuxtLink>
          </div>
        </aside>
      </Reveal>
    </div>

    <Reveal :delay="60">
      <Card title="本页在查什么" class="mt-4">
        <p class="mt-0 text-sm text-ink-2">
          扫描引擎用的就是「规则词条」里那 {{ totalRules }} 条规则，按 8 类坑型分：命中的句子会合并显示，一句里踩中几条就列几条。规则认的是<b class="text-ink">表述</b>，不是事实。
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="c in typeCoverage"
            :key="c.type"
            class="inline-flex items-center gap-1.5 rounded-full border border-line bg-[#FBFCFE] px-2.5 py-1 text-[13px] text-ink-2"
          >
            {{ c.type }}
            <b class="text-brand">{{ c.count }}</b>
          </span>
        </div>
        <p class="mb-0 mt-2.5 text-xs text-ink-3">
          数据来源：后端 /api/rules（本机全栈）或随包快照（线上静态站），与扫描引擎同一份规则，不是另抄一遍。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="100">
      <Card title="扫描结果怎么用" class="mt-4">
        <ol class="mb-0 pl-5 text-sm text-ink-2">
          <li>先看<b class="text-ink">高</b>风险那几条：押金、培训贷、无薪试岗、违约金，这四类一旦签了，钱和自由都容易被卡住。</li>
          <li>拿着清单去谈，把「怎么改」那一句直接说给对方听，比如「这一条按《劳动合同法》第 9 条是不允许收押金的」。</li>
          <li>对方坚持不改的，先别签；带上合同去学校就业指导中心，或拨 <b class="text-ink">12333</b> 咨询。</li>
          <li>已经签了也不代表没办法：保留工资流水、打卡记录、聊天记录，必要时申请劳动仲裁。</li>
        </ol>
      </Card>
    </Reveal>
  </div>
</template>
