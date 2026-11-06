<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { AlertTriangle, Pause, Square, Clock3, Check } from 'lucide-vue-next'
import BottomSheet from '@/components/global/BottomSheet.vue'
import AppButton from '@/components/global/AppButton.vue'
import api from '@/api/workflows'
const props = defineProps({ action: { type: String, required: true }, ids: { type: Array, required: true }, workflowName: { type: String, default: 'este fluxo' } })
const emit = defineEmits(['close', 'complete'])
const mode = ref('new_only'), busy = ref(false), error = ref(''), remaining = ref(0), sheet = ref(null)
let deadline = 0, timer, opener
const destructive = computed(() => props.action === 'cancel_runs' || props.action === 'archive' || (props.action === 'deactivate' && mode.value === 'cancel_all'))
const title = computed(() => ({ cancel_runs: 'Cancelar todas as execuções?', deactivate: 'Como deseja inativar o fluxo?', archive: 'Excluir workflows?', activate: 'Ativar workflows?' })[props.action])
const confirmLabel = computed(() => ({ cancel_runs: 'Cancelar todas as execuções', deactivate: mode.value === 'new_only' ? 'Inativar para novos atendimentos' : 'Cancelar execuções e inativar', archive: 'Excluir workflows', activate: 'Ativar workflows' })[props.action])
function resetDelay() {
  clearInterval(timer); deadline = Date.now() + (destructive.value ? 3000 : 0)
  const tick = () => { remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) }
  tick(); if (destructive.value) timer = setInterval(tick, 100)
}
watch([() => props.action, mode], resetDelay, { immediate: true })
function close() { if (!busy.value) emit('close') }
async function submit() {
  if (busy.value || Date.now() < deadline) return
  busy.value = true; error.value = ''
  try {
    if (props.action === 'cancel_runs') {
      const { data } = await api.cancelDefinitionRuns(props.ids[0]); emit('complete', { action: props.action, canceledCount: data.data.canceledCount })
    } else {
      const { data } = await api.bulkAction([...props.ids], props.action, props.action === 'deactivate' ? { deactivationMode: mode.value } : {})
      emit('complete', { action: props.action, mode: mode.value, results: data.data.results || [] })
    }
  } catch { error.value = 'Não foi possível concluir a ação. Tente novamente.' }
  finally { busy.value = false }
}
function trapFocus(event) {
  const panel = sheet.value?.$el?.querySelector('.bottom-sheet-panel')
  if (event.key !== 'Tab' || !panel?.contains(event.target)) return
  const controls = [...panel.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length)
  if (event.shiftKey && event.target === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
  else if (!event.shiftKey && event.target === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
}
onMounted(() => { opener = document.activeElement; document.addEventListener('keydown', trapFocus); nextTick(() => sheet.value?.$el?.querySelector('button')?.focus()) })
onUnmounted(() => { clearInterval(timer); document.removeEventListener('keydown', trapFocus); opener?.focus?.() })
</script>
<template>
  <Teleport to="body"><BottomSheet ref="sheet" :title="title" :show-close="!busy" class="workflow-action-sheet" :class="{ busy }" role="dialog" aria-modal="true" :aria-label="title" @close="close">
    <div class="action-context"><span class="action-icon"><Pause v-if="action === 'deactivate'" :size="22" /><AlertTriangle v-else :size="22" /></span><div><strong>{{ ids.length > 1 ? `${ids.length} workflows selecionados` : workflowName }}</strong><p v-if="action === 'cancel_runs'">Todas as execuções em andamento deste fluxo serão canceladas, independentemente dos filtros de período, status ou página. O fluxo continua com seu estado atual e poderá iniciar novas execuções se estiver ativo.</p><p v-else-if="action === 'deactivate'">Escolha o que acontece com os atendimentos que já estão no fluxo.</p><p v-else-if="action === 'archive'">Os workflows serão arquivados e suas execuções em andamento serão canceladas.</p><p v-else>Os workflows serão ativados. Rascunhos sem versão publicada serão publicados.</p></div></div>
    <div v-if="action === 'deactivate'" class="mode-options" role="radiogroup" aria-label="Modo de inativação">
      <button type="button" role="radio" :aria-checked="mode === 'new_only'" :disabled="busy" :class="{ selected: mode === 'new_only' }" @click="mode = 'new_only'"><Pause :size="19" /><span><strong>Apenas novos atendimentos</strong><small>Impede novos inícios. As execuções que já estão em andamento continuam normalmente.</small></span><Check v-if="mode === 'new_only'" :size="18" /></button>
      <button type="button" role="radio" :aria-checked="mode === 'cancel_all'" :disabled="busy" :class="{ selected: mode === 'cancel_all' }" @click="mode = 'cancel_all'"><Square :size="18" /><span><strong>Cancelar execuções e inativar</strong><small>Interrompe as execuções existentes e impede novos inícios.</small></span><Check v-if="mode === 'cancel_all'" :size="18" /></button>
    </div>
    <p v-if="destructive" class="action-warning">Mensagens já enviadas e ações já iniciadas não serão desfeitas.</p>
    <p v-if="remaining" class="countdown" aria-live="polite"><Clock3 :size="14" />Leia a confirmação. Você poderá continuar em {{ remaining }}s.</p>
    <p v-if="error" class="action-error" role="alert">{{ error }}</p>
    <template #footer><div class="action-footer"><AppButton variant="outline" :disabled="busy" @click="close">Voltar</AppButton><AppButton :variant="destructive ? 'dangerous' : 'primary'" :disabled="busy || remaining > 0" :loading="busy" @click="submit">{{ confirmLabel }}<template v-if="remaining"> ({{ remaining }}s)</template></AppButton></div></template>
  </BottomSheet></Teleport>
</template>
<style scoped>
.action-context{display:flex;align-items:flex-start;gap:12px}.action-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:42px;height:42px;border-radius:12px;background:#fff7ed;color:#d97706}.action-context strong{font-size:.875rem;font-weight:600;color:#111827}.action-context p,.action-warning{font-size:.8125rem;color:#64748b;line-height:1.6;margin:6px 0 0}.mode-options{display:grid;gap:10px;margin-top:18px}.mode-options button{display:flex;align-items:flex-start;gap:10px;text-align:left;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#64748b;cursor:pointer}.mode-options button>span{flex:1}.mode-options strong{display:block;color:#334155;font-size:.8125rem;font-weight:600}.mode-options small{display:block;margin-top:4px;font-size:.75rem;line-height:1.5}.mode-options button.selected{background:#eff6ff;border-color:#93c5fd;color:#2563eb}.mode-options button:disabled{cursor:wait}.action-warning{padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;margin-top:16px}.countdown{display:flex;align-items:center;gap:6px;color:#64748b;font-size:.75rem;margin:14px 0 0}.action-error{color:#b91c1c;font-size:.8125rem;margin:12px 0 0}.action-footer{display:flex;justify-content:space-between;gap:12px}.workflow-action-sheet.busy :deep(.handle-bar-container){pointer-events:none}@media(max-width:600px){.action-footer{flex-direction:column-reverse}.action-footer .app-button{width:100%}}
</style>
