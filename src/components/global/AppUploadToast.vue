<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({ upload: { type: Object, required: true } })
const percent = computed(() => Math.min(100, Math.max(0, Math.round(props.upload.progress || 0))))
</script>

<template>
  <div class="upload-toast-content">
    <p class="upload-toast-title">{{ upload.title }}</p>
    <p class="upload-toast-description">{{ upload.fileName || upload.description }}</p>
    <div
      class="upload-toast-track"
      role="progressbar"
      aria-label="Progresso do envio"
      :aria-valuenow="upload.progress == null ? undefined : percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="upload-toast-fill"
        :class="{ 'is-indeterminate': upload.progress == null }"
        :style="upload.progress == null ? undefined : { width: `${percent}%` }"
      />
    </div>
    <div class="upload-toast-footer">
      <span>{{ upload.fileName ? upload.description : '' }}</span>
      <span>{{ upload.progress == null ? 'Aguarde…' : `${percent}%` }}</span>
    </div>
    <button type="button" class="upload-toast-close" aria-label="Fechar notificação" @click="upload.onClose?.()">
      <X :size="14" />
    </button>
  </div>
</template>

<style scoped>
.upload-toast-content { position: relative; width: 100%; min-width: 0; padding-right: 18px; }
.upload-toast-title { margin: 0; font-size: 13px; line-height: 1.4; font-weight: 500; }
.upload-toast-description { margin: 4px 0 10px; font-size: 12px; line-height: 1.4; font-weight: 400; color: var(--muted-foreground, #6b7280); overflow-wrap: anywhere; }
.upload-toast-track { height: 6px; overflow: hidden; border-radius: 999px; background: var(--muted, #e5e7eb); }
.upload-toast-fill { height: 100%; border-radius: inherit; background: var(--azul-principal, #6366f1); transition: width 160ms ease; }
.upload-toast-fill.is-indeterminate { width: 35%; animation: upload-progress 1.2s ease-in-out infinite alternate; }
.upload-toast-footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 11px; line-height: 1.4; font-weight: 400; color: var(--muted-foreground, #6b7280); }
.upload-toast-footer span:last-child { flex-shrink: 0; }
.upload-toast-close { position: absolute; right: -3px; top: -2px; display: flex; padding: 2px; border: 0; background: transparent; color: var(--muted-foreground, #6b7280); cursor: pointer; }
.upload-toast-close:focus-visible { outline: 2px solid var(--azul-principal, #6366f1); outline-offset: 3px; }
@keyframes upload-progress { to { transform: translateX(185%); } }
@media (prefers-reduced-motion: reduce) {
  .upload-toast-fill { transition: none; }
  .upload-toast-fill.is-indeterminate { animation: none; }
}
</style>
