<script setup lang="ts">
// 这里只取两个常量；DEFAULT_DESCRIPTION 由 useSeo() 兜底，页面级 description 一律走 useSeo
import { SITE_ORIGIN, SITE_NAME } from '~/composables/useSeo'

// 全站共享的「不需要每页重写」的那部分头信息。
// 每页差异化的 og:title / og:url / canonical / JSON-LD 由页面的 useSeo() 负责写入，
// 这里只保留：titleTemplate、manifest、apple-touch-icon、双 theme-color、默认 og 兜底。
useHead({
  // 已经是完整口号的标题（首页）原样保留，其余页面统一追加「 · 先查」
  titleTemplate: (t) =>
    !t ? SITE_NAME + ' · 大学生遇事先查一遍' : t.includes(SITE_NAME) ? t : t + ' · ' + SITE_NAME,
  link: [
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  ],
  meta: [
    // 两个都写，浏览器按 prefers-color-scheme 自己挑；不支持的浏览器取第一条
    { name: 'theme-color', content: '#F4F6F9', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#12161c', media: '(prefers-color-scheme: dark)' },
    // 兜底：万一某个页面没调 useSeo()，社交卡片也不至于空着
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'zh_CN' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: SITE_ORIGIN + '/og-cover.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  // 防 FOUC：必须在 <head> 里同步执行，CSS 解析前就把 data-mode 设好。
  // plugin 跑在 hydration 之后，会闪白，所以用内联脚本。
  script: [
    {
      tagPosition: 'head',
      innerHTML: `(function(){try{var m=localStorage.getItem('xc.mode');if(m==='dark')document.documentElement.dataset.mode='dark'}catch(e){}})()`,
    },
  ],
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <ScrollProgress />
    <Header />
    <main class="flex-1 py-8">
      <NuxtPage />
    </main>
    <Footer />
    <Toast />
  </div>
</template>
