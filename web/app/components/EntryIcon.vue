<script setup lang="ts">
defineProps<{ name: 'scan' | 'traps' | 'rules' | 'certs' | string }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-[22px] w-[22px]" aria-hidden="true">
    <template v-if="name === 'scan'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </template>
    <template v-else-if="name === 'traps'">
      <path d="M12 3 2.5 20h19L12 3z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </template>
    <template v-else-if="name === 'rules'">
      <path d="M4 4h11l5 5v11H4z" />
      <polyline points="15 4 15 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </template>
    <template v-else>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </template>
  </svg>
</template>
