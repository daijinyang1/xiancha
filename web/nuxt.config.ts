import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// 先查 Web · Nuxt 4 + Vue 3.5 + Tailwind CSS 4
// 两套跑法共用一份代码：
//   1) 本地全栈（npm run dev）：连 Spring Boot :8080，数据走 PostgreSQL；
//   2) 线上静态（npm run generate）：后端不存在，构建时用 app/data/*.json（由 db/*.json 导出）
//      预渲染成纯静态 HTML，Cloudflare Pages 免费托管，扫描功能在浏览器里跑。
const ruleIdList: string[] = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL('./app/data/rules.json', import.meta.url)), 'utf8'),
).map((r: { id: string }) => r.id)

const PRE_RENDER_ROUTES = ['/not-found',
  '/',
  '/scan',
  '/traps',
  '/rules',
  '/certs',
  '/about',
  ...ruleIdList.map((id) => '/rules/' + id),
]

// 线上静态构建时不配 apiBase：页面直接用随包数据，不发请求、也不显示“后端未连接”。
// 注意：.env 里也写了 NUXT_PUBLIC_API_BASE（给本地 dev 用），而 Nuxt 在 generate 时同样会加载 .env，
// 所以这里必须按 NODE_ENV 硬挡住 —— 否则静态产物里会烙进一条「后端未连接」的黄条。
const isDev = process.env.NODE_ENV === 'development'
if (!isDev) delete process.env.NUXT_PUBLIC_API_BASE // 静态构建不认这条，否则会被 runtimeConfig 的 env 覆盖顶回 8080
const apiBase = isDev ? process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8080/api' : ''

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: true,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: false,
      failOnError: true,
      routes: PRE_RENDER_ROUTES,
      // 默认会输出 scan/index.html，Cloudflare Pages 就会把 /scan 308 跳到 /scan/，
      // 对外链接凭空多一跳、还多出结尾斜杠。改成 scan.html 扁平输出，Pages 对 /scan 直接 200。
      autoSubfolderIndex: false,
    },
  },
  runtimeConfig: {
    public: {
      apiBase,
      buildTime: new Date().toISOString().slice(0, 10),
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
