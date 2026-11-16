<script setup>
// Selo "Agenda Doutor" nas três versões de tema.
import sealDark from './seal-dark.svg'
import sealLight from './seal-light.svg'

defineProps({ theme: { type: String, default: 'dark' } })
</script>

<template>
  <img v-if="theme === 'dark'" :src="sealDark" alt="Agenda Doutor" class="seal" />
  <img v-else-if="theme === 'light'" :src="sealLight" alt="Agenda Doutor" class="seal" />
  <span v-else class="pill"><img :src="sealLight" alt="Agenda Doutor" class="seal small" /></span>
</template>

<style scoped>
.seal { height: 30px; width: auto; display: block; }
.seal.small { height: 26px; }
.pill { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; background: #FFFFFF; }
</style>
