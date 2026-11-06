<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import AppButton from '@/components/global/AppButton.vue'
import WorkflowActionDialog from '@/components/pages/workflows/WorkflowActionDialog.vue'
import WorkflowAppointmentPreview from '@/components/pages/workflows/WorkflowAppointmentPreview.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import { Workflow, X, Square } from 'lucide-vue-next'
import WorkflowRunsTable from '@/components/pages/workflows/WorkflowRunsTable.vue'
import WorkflowRunDetails from '@/components/pages/workflows/WorkflowRunDetails.vue'
const route = useRoute(), router = useRouter(), toast = useToast(), selected = ref(null), table = ref(null)
const cancelTarget = ref(null), workflowName = ref('Fluxo selecionado'), appointmentId = ref(null)
const definitionId = computed(() => typeof route.query.definitionId === 'string' ? route.query.definitionId : undefined)
function definitionChanged(value) {
  workflowName.value = value.name
  if (value.id !== (definitionId.value || '')) router.replace({ query: { ...route.query, definitionId: value.id || undefined } })
}
async function canceled({ canceledCount }) { cancelTarget.value = null; toast.success(`${canceledCount} execução(ões) cancelada(s).`); await table.value?.refresh() }
watch(definitionId, () => { cancelTarget.value = null; selected.value = null })
</script>
<template>
  <section class="workflow-runs-page"><header class="page-heading"><div><h1>Execuções de workflows</h1><p>Acompanhe as etapas, esperas e o histórico das automações.</p></div><AppButton variant="outline" :disabled="!definitionId" :title="definitionId ? 'Cancelar todas as execuções deste fluxo' : 'Selecione um workflow nos filtros'" @click="cancelTarget = { id: definitionId, name: workflowName }"><Square :size="15" />Cancelar todas as execuções do fluxo</AppButton></header><WorkflowRunsTable ref="table" :definition-id="definitionId" @definition-change="definitionChanged" @select="selected = $event" /><SideDrawer v-if="selected" size="xl" body-class="workflow-run-body" @close="selected = null"><template #header="{ close }"><div class="run-heading"><span class="run-heading-icon"><Workflow :size="20" /></span><div><h2>Detalhes da execução</h2><p>Acompanhe o fluxo e o histórico de etapas</p></div><button class="run-close" aria-label="Fechar execução" @click="close"><X :size="19" /></button></div></template><WorkflowRunDetails :run-id="selected" @changed="table?.refresh()" @view-appointment="appointmentId = $event" /></SideDrawer><WorkflowActionDialog v-if="cancelTarget" action="cancel_runs" :ids="[cancelTarget.id]" :workflow-name="cancelTarget.name" @close="cancelTarget = null" @complete="canceled" /><WorkflowAppointmentPreview v-if="appointmentId" :appointment-id="appointmentId" @close="appointmentId = null" @changed="table?.refresh()" /></section>
</template>
<style scoped>
.page-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-heading>.app-button{flex-shrink:0;color:#dc2626}@media(max-width:900px){.page-heading{align-items:flex-start;flex-direction:column}.page-heading>.app-button{font-size:.75rem;white-space:normal}}.workflow-runs-page{display:flex;flex-direction:column;gap:20px;height:100%;min-height:0;overflow:hidden}h1{font-size:1.5rem;font-weight:600;color:#111827}header p{color:#64748b;margin-top:6px;font-size:.875rem}.run-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid #e5e7eb}.run-heading h2{font-size:1rem;font-weight:600;color:#111827;margin:0}.run-heading>div{flex:1;min-width:0}.run-heading p{font-size:.75rem;color:#64748b;margin:3px 0 0}.run-heading-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:40px;height:40px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;color:#2563eb}.run-close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#64748b;cursor:pointer}.run-close:hover{background:#f8fafc;color:#111827}
</style>

<style>
.workflow-run-body{background:#f8fafc}
</style>
