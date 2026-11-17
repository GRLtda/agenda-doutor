<script setup>
// A1: banner da retrospectiva no dashboard. Só para o dono e só se houver payload com design registrado.
// Não conhece o visual: delega ao Banner do design do ano (designs/<designKey>/).
// "Agora não" ou ver os stories esconde o banner e passa o acesso para o atalho da barra superior.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRetrospectiveStore } from '../stores/retrospective.store'
import { useRetrospectiveOpener } from '../composables/useRetrospectiveOpener'
import { getDesign } from '../designs'

const auth = useAuthStore()
const store = useRetrospectiveStore()
const { open } = useRetrospectiveOpener()

const isOwner = computed(() => auth.user?.role === 'owner')
const design = computed(() => getDesign(store.summary?.designKey))
const visible = computed(() => isOwner.value && store.available && design.value && !store.bannerHidden)

</script>

<template>
  <div v-if="visible" class="retrospective-banner-slot">
    <component :is="design.Banner" :retrospective="store.summary" @open="open" @dismiss="store.dismissBanner" />
  </div>
</template>

<style scoped>
.retrospective-banner-slot { margin-bottom: 1.5rem; }
</style>
