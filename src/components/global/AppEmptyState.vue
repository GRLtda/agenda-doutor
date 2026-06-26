<template>
  <div class="state-cell">
    <div class="empty-state-content">
      <div class="empty-state-icon-bg">
        <component :is="icon" v-if="icon" :size="24" />
      </div>
      <h3 class="empty-state-title">{{ title }}</h3>
      <p class="empty-state-text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, required: true },
  icon: { type: [Object, Function], required: true }
})
</script>

<style scoped>
.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 380px;
  margin: 0 auto;
}
.empty-state-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal, #2563eb);
}
.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
.empty-state-text {
  color: var(--cinza-texto, #6b7280);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  text-align: center;
}
.state-cell {
  padding: 4rem;
  text-align: center;
  color: var(--cinza-texto, #6b7280);
  font-size: 1rem;
}
</style>
