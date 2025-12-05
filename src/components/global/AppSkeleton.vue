<template>
  <div class="skeleton" :style="{ width, height, borderRadius, '--skeleton-bg': bg, '--skeleton-shimmer': shimmer }"></div>
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '1rem' },
  borderRadius: { type: String, default: '0.5rem' },
  bg: { type: String, default: '#e2e8f0' },
  shimmer: { type: String, default: '#f8fafc' }
})
</script>

<style scoped>
.skeleton {
  background-color: var(--skeleton-bg);
  background-image: linear-gradient(
    to right,
    var(--skeleton-bg) 0%,
    var(--skeleton-shimmer) 20%,
    var(--skeleton-bg) 40%,
    var(--skeleton-bg) 100%
  );
  background-repeat: no-repeat;
  background-size: 200% 100%; 
  animation: shimmer 1.5s infinite linear;
  display: inline-block;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
