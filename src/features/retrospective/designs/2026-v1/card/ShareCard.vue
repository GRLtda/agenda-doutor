<script setup>
// Modo cartão (D1): sem barras e botões, logo e nome no topo, selo no rodapé, animação no quadro final.
import Story from '../Story.vue'

defineProps({
  story: { type: Object, required: true },
  theme: { type: String, required: true },
  clinicName: { type: String, default: '' },
  logoUrl: { type: String, default: null },
  year: { type: Number, required: true },
  copyVariant: { type: Number, default: 1 },
  inProgressMonth: { type: Number, default: null },
})
</script>

<template>
  <Story
    :story="story"
    :theme="theme"
    mode="card"
    :clinic-name="clinicName"
    :logo-url="logoUrl"
    :year="year"
    :copy-variant="copyVariant"
    :in-progress-month="inProgressMonth"
    :animate="false"
  />
</template>
