<script setup>
// E2: dica na primeira vez.
const emit = defineEmits(['done'])
</script>

<template>
  <button type="button" class="hint" aria-label="Entendi, começar a retrospectiva" @click.stop="emit('done')" @pointerdown.stop @pointerup.stop>
    <span class="left">
      <span class="circle outline"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></span>
      <span class="lbl">Toque para<br />voltar</span>
    </span>
    <span class="right">
      <span class="circle solid"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></span>
      <span class="lbl">Toque para avançar</span>
    </span>
    <span class="bottom">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8" /><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" /><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" /><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
      <span class="lbl">Segure para pausar</span>
      <span class="mono start">TOQUE EM QUALQUER LUGAR PARA COMEÇAR</span>
    </span>
  </button>
</template>

<style scoped>
.hint { position: absolute; inset: 0; z-index: 20; border: 0; padding: 0; margin: 0; background: rgba(5, 10, 30, 0.7); color: #FFFFFF; cursor: pointer; display: block; }
.left, .right { position: absolute; top: 72px; bottom: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.left { left: 0; width: 35%; box-sizing: border-box; border-right: 1.5px dashed rgba(255, 255, 255, 0.55); }
.right { left: 35%; right: 0; }
.circle { width: 52px; height: 52px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.outline { box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.7); }
.solid { background: #FFFFFF; color: #0A1230; }
.lbl { font-size: 15px; font-weight: 600; text-align: center; }
.bottom { position: absolute; left: 0; right: 0; bottom: 118px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.start { margin-top: 14px; font-size: 11px; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.8); }
</style>
