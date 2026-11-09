<script setup lang="ts">
useHead({
  titleTemplate: (t) => (t ? t + ' · 先查' : '先查 · 大学生遇事先查一遍'),
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Header />
    <main class="flex-1 py-8">
      <NuxtPage />
    </main>
    <Footer />
    <Toast />
  </div>
</template>
