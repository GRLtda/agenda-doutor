<script setup>
import { ref, onMounted, onUnmounted, computed, watch, markRaw, nextTick, provide, readonly } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useWorkflowsStore } from '@/stores/workflows'
import { useProceduresStore } from '@/stores/procedures'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'
import WorkflowNode from './WorkflowNode.vue'
import WorkflowEdge from '@/components/pages/workflows/WorkflowEdge.vue'
import { workflowSteps, stepTitle, graphSnapshot, canConnectSteps, simulateWorkflow } from '@/utils/workflowEditor'
import MessageTemplateSelect from '@/components/global/MessageTemplateSelect.vue'
import WorkflowLoading from '@/components/pages/workflows/WorkflowLoading.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import { layoutWorkflow } from '@/utils/workflowLayout'
import { ArrowLeft, Save, Play, Plus, Trash2, X, MessageSquare, Zap, Clock, GitBranch, Search, Check, AlertCircle, CalendarDays, CalendarCheck, CalendarX, MousePointerClick, FileText, Stethoscope, CheckCircle2, Circle, ArrowRight, SlidersHorizontal, Copy, Network, Undo2, Unplug } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import { useToast } from 'vue-toastification'

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const route = useRoute()
const router = useRouter()
const workflowsStore = useWorkflowsStore()
const proceduresStore = useProceduresStore()
const templatesStore = useCrmTemplatesStore()
const toast = useToast()

let workflowId = route.params.id
const { onNodeDragStart, onNodeDragStop, onConnect, addEdges, fitView, onNodeClick, onPaneClick, addNodes, project } = useVueFlow()

const nodes = ref([])
const edges = ref([])
const editorLoading = ref(true)
const isLoading = computed(() => editorLoading.value || workflowsStore.loading)
const selectedNode = ref(null)
const isDrawerOpen = ref(false)
const nodeTypesList = computed(() => workflowsStore.nodeTypes || [])
// Register custom node types
const edgeTypes = { default: markRaw(WorkflowEdge) }
const nodeTypes = {
  custom: markRaw(WorkflowNode)
}

// Event type labels for Portuguese display
const eventLabels = {
  'appointment_created': 'Agendamento Criado',
  'appointment_updated': 'Agendamento Atualizado',
  'appointment_confirmed': 'Agendamento Confirmado',
  'appointment_completed': 'Agendamento Realizado',
  'appointment_canceled': 'Agendamento Cancelado',
  'appointment_rescheduled': 'Agendamento Remarcado',
  'procedure_completed': 'Procedimento Realizado',
  'anamnesis_completed': 'Anamnese Respondida',
  'consent_signed': 'Termo Assinado',
  'whatsapp_inbound': 'WhatsApp Recebido',
  'whatsapp_button_clicked': 'Botao WhatsApp Clicado',
  'whatsapp_list_selected': 'Lista WhatsApp Selecionada',
  'manual_started': 'Inicio Manual'
}

// Reuse StyledSelect's native icon support in both trigger and options.
function iconOptions(options) {
  return (options || []).map(option => {
    const text = `${option.value} ${option.label}`.toLowerCase()
    let icon = FileText
    if (/cancel/.test(text)) icon = CalendarX
    else if (/realizado|completed|confirm/.test(text)) icon = CalendarCheck
    else if (/appointment|agendamento|agendado/.test(text)) icon = CalendarDays
    else if (/button|botao|botão|clique/.test(text)) icon = MousePointerClick
    else if (/whatsapp|mensagem|texto|text/.test(text)) icon = MessageSquare
    else if (/procedure|procedimento/.test(text)) icon = Stethoscope
    else if (/tempo|prazo|dias|horas|wait/.test(text)) icon = Clock
    else if (/true|sim|igual|equals/.test(text)) icon = CheckCircle2
    else if (/false|não|nao/.test(text)) icon = Circle
    return { ...option, icon: option.icon || markRaw(icon) }
  })
}

// Options formatted for StyledSelect
const eventTypeOptions = Object.entries(eventLabels).map(([value, label]) => ({
  value,
  label
}))

// Template options for StyledSelect
const templateOptions = computed(() => {
  return templatesStore.templates.map(template => ({
    value: template._id,
    label: template.name
  }))
})

// Procedure options for StyledMultiSelect (sem opção 'todos', pois multi-select vazio = todos)
const procedureOptions = computed(() => {
  const procedures = Array.isArray(proceduresStore.procedures) ? proceduresStore.procedures : []
  return procedures.map(procedure => ({
    value: procedure._id,
    label: procedure.name
  }))
})

const selectedProcedureIds = computed(() => selectedNode.value?.config?.procedure_codes || [])

const conditionPresetOptions = [
  { value: 'appointment_status', label: 'Status do agendamento' },
  { value: 'whatsapp_button', label: 'Botao clicado no WhatsApp' },
  { value: 'whatsapp_text_contains', label: 'Mensagem recebida contem texto' },
  { value: 'whatsapp_has_reply', label: 'Paciente respondeu no WhatsApp' },
  { value: 'invalid_whatsapp', label: 'Paciente com WhatsApp invalido' },
  { value: 'procedure_contains', label: 'Procedimento realizado' },
]

const appointmentStatusOptions = [
  { value: 'Agendado', label: 'Agendado' },
  { value: 'Confirmado', label: 'Confirmado' },
  { value: 'Realizado', label: 'Realizado' },
  { value: 'Cancelado', label: 'Cancelado' },
]

function ensureFirstCondition() {
  if (!selectedNode.value) return null
  selectedNode.value.config ||= {}
  if (!Array.isArray(selectedNode.value.config.conditions) || selectedNode.value.config.conditions.length === 0) {
    selectedNode.value.config.conditions = [{ field: 'event.data.status', operator: 'equals', value: '' }]
  }
  return selectedNode.value.config.conditions[0]
}

function applyConditionPreset(preset) {
  const condition = ensureFirstCondition()
  if (!condition || !selectedNode.value) return

  selectedNode.value.config.preset = preset
  selectedNode.value.config.logic = 'AND'

  const presets = {
    appointment_status: { field: 'event.data.status', operator: 'equals', value: 'Realizado' },
    whatsapp_button: { field: 'event.data.buttonId', operator: 'equals', value: '' },
    whatsapp_text_contains: { field: 'event.data.body', operator: 'contains', value: '' },
    whatsapp_has_reply: { field: 'event.data.body', operator: 'exists', value: '' },
    invalid_whatsapp: { field: 'patient.isInvalidWhatsapp', operator: 'equals', value: true },
    procedure_contains: { field: 'event.data.procedureCodes', operator: 'contains', value: '' },
  }

  Object.assign(condition, presets[preset] || presets.appointment_status)
}

function toggleProcedure(procedureId) {
  if (!selectedNode.value) return
  const current = new Set(selectedNode.value.config.procedure_codes || [])
  if (current.has(procedureId)) current.delete(procedureId)
  else current.add(procedureId)
  selectedNode.value.config.procedure_codes = Array.from(current)
}

function inferConditionPreset(condition) {
  if (!condition) return 'appointment_status'
  if (condition.field === 'event.data.buttonId') return 'whatsapp_button'
  if (condition.field === 'event.data.body' && condition.operator === 'contains') return 'whatsapp_text_contains'
  if (condition.field === 'event.data.body' && condition.operator === 'exists') return 'whatsapp_has_reply'
  if (condition.field === 'patient.isInvalidWhatsapp') return 'invalid_whatsapp'
  if (condition.field === 'event.data.procedureCodes') return 'procedure_contains'
  return 'appointment_status'
}

onMounted(async () => {
  await Promise.allSettled([loadEditor(),workflowsStore.fetchNodeTypes(),proceduresStore.fetchProcedures(),templatesStore.fetchTemplates()])
})
let loadGeneration=0
async function loadEditor() {
  const generation=++loadGeneration
  editorLoading.value=true; initialized.value=false; workflowsStore.error=null
  clearTimeout(fitTimer)
  try {
    await workflowsStore.fetchWorkflowById(workflowId)
    if(disposed || generation!==loadGeneration)return
    if(!workflowsStore.currentWorkflow){editorLoading.value=false;return}
    initializeGraph();initialized.value=true;savedSnapshot.value=graphSnapshot(nodes.value,edges.value)
    await nextTick()
    if(disposed || generation!==loadGeneration)return
    if(!nodes.value.length)await finishEditorLoading(generation)
    else fitTimer=setTimeout(()=>finishEditorLoading(generation),1200)
  } catch {if(!disposed && generation===loadGeneration){workflowsStore.error='Não foi possível carregar o workflow.';editorLoading.value=false}}
}
async function finishEditorLoading(generation=loadGeneration) {
  if(disposed || generation!==loadGeneration || !initialized.value || !editorLoading.value)return
  clearTimeout(fitTimer)
  await nextTick()
  try { await fitView({padding:.25,maxZoom:1}) }
  finally {if(!disposed && generation===loadGeneration)editorLoading.value=false}
}

function initializeGraph() {
  undoHistory.value = []
  // Transform store data to VueFlow format
  const storeNodes = workflowsStore.nodes.map(n => ({
    id: n._id, // Use _id from backend
    type: 'custom',
    position: n.position || { x: 0, y: 0 },
    data: {
      // Pass all node data to the component
      ...n,
      label: n.label || n.name,
    }
  }))

  const storeEdges = workflowsStore.edges.map(e => ({
    id: e._id, // Use _id from backend
    source: e.sourceNodeId,
    target: e.targetNodeId,
    animated: false,
    style: { stroke: '#b1b1b7' },
    sourceHandle: e.conditionKey || undefined,
    label: ({ true: 'Sim, atende', false: 'Não atende', received: 'Resposta recebida', timeout: 'Prazo encerrado' })[e.conditionKey] || undefined
  }))

  // If positions are missing (0,0), run auto-layout
  const needsLayout = storeNodes.every(n => n.position.x === 0 && n.position.y === 0)

  if (needsLayout && storeNodes.length > 0) {
    const layouted = getLayoutedElements(storeNodes, storeEdges)
    nodes.value = layouted.nodes
    edges.value = layouted.edges
  } else {
    nodes.value = storeNodes
    edges.value = storeEdges
  }


}

function getLayoutedElements(nodes, edges) { return layoutWorkflow(nodes, edges) }

const undoHistory = ref([])
function rememberChange() {
  if (!initialized.value) return
  const snapshot = graphSnapshot(nodes.value, edges.value)
  if (undoHistory.value.at(-1) !== snapshot) undoHistory.value.push(snapshot)
  if (undoHistory.value.length > 50) undoHistory.value.shift()
}
function undoChange() {
  if (!undoHistory.value.length) return
  closeDrawer(true); closeSimulation(); pendingSource.value = null
  const snapshot = JSON.parse(undoHistory.value.pop())
  nodes.value = snapshot.nodes.map(node => ({ ...node, type: 'custom' }))
  edges.value = snapshot.edges.map(edge => ({ ...edge, label: branchLabel(edge.sourceHandle), style: { stroke: '#94a3b8', strokeWidth: 1.5 } }))
  scheduleSave()
}
function branchLabel(handle) { return ({ true:'Sim, atende',false:'Não atende',received:'Resposta recebida',timeout:'Prazo encerrado' })[handle] }
// Event Handlers
onNodeDragStart(() => rememberChange())
onNodeDragStop(() => scheduleSave())
onConnect(async params => {
  if (!canConnectSteps(params, edges.value)) { toast.info('Essa ligação já existe ou volta a uma etapa anterior. Escolha outra etapa.'); return }
  rememberChange()
  addEdges([{ ...params, id: `e-${params.source}-${params.sourceHandle || 'next'}-${params.target}`, animated: false, style: { stroke: '#526176', strokeWidth: 1.5 } }])
  scheduleSave()
})

onNodeClick(({ node }) => {
  if (isDrawerOpen.value && !closeDrawer()) return
  procedureSearch.value = ''
  const config = JSON.parse(JSON.stringify(node.data.config || {}))

  // Garante que procedure_codes seja sempre um array para o multi-select
  if (node.data.subtype === 'event_trigger' && config.eventType === 'procedure_completed') {
    if (!Array.isArray(config.procedure_codes)) {
      // Migra de procedureId legado para procedure_codes se necessário
      if (config.procedureId) {
        config.procedure_codes = [config.procedureId]
      } else {
        config.procedure_codes = []
      }
    }
  }

  if (node.data.subtype === 'condition_rules') {
    config.logic = config.logic || 'AND'
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      config.conditions = [{ field: 'event.data.status', operator: 'equals', value: '' }]
    }
    config.preset = config.preset || inferConditionPreset(config.conditions[0])
  }

  if (node.data.subtype === 'wait_event') {
    config.eventType = config.eventType || 'whatsapp_inbound'
    config.timeoutAmount = config.timeoutAmount || 3
    config.timeoutUnit = config.timeoutUnit || 'days'
    config.buttonId = config.buttonId || ''
    config.rowId = config.rowId || ''
    config.textContains = config.textContains || ''
  }

  if (node.data.subtype === 'restart_on_event') {
    config.eventType = config.eventType || 'procedure_completed'
    if (!Array.isArray(config.procedure_codes)) {
      config.procedure_codes = config.procedureIds || []
    }
  }

  selectedNode.value = {
    ...node.data,
    config
  }
  draftSnapshot.value = JSON.stringify(selectedNode.value)
  nodeError.value = ''
  isDrawerOpen.value = true
})

onPaneClick(() => { if (isDrawerOpen.value) closeDrawer() })
function closeDrawer(force = false) {
  if (!force) applySidebarChanges()
  selectedNode.value = null
  isDrawerOpen.value = false
  draftSnapshot.value = ''
  return true
}
function applySidebarChanges() {
  if (!selectedNode.value || !draftDirty.value) return
  const node = nodes.value.find(node => node.id === selectedNode.value._id)
  if (!node) return
  rememberChange()
  node.data = JSON.parse(JSON.stringify(selectedNode.value))
  draftSnapshot.value = JSON.stringify(selectedNode.value)
  nodeError.value = selectedNode.value.subtype === 'send_message' && !selectedNode.value.config.templateId ? 'Escolha um modelo de mensagem antes de publicar.' : ''
  scheduleSave()
}
watch(() => selectedNode.value?.config, () => applySidebarChanges(), { deep: true })
const procedureSearch = ref('')
const filteredProcedureOptions = computed(() => procedureOptions.value.filter(option => option.label.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(procedureSearch.value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase())))
const eventGroups = [
  { value: 'appointment', label: 'Agendamento', icon: markRaw(CalendarDays) },
  { value: 'procedure', label: 'Procedimento', icon: markRaw(Stethoscope) },
  { value: 'whatsapp', label: 'WhatsApp', icon: markRaw(MessageSquare) },
  { value: 'anamnesis', label: 'Anamnese', icon: markRaw(FileText) },
  { value: 'consent', label: 'Termo de consentimento', icon: markRaw(FileText) },
  { value: 'manual', label: 'Início manual', icon: markRaw(Play) },
]
const eventGroup = computed({
  get: () => selectedNode.value?.config.eventType?.split('_')[0] || '',
  set: value => { const option = eventTypeOptions.find(option => option.value.startsWith(value + '_')); if (option) selectedNode.value.config.eventType = option.value },
})
const groupedEventOptions = computed(() => eventTypeOptions.filter(option => option.value.startsWith(eventGroup.value + '_')).map(option => ({ ...option, label: ({ appointment_created: 'Quando for criado', appointment_updated: 'Quando for atualizado', appointment_confirmed: 'Quando for confirmado', appointment_completed: 'Quando for realizado', appointment_canceled: 'Quando for cancelado', appointment_rescheduled: 'Quando for remarcado' })[option.value] || option.label })))
const pendingSource = ref(null)
provide('workflowInsertEdge', id => {
  const edge = edges.value.find(edge => edge.id === id)
  if (!edge) return
  applySidebarChanges(); closeDrawer()
  pendingSource.value = { id: edge.source, handle: edge.sourceHandle || null, edgeId: id }
  paletteOpen.value = true; paletteSearch.value = ''
})
provide('workflowEdgeMenu', (id,event) => openContextMenu({event,edgeId:id}))
provide('workflowConnections', readonly(edges))
provide('workflowAddNext', (id, handle) => {
  applySidebarChanges()
  if (!nodes.value.some(node => node.id === id)) return
  pendingSource.value = { id, handle }
  paletteOpen.value = true; paletteSearch.value = ''; closeDrawer()
})
const contextMenu = ref(null)
const simulation = ref(null)
const simulationIndex = ref(-1)
const simulationRunning = ref(false)
const simulationOrder = computed(() => simulation.value ? [...new Set([...simulation.value.steps.map(step => step.nodeId), ...simulation.value.issues.map(issue => issue.nodeId).filter(Boolean)])] : [])
const simulationReviewed = computed(() => new Set(simulationOrder.value.slice(0, simulationIndex.value + 1)))
const simulationVisual = computed(() => ({
  current: simulationRunning.value ? simulationOrder.value[simulationIndex.value] : null,
  reviewed: simulationReviewed.value,
  errors: new Set((simulation.value?.issues || []).filter(issue => simulationReviewed.value.has(issue.nodeId)).map(issue => issue.nodeId)),
}))
provide('workflowSimulation', readonly(simulationVisual))
const visibleSimulationIssues = computed(() => (simulation.value?.issues || []).filter(issue => !issue.nodeId || simulationReviewed.value.has(issue.nodeId)))
const simulationProgress = computed(() => simulationOrder.value.length ? Math.round((simulationIndex.value + 1) / simulationOrder.value.length * 100) : 100)
let simulationTimer
function stopSimulation() { clearTimeout(simulationTimer); simulationRunning.value = false }
function closeSimulation() { stopSimulation(); simulation.value = null; simulationIndex.value = -1 }
function skipSimulation() { stopSimulation(); simulationIndex.value = simulationOrder.value.length - 1; fitView({ padding: .3, maxZoom: 1 }) }
function advanceSimulation() {
  if (!simulation.value || disposed) return
  simulationIndex.value++
  const id = simulationOrder.value[simulationIndex.value]
  if (!id) { stopSimulation(); return }
  focusSimulationNode(id)
  simulationTimer = setTimeout(() => {
    if (simulationIndex.value >= simulationOrder.value.length - 1) { stopSimulation(); return }
    advanceSimulation()
  }, 850)
}
watch(() => graphSnapshot(nodes.value, edges.value), () => {
  if (simulation.value) { stopSimulation(); simulation.value = simulateWorkflow(nodes.value, edges.value); simulationIndex.value = simulationOrder.value.length - 1 }
})
function openContextMenu({ event, node, edgeId } = {}) {
  if (!event) return
  event.preventDefault(); event.stopPropagation()
  contextMenu.value = { x: Math.max(8, Math.min(event.clientX, window.innerWidth - 230)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 160)), nodeId: node?.id, edgeId }
}
async function copyContextNode() {
  applySidebarChanges()
  const source = nodes.value.find(node => node.id === contextMenu.value?.nodeId)
  contextMenu.value = null
  if (!source) return
  rememberChange()
  syncCanvasToStore()
  const node = await workflowsStore.addNode({ type: source.data.type, subtype: source.data.subtype, config: JSON.parse(JSON.stringify(source.data.config || {})), label: source.data.label, position: { x: source.position.x + 320, y: source.position.y + 40 } }, { persist: false })
  addNodes([{ id: node._id, type: 'custom', position: node.position, data: node }]); scheduleSave()
}
async function organizeFlow() {
  applySidebarChanges(); contextMenu.value = null
  rememberChange()
  const layout = getLayoutedElements(nodes.value, edges.value)
  nodes.value = layout.nodes
  await nextTick(); fitView({ padding: .25, maxZoom: 1 }); scheduleSave()
}
async function runSimulation() {
  applySidebarChanges(); closeDrawer(); contextMenu.value = null; stopSimulation()
  await nextTick()
  if (disposed) return
  simulation.value = simulateWorkflow(nodes.value, edges.value)
  simulationIndex.value = -1
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { skipSimulation(); return }
  simulationRunning.value = simulationOrder.value.length > 0
  if (simulationRunning.value) advanceSimulation()
}
function focusSimulationNode(id) {
  const node = nodes.value.find(node => node.id === id)
  if (node) fitView({ nodes: [node], padding: .8, minZoom: .8, maxZoom: 1, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 })
}
function dismissContext(event) { if (!event.target.closest?.('.canvas-context-menu')) contextMenu.value = null }
function syncCanvasToStore() {
  workflowsStore.nodes = nodes.value.map(node => ({
    ...(node.data || {}),
    _id: node.id,
    key: node.data?.key || node.id,
    position: node.position,
    label: node.data?.label || node.data?.name,
  }))

  workflowsStore.edges = edges.value
    .filter(edge => edge.source && edge.target)
    .map(edge => ({
      ...edge,
      _id: edge.id,
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      conditionKey: edge.sourceHandle || edge.label,
    }))
}

let saveTimer
let saveFlight = null
let saveRequested = false
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveCanvasGraph().catch(() => {}) }, 700)
}
async function saveCanvasGraph() {
  clearTimeout(saveTimer)
  saveRequested = true
  if (saveFlight) return saveFlight
  saveFlight = Promise.resolve().then(async () => {
    pendingSaves.value++
    try {
      while (saveRequested && !disposed) {
        saveRequested = false
        const ids = new Set(nodes.value.map(node => node.id))
        if (ids.size !== nodes.value.length || nodes.value.some(node => !node.id || !node.data?.type || !node.data?.subtype) || edges.value.some(edge => !ids.has(edge.source) || !ids.has(edge.target))) throw new Error('Grafo inválido')
        const snapshot = graphSnapshot(nodes.value, edges.value)
        if (snapshot === savedSnapshot.value) continue
        syncCanvasToStore()
        saveError.value = ''
        await workflowsStore.saveDraftGraph({ preserveLocal: true })
        if (!disposed) savedSnapshot.value = snapshot
        if (!disposed && graphSnapshot(nodes.value, edges.value) !== snapshot) saveRequested = true
      }
    } catch (error) {
      if (!disposed) saveError.value = 'Alterações não salvas. Tente novamente.'
      throw error
    } finally { pendingSaves.value--; saveFlight = null }
  })
  return saveFlight
}
async function persistCanvasRemoval(changes) {
  if (!Array.isArray(changes) || !changes.some(change => change.type === 'remove')) return

  await nextTick()
  try {
    scheduleSave()
  } catch (error) {
    // Pending edits remain available for retry
  }
}

async function deleteSelectedNode() {
  if (!selectedNode.value || !confirm('Excluir esta etapa e suas ligações?')) return
  const id = selectedNode.value._id
  rememberChange()
  nodes.value = nodes.value.filter(node => node.id !== id)
  edges.value = edges.value.filter(edge => edge.source !== id && edge.target !== id)
  closeDrawer(true)
  scheduleSave()
}
function deleteContextNode() {
  const id=contextMenu.value?.nodeId
  if (!id || !confirm('Excluir esta etapa? Todas as ligações de entrada e saída dela também serão excluídas.'))return
  rememberChange(); nodes.value=nodes.value.filter(node=>node.id!==id)
  edges.value=edges.value.filter(edge=>edge.source!==id&&edge.target!==id)
  closeDrawer(true);contextMenu.value=null;scheduleSave()
}
function disconnectContextEdge() {
  const id = contextMenu.value?.edgeId
  if (!id || !confirm('Desconectar esta ligação? As etapas serão mantidas.')) return
  rememberChange(); edges.value = edges.value.filter(edge => edge.id !== id)
  contextMenu.value = null; scheduleSave()
}
function deleteContextTarget() {
  const edge = edges.value.find(edge => edge.id === contextMenu.value?.edgeId)
  if (!edge || !confirm('Excluir a etapa de destino? Todas as ligações de entrada e saída dela também serão excluídas. As outras etapas serão mantidas.')) return
  rememberChange()
  nodes.value = nodes.value.filter(node => node.id !== edge.target)
  edges.value = edges.value.filter(candidate => candidate.source !== edge.target && candidate.target !== edge.target)
  closeDrawer(true); contextMenu.value = null; scheduleSave()
}
function goBack() {
  router.push('/workflows')
}

// Drag and Drop Logic
function onDragStart(event, nodeType, subtype) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', JSON.stringify({ type: nodeType, subtype }))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(event) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

async function addStep(type, subtype, position) {
  if (isLoading.value || !workflowsStore.currentWorkflow) return
  if (!workflowSteps.some(step => step.type === type && step.subtype === subtype)) return
  const source = pendingSource.value
  if (source && (type === 'event' || (source.edgeId && ['end_flow','restart_flow'].includes(subtype)))) return
  const replaced = source?.edgeId ? edges.value.find(edge => edge.id === source.edgeId) : null
  if (source?.edgeId && !replaced) { pendingSource.value = null; return }
  rememberChange()
  pendingSource.value = null
  syncCanvasToStore()
  const node = await workflowsStore.addNode({ type, subtype, position, label: stepTitle(subtype) }, { persist: false })
  if (disposed) return
  addNodes([{ id: node._id, type: 'custom', position: node.position, data: { ...node, label: stepTitle(subtype) } }])
  if (replaced) {
    edges.value = [...edges.value.filter(edge => edge.id !== replaced.id),
      { ...replaced, id: `${replaced.id}-before-${node._id}`, target: node._id, targetHandle: null },
      { id: `${replaced.id}-after-${node._id}`, source: node._id, target: replaced.target, targetHandle: replaced.targetHandle, sourceHandle: subtype === 'condition_rules' ? 'true' : subtype === 'wait_event' ? 'received' : null, label: subtype === 'condition_rules' ? 'Sim, atende' : subtype === 'wait_event' ? 'Resposta recebida' : undefined, style: { stroke: '#94a3b8', strokeWidth: 1.5 } },
    ]
    const descendants = new Set(), queue = [replaced.target]
    while (queue.length) { const id = queue.pop(); if (descendants.has(id)) continue; descendants.add(id); edges.value.filter(edge => edge.source === id).forEach(edge => queue.push(edge.target)) }
    const target = nodes.value.find(candidate => candidate.id === replaced.target)
    const offset = Math.max(0, position.y + 220 - (target?.position.y || 0))
    nodes.value.forEach(candidate => { if (descendants.has(candidate.id)) candidate.position = { ...candidate.position, y: candidate.position.y + offset } })
  } else if (source && nodes.value.some(candidate => candidate.id === source.id)) {
    const connection = { source: source.id, target: node._id, sourceHandle: source.handle }
    if (canConnectSteps(connection, edges.value)) addEdges([{ ...connection, id: `e-${source.id}-${source.handle || 'next'}-${node._id}`, label: ({ true: 'Sim, atende', false: 'Não atende', received: 'Resposta recebida', timeout: 'Prazo encerrado' })[source.handle], style: { stroke: '#94a3b8', strokeWidth: 1.5 } }])
  }
  scheduleSave()
  if (window.innerWidth < 769) paletteOpen.value = false
}
function addStepFromMenu(step) {
  const area = document.querySelector('.vue-flow-basic')?.getBoundingClientRect()
  if (!area) return
  const source = nodes.value.find(node => node.id === pendingSource.value?.id)
  const offset = ['true', 'received'].includes(pendingSource.value?.handle) ? -160 : ['false','timeout'].includes(pendingSource.value?.handle) ? 160 : 0
  const position = source ? { x: source.position.x + offset, y: source.position.y + (source.dimensions?.height || 150) + 100 } : project({ x: area.width * .55, y: area.height * .3 })
  while (nodes.value.some(node => Math.abs(node.position.x - position.x) < 280 && Math.abs(node.position.y - position.y) < 160)) position.y += 210
  return addStep(step.type, step.subtype, position)
}
async function onDrop(event) {
  event.preventDefault()
  try {
    const payload = JSON.parse(event.dataTransfer?.getData('application/vueflow') || '{}')
    const area = document.querySelector('.vue-flow-basic')?.getBoundingClientRect()
    if (!area) return
    await addStep(payload.type, payload.subtype, project({ x: event.clientX - area.left, y: event.clientY - area.top }))
  } catch { toast.info('Escolha uma etapa na lista para adicioná-la.') }
}
// Dynamic Form Helpers
const currentNodeSchema = computed(() => {
  if (!selectedNode.value) return []
  if (!Array.isArray(nodeTypesList.value)) return []

  const typeDef = nodeTypesList.value.find(t => t.type === selectedNode.value.type)
  if (!typeDef) return []

  const subtypeDef = typeDef.subtypes.find(s => s.subtype === selectedNode.value.subtype)
  return subtypeDef ? subtypeDef.configSchema : []
})

async function handleSave() {
  applySidebarChanges()
  if (!workflowsStore.currentWorkflow || isSaving.value) return
  try { await saveCanvasGraph() } catch {}
}
async function handleToggleStatus() {
  applySidebarChanges()
  if (!workflowsStore.currentWorkflow || isSaving.value) return
  if (!confirm('Publicar este fluxo? Novas jornadas passarão a usar esta versão.')) return
  try {
    await saveCanvasGraph()
    pendingSaves.value++
    await workflowsStore.activateWorkflow(workflowId)
  } catch { saveError.value = 'Não foi possível publicar. Confira as etapas e tente novamente.' }
  finally { pendingSaves.value = Math.max(0, pendingSaves.value - 1) }
}
const pendingSaves = ref(0)
async function reloadEditor() { await loadEditor() }
function validConnection(connection) { return canConnectSteps(connection, edges.value.filter(edge => edge.id !== connection.id)) }
const isSaving = computed(() => pendingSaves.value > 0)
const saveError = ref('')
const nodeError = ref('')
const initialized = ref(false)
const savedSnapshot = ref('')
const draftSnapshot = ref('')
const draftDirty = computed(() => isDrawerOpen.value && JSON.stringify(selectedNode.value) !== draftSnapshot.value)
const graphDirty = computed(() => initialized.value && graphSnapshot(nodes.value, edges.value) !== savedSnapshot.value)
const paletteOpen = ref(true)
const paletteSearch = ref('')
const filteredSteps = computed(() => workflowSteps.filter(step => (!pendingSource.value || step.type !== 'event') && (!pendingSource.value?.edgeId || !['end_flow','restart_flow'].includes(step.subtype)) && `${step.title} ${step.description}`.toLowerCase().includes(paletteSearch.value.toLowerCase())))
const stepIcons = { event: Zap, action: MessageSquare, wait: Clock, condition: GitBranch, control: Plus }
const saveState = computed(() => isLoading.value ? 'Carregando…' : saveError.value || (isSaving.value ? 'Salvando…' : draftDirty.value ? 'Etapa em edição' : graphDirty.value ? 'Alterações pendentes' : 'Tudo salvo'))
let disposed = false
let fitTimer
async function guardLeave() {
  applySidebarChanges()
  try { if (graphDirty.value || isSaving.value) await saveCanvasGraph(); return true }
  catch { toast.info('Não foi possível salvar. Tente novamente antes de sair.'); return false }
}
function beforeUnload(event) { if (isSaving.value || graphDirty.value || draftDirty.value) { event.preventDefault(); event.returnValue = '' } }
function editorKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.target.closest?.('input,textarea,[contenteditable=true]')) { event.preventDefault(); undoChange(); return }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); handleSave() }
  if (event.key === 'Escape') { contextMenu.value = null; closeSimulation() }
  if (event.key === 'Escape' && isDrawerOpen.value && !event.target?.closest?.('[role=combobox]')) closeDrawer()
}
onBeforeRouteLeave(guardLeave)
onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id === from.params.id) return true
  if (!await guardLeave()) return false
  workflowId = to.params.id
  initialized.value = false
  closeDrawer(true)
  await loadEditor()
  return true
})
onMounted(() => { document.addEventListener('pointerdown', dismissContext); window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', editorKeydown) })
onUnmounted(() => { disposed = true; stopSimulation(); clearTimeout(fitTimer); clearTimeout(saveTimer); document.removeEventListener('pointerdown', dismissContext); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', editorKeydown) })</script>

<template>
  <div class="workflow-editor-page">
    <header class="editor-header">
      <div class="header-left"><button class="header-icon-btn" aria-label="Voltar para workflows" @click="goBack"><ArrowLeft :size="18" /></button><div class="header-heading"><span class="workflow-name">{{ workflowsStore.currentWorkflow?.name || 'Carregando workflow…' }}</span><span class="workflow-status-badge" :class="{ active: workflowsStore.currentWorkflow?.isActive }">{{ workflowsStore.currentWorkflow?.isActive ? 'Publicado' : workflowsStore.currentWorkflow?.status === 'inactive' ? 'Inativo' : 'Rascunho' }}</span></div></div>
      <div class="header-right"><AppButton variant="outline" aria-label="Desfazer última alteração" :disabled="!undoHistory.length || isLoading" @click="undoChange"><Undo2 :size="16" /><span>Desfazer</span></AppButton><span class="save-state" :class="{ error: saveError }" role="status"><Check v-if="!isLoading && !saveError && !isSaving && !graphDirty && !draftDirty" :size="14" />{{ saveState }}</span><AppButton variant="outline" aria-label="Salvar rascunho" :disabled="isSaving || isLoading" @click="handleSave"><Save :size="16" /><span>Salvar</span></AppButton><AppButton variant="primary" aria-label="Publicar fluxo" :disabled="isSaving || isLoading || !workflowsStore.currentWorkflow" @click="handleToggleStatus"><Play :size="15" /><span>{{ workflowsStore.currentWorkflow?.isActive ? 'Publicar versão' : 'Publicar' }}</span></AppButton></div>
    </header>
    <div class="editor-layout">
      <div v-if="saveError && !isDrawerOpen" class="save-failure" role="alert">{{ saveError }} <button @click="handleSave">Tentar novamente</button></div>
      <button class="palette-toggle" :aria-expanded="paletteOpen" @click="paletteOpen = !paletteOpen; if (!paletteOpen) pendingSource = null"><Plus :size="16" />Adicionar etapa</button>
      <aside v-if="paletteOpen" class="nodes-sidebar" aria-label="Etapas disponíveis">
        <div class="sidebar-header"><div><h3>{{ pendingSource ? 'Escolha a próxima etapa' : 'Adicionar etapa' }}</h3><p>{{ pendingSource ? (pendingSource.edgeId ? 'A etapa será inserida entre as duas existentes.' : 'A nova etapa será conectada automaticamente.') : 'Clique para adicionar ou arraste para o fluxo.' }}</p></div><button class="header-icon-btn" aria-label="Recolher etapas" @click="paletteOpen = false; pendingSource = null"><X :size="16" /></button></div>
        <div class="palette-search"><Search :size="15" /><input v-model="paletteSearch" aria-label="Buscar etapa" placeholder="Buscar etapa" /></div>
        <div class="nodes-list"><button v-for="step in filteredSteps" :key="step.subtype" class="node-item" :disabled="isLoading" draggable="true" @dragstart="onDragStart($event, step.type, step.subtype)" @click="addStepFromMenu(step)"><div class="node-item-icon" :class="`icon-${step.type}`"><component :is="stepIcons[step.type]" :size="17" /></div><div class="node-item-content"><span class="node-item-label">{{ step.title }}</span><span class="node-item-desc">{{ step.description }}</span></div><Plus :size="14" class="step-add-icon" /></button><p v-if="!filteredSteps.length" class="palette-no-results">Nenhuma etapa encontrada.</p></div>
      </aside>
      <div class="editor-container" @drop="onDrop" @dragover="onDragOver">
        <div v-if="workflowsStore.error && !workflowsStore.currentWorkflow" class="loading-overlay editor-error" role="alert"><p>Não foi possível carregar este fluxo.</p><AppButton variant="outline" @click="reloadEditor">Tentar novamente</AppButton></div>
        <WorkflowLoading v-else-if="isLoading" />

        <VueFlow @node-context-menu="openContextMenu" @pane-context-menu="event => openContextMenu({ event })"
          v-if="initialized && workflowsStore.currentWorkflow"
          @nodes-initialized="finishEditorLoading()"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes" :edge-types="edgeTypes"
          :default-viewport="{ zoom: 1 }"
          :min-zoom="0.2"
          :max-zoom="4"
          :nodes-draggable="true" :nodes-connectable="true" :delete-key-code="null" :is-valid-connection="validConnection"
          fit-view-on-init
          class="vue-flow-basic"
          @nodes-change="persistCanvasRemoval"
          @edges-change="persistCanvasRemoval"
        >
          <Background pattern-color="#171717" :gap="20" :size="1" />
          <Controls :show-interactive="false"><button class="vue-flow__controls-button simulation-button" title="Simular fluxo" aria-label="Simular fluxo" @click="runSimulation"><Play :size="17" /></button></Controls>
        </VueFlow>
      </div>
    </div>

    <div v-if="contextMenu" class="canvas-context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" role="menu" aria-label="Opções do fluxo" @contextmenu.prevent>
      <template v-if="contextMenu.edgeId"><button role="menuitem" @click="disconnectContextEdge"><Unplug :size="16" />Desconectar ligação</button><button role="menuitem" class="edge-delete-action" @click="deleteContextTarget"><Trash2 :size="16" />Excluir etapa de destino</button></template>
      <button v-if="contextMenu.nodeId" role="menuitem" @click="copyContextNode"><Copy :size="16" />Copiar etapa</button>
      <button v-if="contextMenu.nodeId" role="menuitem" class="edge-delete-action" @click="deleteContextNode"><Trash2 :size="16" />Excluir etapa</button>
      <button role="menuitem" @click="organizeFlow"><Network :size="16" />Reorganizar etapas</button>
      <button role="menuitem" @click="runSimulation"><Play :size="16" />Simular fluxo</button>
      <button v-if="!contextMenu.nodeId && !contextMenu.edgeId" role="menuitem" @click="paletteOpen = true; contextMenu = null"><Plus :size="16" />Adicionar etapa</button>
    </div>
    <section v-if="simulation" class="simulation-panel" aria-label="Simulação do fluxo">
      <div class="simulation-heading"><span class="simulation-heading-icon"><Play :size="20" /></span><div><span class="inspector-eyebrow">Revisão da jornada</span><h2>Simulação do fluxo</h2></div><button class="header-icon-btn" aria-label="Fechar simulação" @click="closeSimulation"><X :size="18" /></button></div>
      <p class="simulation-note">Verificação dos caminhos, sem enviar mensagens ou alterar pacientes.</p>
      <div class="simulation-status" :class="{ 'has-errors': visibleSimulationIssues.length }" role="status"><strong>{{ simulationRunning ? 'Verificando etapas…' : visibleSimulationIssues.length ? 'Correções necessárias' : 'Verificação concluída' }}</strong><span>{{ simulationRunning ? `${simulationIndex + 1} de ${simulationOrder.length} etapas` : `${simulationOrder.length} etapas verificadas` }}</span><div class="simulation-progress"><div :style="{ width: simulationProgress + '%' }"></div></div><button v-if="simulationRunning" class="simulation-skip" @click="skipSimulation">Pular para o resultado <ArrowRight :size="14" /></button></div>
      <div class="simulation-results" aria-live="polite">
        <h3 v-if="visibleSimulationIssues.length">{{ visibleSimulationIssues.length }} ponto(s) para corrigir</h3>
        <button v-for="(issue, i) in visibleSimulationIssues" :key="i" class="simulation-issue" @click="focusSimulationNode(issue.nodeId)"><AlertCircle :size="18" /><span><strong>{{ issue.title }}</strong>{{ issue.message }}</span><ArrowRight :size="15" /></button>
        <h3>Etapas da jornada</h3>
        <ol class="simulation-timeline"><li v-for="(step, i) in simulation.steps" :key="step.nodeId" :class="{ 'step-error': simulationVisual.errors.has(step.nodeId), 'step-current': simulationVisual.current === step.nodeId, 'step-reviewed': simulationReviewed.has(step.nodeId) }"><span class="timeline-marker"><AlertCircle v-if="simulationVisual.errors.has(step.nodeId)" :size="16" /><Check v-else-if="simulationReviewed.has(step.nodeId)" :size="16" /><span v-else>{{ i + 1 }}</span></span><button @click="focusSimulationNode(step.nodeId)"><strong>{{ step.title }}</strong><span>{{ step.description }}</span><small>{{ simulationVisual.current === step.nodeId ? 'Verificando agora' : simulationVisual.errors.has(step.nodeId) ? 'Precisa corrigir' : simulationReviewed.has(step.nodeId) ? 'Verificada' : 'Aguardando verificação' }}</small></button></li></ol>
        <p v-if="!simulationRunning" class="simulation-note">Modelos e serviços também serão validados na execução real.</p>
      </div>
    </section>
    <!-- Side Drawer for Node Editing -->
    <aside v-if="isDrawerOpen" :class="`inspector-${selectedNode?.type || 'action'}`" class="node-inspector" aria-label="Configurar etapa">
      <div class="inspector-heading"><div class="drawer-header"><div class="inspector-title-group"><span class="inspector-step-icon"><component :is="stepIcons[selectedNode?.type] || SlidersHorizontal" :size="20" /></span><div><span class="inspector-eyebrow">Configurar etapa</span><h2>{{ selectedNode ? stepTitle(selectedNode.subtype) : 'Detalhes' }}</h2></div></div><button class="header-icon-btn" aria-label="Fechar configuração" @click="closeDrawer()"><X :size="18" /></button></div></div>
      <div v-if="selectedNode" class="node-edit-form"><p v-if="nodeError || saveError" class="node-error" role="alert">{{ nodeError || saveError }}</p>

        <!-- Node Description Section -->
        <div class="node-description-card" v-if="selectedNode.subtype === 'send_message'">
          <div class="description-icon">
            <MessageSquare :size="20" />
          </div>
          <div class="description-content">
            <h4>Enviar Mensagem via WhatsApp</h4>
            <p>Este bloco envia automaticamente uma mensagem para o paciente quando ativado pelo fluxo do workflow.</p>
          </div>
        </div>

        <!-- Send Message: Template Selector (Custom handling) -->
        <template v-if="selectedNode.subtype === 'send_message'">
          <div class="form-section">
            <h3 class="section-title">Configuração da Mensagem</h3>

            <MessageTemplateSelect
              v-model="selectedNode.config.templateId"
              label="Modelo de Mensagem"
              :options="iconOptions(templateOptions)"
              :required="true" :error="nodeError" @update:model-value="nodeError = ''"
            />

            <div class="field-hint">
              <span class="hint-icon" aria-hidden="true"><AlertCircle :size="14" /></span>
              <span>Os modelos são criados em <strong>Marketing → Modelos</strong>. Eles podem conter variáveis como {paciente}, {data_consulta}, etc.</span>
            </div>
          </div>

          <details class="info-card"><summary>Ver exemplo</summary>
            <h4>Como funciona?</h4>
            <ul>
              <li>Quando o workflow chegar neste nó, a mensagem será enviada via WhatsApp</li>
              <li>As variáveis do modelo serão substituídas pelos dados reais do paciente</li>
              <li>O envio será registrado no histórico de mensagens</li>
            </ul>
          </details>
        </template>

        <template v-else-if="selectedNode.subtype === 'request_media'">
          <div class="node-description-card">
            <div class="description-icon">
              <MessageSquare :size="20" />
            </div>
            <div class="description-content">
              <h4>Pedir Foto ou Arquivo</h4>
              <p>Envie um modelo pedindo uma midia e conecte este bloco a um Esperar Evento para aguardar a resposta.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Mensagem de Solicitação</h3>
            <MessageTemplateSelect
              v-model="selectedNode.config.templateId"
              label="Modelo de Mensagem"
              :options="iconOptions(templateOptions)"
              :required="true" :error="nodeError" @update:model-value="nodeError = ''"
            />
          </div>
        </template>

        <!-- Event Trigger: Custom handling with StyledSelect -->
        <template v-else-if="selectedNode.subtype === 'event_trigger'">
          <!-- Description Card -->
          <div class="node-description-card node-description-event">
            <div class="description-icon event-icon">
              <Zap :size="20" />
            </div>
            <div class="description-content">
              <h4>Quando esta jornada começa?</h4>
              <p>Escolha o que precisa acontecer para iniciar as próximas etapas para o paciente.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Escolha quando começar</h3>

            <StyledSelect v-model="eventGroup" label="O que inicia a jornada?" :options="eventGroups" placeholder="Escolha uma categoria" />
            <StyledSelect v-if="eventGroup" v-model="selectedNode.config.eventType" :label="eventGroup === 'appointment' ? 'Quando o agendamento…' : 'O que deve acontecer?'" :options="iconOptions(groupedEventOptions)" :required="true" />

            <!-- Conditional Procedure Multi-Select for Combos -->
            <div v-if="selectedNode.config.eventType === 'procedure_completed'" class="procedure-picker">
              <div class="procedure-picker-header">
                <label>Procedimentos</label>
                <button type="button" class="link-button" @click="selectedNode.config.procedure_codes = []">
                  Todos
                </button>
              </div>
              <div class="procedure-search"><Search :size="15" /><input v-model="procedureSearch" placeholder="Buscar procedimento" aria-label="Buscar procedimento" /></div>
              <div v-if="procedureOptions.length === 0" class="empty-inline">
                Nenhum procedimento cadastrado para esta clinica.
              </div>
              <p v-if="procedureOptions.length && !filteredProcedureOptions.length" class="empty-inline">Nenhum procedimento encontrado.</p>
              <div v-if="procedureOptions.length" class="procedure-chip-list">
                <button
                  v-for="procedure in filteredProcedureOptions"
                  :key="procedure.value"
                  type="button"
                  class="procedure-chip"
                  :class="{ selected: selectedProcedureIds.includes(procedure.value) }"
                  @click="toggleProcedure(procedure.value)"
                >
                  {{ procedure.label }}
                </button>
              </div>
            </div>

            <div v-if="selectedNode.config.eventType === 'procedure_completed'" class="field-hint">
              <span class="hint-icon" aria-hidden="true"><AlertCircle :size="14" /></span>
              <span>Deixe em branco para disparar em qualquer procedimento. Selecione múltiplos para criar uma combo (ex: Botox + Fios). O workflow só dispara quando TODOS forem realizados juntos.</span>
            </div>
          </div>

          <details class="info-card"><summary>Ver exemplo</summary>
            <h4>Eventos Disponíveis</h4>
            <ul>
              <li><strong>Agendamento Criado:</strong> Dispara quando um novo agendamento é criado</li>
              <li><strong>Agendamento Realizado:</strong> Dispara quando um atendimento é finalizado</li>
              <li><strong>Agendamento Cancelado:</strong> Dispara quando um agendamento é cancelado</li>
            </ul>
          </details>
        </template>

        <!-- Wait Days: Custom handling -->
        <template v-else-if="selectedNode.subtype === 'wait_days'">
          <!-- Description Card -->
          <div class="node-description-card node-description-wait">
            <div class="description-icon wait-icon">
              <Clock :size="20" />
            </div>
            <div class="description-content">
              <h4>Tempo de Espera</h4>
              <p>Este bloco pausa a execução do workflow pelo tempo configurado antes de continuar.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Configuração do Tempo</h3>

            <div class="time-inputs-grid">
              <div class="form-group">
                <label>Meses</label>
                <input
                  type="number"
                  v-model.number="selectedNode.config.months"
                  class="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div class="form-group">
                <label>Dias</label>
                <input
                  type="number"
                  v-model.number="selectedNode.config.days"
                  class="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div class="form-group">
                <label>Horas</label>
                <input
                  type="number"
                  v-model.number="selectedNode.config.hours"
                  class="form-input"
                  placeholder="0"
                  min="0"
                  max="23"
                />
              </div>

              <div class="form-group">
                <label>Minutos</label>
                <input
                  type="number"
                  v-model.number="selectedNode.config.minutes"
                  class="form-input"
                  placeholder="0"
                  min="0"
                  max="59"
                />
              </div>
            </div>

            <div class="field-hint">
              <span class="hint-icon" aria-hidden="true"><AlertCircle :size="14" /></span>
              <span>Defina pelo menos um valor. O tempo total será a soma de dias + horas + minutos.</span>
            </div>
          </div>

          <details class="info-card"><summary>Ver exemplo</summary>
            <h4>Como funciona?</h4>
            <ul>
              <li>O workflow será pausado pelo tempo configurado</li>
              <li>Útil para enviar lembretes após X dias de um agendamento</li>
              <li>Exemplo: Aguardar 7 dias para enviar pesquisa de satisfação</li>
            </ul>
          </details>
        </template>

        <template v-else-if="selectedNode.subtype === 'wait_event'">
          <div class="node-description-card node-description-wait">
            <div class="description-icon wait-icon">
              <Clock :size="20" />
            </div>
            <div class="description-content">
              <h4>Esperar Acontecimento</h4>
              <p>Pausa a jornada ate chegar um evento real do sistema ou ate acabar o prazo.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Evento Esperado</h3>
            <StyledSelect
              v-model="selectedNode.config.eventType"
              label="Evento"
              :options="iconOptions(eventTypeOptions)"
              :required="true" :error="nodeError" @update:model-value="nodeError = ''"
            />

            <div v-if="selectedNode.config.eventType === 'whatsapp_button_clicked'" class="form-group">
              <label>ID do botao esperado</label>
              <input
                v-model="selectedNode.config.buttonId"
                class="form-input"
                placeholder="Ex: retocar_sim"
              />
              <span class="helper-text">Use o mesmo ID configurado no botao do modelo de mensagem.</span>
            </div>

            <div v-else-if="selectedNode.config.eventType === 'whatsapp_list_selected'" class="form-group">
              <label>ID da opcao esperada</label>
              <input
                v-model="selectedNode.config.rowId"
                class="form-input"
                placeholder="Ex: quero_reagendar"
              />
              <span class="helper-text">Use o mesmo ID da linha configurada na lista do modelo.</span>
            </div>

            <div v-else-if="selectedNode.config.eventType === 'whatsapp_inbound'" class="form-group">
              <label>Texto esperado na resposta</label>
              <input
                v-model="selectedNode.config.textContains"
                class="form-input"
                placeholder="Opcional. Ex: sim"
              />
              <span class="helper-text">Deixe vazio para aceitar qualquer mensagem recebida.</span>
            </div>

            <div class="time-inputs-grid">
              <div class="form-group">
                <label>Prazo</label>
                <input
                  type="number"
                  v-model.number="selectedNode.config.timeoutAmount"
                  class="form-input"
                  min="1"
                />
              </div>
              <div class="form-group">
                <label>Unidade</label>
                <StyledSelect
                  v-model="selectedNode.config.timeoutUnit"
                  :options="iconOptions([
                    { value: 'minutes', label: 'Minutos' },
                    { value: 'hours', label: 'Horas' },
                    { value: 'days', label: 'Dias' },
                    { value: 'weeks', label: 'Semanas' },
                    { value: 'months', label: 'Meses' },
                  ])"
                />
              </div>
            </div>
            <div class="field-hint">
              <span class="hint-icon">i</span>
              <span>Conecte a saida received para quando o evento chegar e timeout para o caminho alternativo.</span>
            </div>
          </div>
        </template>

        <template v-else-if="selectedNode.subtype === 'condition_rules'">
          <div class="node-description-card">
            <div class="description-icon">
              <GitBranch :size="20" />
            </div>
            <div class="description-content">
              <h4>Escolha entre dois caminhos</h4>
              <p>Defina a condição abaixo. O fluxo segue conforme o resultado.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title"><SlidersHorizontal :size="16" /> Condição para continuar</h3>
            <div class="form-group">
              <label>O que deseja verificar?</label>
              <StyledSelect
                v-model="selectedNode.config.preset"
                :options="iconOptions(conditionPresetOptions)"
                @update:model-value="applyConditionPreset"
              />
            </div>

            <div v-if="selectedNode.config.preset === 'appointment_status'" class="form-group">
              <label>Status</label>
              <StyledSelect
                v-model="selectedNode.config.conditions[0].value"
                :options="iconOptions(appointmentStatusOptions)"
              />
            </div>

            <div v-else-if="selectedNode.config.preset === 'whatsapp_button'" class="form-group">
              <label>ID do botao</label>
              <input v-model="selectedNode.config.conditions[0].value" class="form-input" placeholder="Ex: retocar_sim" />
            </div>

            <div v-else-if="selectedNode.config.preset === 'whatsapp_text_contains'" class="form-group">
              <label>Texto recebido contem</label>
              <input v-model="selectedNode.config.conditions[0].value" class="form-input" placeholder="Ex: sim" />
            </div>

            <div v-else-if="selectedNode.config.preset === 'procedure_contains'" class="form-group">
              <label>Procedimento</label>
              <StyledSelect
                v-model="selectedNode.config.conditions[0].value"
                :options="iconOptions([{ value: '', label: 'Selecione' }, ...procedureOptions])"
              />
            </div>

            <div class="condition-paths" aria-label="Caminhos do resultado">
              <p>O que acontece depois?</p>
              <div class="condition-path path-yes"><CheckCircle2 :size="17" /><div><strong>Sim, atende</strong><span>Segue pela saída verde.</span></div><ArrowRight :size="16" /></div>
              <div class="condition-path path-no"><X :size="17" /><div><strong>Não atende</strong><span>Segue pela saída vermelha.</span></div><ArrowRight :size="16" /></div>
              <small>Conecte cada saída à próxima etapa no fluxo.</small>
            </div>
          </div>
        </template>

        <template v-else-if="selectedNode.subtype === 'restart_flow' || selectedNode.subtype === 'end_flow'">
          <div class="node-description-card">
            <div class="description-icon">
              <Play v-if="selectedNode.subtype === 'restart_flow'" :size="20" />
              <X v-else :size="20" />
            </div>
            <div class="description-content">
              <h4>{{ selectedNode.subtype === 'restart_flow' ? 'Recomecar Fluxo' : 'Finalizar Fluxo' }}</h4>
              <p>{{ selectedNode.subtype === 'restart_flow' ? 'Encerra a execucao atual e abre uma nova jornada do mesmo workflow.' : 'Finaliza a execucao atual com sucesso.' }}</p>
            </div>
          </div>
        </template>

        <template v-else-if="selectedNode.subtype === 'restart_on_event'">
          <div class="node-description-card">
            <div class="description-icon">
              <Zap :size="20" />
            </div>
            <div class="description-content">
              <h4>Reiniciar se acontecer</h4>
              <p>Enquanto esta jornada estiver ativa, se esse evento acontecer para o mesmo paciente, a jornada atual para. Se o evento tambem for o gatilho do fluxo, uma nova jornada comeca do zero.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Evento que reinicia</h3>
            <StyledSelect
              v-model="selectedNode.config.eventType"
              label="Evento"
              :options="iconOptions(eventTypeOptions)"
              :required="true" :error="nodeError" @update:model-value="nodeError = ''"
            />

            <div v-if="selectedNode.config.eventType === 'procedure_completed'" class="procedure-picker">
              <div class="procedure-picker-header">
                <label>Procedimentos</label>
                <button type="button" class="link-button" @click="selectedNode.config.procedure_codes = []">
                  Qualquer procedimento
                </button>
              </div>
              <div class="procedure-search"><Search :size="15" /><input v-model="procedureSearch" placeholder="Buscar procedimento" aria-label="Buscar procedimento" /></div>
              <div v-if="procedureOptions.length === 0" class="empty-inline">
                Nenhum procedimento cadastrado para esta clinica.
              </div>
              <p v-if="procedureOptions.length && !filteredProcedureOptions.length" class="empty-inline">Nenhum procedimento encontrado.</p>
              <div v-if="procedureOptions.length" class="procedure-chip-list">
                <button
                  v-for="procedure in filteredProcedureOptions"
                  :key="procedure.value"
                  type="button"
                  class="procedure-chip"
                  :class="{ selected: selectedProcedureIds.includes(procedure.value) }"
                  @click="toggleProcedure(procedure.value)"
                >
                  {{ procedure.label }}
                </button>
              </div>
            </div>

            <div class="field-hint">
              <span class="hint-icon">i</span>
              <span>Para Botox: escolha Procedimento Realizado e marque Botox. Se o paciente fizer Botox novamente, o fluxo antigo para e o novo Botox inicia outra jornada.</span>
            </div>
          </div>
        </template>

        <!-- Dynamic Fields based on Schema (for other node types) -->
        <template v-else-if="currentNodeSchema.length > 0">
          <div class="form-section">
            <h3 class="section-title">Configurações</h3>

            <div v-for="field in currentNodeSchema" :key="field.key" class="form-group">
              <label>
                {{ field.label }}
                <span v-if="field.required" class="required-indicator">*</span>
              </label>

              <!-- Text Input -->
              <input
                v-if="field.type === 'string' || field.type === 'number'"
                :type="field.type === 'number' ? 'number' : 'text'"
                v-model="selectedNode.config[field.key]"
                class="form-input"
                :placeholder="field.label"
              />

              <!-- Textarea -->
              <textarea
                v-else-if="field.type === 'text'"
                v-model="selectedNode.config[field.key]"
                rows="4"
                class="form-input"
                :placeholder="field.label"
              ></textarea>

              <!-- Select -->
              <StyledSelect
                v-else-if="field.type === 'select'"
                v-model="selectedNode.config[field.key]"
                :options="iconOptions(field.options.map((option) => ({ value: option, label: option })))"
              />

              <!-- Procedure Select (Dynamic from Store) -->
              <StyledSelect
                v-else-if="field.type === 'procedure-select'"
                v-model="selectedNode.config[field.key]"
                :options="iconOptions(proceduresStore.procedures.map((proc) => ({ value: proc._id, label: proc.name })))"
                placeholder="Selecione um procedimento"
              />

              <!-- Template Select (Dynamic from Templates Store) -->
              <MessageTemplateSelect
                v-else-if="field.type === 'template-select'"
                v-model="selectedNode.config[field.key]"
                :options="iconOptions(templatesStore.templates.map((template) => ({ value: template._id, label: template.name })))"
                placeholder="Selecione um modelo"
              />

              <span v-if="field.helperText" class="helper-text">{{ field.helperText }}</span>
            </div>
          </div>
        </template>

        <div v-else class="empty-schema-msg">
          <p>Este bloco não possui configurações adicionais.</p>
        </div>
      </div>

      <div class="inspector-footer">
        <div class="drawer-footer">
          <button class="btn-delete" @click="deleteSelectedNode">
            <Trash2 :size="16" /> Excluir etapa
          </button>
          <span class="autosave-caption" role="status"><Check :size="14" />{{ saveError ? 'Falha ao salvar' : isSaving ? 'Salvando…' : graphDirty ? 'Salvamento automático' : 'Alterações salvas' }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.editor-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #64748b; }
.save-failure { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); max-width: min(380px, calc(100% - 24px)); padding: .75rem; border: 1px solid #fecaca; border-radius: 10px; background: #fff; color: #b91c1c; font-size: .75rem; z-index: 14; }.save-failure button { display: block; margin-top: 5px; color: var(--azul-principal); font-weight: 600; }
.workflow-editor-page { height: 100%; min-height: 0; display: flex; flex-direction: column; position: relative; overflow: hidden; background: #f8fafc; }
.editor-header { flex-shrink: 0; min-height: 64px; margin: 12px 12px 0; padding: 10px 14px; background: #fff; border: 1px solid #e5e9f0; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 2px 8px #0f172a04; z-index: 12; }
.header-left, .header-right, .header-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }.header-left { flex: 1; }.header-right { flex-shrink: 0; }.workflow-name { color: #1e293b; font-size: .9rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
.workflow-status-badge { font-size: .65rem; color: #64748b; background: #f1f5f9; border-radius: 5px; padding: 3px 6px; white-space: nowrap; }.workflow-status-badge.active { color: #387761; background: #edf6f1; }
.header-icon-btn { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: #64748b; cursor: pointer; }.header-icon-btn:hover { background: #f1f5f9; }.header-icon-btn:focus-visible, .node-item:focus-visible { outline: 2px solid var(--azul-principal); outline-offset: 2px; }
.save-state { display: flex; align-items: center; gap: 5px; font-size: .75rem; color: #64748b; max-width: 230px; }.save-state.error { color: #b91c1c; }
.editor-layout { flex: 1; min-height: 0; position: relative; overflow: hidden; }.editor-container, .vue-flow-basic { width: 100%; height: 100%; }.editor-container { position: relative; }
.palette-toggle { position: absolute; top: 14px; left: 16px; display: flex; align-items: center; gap: 7px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #334155; font-size: .8125rem; box-shadow: 0 4px 12px #0f172a08; z-index: 9; cursor: pointer; }
.nodes-sidebar { position: absolute; top: 14px; left: 16px; bottom: 16px; width: 272px; display: flex; flex-direction: column; background: #fff; border: 1px solid #e5e9f0; border-radius: 14px; box-shadow: 0 8px 28px #0f172a0a; overflow: hidden; z-index: 10; }
.sidebar-header { display: flex; align-items: flex-start; gap: 5px; padding: 16px 12px 10px; }.sidebar-header h3 { font-size: .875rem; font-weight: 600; color: #1e293b; }.sidebar-header p { font-size: .7rem; line-height: 1.5; color: #526176; margin-top: 4px; }
.palette-search { display: flex; align-items: center; gap: 8px; margin: 0 12px 10px; padding: 8px 10px; border: 1px solid #e5e9f0; border-radius: 8px; color: #526176; }.palette-search input { min-width: 0; width: 100%; outline: 0; background: transparent; font-size: .75rem; color: #334155; }
.nodes-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 12px; }.node-item { width: 100%; display: flex; align-items: flex-start; gap: 9px; padding: 11px 8px; border: 0; border-radius: 9px; background: #fff; text-align: left; cursor: pointer; transition: background-color 150ms; }.node-item:hover { background: #f5f8fc; }.node-item:disabled { opacity: .5; cursor: default; }
.node-item-icon { width: 30px; height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #f0f4fa; color: #64748b; }.icon-event { background: #faf5e8; color: #93702c; }.icon-action { background: #edf3ff; color: #3f6db1; }.icon-condition { background: #f4f0f9; color: #82649b; }.icon-control { background: #eef6f1; color: #54816d; }.node-item-content { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }.node-item-label { font-weight: 500; font-size: .75rem; color: #334155; }.node-item-desc { font-size: .68rem; line-height: 1.5; color: #526176; }.step-add-icon { flex-shrink: 0; margin-top: 7px; color: #a3afbf; }.palette-no-results { padding: 1rem; color: #64748b; font-size: .75rem; }
.node-inspector { position: absolute; top: 92px; right: 16px; bottom: 16px; width: 360px; max-width: calc(100% - 32px); display: flex; flex-direction: column; border: 1px solid #e5e9f0; border-radius: 14px; background: #fff; box-shadow: 0 8px 28px #0f172a14; z-index: 15; overflow: hidden; }
.inspector-heading { flex-shrink: 0; padding: 16px; border-bottom: 1px solid #eef1f5; }.drawer-header { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }.drawer-header h2 { font-size: .875rem; font-weight: 600; color: #1e293b; margin-top: 4px; }.inspector-eyebrow { font-size: .65rem; font-weight: 500; color: #526176; }
.node-edit-form { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }.inspector-intro { font-size: .75rem; line-height: 1.6; color: #64748b; margin-bottom: 16px; }.node-error { color: #b91c1c; font-size: .75rem; margin-bottom: .75rem; }.inspector-footer { flex-shrink: 0; padding: 12px 16px; border-top: 1px solid #eef1f5; }.drawer-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.btn-delete { display: inline-flex; align-items: center; gap: 5px; padding: 8px 0; color: #dc2626; font-size: .75rem; border: 0; background: none; cursor: pointer; }
.form-section { margin-bottom: 20px; }.section-title { font-size: .8rem; font-weight: 600; color: #334155; margin-bottom: 14px; }.form-group { margin-bottom: 14px; }.form-group label { display: block; font-size: .75rem; font-weight: 500; color: #475569; margin-bottom: 6px; }.form-input, .node-edit-form :deep(.select-button) { border: 1px solid #dce2eb; border-radius: 10px; background: #fff; font-size: .8125rem; }.form-input { width: 100%; padding: 10px 12px; }.form-input:focus { outline: 0; border-color: var(--azul-principal); box-shadow: 0 0 0 3px #0057ff0c; }.field-hint, .helper-text { display: flex; align-items: flex-start; gap: 6px; font-size: .7rem; line-height: 1.5; color: #526176; margin-top: 8px; }.hint-icon { flex-shrink: 0; }.required-indicator { color: #b91c1c; }.time-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.node-description-card, .info-card { padding: 12px; background: #f8fafc; border: 1px solid #eef1f5; border-radius: 10px; margin-bottom: 18px; display: flex; gap: 10px; }.info-card { display: block; }.info-card h4 { font-size: .75rem; font-weight: 600; color: #475569; margin-bottom: 6px; }.info-card ul, .info-card li { font-size: .7rem; line-height: 1.6; color: #64748b; }.info-card ul { padding-left: 1rem; list-style: disc; }.description-icon { color: #64748b; flex-shrink: 0; }.description-content h4 { font-size: .75rem; font-weight: 600; color: #475569; }.description-content p, .info-card p, .empty-schema-msg { font-size: .7rem; line-height: 1.5; color: #526176; margin-top: 5px; }
.procedure-picker { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }.procedure-picker-header { display: flex; align-items: center; justify-content: space-between; font-size: .75rem; }.procedure-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }.procedure-chip { padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; color: #64748b; font-size: .7rem; }.procedure-chip.selected { background: #edf3ff; color: var(--azul-principal); border-color: #bfd0f0; }.link-button { color: var(--azul-principal); font-size: .7rem; }.empty-inline { color: #526176; font-size: .7rem; }
.loading-overlay { position: absolute; inset: 0; background: #f8fafc; z-index: 8; }.skeleton-nodes { position: relative; width: 100%; height: 100%; }.skeleton-node { position: absolute; width: 240px; height: 100px; background: #e9eef5; border-radius: 12px; }.skeleton-line { position: absolute; width: 2px; background: #e2e8f0; }
:deep(.vue-flow__controls) { left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px #0f172a08; }:deep(.vue-flow__controls-button) { width: 34px; height: 34px; border: 0; border-right: 1px solid #eef1f5; background: #fff; color: #64748b; }:deep(.vue-flow__edge-path) { stroke-width: 1.5; }:deep(.vue-flow__edge-text) { font-size: 10px; fill: #64748b; }
@media(max-width:1100px) { .save-state { display: none; }.nodes-sidebar { width: 240px; }.node-inspector { width: 330px; } }
@media(max-width:768px) { .editor-header { margin: 8px 8px 0; padding: 8px; min-height: 60px; gap: 6px; }.header-heading { flex-direction: column; align-items: flex-start; gap: 3px; }.workflow-name { max-width: 140px; font-size: .75rem; }.header-right { gap: 6px; }.header-right :deep(.app-button) { padding: 0 8px; font-size: .7rem; }.header-right :deep(.app-button .button-content > span) { display: none; }.nodes-sidebar { top: 12px; left: 10px; bottom: 70px; width: min(290px, calc(100% - 20px)); }.node-inspector { top: auto; bottom: 12px; right: 10px; width: calc(100% - 20px); max-width: none; height: min(65dvh, 560px); }.palette-toggle { left: 10px; }.time-inputs-grid { grid-template-columns: 1fr; } }
@media(prefers-reduced-motion:reduce) { .node-item { transition: none; } }

.node-item { border: 1px solid #dce3ec; margin-bottom: 8px; padding: 12px; align-items: center; box-shadow: 0 2px 3px #0f172a04; }
.node-item:hover { border-color: #2563eb; background: #eff6ff; }
.node-item-label { color: #111827; font-weight: 650; font-size: .8rem; }.node-item-desc { color: #475569; line-height: 1.4; }.node-item-icon { width: 36px; height: 36px; }
.icon-event { background: #fff0d8; color: #c45309; }.icon-action { background: #dbeafe; color: #1d4ed8; }.icon-wait { background: #e0e7ff; color: #4338ca; }.icon-condition { background: #f3e8ff; color: #7e22ce; }.icon-control { background: #dcfce7; color: #15803d; }
.step-add-icon { color: #2563eb; margin-top: 0; }.drawer-header h2, .sidebar-header h3, .section-title { color: #111827; font-weight: 650; }.form-group label { color: #1f2937; }.description-content p { color: #475569; }
.info-card summary { cursor: pointer; color: #334155; font-size: .75rem; font-weight: 600; }.info-card h4 { display: none; }.btn-delete { color: #dc2626; background: #fff1f2; padding: 9px 10px; border-radius: 8px; font-weight: 600; }.btn-delete:hover { background: #ffe4e6; }

.node-inspector { --step-color: #1d4ed8; --step-bg: #eff6ff; }
.inspector-event { --step-color: #b45309; --step-bg: #fff3e3; }.inspector-condition { --step-color: #7e22ce; --step-bg: #faf0ff; }.inspector-wait { --step-color: #4338ca; --step-bg: #eef2ff; }.inspector-control { --step-color: #047857; --step-bg: #ecfdf5; }
.inspector-heading { background: var(--step-bg); padding: 18px 16px; }.inspector-title-group { display: flex; align-items: center; gap: 10px; }.inspector-step-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 11px; background: white; color: var(--step-color); flex-shrink: 0; }.inspector-eyebrow { color: var(--step-color); }.drawer-header h2 { line-height: 1.4; }
.node-edit-form { padding: 20px 16px; background: #f8fafc; }.node-description-card { background: var(--step-bg); border-color: transparent; margin-bottom: 20px; padding: 14px; }.description-icon, .description-content h4 { color: var(--step-color); }.description-content p { margin-top: 6px; line-height: 1.6; font-size: .75rem; }
.form-section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }.section-title { display: flex; align-items: center; gap: 8px; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px solid #edf0f5; }.section-title svg { color: var(--step-color); }.form-group { margin-bottom: 20px; }.form-group:last-child { margin-bottom: 0; }.form-group label { margin-bottom: 8px; }.node-edit-form :deep(.option-icon) { color: var(--step-color); flex-shrink: 0; }
.condition-paths { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; }.condition-paths > p { font-size: .75rem; font-weight: 600; color: #111827; margin-bottom: 12px; }.condition-path { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; margin-bottom: 10px; }.condition-path > div { flex: 1; }.condition-path strong, .condition-path span { display: block; }.condition-path strong { font-size: .75rem; }.condition-path span { font-size: .7rem; margin-top: 4px; color: #475569; }.path-yes { background: #ecfdf5; color: #15803d; }.path-no { background: #fff1f2; color: #be123c; }.condition-paths small { display: block; color: #475569; font-size: .7rem; line-height: 1.6; margin-top: 12px; }

.procedure-search { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid #dce2eb; border-radius: 8px; margin: 12px 0; color: #64748b; }.procedure-search input { min-width: 0; width: 100%; outline: none; font-size: .75rem; background: transparent; }.procedure-chip-list { max-height: 220px; overflow-y: auto; }
.autosave-caption { display: flex; align-items: center; gap: 5px; font-size: .7rem; color: #475569; }
.canvas-context-menu { position: fixed; width: 222px; padding: 6px; z-index: 70; border-radius: 12px; border: 1px solid #e2e8f0; background: white; box-shadow: 0 12px 35px #0f172a20; }.canvas-context-menu button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 10px; border-radius: 7px; color: #1e293b; font-size: .8rem; text-align: left; }.canvas-context-menu button:hover, .canvas-context-menu button:focus-visible { background: #eff6ff; color: #1d4ed8; outline: none; }
.simulation-panel { position: absolute; right: 16px; top: 92px; bottom: 16px; width: 380px; max-width: calc(100% - 32px); z-index: 30; background: white; border: 1px solid #dce2eb; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 8px 28px #0f172a14; }.simulation-panel h2 { font-weight: 600; }.simulation-note { font-size: .75rem; color: #475569; line-height: 1.6; margin: 12px 0; }.simulation-results { overflow-y: auto; min-height: 0; }.simulation-results h3 { font-size: .8rem; font-weight: 600; margin: 16px 0 12px; }.simulation-issue { display: flex; gap: 8px; width: 100%; text-align: left; background: #fff7ed; color: #9a3412; padding: 12px; border-radius: 9px; margin-bottom: 8px; font-size: .75rem; }.simulation-issue svg { flex-shrink: 0; }.simulation-issue strong, .simulation-results li strong { display: block; margin-bottom: 4px; }.simulation-results ol { padding-left: 20px; list-style: decimal; }.simulation-results li { font-size: .75rem; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }.simulation-results li button { text-align: left; }.simulation-results li span { color: #475569; }
@media(max-width:768px) { .simulation-panel { right: 10px; bottom: 12px; top: auto; height: 70dvh; max-width: calc(100% - 20px); } }

.simulation-panel { padding: 0; overflow: hidden; background: #f8fafc; }.simulation-heading { display: flex; align-items: center; gap: 10px; padding: 18px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }.simulation-heading > div { flex: 1; }.simulation-heading-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; color: #1d4ed8; background: white; border-radius: 10px; }.simulation-panel > .simulation-note { margin: 16px 18px; }
.simulation-status { margin: 0 18px 16px; padding: 14px; border: 1px solid #bfdbfe; border-radius: 12px; background: #eff6ff; color: #1e40af; }.simulation-status strong, .simulation-status > span { display: block; font-size: .8rem; }.simulation-status > span { font-size: .7rem; margin-top: 5px; }.simulation-status.has-errors { background: #fff1f2; border-color: #fecdd3; color: #be123c; }.simulation-progress { height: 5px; border-radius: 5px; background: #dbeafe; overflow: hidden; margin-top: 12px; }.simulation-progress > div { height: 100%; background: #2563eb; transition: width 300ms; }.has-errors .simulation-progress > div { background: #e11d48; }.simulation-skip { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: .75rem; font-weight: 600; }
.simulation-results { padding: 0 18px 18px; }.simulation-issue { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; line-height: 1.6; }.simulation-issue > span { flex: 1; }.simulation-issue:hover { background: #ffe4e6; }
.simulation-results .simulation-timeline { padding: 0; list-style: none; }.simulation-timeline li { display: flex; gap: 10px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; margin-bottom: 10px; }.timeline-marker { flex-shrink: 0; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f1f5f9; color: #64748b; }.simulation-timeline li button { flex: 1; }.simulation-timeline small { display: block; font-size: .65rem; margin-top: 8px; color: #64748b; }.simulation-timeline .step-reviewed .timeline-marker { color: #15803d; background: #dcfce7; }.simulation-timeline .step-current { border-color: #2563eb; box-shadow: 0 0 0 2px #2563eb12; }.simulation-timeline .step-error { background: #fff1f2; border-color: #fecdd3; }.simulation-timeline .step-error .timeline-marker, .simulation-timeline .step-error small { color: #be123c; background: #ffe4e6; }.simulation-timeline .step-error strong { color: #be123c; }
@media(prefers-reduced-motion:reduce) { .simulation-progress > div { transition: none; } }
.canvas-context-menu .edge-delete-action { color: #dc2626; }
</style>
