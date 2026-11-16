<script setup>
// D4: feedback de sucesso ou erro ao gerar/compartilhar a imagem.
defineProps({ type: { type: String, default: 'ok' }, title: String, subtitle: String })
const emit = defineEmits(['retry'])
</script>

<template>
  <div v-if="type === 'ok'" role="status" class="toast">
    <span class="ico ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
    <span class="txt"><span class="t">{{ title }}</span><span class="s">{{ subtitle }}</span></span>
  </div>
  <div v-else role="alert" class="toast err">
    <span class="ico bad"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" x2="12" y1="7" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg></span>
    <span class="txt"><span class="t">{{ title || 'Não foi possível gerar a imagem' }}</span><span class="s">{{ subtitle || 'Verifique a conexão e tente de novo.' }}</span></span>
    <button type="button" class="retry" @click="emit('retry')">Tentar</button>
  </div>
</template>

<style scoped>
.toast { position: absolute; top: 76px; left: 18px; right: 18px; z-index: 24; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: #FFFFFF; color: #0F172A; box-shadow: 0 14px 36px rgba(10, 18, 48, 0.24); }
.toast.err { padding: 10px 8px 10px 14px; }
.ico { width: 30px; height: 30px; flex: none; border-radius: 999px; color: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.ok { background: #0057FF; }
.bad { background: #DC2626; }
.txt { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.t { font-size: 15px; font-weight: 600; }
.s { font-size: 13px; color: #475569; }
.retry { height: 44px; padding: 0 10px; border: 0; background: transparent; color: #0057FF; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
