<script setup>
// Marca do Agenda Doutor no rodapé dos stories e cartões.
// - Temas escuro e claro: só o símbolo (brand.svg), sem a escrita.
// - Tema azul (resumo, o último story): logo completo com a escrita, todo branco e sem fundo,
//   porque o símbolo azul sumiria no fundo azul.
import brand from './brand.svg'
import logoWhite from './logo-white.svg'

defineProps({ theme: { type: String, default: 'dark' } })
</script>

<template>
  <img v-if="theme === 'blue'" :src="logoWhite" alt="Agenda Doutor" class="logo-full" />
  <img v-else :src="brand" alt="Agenda Doutor" class="mark" />
</template>

<style scoped>
.mark { height: 30px; width: auto; display: block; }
.logo-full { height: 30px; width: auto; display: block; }
</style>
