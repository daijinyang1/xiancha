<script setup lang="ts">
const { message, visible } = useToast()
</script>

<template>
  <div
    class="toast-x pointer-events-none fixed bottom-7 left-1/2 z-[99] max-w-[90vw] -translate-x-1/2 rounded-[9px] bg-ink px-[18px] py-2.5 text-center text-[13.5px] text-white shadow-lg"
    :class="visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>
