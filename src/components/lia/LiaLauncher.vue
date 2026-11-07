<script setup>
import { computed } from 'vue'
import { useLiaStore } from '@/stores/lia'
import LiaAvatar from './LiaAvatar.vue'
const store = useLiaStore()
const state = computed(() => store.isSending
  ? store.streamText ? 'responding' : 'thinking'
  : store.backgroundNotice === 'error' ? 'error' : store.backgroundNotice === 'answer' ? 'success' : 'attentive')
const label = computed(() => store.isSending ? store.streamText ? 'Lia está respondendo' : 'Lia está pensando' : store.backgroundNotice === 'answer' ? 'Resposta pronta' : store.backgroundNotice === 'error' ? 'Confira sua conversa' : 'Fale com a Lia')
</script>
<template>
  <div v-if="store.isAvailable" class="lia-launcher-area">
    <button v-if="!store.isOpen" type="button" class="lia-launcher" :class="{ 'has-notice': !!store.backgroundNotice, working: store.isSending }" :aria-label="`${label}. Abrir conversa com a Lia`" @click="store.isOpen = true">
      <span class="launcher-art"><LiaAvatar class="launcher-character" :state="state" /><span v-if="store.backgroundNotice" class="notice-dot" aria-hidden="true"></span></span>
      <span>{{ label }}</span>
    </button>
    <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ !store.isOpen && store.backgroundNotice ? store.backgroundNotice === 'answer' ? 'A Lia respondeu. Abra a conversa para conferir.' : 'A Lia encontrou um problema. Abra a conversa para conferir.' : '' }}</span>
  </div>
</template>
<style scoped>
.lia-launcher-area { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 3000; }
.lia-launcher { display: flex; align-items: center; gap: .35rem; padding: .32rem 1rem .32rem .3rem; border: 1px solid var(--border, #e5e7eb); border-radius: 999px; color: var(--foreground, #243247); background: var(--card, #fff); box-shadow: 0 8px 30px #1930551f; cursor: pointer; font: inherit; font-size: .75rem; font-weight: 550; transition: transform .18s, box-shadow .18s; }
.lia-launcher:hover { transform: translateY(-2px); box-shadow: 0 12px 34px #1930552e; }.lia-launcher:focus-visible { outline: 2px solid var(--azul-principal, #0057ff); outline-offset: 4px; }.launcher-art { position: relative; display: block; }.launcher-character { width: 42px; }.has-notice { border-color: color-mix(in srgb, var(--azul-principal, #0057ff) 45%, var(--border, #e5e7eb)); }.notice-dot { position: absolute; top: 4px; right: 3px; width: 8px; height: 8px; border: 2px solid var(--card, #fff); border-radius: 50%; background: var(--azul-principal, #0057ff); }.working { box-shadow: 0 5px 28px #0057ff20; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }@media(max-width: 768px) { .lia-launcher-area { right: 1rem; bottom: 1rem; } }@media(prefers-reduced-motion: reduce) { .lia-launcher { transition: none; }.lia-launcher:hover { transform: none; } }
</style>
