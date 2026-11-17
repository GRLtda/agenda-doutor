<script setup>
// D3: só no computador; baixa o PNG e orienta a postar pelo celular.
import { onMounted, ref } from 'vue'

defineProps({ previewUrl: { type: String, default: null }, busy: { type: Boolean, default: false } })
const emit = defineEmits(['download', 'close'])
const btn = ref(null)
onMounted(() => btn.value?.focus())
</script>

<template>
  <div class="scrim" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rd26-d3-title">
      <div class="preview-col">
        <div class="preview">
          <img v-if="previewUrl" :src="previewUrl" alt="Prévia da imagem do story" />
          <slot v-else name="preview" />
        </div>
        <div class="mono size">1080 × 1920 px · PNG</div>
      </div>
      <div class="content">
        <div class="top">
          <h2 id="rd26-d3-title">Baixar imagem</h2>
          <button type="button" class="x" aria-label="Fechar" @click="emit('close')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
        </div>
        <p class="lead">O Instagram não deixa postar Stories pelo computador. Baixe a imagem e publique pelo celular, leva menos de um minuto.</p>
        <ol>
          <li><span class="n">1</span><span>Baixe a imagem do story.</span></li>
          <li><span class="n">2</span><span>Envie para o celular (AirDrop, WhatsApp ou e-mail).</span></li>
          <li><span class="n">3</span><span>No Instagram, toque em <strong>+</strong>, escolha <strong>Story</strong> e selecione a imagem.</span></li>
        </ol>
        <div class="actions">
          <button ref="btn" type="button" class="primary" :disabled="busy" @click="emit('download')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
            {{ busy ? 'Preparando a imagem…' : 'Baixar imagem' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 60; background: rgba(5, 9, 26, 0.62); display: flex; align-items: center; justify-content: center; padding: 24px; }
.dialog { width: 760px; max-width: 100%; max-height: 100%; overflow: auto; box-sizing: border-box; border-radius: 18px; background: #FFFFFF; color: #0F172A; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45); display: flex; gap: 36px; padding: 36px; }
.preview-col { width: 254px; flex: none; display: flex; flex-direction: column; gap: 10px; }
.preview { width: 254px; height: 452px; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1px #E2E8F0, 0 12px 30px rgba(15, 23, 42, 0.16); }
.preview img { width: 100%; height: 100%; display: block; }
.size { font-size: 11px; color: #64748B; text-align: center; }
.content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
h2 { margin: 0; font-size: 26px; font-weight: 650; letter-spacing: -0.02em; }
.x { width: 44px; height: 44px; margin: -8px -10px 0 0; border: 0; border-radius: 8px; background: transparent; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.lead { font-size: 15px; line-height: 1.55; color: #475569; }
ol { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
li { display: flex; gap: 12px; align-items: flex-start; font-size: 15px; line-height: 1.45; }
li > span:last-child { padding-top: 3px; }
li strong { font-weight: 600; }
.n { width: 26px; height: 26px; flex: none; border-radius: 999px; background: #EEF4FF; color: #0057FF; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.actions { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
.primary { height: 52px; border: 0; border-radius: 999px; background: #0057FF; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 10px 24px rgba(0, 87, 255, 0.3); }
.primary:disabled { opacity: 0.6; cursor: progress; }
@media (max-width: 720px) { .dialog { flex-direction: column; align-items: center; padding: 24px; gap: 20px; } .content { width: 100%; } }
</style>
