// web/app/composables/useSeo.ts —— 全站 SEO / 社交分享的唯一出口。
//
// 为什么不用 useRequestURL() 拼绝对地址：
//   Nuxt 静态预渲染时，nitro 的内部 localFetch 走 node-mock-http，mock 请求的
//   host 缺省是 "localhost"、protocol 不是 https —— 预渲染期 useRequestURL() 给出的是
//   http://localhost/rules/R01 这种东西，直接拼进 canonical 会让 63 个词条页全部指错。
//   所以统一用 SITE_ORIGIN + route.path，域名与 tools/stage-site.mjs 的 ORIGIN 保持一致。
//
// 用法（页面里一行）：
//   useSeo({ title: '规则词条', description: '...' })
//   useSeo({ title: computed(() => rule.value?.ask ?? '规则词条'), jsonLd: computed(() => ({...})) })

export const SITE_ORIGIN = 'https://xiancha.pages.dev'
export const SITE_NAME = '先查'
export const SITE_TAGLINE = '大学生的查询站 · 遇事先查一遍'
export const DEFAULT_DESCRIPTION =
  '毕业、找工作、签合同、考证、办手续，先来查一遍。「先查」是大学生的查询站：63 条合同避坑规则词条、12 个真实踩坑案例、6 张证书的报考日历。'
export const OG_IMAGE = SITE_ORIGIN + '/og-cover.png'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

const THEME_LIGHT = '#F4F6F9'
const THEME_DARK = '#12161c'

/** route.path → 干净绝对地址（去掉尾部 /index.html、折叠重复斜杠、去掉尾部斜杠） */
export function absoluteUrl(path: string): string {
  let p = String(path || '/').split('?')[0].split('#')[0]
  p = p.replace(/\/index\.html$/i, '/')
  p = p.replace(/\/{2,}/g, '/')
  if (p.length > 1) p = p.replace(/\/$/, '')
  if (!p.startsWith('/')) p = '/' + p
  return SITE_ORIGIN + (p === '/' ? '/' : p)
}

/** 摘要裁到 n 字，且不在半个词上截断 */
export function clip(text: string, n = 110): string {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

type MaybeRef<T> = T | { value: T } | (() => T) | { __v_isRef: true; value: T }

function unrefish<T>(v: MaybeRef<T> | undefined): T | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'function') return (v as () => T)()
  if (v && typeof v === 'object' && '__v_isRef' in (v as object)) return (v as { value: T }).value
  return v as T
}

export interface SeoOptions {
  /** 页面标题（会由 app.vue 的 titleTemplate 追加「 · 先查」） */
  title?: MaybeRef<string>
  /** 页面描述；不给就用全站默认 */
  description?: MaybeRef<string>
  /** 覆盖 og:type，默认 website */
  type?: MaybeRef<string>
  /** 覆盖分享图，默认 og-cover.png */
  image?: MaybeRef<string>
  /** 覆盖 canonical 的路径（默认取当前 route.path） */
  path?: MaybeRef<string>
  /** 是否 noindex（404 页用） */
  noindex?: boolean
  /** JSON-LD：对象或对象数组，自动包 <script type="application/ld+json"> */
  jsonLd?: MaybeRef<Record<string, unknown> | Record<string, unknown>[] | null | undefined>
}

/**
 * 一次装好：title / description / og:* / twitter:* / canonical / manifest /
 * apple-touch-icon / 双 theme-color / JSON-LD。
 *
 * 注意：这里**不重复**声明 manifest / apple-touch-icon —— 它们由 app.vue 统一挂一次，
 * 每页再挂会让 unhead 生成重复 link 标签。
 */
export function useSeo(opts: SeoOptions = {}) {
  const route = useRoute()

  const title = computed(() => String(unrefish(opts.title) ?? SITE_NAME))
  const description = computed(
    () => String(unrefish(opts.description) ?? DEFAULT_DESCRIPTION),
  )
  const url = computed(() => absoluteUrl(String(unrefish(opts.path) ?? route.path)))
  const type = computed(() => String(unrefish(opts.type) ?? 'website'))
  const image = computed(() => {
    const raw = unrefish(opts.image)
    if (!raw) return OG_IMAGE
    const s = String(raw)
    return /^https?:\/\//i.test(s) ? s : SITE_ORIGIN + (s.startsWith('/') ? s : '/' + s)
  })
  // og:title 带站名，微信/QQ 群里不点开也知道是谁；<title> 仍由 titleTemplate 拼
  const ogTitle = computed(() => (title.value.includes(SITE_NAME) ? title.value : title.value + ' · ' + SITE_NAME))

  const jsonLdScripts = computed(() => {
    const raw = unrefish(opts.jsonLd)
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : [raw]
    return items
      .filter(Boolean)
      .map((obj) => ({
        type: 'application/ld+json',
        // unhead 认 innerHTML 这个键名（等价于旧的 children），会原样写进 <script> 内文
        innerHTML: JSON.stringify(obj),
      }))
  })

  useHead({
    title,
    meta: computed(() => {
      const list: Record<string, string>[] = [
        { name: 'description', content: description.value },

        { property: 'og:type', content: type.value },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:title', content: ogTitle.value },
        { property: 'og:description', content: description.value },
        { property: 'og:url', content: url.value },
        { property: 'og:image', content: image.value },
        { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
        { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
        { property: 'og:image:alt', content: '先查 · 该知道的事，先查一遍。' },
        { property: 'og:locale', content: 'zh_CN' },

        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: ogTitle.value },
        { name: 'twitter:description', content: description.value },
        { name: 'twitter:image', content: image.value },
        { name: 'twitter:image:alt', content: '先查 · 该知道的事，先查一遍。' },
      ]
      const ogImageType = /\.jpe?g$/i.test(image.value) ? 'image/jpeg' : 'image/png'
      list.push({ property: 'og:image:type', content: ogImageType })
      if (opts.noindex) list.push({ name: 'robots', content: 'noindex, follow' })
      return list
    }),
    link: computed(() => [{ rel: 'canonical', href: url.value }]),
    script: jsonLdScripts,
  })
}

/* ---------- 结构化数据构造器：页面只调这几个，避免各写一遍 @context ---------- */

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: '先查 · 大学生遇事先查一遍',
    url: SITE_ORIGIN + '/',
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: SITE_ORIGIN + '/rules?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN + '/',
    logo: { '@type': 'ImageObject', url: SITE_ORIGIN + '/icon-512.png', width: 512, height: 512 },
    description: '由两个人做的大学生查询站，所有内容都可核、有出处。',
    knowsAbout: ['实习与劳动合同', '押金与培训贷', '考证日历', '大学生就业避坑'],
  }
}

/** /rules/[id]：一条规则天然就是「问题 + 判定 + 法条 + 改法」，用 FAQPage 最贴 */
export function faqJsonLd(rule: { id?: string; ask: string; verdict: string; law?: string; fix?: string }, url: string) {
  const answerParts = [rule.verdict, rule.law, rule.fix].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: rule.ask,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answerParts.join('\n\n'),
        },
      },
    ],
    url,
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_ORIGIN + '/' },
  }
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  }
}

export function itemListJsonLd(items: { name: string; description?: string; url?: string }[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.description ? { description: it.description } : {}),
      ...(it.url ? { url: it.url } : {}),
    })),
    inLanguage: 'zh-CN',
  }
}
