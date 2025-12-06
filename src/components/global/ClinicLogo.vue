<template>
  <div class="clinic-logo" :style="{ width: size, height: 'auto' }">
    <img src="@/assets/logo_dark.svg" alt="Logo Clínica" />
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: '150px'
  }
});
</script>

<style scoped>
.clinic-logo {
  display: flex;
  align-items: center;
  justify-content: center;
}

.clinic-logo img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
