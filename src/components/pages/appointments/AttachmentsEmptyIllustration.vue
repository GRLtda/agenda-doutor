<script setup>
import illustration from '@/assets/illustrations/attachments-empty.svg?raw'
</script>

<template>
  <div class="attachments-illustration" aria-hidden="true" v-html="illustration"></div>
</template>

<style scoped>
.attachments-illustration {
  width: min(240px, 100%);
  margin: 0 auto;
}
.attachments-illustration :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
