<script setup>
// Atalho da retrospectiva na barra superior, ao lado das notificações.
// Aparece quando o banner sai: depois de "Agora não" ou depois de ver os stories. Celular: só o ícone; computador: ícone + texto.
import { computed } from 'vue'
import { CalendarHeart } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useRetrospectiveStore } from '../stores/retrospective.store'
import { useRetrospectiveOpener } from '../composables/useRetrospectiveOpener'

const auth = useAuthStore()
const store = useRetrospectiveStore()
const { open } = useRetrospectiveOpener()

const isOwner = computed(() => auth.user?.role === 'owner')
const visible = computed(() => isOwner.value && store.available && store.bannerHidden)
const label = computed(() => `Retrospectiva ${store.summary?.year ?? ''}`.trim())

</script>

<template>
  <button v-if="visible" type="button" class="retro-shortcut" :aria-label="`Abrir ${label}`" :title="label" @click="open">
    <span class="story-ring" aria-hidden="true"><CalendarHeart :size="16" /></span>
    <span class="text">{{ label }}</span>
  </button>
</template>

<style scoped>
.retro-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 5px;
  border-radius: 0.6rem;
  border: 1px solid #e5e7eb;
  background-color: #FFFEFF;
  color: #0A1230;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.retro-shortcut:hover { background-color: #f3f4f6; }
.retro-shortcut:focus-visible { outline: 2px solid #0057FF; outline-offset: 2px; }
/* Anel de "story" para lembrar a retrospectiva em stories. */
.story-ring {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  background: linear-gradient(135deg, #0A1230 0%, #0B1D5C 45%, #0057FF 100%);
  box-shadow: 0 0 0 2px #FFFEFF, 0 0 0 3.5px #0057FF;
  margin-left: 3px;
}
@media (max-width: 768px) {
  .retro-shortcut { width: 38px; padding: 0; justify-content: center; }
  .story-ring { margin-left: 0; }
  .text { display: none; }
}
</style>
