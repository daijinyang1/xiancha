<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <section class="rounded-xl border border-line bg-white p-6 shadow-sm">
    <header v-if="title || $slots.head" class="mb-3.5 flex flex-wrap items-center justify-between gap-3">
      <h2 v-if="title" class="!mb-0 !text-[17px]">{{ title }}</h2>
      <slot name="head" />
    </header>
    <slot />
  </section>
</template>
