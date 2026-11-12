<script setup lang="ts">
// 线性图标：24x24，stroke-width 2，currentColor。
// 支持 scan / traps / rules / certs / history / stats / home / shield / spark；
// 未知名字一律回落到日历图标（保持对旧调用的向后兼容）。
withDefaults(
  defineProps<{
    name?: string
  }>(),
  { name: 'certs' },
)
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-[22px] w-[22px]"
    aria-hidden="true"
  >
    <!-- 合同扫描：放大镜 -->
    <template v-if="name === 'scan'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </template>

    <!-- 避坑库：警示三角 -->
    <template v-else-if="name === 'traps'">
      <path d="M12 3 2.5 20h19L12 3z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </template>

    <!-- 规则词条：带折角的文档 -->
    <template v-else-if="name === 'rules'">
      <path d="M4 4h11l5 5v11H4z" />
      <polyline points="15 4 15 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </template>

    <!-- 考证日历：日历 -->
    <template v-else-if="name === 'certs'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </template>

    <!-- 扫描历史：表盘 + 倒退箭头（回看） -->
    <template v-else-if="name === 'history'">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <polyline points="3 4 3 8.5 7.5 8.5" />
      <polyline points="12 7.5 12 12 15.2 13.8" />
    </template>

    <!-- 数据总览：柱状图 -->
    <template v-else-if="name === 'stats'">
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5.5" y="12" width="3.4" height="8" rx="0.8" />
      <rect x="10.8" y="7.5" width="3.4" height="12.5" rx="0.8" />
      <rect x="16.1" y="10" width="3.4" height="10" rx="0.8" />
    </template>

    <!-- 首页：房子 -->
    <template v-else-if="name === 'home'">
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.8V20h13V9.8" />
      <path d="M10 20v-5.2h4V20" />
    </template>

    <!-- 安全/可信：盾牌 + 勾 -->
    <template v-else-if="name === 'shield'">
      <path d="M12 3l7 2.6v6.1c0 4.3-2.9 7.6-7 9.3-4.1-1.7-7-5-7-9.3V5.6L12 3z" />
      <polyline points="8.8 12 11.2 14.4 15.4 9.8" />
    </template>

    <!-- 亮点/新功能：四角星 -->
    <template v-else-if="name === 'spark'">
      <path d="M12 3.2l1.9 5.1 5.1 1.9-5.1 1.9L12 17.2l-1.9-5.1L5 10.2l5.1-1.9L12 3.2z" />
      <line x1="18.6" y1="16.4" x2="18.6" y2="21" />
      <line x1="16.3" y1="18.7" x2="20.9" y2="18.7" />
    </template>

    <!-- 兜底：日历（旧行为） -->
    <template v-else>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </template>
  </svg>
</template>
