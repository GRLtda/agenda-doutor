<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import LiaAvatar from '@/components/lia/LiaAvatar.vue'
import { markChangedWords, sanitizeRecordHtml } from '@/utils/recordHtml'

const props = defineProps({
  originalContent: { type: String, required: true },
  refinedContent: { type: String, required: true },
  accepting: Boolean,
})
const emit = defineEmits(['accept', 'reject'])

const original = computed(() => sanitizeRecordHtml(props.originalContent))
const refined = computed(() => markChangedWords(props.originalContent, props.refinedContent))
const dialog = ref(null)
onMounted(async () => { await nextTick(); dialog.value?.focus() })
const onKeydown = event => { if (event.key === 'Escape' && !props.accepting) emit('reject') }
</script>

<template>
  <Teleport to="body">
    <div class="review-overlay" @click.self="!accepting && emit('reject')">
      <div ref="dialog" class="review-dialog" role="dialog" aria-modal="true" aria-labelledby="refine-title" tabindex="-1" @keydown="onKeydown">
        <header class="review-header">
          <LiaAvatar class="review-avatar" state="success" :active="false" />
          <div>
            <h2 id="refine-title">Revise a sugestão da Lia</h2>
            <p>A Lia corrige a escrita e organiza o texto em títulos e listas. Números, doses, datas e dados clínicos não são alterados, e nada muda no prontuário até você aceitar.</p>
          </div>
        </header>

        <div class="review-columns">
          <section aria-labelledby="refine-original">
            <h3 id="refine-original">Seu texto</h3>
            <div class="review-text" v-html="original"></div>
          </section>
          <section aria-labelledby="refine-suggestion">
            <h3 id="refine-suggestion">Sugestão da Lia <small v-if="refined.changed">{{ refined.changed }} {{ refined.changed === 1 ? 'palavra ajustada' : 'palavras ajustadas' }}, em destaque</small></h3>
            <div class="review-text is-suggestion" v-html="refined.html"></div>
          </section>
        </div>

        <p class="review-privacy"><ShieldCheck :size="14" aria-hidden="true" /> O texto foi enviado sem nome, CPF, telefone ou e-mail do paciente. Ao aceitar, a versão anterior fica guardada de forma oculta no histórico do prontuário.</p>

        <footer class="review-actions">
          <AppButton variant="outline" :disabled="accepting" @click="emit('reject')">Manter meu texto</AppButton>
          <AppButton variant="primary" :loading="accepting" :disabled="accepting" @click="emit('accept')">Aceitar melhoria</AppButton>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.review-overlay { position: fixed; inset: 0; z-index: 6000; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, 0.45); }
.review-dialog { width: min(980px, 100%); max-height: min(780px, calc(100dvh - 2rem)); display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; border-radius: 1rem; background: #fff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3); outline: none; overflow: hidden; }
.review-header { display: flex; align-items: center; gap: 1rem; }
.review-avatar { width: 56px; flex-shrink: 0; }
.review-header h2 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e293b; }
.review-header p { margin: 4px 0 0; font-size: 0.875rem; line-height: 1.5; color: #475569; }
.review-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; min-height: 0; overflow-y: auto; }
.review-columns section { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
.review-columns h3 { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; color: #334155; }
.review-columns h3 small { font-weight: 400; color: #64748b; }
.review-text { padding: 0.875rem 1rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; background: #f8fafc; font-size: 0.9375rem; line-height: 1.6; color: #1e293b; overflow-wrap: anywhere; }
.review-text.is-suggestion { border-color: #bcd0ff; background: #f5f9ff; }
.review-text :deep(p) { margin: 0 0 0.5rem; }
.review-text :deep(p:last-child) { margin-bottom: 0; }
.review-text :deep(ul), .review-text :deep(ol) { margin: 0 0 0.5rem; padding-left: 1.25rem; }
.review-text :deep(ul) { list-style: disc; }
.review-text :deep(ol) { list-style: decimal; }
.review-text :deep(h1), .review-text :deep(h2), .review-text :deep(h3) { margin: 0.75rem 0 0.375rem; font-weight: 600; line-height: 1.3; color: #0f172a; }
.review-text :deep(h1:first-child), .review-text :deep(h2:first-child), .review-text :deep(h3:first-child) { margin-top: 0; }
.review-text :deep(h1) { font-size: 1.125rem; }
.review-text :deep(h2) { font-size: 1rem; }
.review-text :deep(h3) { font-size: 0.9375rem; }
.review-text :deep(strong) { font-weight: 600; }
.review-text :deep(blockquote) { margin: 0 0 0.5rem; padding-left: 0.75rem; border-left: 3px solid #cbd5e1; color: #475569; }
.review-text :deep(mark) { padding: 0 2px; border-radius: 3px; background: #dbe8ff; color: #0b3fae; }
.review-privacy { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0; font-size: 0.8125rem; line-height: 1.45; color: #64748b; }
.review-privacy svg { flex-shrink: 0; margin-top: 2px; }
.review-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
@media (max-width: 720px) {
  .review-columns { grid-template-columns: minmax(0, 1fr); }
  .review-actions { flex-direction: column-reverse; }
  .review-actions > * { width: 100%; }
}
</style>
