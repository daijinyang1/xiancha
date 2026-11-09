<script setup lang="ts">
const router = useRouter()
const { fetchStats } = useApi()

useHead({
  title: '首页',
  meta: [
    {
      name: 'description',
      content:
        '毕业、找工作、签合同、考证、办手续，先来查一遍。现在主线是实习与劳动合同避坑：粘一份合同，扫出押金、培训贷、无薪试岗、加班无加班费这些坑。',
    },
  ],
})

const stats = ref({ rules: 63, traps: 12, certs: 6 })

onMounted(async () => {
  const s = await fetchStats()
  stats.value = { rules: s.rules, traps: s.traps, certs: s.certs }
})

const keyword = ref('')
const samples = ['押金', '违约金', '试用期', '社保', '加班费', '竞业']

function go(word?: string) {
  const w = String(word ?? keyword.value).trim()
  router.push(w ? { path: '/rules', query: { q: w } } : '/rules')
}

const entries = [
  {
    to: '/scan',
    icon: 'scan',
    title: '合同风险扫描',
    desc: '粘贴实习协议、三方协议或劳动合同原文，逐句匹配 63 条规则，命中处标红，给出风险等级、法律依据与修改建议。',
    more: '去扫描 →',
  },
  {
    to: '/traps',
    icon: 'traps',
    title: '避坑案例库',
    desc: '12 个脱敏改写过的真实套路，按押金、培训贷、社保、加班等 8 类筛选，每条都写清了「当时有哪些信号」和「后来怎么处理」。',
    more: '翻案例 →',
  },
  {
    to: '/rules',
    icon: 'rules',
    title: '规则词条',
    desc: '63 条风险规则一条一页，每条都是「学生真正会问的那句话」加一句判定、法条原文和改法，可搜可筛，每条有自己的固定网址。',
    more: '查词条 →',
  },
  {
    to: '/certs',
    icon: 'certs',
    title: '考证日历',
    desc: '教师资格证、计算机二级、四六级、普通话、初级会计、驾照：报考门槛、报名与考试窗口、费用口径，以及离最近一次考试还有多久。',
    more: '查证书 →',
  },
]

const layer2 = [
  { topic: '三方协议与档案', question: '签了三方还能反悔吗、档案放哪、报到证取消了怎么办、派遣怎么走' },
  { topic: '社保与公积金', question: '实习要不要交社保、断缴有什么影响、基数怎么算、异地能不能转' },
  { topic: '租房与押金', question: '押一付三合不合规、中介费怎么退、转租违约、退租时怎么留证' },
  { topic: '助学贷款与征信', question: '什么时候开始还、怎么还、逾期记录怎么消' },
  { topic: '求职中的骗局', question: '收费内推、虚假管培生、传销与刷单招聘、面试收费怎么识别' },
]

const layer3 = [
  { t: '不做法律咨询、不做维权代理。', d: '只提示「这里有风险」，不承诺结果、不代替律师。涉及金额较大、已经签署、或对方拒绝协商的，请走学校就业指导中心或 12333。' },
  { t: '不做社区、投稿、评论区。', d: '一旦有用户生成内容，就要审核、担责、处理投诉，这是我们扛不住的成本。' },
  { t: '不做 App、不做小程序。', d: '网页在手机上本来就能开，多一个审核流程换不来任何体验提升。' },
  { t: '不做付费墙。', d: '能查的东西就让你查，不收钱。以后如果活不下去，会先跟你说明白，而不是悄悄把话说一半。' },
]
</script>

<template>
  <div class="wrap">
    <!-- 品牌头：深蓝主色 + 红色强调 -->
    <section class="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div class="border-b-[3px] border-brand bg-white px-6 pb-6 pt-6 sm:px-10 sm:pb-8 sm:pt-9">
        <div class="mb-4 flex items-center gap-1.5">
          <span class="h-1 w-9 rounded-sm bg-brand" />
          <span class="h-1 w-9 rounded-sm bg-danger" />
          <span class="h-1 w-9 rounded-sm bg-amber" />
        </div>
        <span class="mb-3 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">
          大学生的查询站 · 遇事先查一遍
        </span>
        <h1 class="!mb-3.5 text-[30px] tracking-[0.02em] sm:text-[36px]">
          该知道的事，先<em class="not-italic text-danger">查</em>一遍。
        </h1>
        <p class="mb-5 max-w-[680px] text-[15px] text-ink-2 sm:text-base">
          毕业、找工作、签合同、考证、办手续——这些事第一次遇上，最怕的不是难，是<b>不知道该问什么</b>。这里的每一页都只干一件事：把该问的问题提前摆到你面前，把依据和出处写清楚。现在的主线是就业避坑，从实习协议和劳动合同开始。
        </p>

        <div class="max-w-[640px]">
          <div class="relative">
            <svg class="pointer-events-none absolute left-3.5 top-[15px] h-5 w-5 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            <input
              v-model="keyword"
              type="search"
              class="h-[50px] w-full rounded-xl border border-line bg-white pl-11 pr-3 text-[15px] outline-none transition focus:border-brand-2 focus:ring-[3px] focus:ring-brand-2/15"
              placeholder="搜一个词，比如：押金、违约金、试用期、竞业、社保……"
              autocomplete="off"
              aria-label="在全站内容里搜索"
              @keydown.enter.prevent="go()"
            >
          </div>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <button
              v-for="s in samples"
              :key="s"
              type="button"
              class="h-8 rounded-full border border-line bg-white px-[13px] text-[13px] text-ink-2 transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD]"
              @click="go(s)"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2.5">
          <NuxtLink
            to="/scan"
            class="inline-flex h-11 items-center justify-center rounded-[9px] bg-brand px-[22px] text-[15px] font-bold text-white no-underline transition hover:bg-[#1A4368] hover:no-underline"
          >
            粘贴合同全文，逐句扫一遍
          </NuxtLink>
          <NuxtLink
            to="/traps"
            class="inline-flex h-11 items-center justify-center rounded-[9px] border border-line bg-white px-[22px] text-[15px] text-ink-2 no-underline transition hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          >
            看看别人踩过的坑
          </NuxtLink>
        </div>
        <p class="mt-2.5 text-xs text-ink-3">
          已有 {{ stats.rules }} 条风险规则、{{ stats.traps }} 个真实案例、{{ stats.certs }} 张证书，全部免费、不用登录、不用上传。
        </p>
      </div>

      <!-- KPI 四格 -->
      <div class="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <div class="px-5 py-4 sm:px-6">
          <b class="block text-2xl leading-tight text-brand">{{ stats.rules }}</b>
          <span class="text-xs text-ink-3">条风险规则</span>
        </div>
        <div class="px-5 py-4 sm:px-6">
          <b class="block text-2xl leading-tight text-brand">{{ stats.traps }}</b>
          <span class="text-xs text-ink-3">个真实套路案例</span>
        </div>
        <div class="px-5 py-4 sm:px-6">
          <b class="block text-2xl leading-tight text-brand">{{ stats.certs }}</b>
          <span class="text-xs text-ink-3">张证书查询</span>
        </div>
        <div class="px-5 py-4 sm:px-6">
          <b class="block text-2xl leading-tight text-danger">8</b>
          <span class="text-xs text-ink-3">类坑型分类</span>
        </div>
      </div>
    </section>

    <!-- 四张入口卡 -->
    <section class="mt-7">
      <h2 class="!mb-4 text-[17px]">四件现在就能查的事</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="e in entries"
          :key="e.to"
          :to="e.to"
          class="group block rounded-xl border border-line bg-white p-5 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD8E6] hover:shadow-md hover:no-underline"
        >
          <span class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
            <EntryIcon :name="e.icon" />
          </span>
          <h3 class="!mb-1.5 !text-[17px] text-ink">{{ e.title }}</h3>
          <p class="mb-3 text-[13.5px] text-ink-2">{{ e.desc }}</p>
          <span class="text-[13px] font-bold text-brand">{{ e.more }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- 三层结构 -->
    <Card title="三层：现在能查的、排队的、不做的" class="mt-6">
      <template #head>
        <span class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2">路线</span>
      </template>
      <p class="mt-0 text-xs text-ink-3">
        先把话说清楚：这不是一个「合同扫描器」，是一个查东西的地方。合同扫描是目前唯一做完了的那一格，其余的格子我列出来，是为了让你知道这里以后会长成什么样，也是为了不骗你。
      </p>

      <h3 class="!mb-2 !mt-5 !text-base">第一层 · 现在就能查（已经能用）</h3>
      <div class="mb-2 overflow-x-auto rounded-xl border border-line">
        <table class="w-full min-w-[560px] border-collapse text-[13.5px]">
          <thead>
            <tr class="bg-[#F7FAFD] text-[12.5px] text-ink-2">
              <th class="whitespace-nowrap px-3.5 py-3 text-left font-bold">栏目</th>
              <th class="px-3.5 py-3 text-left font-bold">能回答什么</th>
              <th class="whitespace-nowrap px-3.5 py-3 text-left font-bold">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-line">
              <td class="whitespace-nowrap px-3.5 py-3 font-bold">合同风险扫描</td>
              <td class="px-3.5 py-3">逐句匹配 {{ stats.rules }} 条规则，给出风险等级、法律依据与修改建议</td>
              <td class="whitespace-nowrap px-3.5 py-3"><span class="rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok">已上线</span></td>
            </tr>
            <tr class="border-t border-line">
              <td class="whitespace-nowrap px-3.5 py-3 font-bold">避坑案例库</td>
              <td class="px-3.5 py-3">{{ stats.traps }} 个脱敏案例，写清当时的信号与后来的处理</td>
              <td class="whitespace-nowrap px-3.5 py-3"><span class="rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok">已上线</span></td>
            </tr>
            <tr class="border-t border-line">
              <td class="whitespace-nowrap px-3.5 py-3 font-bold">规则词条</td>
              <td class="px-3.5 py-3">{{ stats.rules }} 条规则一条一页，含判定、法条与改法</td>
              <td class="whitespace-nowrap px-3.5 py-3"><span class="rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok">已上线</span></td>
            </tr>
            <tr class="border-t border-line">
              <td class="whitespace-nowrap px-3.5 py-3 font-bold">考证日历</td>
              <td class="px-3.5 py-3">{{ stats.certs }} 张证书的报考门槛、报名与考试窗口、费用口径</td>
              <td class="whitespace-nowrap px-3.5 py-3"><span class="rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok">已上线</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="!mb-2 !mt-5 !text-base">第二层 · 排队中（还没做，不装的）</h3>
      <p class="mt-0 text-xs text-ink-3">
        下面这些是我认为同样值得查、但现在还没做的东西。写在首页上，是提醒自己别把「以后要做」说成「已经做了」。按顺序来，一次只加一格。
      </p>
      <div class="overflow-x-auto rounded-xl border border-line">
        <table class="w-full min-w-[560px] border-collapse text-[13.5px]">
          <thead>
            <tr class="bg-[#F7FAFD] text-[12.5px] text-ink-2">
              <th class="w-[150px] px-3.5 py-3 text-left font-bold">主题</th>
              <th class="px-3.5 py-3 text-left font-bold">要回答的问题</th>
              <th class="w-[100px] px-3.5 py-3 text-left font-bold">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in layer2" :key="row.topic" class="border-t border-line">
              <td class="px-3.5 py-3 font-bold">{{ row.topic }}</td>
              <td class="px-3.5 py-3 text-ink-2">{{ row.question }}</td>
              <td class="px-3.5 py-3"><span class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2">排队中</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mb-0 mt-3 text-xs text-ink-3">
        判断标准很简单：一个主题只有同时满足「有明确的坑型清单」「能写成可查的条目」「有公开可核的出处」三条，才会从这一层挪到上面那一层。凑不齐就继续排队，不做成半懂不懂的页面。
      </p>
    </Card>

    <Card title="第三层 · 明确不做" class="mt-4">
      <ul class="mb-0 list-none p-0">
        <li v-for="(l, i) in layer3" :key="l.t" class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
          <b class="text-ink">{{ l.t }}</b>{{ l.d }}
        </li>
      </ul>
    </Card>

    <Card title="合同扫描这一格怎么用" class="mt-4">
      <template #head>
        <span class="rounded-full border border-line bg-brand-soft px-[7px] text-[11px] font-bold leading-[18px] text-brand">核心功能</span>
      </template>
      <ol class="mb-0 pl-5 text-sm text-ink-2">
        <li><b class="text-ink">先脱敏</b>：把身份证号、手机号、统一社会信用代码、银行卡号替换成 ●●●●，并告诉你隐藏了几处。</li>
        <li><b class="text-ink">再匹配</b>：用 {{ stats.rules }} 条规则逐条扫原文，命中的句子标红；同一句命中多条会合并成一张卡片，不重复刷屏。</li>
        <li><b class="text-ink">看解释</b>：每条风险给出「为什么有风险」「依据哪一条」「怎么改」，法条只写条号，不编造条文原文。</li>
        <li><b class="text-ink">带走它</b>：拿去和 HR 谈，或者发给学长学姐、学校就业指导老师看一眼。</li>
      </ol>
    </Card>

    <Card title="我们不说的话" class="mt-4">
      <p class="mb-2 text-sm text-ink-2">
        这里<b class="text-ink">不是律师</b>，也<b class="text-ink">不能替你判断一份合同一定违法</b>。规则库只认「常见的表述套路」，命中不等于无效，不命中也不等于安全。它的作用是把该问的问题提前摆到你面前，让你在动笔之前多问一句。
      </p>
      <p class="mb-0 text-xs text-ink-3">
        页面里写的费用与时间一律标了「以官网当期公告为准」，因为政策每年都在动，写成死日期就是把错的东西教给你。
      </p>
    </Card>
  </div>
</template>