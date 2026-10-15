<script setup>
import { computed, ref, watch } from 'vue'
import { VueFlow, Handle, Position } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/controls/dist/style.css'
import { Workflow, UserRound, CalendarDays, Clock3, CircleCheck, AlertCircle, Layers, History, Square, MessageSquare, GitBranch, Zap, RotateCcw, Plus, Minus, Maximize2 } from 'lucide-vue-next'
import { Background } from '@vue-flow/background'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import api from '@/api/workflows'
import AppButton from '@/components/global/AppButton.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import { useWorkflowPolling } from '@/composables/useWorkflowPolling'
import dagre from 'dagre'
import { runStatusLabels as labels, activeRunStatuses, formatRunDate as date } from '@/utils/workflowRuns'
const props = defineProps({ runId: { type: String, required: true } })
const emit = defineEmits(['changed', 'view-appointment'])
const { data, loading, error, refresh } = useWorkflowPolling(() => props.runId, async () => (await api.getRunById(props.runId)).data.data)
const familyLabels = { trigger: 'Gatilho', action: 'Ação', wait: 'Espera', condition: 'Condição', control: 'Controle' }
const familyIcons = { trigger: Zap, action: MessageSquare, wait: Clock3, condition: GitBranch, control: RotateCcw }
const confirming = ref(false), canceling = ref(false), cancelError = ref('')
watch(() => props.runId, () => { confirming.value = false; cancelError.value = '' })
const graph = computed(() => {
  if (!data.value?.graph) return { nodes: [], edges: [] }
  const { graph, run, steps } = data.value
  const layout = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  layout.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 40 })
  graph.nodes.forEach(n => layout.setNode(n.key, { width: 220, height: 82 }))
  graph.edges.forEach(e => { if (layout.hasNode(e.source) && layout.hasNode(e.target)) layout.setEdge(e.source, e.target) })
  dagre.layout(layout)
  return { nodes: graph.nodes.map(n => {
    const position = layout.node(n.key)
    const status = run.currentNodeKeys.includes(n.key) ? 'running' : [...steps].reverse().find(s => s.nodeKey === n.key)?.status || 'pending'
    return { id: n.key, type: 'execution', data: { label: n.label, family: n.family, status }, label: n.label, class: run.currentNodeKeys.includes(n.key) ? 'execution-current' : steps.some(s => s.nodeKey === n.key && s.status === 'success') ? 'execution-success' : '', position: { x: position.x - 110, y: position.y - 41 }, style: { width: '220px' } }
  }), edges: graph.edges.map((e, i) => ({ ...e, id: e.key || `edge-${i}` })) }
})
async function cancel() {
  if (canceling.value) return
  const id = props.runId
  canceling.value = true; cancelError.value = ''
  try { await api.cancelRun(id); if (id === props.runId) { confirming.value = false; await refresh(); emit('changed') } }
  catch { if (id === props.runId) cancelError.value = 'Não foi possível interromper. Tente novamente.' }
  finally { canceling.value = false }
}
</script>
<template>
  <div class="execution-detail">
    <div v-if="loading" class="detail-skeleton" aria-busy="true"><AppSkeleton height="150px" /><AppSkeleton height="320px" /><AppSkeleton height="100px" /></div>
    <div v-if="error" class="execution-notice is-error" role="alert"><AlertCircle :size="18" /><span>{{ error }}</span><AppButton variant="outline" @click="refresh">Tentar novamente</AppButton></div>
    <template v-if="data">
      <section class="execution-summary" aria-label="Resumo da execução">
        <div class="summary-heading"><span class="summary-icon"><Workflow :size="21" /></span><div class="summary-title"><span class="eyebrow">Execução de workflow</span><h3>{{ data.run.workflowName }}</h3></div><span class="status-badge" :class="data.run.status">{{ labels[data.run.status] }}</span></div>
        <div class="summary-subject"><span><UserRound :size="15" />{{ data.run.patientName || 'Paciente não informado' }}</span><span v-if="data.run.appointment"><CalendarDays :size="15" />{{ date(data.run.appointment.startTime) }}</span></div>
        <AppButton v-if="data.run.appointment?._id" variant="outline" size="sm" class="view-appointment-button" @click="emit('view-appointment', data.run.appointment._id)"><CalendarDays :size="14" />Ver atendimento</AppButton><div class="execution-dates"><div><span><Clock3 :size="13" />Início</span><strong>{{ date(data.run.startedAt) }}</strong></div><div><span><History :size="13" />Última atividade</span><strong>{{ date(data.run.lastActivityAt) }}</strong></div><div v-if="data.run.finishedAt"><span><CircleCheck :size="13" />Término</span><strong>{{ date(data.run.finishedAt) }}</strong></div></div>
      </section>
      <div v-if="data.error" class="execution-notice is-error" role="alert"><AlertCircle :size="18" /><p>{{ data.error }}</p></div>
      <div v-else-if="data.stopReason" class="execution-notice"><AlertCircle :size="18" /><p>{{ data.stopReason }}</p></div>
      <section class="execution-section graph-section">
        <div class="section-heading"><span class="section-heading-icon"><Layers :size="17" /></span><div><h4>Fluxo executado</h4><p>Etapas da versão usada nesta execução</p></div><span v-if="data.version" class="version-badge">Versão {{ data.version }}</span></div>
        <div class="graph-legend"><span><i class="legend-current"></i>Em andamento</span><span><i class="legend-success"></i>Concluída</span><span><i class="legend-failed"></i>Falhou</span></div>
        <div v-if="graph.nodes.length" class="run-canvas" aria-label="Grafo da versão executada, somente leitura"><VueFlow :key="runId" :nodes="graph.nodes" :edges="graph.edges" :nodes-draggable="false" :nodes-connectable="false" :edges-updatable="false" :elements-selectable="false" fit-view-on-init :max-zoom="1.5">
          <Background :gap="16" color="#cbd5e1" /><Controls :show-interactive="false"><template #icon-zoom-in><Plus :size="14" /><span class="sr-only">Aumentar zoom</span></template><template #icon-zoom-out><Minus :size="14" /><span class="sr-only">Diminuir zoom</span></template><template #icon-fit-view><Maximize2 :size="14" /><span class="sr-only">Enquadrar fluxo</span></template></Controls>
          <template #node-execution="{ data: node }"><div class="execution-node" :class="node.status"><Handle type="target" :position="Position.Top" /><div class="node-family"><component :is="familyIcons[node.family] || Layers" :size="13" /><span>{{ familyLabels[node.family] || 'Etapa' }}</span><span class="node-status-dot"></span></div><strong>{{ node.label }}</strong><Handle type="source" :position="Position.Bottom" /></div></template>
        </VueFlow></div>
        <p v-else class="section-empty">Grafo histórico indisponível.</p>
      </section>
      <section class="execution-section history-section">
        <div class="section-heading"><span class="section-heading-icon"><History :size="17" /></span><div><h4>Histórico de etapas</h4><p>Acompanhe o que aconteceu nesta execução</p></div></div>
        <ol class="execution-timeline"><li v-for="step in data.steps" :key="step._id" :class="step.status"><span class="timeline-marker"><CircleCheck v-if="step.status === 'success'" :size="15" /><AlertCircle v-else-if="step.status === 'failed'" :size="15" /><Clock3 v-else :size="15" /></span><div class="timeline-content"><div class="timeline-title"><strong>{{ step.label || data.graph?.nodes.find(n => n.key === step.nodeKey)?.label || 'Etapa' }}</strong><span class="status-badge" :class="step.status">{{ labels[step.status] }}</span></div><div class="timeline-meta"><span>Tentativa {{ step.attempt }}</span><span>{{ date(step.startedAt || step.createdAt) }}<template v-if="step.finishedAt"> → {{ date(step.finishedAt) }}</template></span></div><div v-if="step.dueAt || step.wait" class="wait-info"><Clock3 :size="13" /><span v-if="step.wait">Espera {{ { duration: 'por duração', event: 'por evento', date: 'por data' }[step.wait.mode] }}</span><span v-if="step.dueAt">até {{ date(step.dueAt) }}</span></div><p v-if="step.error" class="step-error">{{ step.error }}</p></div></li></ol>
        <p v-if="!data.steps.length" class="section-empty">Nenhuma etapa registrada.</p>
      </section>
      <div v-if="activeRunStatuses.includes(data.run.status)" class="cancel-area">
        <template v-if="!confirming"><div><strong>Interromper esta execução</strong><p>Impede que as próximas etapas sejam executadas.</p></div><AppButton variant="outline" class="interrupt-button" @click="confirming = true"><Square :size="14" />Interromper execução</AppButton></template>
        <div v-else class="cancel-confirmation" role="group" aria-label="Confirmar interrupção"><strong>Deseja interromper a execução?</strong><p>As próximas etapas não serão executadas. Mensagens já enviadas e ações já iniciadas não serão desfeitas.</p><div class="confirm-actions"><AppButton variant="outline" :disabled="canceling" @click="confirming = false">Voltar</AppButton><AppButton variant="dangerous" :disabled="canceling" @click="cancel">{{ canceling ? 'Interrompendo…' : 'Confirmar interrupção' }}</AppButton></div></div>
      </div>
      <p v-if="cancelError" class="execution-notice is-error" role="alert">{{ cancelError }}</p>
    </template>
  </div>
</template>
<style scoped>
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.execution-detail{display:flex;flex-direction:column;gap:16px;color:#475569;font-size:.8125rem;line-height:1.5}.execution-detail h3,.execution-detail h4,.execution-detail p{margin:0}.detail-skeleton{display:grid;gap:16px}.execution-summary,.execution-section{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.execution-summary{padding:18px}.summary-heading{display:flex;align-items:center;gap:12px}.summary-icon,.section-heading-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:10px;background:#eff6ff;color:#2563eb}.summary-icon{height:44px;width:44px}.summary-title{flex:1;min-width:0}.eyebrow{font-size:.68rem;color:#64748b;font-weight:500}.summary-title h3{font-size:1rem;font-weight:650;color:#111827;overflow-wrap:anywhere}.summary-subject{display:flex;flex-wrap:wrap;gap:8px 20px;padding:16px 0;color:#475569}.summary-subject>span{display:flex;align-items:center;gap:7px}.summary-subject svg{color:#94a3b8;flex-shrink:0}.view-appointment-button{margin-bottom:14px}.execution-dates{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;padding-top:14px;border-top:1px solid #f1f5f9}.execution-dates>div{display:flex;flex-direction:column;gap:4px}.execution-dates span{display:flex;align-items:center;gap:5px;color:#64748b;font-size:.7rem}.execution-dates strong{font-weight:500;font-size:.75rem;color:#334155}.status-badge{display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;border-radius:20px;padding:3px 9px;background:#f1f5f9;color:#64748b;font-size:.7rem;font-weight:500}.status-badge.running,.status-badge.queued{background:#eff6ff;color:#2563eb}.status-badge.waiting{background:#fffbeb;color:#b45309}.status-badge.completed,.status-badge.success{background:#f0fdf4;color:#15803d}.status-badge.failed{background:#fef2f2;color:#dc2626}.section-heading{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid #f1f5f9}.section-heading-icon{width:34px;height:34px;background:#f8fafc;color:#64748b}.section-heading>div{flex:1;min-width:0}.section-heading h4{font-size:.875rem;font-weight:600;color:#111827}.section-heading p{font-size:.7rem;color:#64748b;margin-top:2px}.version-badge{font-size:.68rem;color:#64748b;border:1px solid #e5e7eb;border-radius:6px;padding:3px 7px;white-space:nowrap}.graph-legend{display:flex;flex-wrap:wrap;gap:14px;padding:12px 18px;font-size:.68rem;color:#64748b}.graph-legend span{display:flex;align-items:center;gap:5px}.graph-legend i,.node-status-dot{width:7px;height:7px;border-radius:50%;background:#cbd5e1}.legend-current{background:#3b82f6!important}.legend-success{background:#22c55e!important}.legend-failed{background:#ef4444!important}.run-canvas{height:360px;background:#f8fafc;border-top:1px solid #f1f5f9}.execution-node{position:relative;background:#fff;border:1px solid #cbd5e1;border-radius:10px;overflow:visible;box-shadow:0 2px 6px #0f172a08;min-height:82px;color:#334155}.node-family{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f8fafc;border-radius:9px 9px 0 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:11px}.node-status-dot{margin-left:auto}.execution-node>strong{display:block;padding:10px 12px;font-size:13px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}.execution-node.running,.execution-node.waiting{border-color:#3b82f6}.execution-node.running .node-family,.execution-node.waiting .node-family{background:#eff6ff;color:#2563eb}.execution-node.running .node-status-dot,.execution-node.waiting .node-status-dot{background:#3b82f6}.execution-node.success{border-color:#86efac}.execution-node.success .node-status-dot{background:#22c55e}.execution-node.failed{border-color:#fca5a5}.execution-node.failed .node-family{background:#fef2f2;color:#dc2626}.execution-node.failed .node-status-dot{background:#ef4444}.execution-detail :deep(.vue-flow__handle){width:6px;height:6px;border:1px solid #94a3b8;background:white}.execution-detail :deep(.vue-flow__edge-path){stroke:#94a3b8}.execution-detail :deep(.vue-flow__controls){box-shadow:0 2px 6px #0f172a12;border:1px solid #e5e7eb;border-radius:7px;overflow:hidden}.execution-timeline{list-style:none;margin:0;padding:18px}.execution-timeline>li{position:relative;display:flex;gap:12px;padding-bottom:20px}.execution-timeline>li:last-child{padding-bottom:0}.execution-timeline>li:not(:last-child):before{content:'';position:absolute;top:28px;bottom:0;left:13px;width:1px;background:#e5e7eb}.timeline-marker{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:28px;height:28px;border:1px solid #e5e7eb;border-radius:50%;background:#f8fafc;color:#64748b;z-index:1}.success .timeline-marker{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0}.failed .timeline-marker{background:#fef2f2;color:#dc2626;border-color:#fecaca}.waiting .timeline-marker,.running .timeline-marker{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}.timeline-content{flex:1;min-width:0;padding-top:2px}.timeline-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.timeline-title>strong{font-size:.8rem;color:#334155;font-weight:600;overflow-wrap:anywhere}.timeline-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:.68rem;color:#64748b}.wait-info{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:8px;font-size:.7rem;color:#64748b}.step-error{margin-top:8px!important;padding:8px 10px;background:#fef2f2;border-radius:6px;color:#b91c1c;font-size:.75rem}.execution-notice{display:flex;align-items:center;gap:9px;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#f8fafc;color:#64748b}.execution-notice svg{flex-shrink:0}.execution-notice.is-error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}.section-empty{padding:20px;color:#64748b}.cancel-area{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.cancel-area strong{font-weight:600;color:#334155;font-size:.8rem}.cancel-area p{font-size:.75rem;color:#64748b;margin-top:4px}.interrupt-button{color:#dc2626;border-color:#fecaca}.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}.cancel-confirmation{width:100%}@media(max-width:600px){.execution-summary{padding:14px}.summary-heading{flex-wrap:wrap}.summary-heading .status-badge{margin-left:56px}.execution-dates{grid-template-columns:1fr}.timeline-title{align-items:flex-start;flex-wrap:wrap}.section-heading{padding:14px}.version-badge{margin-left:auto}.section-heading p{display:none}.cancel-area{align-items:flex-start;flex-direction:column}.execution-timeline{padding:14px}.run-canvas{height:320px}}
</style>
