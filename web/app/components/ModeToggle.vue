<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

// 深色模式开关（iOS 风格滑动开关）
// SSR 安全：服务端一律渲染 light（on=false），不读 localStorage；
// onMounted 后再对齐真实选择，避免水合不一致。
const on = ref(false)
const ready = ref(false)

const STORAGE_KEY = 'xc.mode'

function apply(dark: boolean) {
  if (import.meta.client) {
    document.documentElement.dataset.mode = dark ? 'dark' : 'light'
  }
}

function persist(dark: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    /* 隐私模式下 localStorage 可能抛错，忽略即可 */
  }
}

function toggle() {
  on.value = !on.value
}

onMounted(() => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  // 只认用户的手动选择，不跟随系统：
  // head 里的内联脚本也只看 localStorage，两边口径必须一致，否则刷新会闪。
  on.value = stored === 'dark'
  ready.value = true
  apply(on.value)
})

watch(on, (v) => {
  if (!ready.value) return
  apply(v)
  persist(v)
})
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="on ? 'true' : 'false'"
    aria-label="深色模式"
    class="mode-toggle"
    :class="{ 'is-on': on }"
    @click="toggle"
  >
    <span class="mode-toggle-track" aria-hidden="true">
      <span class="mode-toggle-thumb">
        <!-- 太阳 -->
        <svg
          v-if="!on"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          class="mode-toggle-icon"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <!-- 月亮 -->
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mode-toggle-icon"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </span>
  </button>
</template>

<style scoped>
.mode-toggle {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: 999px;
  line-height: 0;
  vertical-align: middle;
}

.mode-toggle-track {
  position: relative;
  display: block;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--color-page);
  box-shadow: inset 0 1px 2px rgba(28, 37, 48, 0.08);
  transition:
    background-color var(--duration-base) var(--ease-out-x),
    border-color var(--duration-base) var(--ease-out-x);
}

.mode-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  color: var(--color-amber);
  box-shadow: 0 1px 2px rgba(28, 37, 48, 0.24);
  transform: translateX(0);
  transition:
    transform var(--duration-base) var(--ease-out-x),
    background-color var(--duration-base) var(--ease-out-x),
    color var(--duration-base) var(--ease-out-x);
}

.mode-toggle.is-on .mode-toggle-track {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
}

.mode-toggle.is-on .mode-toggle-thumb {
  transform: translateX(20px);
  background: var(--color-brand);
  color: #fff;
}

.mode-toggle-icon {
  width: 11px;
  height: 11px;
  display: block;
}

.mode-toggle:focus-visible {
  outline: 2px solid var(--color-brand-2);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .mode-toggle-track,
  .mode-toggle-thumb {
    transition: none;
  }
}
</style>
