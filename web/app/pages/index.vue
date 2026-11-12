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

// 静态预渲染时直接写入 HTML 的兜底数字（与 db/*.json 一致）
const stats = ref({ rules: 63, traps: 12, certs: 6, types: 8 })

// 构建期（nuxt generate）在服务端就把统计数写进 HTML，纯静态站不需要后端。
// 必须用 await useAsyncData —— 禁止 onMounted 取数，否则预渲染拿不到数据。
const { data: statsData } = await useAsyncData('xc-stats', () => fetchStats())
if (statsData.value) {
  stats.value = {
    rules: statsData.value.rules,
    traps: statsData.value.traps,
    certs: statsData.value.certs,
    // 8 类是坑型维度（byType 的键数），不是风险等级
    types: Object.keys(statsData.value.byType || {}).length || 8,
  }
}

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
    tag: '核心',
    desc: '粘贴实习协议、三方协议或劳动合同原文，逐句匹配 63 条规则，命中处标红，给出风险等级、法律依据与修改建议。',
    more: '去扫描 →',
  },
  {
    to: '/traps',
    icon: 'traps',
    title: '避坑案例库',
    tag: '案例',
    desc: '12 个脱敏改写过的真实套路，按押金、培训贷、社保、加班等 8 类筛选，每条都写清了「当时有哪些信号」和「后来怎么处理」。',
    more: '翻案例 →',
  },
  {
    to: '/rules',
    icon: 'rules',
    title: '规则词条',
    tag: '词条',
    desc: '63 条风险规则一条一页，每条都是「学生真正会问的那句话」加一句判定、法条原文和改法，可搜可筛，每条有自己的固定网址。',
    more: '查词条 →',
  },
  {
    to: '/certs',
    icon: 'certs',
    title: '考证日历',
    tag: '日历',
    desc: '教师资格证、计算机二级、四六级、普通话、初级会计、驾照：报考门槛、报名与考试窗口、费用口径，以及离最近一次考试还有多久。',
    more: '查证书 →',
  },
  {
    to: '/history',
    icon: 'history',
    title: '扫描历史',
    tag: '记录',
    desc: '本机最近扫过的合同都留在这儿：命中几句、踩中几条规则、风险分多少。回头对比不同版本，看改过之后是不是真的变干净了。',
    more: '看历史 →',
  },
]

// 三步怎么用
const steps = [
  {
    n: '01',
    icon: 'scan',
    title: '粘一份原文',
    desc: '把实习协议、三方协议或劳动合同全文贴进来。身份证号、手机号、银行卡号会先在浏览器里打码，原文不上传、不落库。',
  },
  {
    n: '02',
    icon: 'shield',
    title: '逐句扫一遍',
    desc: '按句切分后用 63 条规则逐条匹配，命中的句子标红。同一句话踩中多条规则时合并成一张卡片，不重复刷屏。',
  },
  {
    n: '03',
    icon: 'spark',
    title: '拿着去谈',
    desc: '每条风险都写清「为什么有风险」「依据哪一条」「怎么改」。拿去和 HR 谈，或者发给学长学姐、学校就业指导老师再看一眼。',
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
    <!-- ============ Hero ============ -->
    <section class="hero-surface relative overflow-hidden rounded-xl border border-line shadow-sm">
      <!-- 纹理装饰层：绝对定位铺满 Hero，pointer-events:none、z-index 0，内容一律 z-1 压在上面 -->
      <div class="tex-layer tex-dot tex-fade" aria-hidden="true" />
      <div class="relative z-[1] border-b-[3px] border-brand px-6 pb-7 pt-7 sm:px-10 sm:pb-9 sm:pt-10">
        <Reveal :delay="0">
          <div class="mb-4 flex items-center gap-1.5">
            <span class="h-1 w-9 rounded-sm bg-brand" />
            <span class="h-1 w-9 rounded-sm bg-danger" />
            <span class="h-1 w-9 rounded-sm bg-amber" />
          </div>
          <span class="mb-3 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">
            大学生的查询站 · 遇事先查一遍
          </span>
        </Reveal>

        <Reveal :delay="90">
          <h1 class="!mb-3.5 text-[30px] tracking-[0.02em] sm:text-[38px]">
            该知道的事，先<em class="not-italic text-danger">查</em>一遍。
          </h1>
        </Reveal>

        <Reveal :delay="180">
          <p class="mb-6 max-w-[34em] text-[15px] text-ink-2 sm:text-base">
            毕业、找工作、签合同、考证、办手续——这些事第一次遇上，最怕的不是难，是<b class="text-ink">不知道该问什么</b>。这里的每一页都只干一件事：把该问的问题提前摆到你面前，把依据和出处写清楚。现在的主线是就业避坑，从实习协议和劳动合同开始。
          </p>
        </Reveal>

        <Reveal :delay="270">
          <div class="max-w-[640px]">
            <div class="relative">
              <svg class="pointer-events-none absolute left-3.5 top-[15px] h-5 w-5 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <line x1="15.5" y1="15.5" x2="21" y2="21" />
              </svg>
              <input
                v-model="keyword"
                type="search"
                class="h-[50px] w-full rounded-[9px] border border-line bg-white pl-11 pr-3 text-[15px] outline-none transition focus:border-brand-2 focus:ring-[3px] focus:ring-brand-2/15"
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
                class="chip-x h-8 rounded-full border border-line bg-white px-[13px] text-[13px] text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:text-brand"
                @click="go(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal :delay="360">
          <div class="mt-6 flex flex-wrap items-center gap-2.5">
            <NuxtLink
              to="/scan"
              class="btn-x h-11 bg-brand px-[22px] text-[15px] font-bold text-white no-underline shadow-sm hover:bg-[#1A4368] hover:no-underline hover:shadow-md"
            >
              粘贴合同全文，逐句扫一遍
            </NuxtLink>
            <NuxtLink
              to="/traps"
              class="btn-x h-11 border border-line bg-white px-[22px] text-[15px] text-ink-2 no-underline hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:text-ink hover:no-underline"
            >
              看看别人踩过的坑
            </NuxtLink>
          </div>
          <p class="mt-2.5 text-xs text-ink-3">
            已有 {{ stats.rules }} 条风险规则、{{ stats.traps }} 个真实案例、{{ stats.certs }} 张证书，全部免费、不用登录、不用上传。
          </p>
        </Reveal>
      </div>

      <!-- KPI 四格：数字滚动 -->
      <div class="relative z-[1] grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <Reveal :delay="0" class="px-5 py-4 sm:px-6">
          <b class="block text-[26px] leading-tight text-brand"><CountUp :to="stats.rules" /></b>
          <span class="text-xs text-ink-3">条风险规则</span>
        </Reveal>
        <Reveal :delay="80" class="px-5 py-4 sm:px-6">
          <b class="block text-[26px] leading-tight text-brand"><CountUp :to="stats.traps" /></b>
          <span class="text-xs text-ink-3">个真实套路案例</span>
        </Reveal>
        <Reveal :delay="160" class="px-5 py-4 sm:px-6">
          <b class="block text-[26px] leading-tight text-brand"><CountUp :to="stats.certs" /></b>
          <span class="text-xs text-ink-3">张证书查询</span>
        </Reveal>
        <Reveal :delay="240" class="px-5 py-4 sm:px-6">
          <b class="block text-[26px] leading-tight text-danger"><CountUp :to="stats.types" /></b>
          <span class="text-xs text-ink-3">类坑型分类</span>
        </Reveal>
      </div>
    </section>

    <!-- ============ 功能入口：5 张卡 ============ -->
    <section class="mt-8">
      <Reveal>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 class="!mb-0 text-[17px]">五件现在就能查的事</h2>
          <span class="text-xs text-ink-3">点进去就能用，不用注册</span>
        </div>
      </Reveal>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal
          v-for="(e, i) in entries"
          :key="e.to"
          soft
          :delay="i * 70"
          class="h-full"
        >
          <NuxtLink
            :to="e.to"
            class="entry-card group relative flex h-full flex-col rounded-xl border border-line bg-white p-5 no-underline shadow-sm hover:border-[#BFD2E5] hover:shadow-lg hover:no-underline"
          >
            <!-- hover 才亮的 brand 渐变叠层：一层绝对定位 span，零图片，走 --duration-base -->
            <span
              class="entry-veil pointer-events-none absolute inset-0 rounded-xl"
              aria-hidden="true"
            />
            <div class="relative z-[1] flex h-full flex-col">
              <div class="mb-3.5 flex items-center justify-between gap-2">
                <span class="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
                  <span class="entry-glyph flex items-center justify-center"><EntryIcon :name="e.icon" /></span>
                </span>
                <span class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2">{{ e.tag }}</span>
              </div>
              <h3 class="!mb-1.5 !text-[17px] text-ink">{{ e.title }}</h3>
              <p class="mb-3 flex-1 text-[13.5px] text-ink-2">{{ e.desc }}</p>
              <span class="text-[13px] font-bold text-brand">{{ e.more }}</span>
            </div>
          </NuxtLink>
        </Reveal>
      </div>
    </section>

    <!-- ============ 三步怎么用：时间线 ============ -->
    <section class="mt-9">
      <Reveal>
        <h2 class="!mb-4 text-[17px]">三步：粘进去、扫一遍、拿去谈</h2>
      </Reveal>

      <div class="rounded-xl border border-line bg-white p-6 shadow-sm">
        <ol class="relative m-0 list-none p-0">
          <span class="timeline-rail pointer-events-none absolute left-[19px] top-3 bottom-3 w-[2px] rounded-full sm:left-[23px]" aria-hidden="true" />
          <Reveal
            v-for="(s, i) in steps"
            :key="s.n"
            as="li"
            :delay="i * 130"
            class="relative flex gap-4 pb-6 last:pb-0"
          >
            <span class="anim-pulse-dot z-[1] flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-brand-soft bg-white text-brand sm:h-12 sm:w-12">
              <EntryIcon :name="s.icon" />
            </span>
            <div class="pt-0.5">
              <div class="mb-1 flex flex-wrap items-baseline gap-2">
                <span class="font-mono text-[11px] font-bold tracking-widest text-ink-3">{{ s.n }}</span>
                <h3 class="!mb-0 !text-[15.5px] text-ink">{{ s.title }}</h3>
              </div>
              <p class="mb-0 text-[13.5px] text-ink-2">{{ s.desc }}</p>
            </div>
          </Reveal>
        </ol>
      </div>
    </section>

    <!-- ============ 三层结构 ============ -->
    <Card title="三层：现在能查的、排队的、不做的" class="mt-6">
      <template #head>
        <span class="rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2">路线</span>
      </template>
      <p class="mt-0 text-xs text-ink-3">
        先把话说清楚：这不是一个「合同扫描器」，是一个查东西的地方。合同扫描是目前唯一做完了的那一格，其余的格子我列出来，是为了让你知道这里以后会长成什么样，也是为了不骗你。
      </p>

      <h3 class="!mb-2 !mt-5 !text-base">第一层 · 现在就能查（已经能用）</h3>
      <div class="mb-2 overflow-x-auto rounded-xl border border-line">
        <table class="table-x min-w-[420px]">
          <caption>第一层：现在就能查的四格</caption>
          <thead>
            <tr>
              <th class="whitespace-nowrap">栏目</th>
              <th>能回答什么</th>
              <th class="whitespace-nowrap">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="whitespace-nowrap font-bold">合同风险扫描</td>
              <td>逐句匹配 {{ stats.rules }} 条规则，给出风险等级、法律依据与修改建议</td>
              <td class="whitespace-nowrap"><span class="inline-flex items-center rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok"><span class="dot-status" aria-hidden="true" />已上线</span></td>
            </tr>
            <tr>
              <td class="whitespace-nowrap font-bold">避坑案例库</td>
              <td>{{ stats.traps }} 个脱敏案例，写清当时的信号与后来的处理</td>
              <td class="whitespace-nowrap"><span class="inline-flex items-center rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok"><span class="dot-status" aria-hidden="true" />已上线</span></td>
            </tr>
            <tr>
              <td class="whitespace-nowrap font-bold">规则词条</td>
              <td>{{ stats.rules }} 条规则一条一页，含判定、法条与改法</td>
              <td class="whitespace-nowrap"><span class="inline-flex items-center rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok"><span class="dot-status" aria-hidden="true" />已上线</span></td>
            </tr>
            <tr>
              <td class="whitespace-nowrap font-bold">考证日历</td>
              <td>{{ stats.certs }} 张证书的报考门槛、报名与考试窗口、费用口径</td>
              <td class="whitespace-nowrap"><span class="inline-flex items-center rounded-full bg-ok-soft px-[7px] text-[11px] font-bold leading-[18px] text-ok"><span class="dot-status" aria-hidden="true" />已上线</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="!mb-2 !mt-5 !text-base">第二层 · 排队中（还没做，不装的）</h3>
      <p class="mt-0 text-xs text-ink-3">
        下面这些是我认为同样值得查、但现在还没做的东西。写在首页上，是提醒自己别把「以后要做」说成「已经做了」。按顺序来，一次只加一格。
      </p>
      <div class="overflow-x-auto rounded-xl border border-line">
        <table class="table-x min-w-[420px]">
          <caption>第二层：排队中的主题，按顺序一次加一格</caption>
          <thead>
            <tr>
              <th class="w-[150px] whitespace-nowrap">主题</th>
              <th>要回答的问题</th>
              <th class="w-[100px] whitespace-nowrap">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in layer2" :key="row.topic">
              <td class="font-bold">{{ row.topic }}</td>
              <td class="text-ink-2">{{ row.question }}</td>
              <td><span class="inline-flex items-center rounded-full border border-line bg-[#EFF2F6] px-[7px] text-[11px] font-bold leading-[18px] text-ink-2"><span class="dot-status is-hollow" aria-hidden="true" />排队中</span></td>
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
        <li v-for="l in layer3" :key="l.t" class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
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
