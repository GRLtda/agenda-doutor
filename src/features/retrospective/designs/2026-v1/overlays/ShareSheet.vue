<script setup>
// D2: menu de compartilhar no celular/tablet (sempre, mesmo sem Web Share com arquivos).
import { onMounted, ref } from 'vue'

defineProps({
  thumbBg: { type: String, required: true },
  thumbColor: { type: String, required: true },
  thumbText: { type: String, default: 'AD' },
  previewUrl: { type: String, default: null },
  busy: { type: Boolean, default: false },
  // Sem Web Share com arquivos (HTTP, Firefox, navegador de apps) só dá para salvar a imagem.
  canShare: { type: Boolean, default: true },
})
const emit = defineEmits(['share', 'save', 'cancel'])
const first = ref(null)
const saveBtn = ref(null)
onMounted(() => (first.value || saveBtn.value)?.focus())
</script>

<template>
  <div class="scrim" @click.self="emit('cancel')" @keydown.esc.stop="emit('cancel')">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Compartilhar story">
      <div class="grip" aria-hidden="true"></div>
      <div class="head">
        <div class="thumb" :style="{ background: thumbBg, color: thumbColor }">
          <img v-if="previewUrl" :src="previewUrl" alt="" />
          <span v-else>{{ thumbText }}</span>
        </div>
        <div class="txt">
          <div class="t">Compartilhar este story</div>
          <div class="s" aria-live="polite">{{ busy ? 'Preparando a imagem…' : 'Imagem 1080 × 1920, sem botões, pronta para os Stories.' }}</div>
        </div>
      </div>
      <p v-if="!canShare" class="note">Este navegador não abre o Instagram direto. Salve a imagem e, no Instagram, toque em <strong>+</strong>, escolha <strong>Story</strong> e selecione a foto.</p>
      <button v-if="canShare" ref="first" type="button" class="opt" :disabled="busy" @click="emit('share')">
        <span class="ico blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg></span>
        Compartilhar no Instagram Stories
      </button>
      <button ref="saveBtn" type="button" class="opt" :disabled="busy" @click="emit('save')">
        <span class="ico gray"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg></span>
        Salvar imagem
      </button>
      <button type="button" class="cancel" @click="emit('cancel')">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
.scrim { position: absolute; inset: 0; z-index: 22; background: rgba(5, 10, 30, 0.55); display: flex; flex-direction: column; justify-content: flex-end; }
.sheet { background: #FFFFFF; color: #0F172A; border-radius: 18px 18px 0 0; padding: 10px 16px 30px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 -12px 40px rgba(10, 18, 48, 0.25); }
.grip { align-self: center; width: 40px; height: 4px; border-radius: 2px; background: #CBD5E1; margin-bottom: 12px; }
.head { display: flex; gap: 14px; align-items: center; padding: 0 4px 14px; border-bottom: 1px solid #E2E8F0; margin-bottom: 6px; }
.thumb { width: 44px; height: 78px; flex: none; border-radius: 8px; box-shadow: 0 0 0 1px #E2E8F0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.txt { display: flex; flex-direction: column; gap: 3px; }
.t { font-size: 17px; font-weight: 600; }
.s { font-size: 13px; line-height: 1.4; color: #475569; }
.note { margin: 4px 4px 6px; font-size: 14px; line-height: 1.45; color: #475569; }
.note strong { font-weight: 600; color: #0F172A; }
.opt { height: 60px; border: 0; background: transparent; display: flex; align-items: center; gap: 14px; padding: 0 6px; border-radius: 12px; font-size: 16px; font-weight: 500; color: #0F172A; cursor: pointer; text-align: left; }
.opt:disabled { opacity: 0.5; cursor: progress; }
.ico { width: 40px; height: 40px; flex: none; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.blue { background: #EEF4FF; color: #0057FF; }
.gray { background: #F1F5F9; color: #0F172A; }
.cancel { margin-top: 10px; height: 52px; border-radius: 999px; border: 1px solid #CBD5E1; background: #FFFFFF; font-size: 16px; font-weight: 600; color: #0F172A; cursor: pointer; }
</style>
