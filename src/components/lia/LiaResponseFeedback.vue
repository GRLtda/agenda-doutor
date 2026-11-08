<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Check, Flag, ThumbsDown, ThumbsUp, X } from 'lucide-vue-next'
import { submitLiaFeedback } from '@/api/lia'
const props = defineProps({ message: { type: Object, required: true }, conversationId: String })
const mode = ref(null), reason = ref(''), note = ref(''), shareContext = ref(false), saving = ref(false), error = ref(''), saved = ref(null), heading = ref(null)
let alive = true, opener
onBeforeUnmount(() => { alive = false })
const feedback = computed(() => ({ ...props.message.metadata?.feedback, ...saved.value }))
const reasons = computed(() => mode.value === 'report'
  ? [{ value: 'unsafe', label: 'Conteúdo perigoso' }, { value: 'privacy', label: 'Exposição de dados pessoais' }, { value: 'offensive', label: 'Conteúdo ofensivo' }, { value: 'other', label: 'Outro motivo' }]
  : [{ value: 'incorrect', label: 'Informação incorreta' }, { value: 'incomplete', label: 'Resposta incompleta' }, { value: 'irrelevant', label: 'Não respondeu ao pedido' }, { value: 'unsafe', label: 'Conteúdo inadequado' }, { value: 'other', label: 'Outro motivo' }])
const canSubmit = computed(() => !saving.value && (mode.value === 'positive' || !!reason.value) && (reason.value !== 'other' || !!note.value.trim()))
async function open(value, event) { opener = event.currentTarget; mode.value = value; reason.value = ''; note.value = ''; shareContext.value = false; error.value = ''; await nextTick(); heading.value?.focus() }
function autoGrow(event) { const el = event.target; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight + 2, 220)}px` }
function close() { if (saving.value) return; mode.value = null; nextTick(() => opener?.focus?.()) }
async function submit() {
  if (!canSubmit.value || !props.conversationId) return
  saving.value = true; error.value = ''
  const payload = { kind: mode.value === 'report' ? 'report' : 'rating', ...(mode.value === 'report' ? {} : { vote: mode.value }), ...(reason.value ? { reason: reason.value } : {}), note: note.value.trim(), shareContext: shareContext.value }
  try {
    const { data } = await submitLiaFeedback(props.conversationId, props.message.id, payload)
    if (!alive) return
    saved.value = { ...feedback.value, ...(data.feedback.kind === 'report' ? { reported: true } : { vote: data.feedback.vote }) }
    mode.value = null; await nextTick(); opener?.focus?.()
  } catch (requestError) { if (alive) error.value = requestError.response?.data?.message || 'Não foi possível enviar. Seu texto foi mantido para tentar novamente.' }
  finally { if (alive) saving.value = false }
}
</script>

<template>
  <div class="response-feedback">
    <div class="response-tools"><slot></slot><span class="tool-divider"></span>
      <button type="button" :disabled="!!feedback.vote || saving" :class="{ selected: feedback.vote === 'positive' }" :aria-pressed="feedback.vote === 'positive'" aria-label="Gostei da resposta" title="Gostei da resposta" @click="open('positive', $event)"><ThumbsUp :size="13" /></button>
      <button type="button" :disabled="!!feedback.vote || saving" :class="{ selected: feedback.vote === 'negative' }" :aria-pressed="feedback.vote === 'negative'" aria-label="Não gostei da resposta" title="Não gostei da resposta" @click="open('negative', $event)"><ThumbsDown :size="13" /></button>
      <button type="button" :disabled="feedback.reported || saving" :class="{ selected: feedback.reported }" :aria-pressed="!!feedback.reported" aria-label="Denunciar resposta" title="Denunciar resposta" @click="open('report', $event)"><Flag :size="13" /></button>
      <span v-if="feedback.vote || feedback.reported" class="feedback-received" role="status"><Check :size="11" />{{ feedback.reported ? 'Denúncia recebida' : 'Avaliação recebida' }}</span>
    </div>
    <form v-if="mode" class="feedback-form" @submit.prevent="submit" @keydown.esc.stop.prevent="close">
      <header><h3 ref="heading" tabindex="-1">{{ mode === 'report' ? 'Denunciar esta resposta' : mode === 'negative' ? 'O que podemos melhorar?' : 'O que funcionou bem?' }}</h3><button type="button" aria-label="Fechar feedback" :disabled="saving" @click="close"><X :size="15" /></button></header>
      <fieldset v-if="mode !== 'positive'" :disabled="saving"><legend>{{ mode === 'report' ? 'Selecione o motivo da denúncia' : 'Por que a resposta não ajudou?' }}</legend><label v-for="option in reasons" :key="option.value" :class="{ chosen: reason === option.value }"><input v-model="reason" type="radio" :value="option.value" :name="`lia-feedback-${message.id}`" />{{ option.label }}</label></fieldset>
      <label class="note-label">{{ reason === 'other' ? 'Descreva o motivo' : 'Conte mais, se quiser' }}<textarea v-model="note" @input="autoGrow"data-clarity-mask="true" data-sentry-mask :disabled="saving" maxlength="2000" rows="3" :required="reason === 'other'" placeholder="Evite incluir nomes, documentos ou dados sensíveis de pacientes."></textarea></label>
      <label class="share-context"><input v-model="shareContext" type="checkbox" :disabled="saving" /><span>Compartilhar também minha pergunta e esta resposta com a equipe administrativa para análise.</span></label>
      <p class="privacy-note">{{ shareContext ? 'Somente esta pergunta e esta resposta serão anexadas. O restante da conversa não será enviado.' : 'Serão enviados apenas sua avaliação, motivo e comentário, vinculados à sua conta e clínica. O texto da conversa não será anexado.' }}</p>
      <p v-if="error" role="alert" class="feedback-error">{{ error }}</p>
      <div class="feedback-actions"><button type="button" :disabled="saving" @click="close">Agora não</button><button type="submit" :disabled="!canSubmit" :class="{ report: mode === 'report' }">{{ saving ? 'Enviando…' : mode === 'report' ? 'Enviar denúncia' : 'Enviar avaliação' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.response-feedback { margin-top: 8px; }.response-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; }.response-tools>button { display: grid; place-items: center; width: 25px; height: 26px; padding: 0; border: 0; border-radius: 7px; color: var(--lia-muted); background: transparent; cursor: pointer; }.response-tools>button:hover:not(:disabled),.response-tools>button.selected { color: var(--lia-blue); background: var(--lia-tint); }.response-tools>button:disabled { opacity: .6; cursor: default; }.tool-divider { width: 1px; height: 12px; margin: 0 5px; background: var(--lia-line); }.feedback-received { display: inline-flex; align-items: center; gap: 4px; margin-left: 5px; color: var(--lia-muted); font-size: 9px; }
.feedback-form { margin-top: 10px; padding: 15px; border: 1px solid var(--lia-line); border-radius: 14px; color: var(--lia-text); background: var(--lia-surface); }.feedback-form header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.feedback-form h3 { margin: 0; font-size: 13px; font-weight: 600; outline: none; }.feedback-form header>button { display: grid; place-items: center; border: 0; background: transparent; color: var(--lia-muted); cursor: pointer; }fieldset { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0; padding: 0; border: 0; }legend { margin-bottom: 8px; font-size: 11px; color: var(--lia-muted); }fieldset label { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid var(--lia-line); border-radius: 9px; font-size: 10px; cursor: pointer; }fieldset label.chosen { border-color: var(--lia-blue); background: var(--lia-tint); }input[type=radio],input[type=checkbox] { appearance: auto; -webkit-appearance: auto; display: inline-block; width: 14px; height: 14px; margin: 0; padding: 0; border: initial; opacity: 1; accent-color: var(--lia-blue); }.note-label { display: grid; gap: 7px; margin-top: 14px; font-size: 11px; color: var(--lia-muted); }textarea { box-sizing: border-box; width: 100%; min-height: 70px; padding: 10px; border: 1px solid var(--lia-line); border-radius: 10px; background: var(--lia-bg); color: var(--lia-text); font: inherit; font-size: 12px; line-height: 1.6; resize: none; overflow: hidden; field-sizing: content; max-height: 220px; }.share-context { display: flex; align-items: flex-start; gap: 7px; margin: 13px 0 0; font-size: 10px; line-height: 1.6; }.share-context input { flex-shrink: 0; margin-top: 3px; }.privacy-note { margin: 8px 0 0; color: var(--lia-muted); font-size: 9px; line-height: 1.6; }.feedback-error { color: #c44359; font-size: 11px; }.feedback-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 7px; margin-top: 14px; }.feedback-actions button { padding: 8px 10px; border: 1px solid var(--lia-line); border-radius: 9px; color: var(--lia-muted); background: var(--lia-bg); font: inherit; font-size: 11px; cursor: pointer; }.feedback-actions button[type=submit] { border-color: var(--lia-blue); color: white; background: var(--lia-blue); }.feedback-actions button.report { background: #bc4055; border-color: #bc4055; }.feedback-actions button:disabled { opacity: .5; cursor: default; }button:focus-visible,input:focus-visible,textarea:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }
</style>
