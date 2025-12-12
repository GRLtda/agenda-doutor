<script setup>
import { ref, onMounted, computed, watch, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useWorkflowsStore } from '@/stores/workflows'
import { useProceduresStore } from '@/stores/procedures'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'
import WorkflowNode from './WorkflowNode.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import dagre from 'dagre'
import { ArrowLeft, Save, Pause, Play, Plus, Trash2, GripVertical, X, MessageSquare, Zap, Clock, Star, User, CalendarPlus, GitBranch } from 'lucide-vue-next'
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

const workflowId = route.params.id
const { onNodeDragStop, onConnect, addEdges, setNodes, setEdges, fitView, onNodeClick, onPaneClick, addNodes, project } = useVueFlow()

const nodes = ref([])
const edges = ref([])
const isLoading = computed(() => workflowsStore.loading)
const selectedNode = ref(null)
const isDrawerOpen = ref(false)
const nodeTypesList = computed(() => workflowsStore.nodeTypes || [])
const isAddMenuOpen = ref(false)
// Register custom node types
const nodeTypes = {
  custom: markRaw(WorkflowNode)
}

// Event type labels for Portuguese display
const eventLabels = {
  'appointment_created': 'Agendamento Criado',
  'appointment_updated': 'Agendamento Atualizado',
  'appointment_completed': 'Agendamento Realizado',
  'appointment_canceled': 'Agendamento Cancelado',
  'procedure_completed': 'Procedimento Realizado'
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

// Procedure options for StyledSelect
const procedureOptions = computed(() => {
  const options = proceduresStore.procedures.map(procedure => ({
    value: procedure._id,
    label: procedure.name
  }))
  
  // Add "All Procedures" option at the beginning
  return [
    { value: '', label: 'Todos os Procedimentos' },
    ...options
  ]
})

onMounted(async () => {
  if (workflowId) {
    await Promise.all([
      workflowsStore.fetchWorkflowById(workflowId),
      workflowsStore.fetchNodeTypes(),
      proceduresStore.fetchProcedures(),
      templatesStore.fetchTemplates(),
    ])
    initializeGraph()
  }
})

function initializeGraph() {
  // Transform store data to VueFlow format
  const storeNodes = workflowsStore.nodes.map(n => ({
    id: n._id, // Use _id from backend
    type: 'custom',
    position: n.position || { x: 0, y: 0 },
    data: { 
      // Pass all node data to the component
      ...n,
      label: n.name, // Fallback if name exists
    }
  }))

  const storeEdges = workflowsStore.edges.map(e => ({
    id: e._id, // Use _id from backend
    source: e.sourceNodeId,
    target: e.targetNodeId,
    animated: true,
    style: { stroke: '#b1b1b7' },
    label: e.conditionKey
  }))

  // If positions are missing (0,0), run auto-layout
  const needsLayout = storeNodes.some(n => n.position.x === 0 && n.position.y === 0)
  
  if (needsLayout && storeNodes.length > 0) {
    const layouted = getLayoutedElements(storeNodes, storeEdges)
    nodes.value = layouted.nodes
    edges.value = layouted.edges
  } else {
    nodes.value = storeNodes
    edges.value = storeEdges
  }
  
  // Fit view after a short delay to allow rendering
  setTimeout(() => {
    fitView()
  }, 100)
}

// Auto Layout Function using Dagre
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 240
const nodeHeight = 100

function getLayoutedElements(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      }
    }),
    edges,
  }
}

// Event Handlers
onNodeDragStop(async ({ node }) => {
  // Save new position to store/backend
  await workflowsStore.updateNodePosition(node.id, node.position)
})

onConnect((params) => {
  const newEdge = {
    ...params,
    id: `e${params.source}-${params.target}`,
    animated: true
  }
  addEdges([newEdge])
  workflowsStore.addEdge(newEdge)
})

onNodeClick(({ node }) => {
  selectedNode.value = { 
    ...node.data,
    config: node.data.config || {} 
  }
  isDrawerOpen.value = true
})

onPaneClick(() => {
  selectedNode.value = null
  isDrawerOpen.value = false
})

function closeDrawer() {
  selectedNode.value = null
  isDrawerOpen.value = false
}

async function saveNodeChanges() {
  if (!selectedNode.value) return
  
  try {
    // Call store update
    await workflowsStore.updateNode(selectedNode.value._id, selectedNode.value)
    
    // Update local graph data to reflect changes immediately
    const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value._id)
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].data = { ...selectedNode.value }
    }
    
    closeDrawer()
  } catch (error) {
    // Error handled in store
  }
}

async function deleteSelectedNode() {
  if (!selectedNode.value) return
  if (!confirm('Tem certeza que deseja excluir este nó?')) return

  try {
    await workflowsStore.deleteNode(selectedNode.value._id)
    
    // Remove from local graph
    nodes.value = nodes.value.filter(n => n.id !== selectedNode.value._id)
    edges.value = edges.value.filter(e => e.source !== selectedNode.value._id && e.target !== selectedNode.value._id)
    
    closeDrawer()
  } catch (error) {
    // Error already handled in store
  }
}

function goBack() {
  router.push('/app/workflows')
}

// Helper for display
function formatSubtype(subtype) {
  if (!subtype) return ''
  return subtype
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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

async function onDrop(event) {
  const data = event.dataTransfer?.getData('application/vueflow')
  if (!data) return

  const { type, subtype } = JSON.parse(data)
  
  // Calculate position
  const { left, top } = document.querySelector('.vue-flow-basic').getBoundingClientRect()
  const position = project({
    x: event.clientX - left,
    y: event.clientY - top,
  })

  // Show loading toast or indicator if needed
  
  try {
    const newNode = await workflowsStore.addNode({
      type,
      subtype,
      position
    })

    addNodes([{
      id: newNode._id, // Use real ID from backend
      type: 'custom',
      position: newNode.position,
      data: {
        ...newNode,
        label: formatSubtype(newNode.subtype)
      },
    }])
  } catch (error) {
    // Error already handled in store
  }
}

// Dynamic Form Helpers
const currentNodeSchema = computed(() => {
  if (!selectedNode.value) return []
  
  const typeDef = nodeTypesList.value.find(t => t.type === selectedNode.value.type)
  if (!typeDef) return []
  
  const subtypeDef = typeDef.subtypes.find(s => s.subtype === selectedNode.value.subtype)
  return subtypeDef ? subtypeDef.configSchema : []
})

async function handleSave() {
  if (!workflowsStore.currentWorkflow) return
  
  // Since nodes/edges are auto-saved, we just confirm or update metadata if needed
  // For now, we'll just show a success message or trigger a metadata update
  try {
    await workflowsStore.updateWorkflow(workflowId, {
      name: workflowsStore.currentWorkflow.name,
      description: workflowsStore.currentWorkflow.description
    })
    // toast.success is handled in store
  } catch (error) {
    // error handled in store
  }
}

async function handleToggleStatus() {
  if (!workflowsStore.currentWorkflow) return
  
  if (workflowsStore.currentWorkflow.isActive) {
    await workflowsStore.deactivateWorkflow(workflowId)
  } else {
    await workflowsStore.activateWorkflow(workflowId)
  }
}
</script>

<template>
  <div class="workflow-editor-page">
    <header class="editor-header">
      <div class="header-left">
        <button @click="goBack" class="header-icon-btn" title="Voltar">
          <ArrowLeft :size="18" />
        </button>
        <div class="header-divider"></div>
        <button class="header-icon-btn" @click="handleSave" title="Salvar">
          <Save :size="18" />
        </button>
      </div>
      
      <div class="header-center" v-if="!isLoading">
        <span class="workflow-name">{{ workflowsStore.currentWorkflow?.name || 'Novo Workflow' }}</span>
        <span class="workflow-status-badge" :class="{ active: workflowsStore.currentWorkflow?.isActive }">
          {{ workflowsStore.currentWorkflow?.isActive ? 'Ativo' : 'Rascunho' }}
        </span>
      </div>
      <div v-else class="header-center">
        <div class="skeleton skeleton-text" style="width: 150px; height: 20px;"></div>
      </div>
      
      <div class="header-right">
        <button 
          class="toggle-status-btn"
          :class="{ active: workflowsStore.currentWorkflow?.isActive }"
          @click="handleToggleStatus"
          :title="workflowsStore.currentWorkflow?.isActive ? 'Desativar' : 'Ativar'"
        >
          <span class="toggle-indicator"></span>
        </button>
      </div>
    </header>

    <div class="editor-layout">
      <!-- Sidebar for Adding Nodes -->
      <aside class="nodes-sidebar">
        <div class="sidebar-header">
          <h3>Blocos</h3>
        </div>
        <div class="nodes-list">
          <!-- GATILHO -->
          <div class="node-category">
            <h4 class="category-title">Gatilho</h4>
            <div 
              class="node-item node-event"
              draggable="true"
              @dragstart="onDragStart($event, 'event', 'event_trigger')"
            >
              <div class="node-item-icon icon-event">
                <Star :size="18" />
              </div>
              <div class="node-item-content">
                <span class="node-item-label">Gatilho de Evento</span>
                <span class="node-item-desc">Inicia o workflow baseado em um evento do sistema</span>
              </div>
            </div>
          </div>

          <!-- AÇÃO -->
          <div class="node-category">
            <h4 class="category-title">Ação</h4>
            <div 
              class="node-item node-action"
              draggable="true"
              @dragstart="onDragStart($event, 'action', 'send_message')"
            >
              <div class="node-item-icon icon-action">
                <MessageSquare :size="18" />
              </div>
              <div class="node-item-content">
                <span class="node-item-label">Enviar Mensagem (WhatsApp)</span>
                <span class="node-item-desc">Envia uma mensagem para o paciente</span>
              </div>
            </div>

          </div>

          <!-- AGUARDAR -->
          <div class="node-category">
            <h4 class="category-title">Aguardar</h4>
            <div 
              class="node-item node-wait"
              draggable="true"
              @dragstart="onDragStart($event, 'wait', 'wait_days')"
            >
              <div class="node-item-icon icon-wait">
                <Clock :size="18" />
              </div>
              <div class="node-item-content">
                <span class="node-item-label">Esperar Tempo</span>
                <span class="node-item-desc">Aguarda X dias/horas antes de continuar</span>
              </div>
            </div>
          </div>


        </div>
      </aside>

      <div class="editor-container" @drop="onDrop" @dragover="onDragOver">
        <div v-if="isLoading" class="loading-overlay">
          <!-- Skeleton Loading for Editor -->
          <div class="skeleton-nodes">
             <div class="skeleton-node" style="top: 50px; left: 50%; transform: translateX(-50%)"></div>
             <div class="skeleton-line" style="top: 130px; left: 50%; height: 50px;"></div>
             <div class="skeleton-node" style="top: 180px; left: 50%; transform: translateX(-50%)"></div>
             <div class="skeleton-line" style="top: 260px; left: 50%; height: 50px;"></div>
             <div class="skeleton-node" style="top: 310px; left: 30%;"></div>
             <div class="skeleton-node" style="top: 310px; right: 30%;"></div>
          </div>
        </div>

        <VueFlow
          v-else
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-viewport="{ zoom: 1 }"
          :min-zoom="0.2"
          :max-zoom="4"
          fit-view-on-init
          class="vue-flow-basic"
        >
          <Background pattern-color="#aaa" :gap="16" />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <!-- Side Drawer for Node Editing -->
    <SideDrawer v-if="isDrawerOpen" @close="closeDrawer">
      <template #header>
        <div class="drawer-header">
          <h2>{{ selectedNode ? formatSubtype(selectedNode.subtype) : 'Detalhes' }}</h2>
          <div class="drawer-badges">
            <span class="node-type-badge">{{ selectedNode?.type }}</span>
            <span class="node-id-badge" v-if="selectedNode">
              ID #{{ selectedNode._id?.slice(-6).toUpperCase() }}
            </span>
          </div>
        </div>
      </template>

      <div v-if="selectedNode" class="node-edit-form">
        
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
            
            <StyledSelect
              v-model="selectedNode.config.templateId"
              label="Modelo de Mensagem"
              :options="templateOptions"
              :required="true"
            />
            
            <div class="field-hint">
              <span class="hint-icon">💡</span>
              <span>Os modelos são criados em <strong>Marketing → Modelos</strong>. Eles podem conter variáveis como {paciente}, {data_consulta}, etc.</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Como funciona?</h4>
            <ul>
              <li>Quando o workflow chegar neste nó, a mensagem será enviada via WhatsApp</li>
              <li>As variáveis do modelo serão substituídas pelos dados reais do paciente</li>
              <li>O envio será registrado no histórico de mensagens</li>
            </ul>
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
              <h4>Gatilho de Evento</h4>
              <p>Este bloco inicia o workflow quando o evento selecionado ocorre no sistema.</p>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Configuração do Gatilho</h3>
            
            <StyledSelect
              v-model="selectedNode.config.eventType"
              label="Tipo de Evento"
              :options="eventTypeOptions"
              :required="true"
            />

            <!-- Conditional Procedure Select -->
            <StyledSelect
              v-if="selectedNode.config.eventType === 'procedure_completed'"
              v-model="selectedNode.config.procedureId"
              label="Procedimento Específico"
              :options="procedureOptions"
              :required="false"
              class="mt-4"
            />
            
            <div v-if="selectedNode.config.eventType === 'procedure_completed'" class="field-hint">
              <span class="hint-icon">💡</span>
              <span>Deixe em branco para disparar em qualquer procedimento realizado, ou selecione um procedimento específico.</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Eventos Disponíveis</h4>
            <ul>
              <li><strong>Agendamento Criado:</strong> Dispara quando um novo agendamento é criado</li>
              <li><strong>Agendamento Realizado:</strong> Dispara quando um atendimento é finalizado</li>
              <li><strong>Agendamento Cancelado:</strong> Dispara quando um agendamento é cancelado</li>
            </ul>
          </div>
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
              <span class="hint-icon">💡</span>
              <span>Defina pelo menos um valor. O tempo total será a soma de dias + horas + minutos.</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Como funciona?</h4>
            <ul>
              <li>O workflow será pausado pelo tempo configurado</li>
              <li>Útil para enviar lembretes após X dias de um agendamento</li>
              <li>Exemplo: Aguardar 7 dias para enviar pesquisa de satisfação</li>
            </ul>
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
              <select 
                v-else-if="field.type === 'select'"
                v-model="selectedNode.config[field.key]"
                class="form-input"
              >
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- Procedure Select (Dynamic from Store) -->
              <select 
                v-else-if="field.type === 'procedure-select'"
                v-model="selectedNode.config[field.key]"
                class="form-input"
              >
                <option value="" disabled>Selecione um procedimento</option>
                <option v-for="proc in proceduresStore.procedures" :key="proc._id" :value="proc._id">
                  {{ proc.name }}
                </option>
              </select>

              <!-- Template Select (Dynamic from Templates Store) -->
              <select 
                v-else-if="field.type === 'template-select'"
                v-model="selectedNode.config[field.key]"
                class="form-input"
              >
                <option value="" disabled>Selecione um modelo</option>
                <option v-for="template in templatesStore.templates" :key="template._id" :value="template._id">
                  {{ template.name }}
                </option>
              </select>

              <span v-if="field.helperText" class="helper-text">{{ field.helperText }}</span>
            </div>
          </div>
        </template>

        <div v-else class="empty-schema-msg">
          <p>Este bloco não possui configurações adicionais.</p>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <button class="btn-delete" @click="deleteSelectedNode">
            <Trash2 :size="16" /> Excluir Nó
          </button>
          <AppButton variant="primary" @click="saveNodeChanges">
            Salvar Alterações
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style scoped>
.workflow-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2rem);
  background-color: #f9fafb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  height: 56px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.header-icon-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.header-divider {
  width: 1px;
  height: 24px;
  background-color: #e5e7eb;
  margin: 0 0.25rem;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.workflow-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

.workflow-status-badge {
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 12px;
  background-color: #f3f4f6;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.workflow-status-badge.active {
  background-color: #dcfce7;
  color: #166534;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-status-btn {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background-color: #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.toggle-status-btn.active {
  background-color: #22c55e;
}

.toggle-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.toggle-status-btn.active .toggle-indicator {
  left: 22px;
}

.editor-layout {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
  background-color: #f8fafc;
}

/* Floating Sidebar Styles */
.nodes-sidebar {
  position: absolute;
  left: 16px;
  top: 16px;
  bottom: 16px;
  width: 260px;
  background-color: white;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.sidebar-header {
  padding: 1.25rem 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sidebar-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.nodes-list {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  flex-grow: 1;
}

.node-category {
  margin-bottom: 0.5rem;
}

.category-title {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #9ca3af;
  font-weight: 700;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
  letter-spacing: 0.08em;
  padding-left: 0.25rem;
}

.node-category:first-child .category-title {
  margin-top: 0;
}

.node-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 0.75rem;
  background-color: white;
  border: none;
  border-radius: 0.625rem;
  cursor: grab;
  transition: all 0.15s ease;
  margin-bottom: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  border-left: 4px solid transparent;
}

.node-item:hover {
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.node-item:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.node-item-icon {
  color: #d1d5db;
  margin-top: 2px;
  flex-shrink: 0;
}

.node-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.node-item-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.node-item-desc {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

/* Node Item Colors - Left Border */
.node-event { 
  border-left-color: #f59e0b; 
}
.node-event:hover {
  border-left-color: #d97706;
}

.node-action { 
  border-left-color: #3b82f6; 
}
.node-action:hover {
  border-left-color: #2563eb;
}

.node-wait { 
  border-left-color: #6b7280; 
}
.node-wait:hover {
  border-left-color: #4b5563;
}

.node-condition { 
  border-left-color: #a855f7; 
}
.node-condition:hover {
  border-left-color: #9333ea;
}

/* Icon Colors */
.node-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.icon-event {
  background-color: #fef3c7;
  color: #d97706;
}

.icon-action {
  background-color: #dbeafe;
  color: #2563eb;
}

.icon-wait {
  background-color: #f3f4f6;
  color: #4b5563;
}

.icon-condition {
  background-color: #f3e8ff;
  color: #9333ea;
}

.editor-container {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}

.vue-flow-basic {
  background-color: #f8fafc;
}

/* Loading Skeleton Styles */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.skeleton-nodes {
  position: relative;
  width: 100%;
  height: 100%;
}

.skeleton-node {
  position: absolute;
  width: 240px;
  height: 80px;
  background-color: #e2e8f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-line {
  position: absolute;
  width: 2px;
  background-color: #e2e8f0;
  transform: translateX(-50%);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Drawer Styles */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.drawer-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.node-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.node-id-badge {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
  font-weight: 500;
}

.node-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Node Description Card */
.node-description-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border-radius: 0.75rem;
  border: 1px solid #dbeafe;
}

.description-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.description-content h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e40af;
  margin: 0 0 0.25rem 0;
}

.description-content p {
  font-size: 0.85rem;
  color: #3b82f6;
  margin: 0;
  line-height: 1.4;
}

/* Event Description Card Variant */
.node-description-event {
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border: 1px solid #fde047;
}

.node-description-event .event-icon {
  background-color: #f59e0b;
}

.node-description-event .description-content h4 {
  color: #92400e;
}

.node-description-event .description-content p {
  color: #b45309;
}

/* Wait Description Card Variant */
.node-description-wait {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 1px solid #d1d5db;
}

.node-description-wait .wait-icon {
  background-color: #6b7280;
}

.node-description-wait .description-content h4 {
  color: #374151;
}

.node-description-wait .description-content p {
  color: #6b7280;
}

/* Time Inputs Grid */
.time-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.time-inputs-grid .form-input {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 500;
}

/* Form Section */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.required-indicator {
  color: #ef4444;
  margin-left: 2px;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  width: 100%;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.template-select {
  cursor: pointer;
}

/* Field Hint */
.field-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #fefce8;
  border-radius: 0.5rem;
  border: 1px solid #fef08a;
}

.hint-icon {
  flex-shrink: 0;
}

.field-hint span {
  font-size: 0.8rem;
  color: #854d0e;
  line-height: 1.4;
}

.field-hint strong {
  color: #713f12;
}

/* Info Card */
.info-card {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.info-card h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.info-card ul {
  margin: 0;
  padding-left: 1.25rem;
}

.info-card li {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.info-card li:last-child {
  margin-bottom: 0;
}

.input-disabled {
  background-color: #f9fafb;
  color: #6b7280;
  border-color: #e5e7eb;
  padding: 0.625rem;
  border-radius: 0.5rem;
  width: 100%;
}

.helper-text {
  font-size: 0.75rem;
  color: #6b7280;
}

.empty-schema-msg {
  color: #6b7280;
  font-style: italic;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-delete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #ef4444;
  background: none;
  border: none;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.btn-delete:hover {
  background-color: #fee2e2;
}
</style>

<style scoped>
/* ... (existing styles) ... */
.workflow-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2rem); /* Adjust based on layout padding */
  background-color: #f9fafb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  background-color: #f3f4f6;
}

.workflow-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.workflow-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: #e5e7eb;
  color: #6b7280;
  margin-left: 8px;
}

.workflow-status.active {
  background-color: #dcfce7;
  color: #166534;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.editor-container {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}

.vue-flow-basic {
  background-color: #f8fafc;
}

/* Loading Skeleton Styles */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.skeleton-nodes {
  position: relative;
  width: 100%;
  height: 100%;
}

.skeleton-node {
  position: absolute;
  width: 240px;
  height: 80px;
  background-color: #e2e8f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-line {
  position: absolute;
  width: 2px;
  background-color: #e2e8f0;
  transform: translateX(-50%);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Drawer Styles */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.node-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.node-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-disabled {
  background-color: #f9fafb;
  color: #6b7280;
  border-color: #e5e7eb;
  padding: 0.625rem;
  border-radius: 0.5rem;
  width: 100%;
}

.font-mono {
  font-family: monospace;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-delete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #ef4444;
  background: none;
  border: none;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.btn-delete:hover {
  background-color: #fee2e2;
}
</style>

<style scoped>
.workflow-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2rem); /* Adjust based on layout padding */
  background-color: #f9fafb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  background-color: #f3f4f6;
}

.workflow-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.workflow-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: #e5e7eb;
  color: #6b7280;
  margin-left: 8px;
}

.workflow-status.active {
  background-color: #dcfce7;
  color: #166534;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.editor-container {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}

.vue-flow-basic {
  background-color: #f8fafc;
}

/* Loading Skeleton Styles */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.skeleton-nodes {
  position: relative;
  width: 100%;
  height: 100%;
}

.skeleton-node {
  position: absolute;
  width: 240px;
  height: 80px;
  background-color: #e2e8f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-line {
  position: absolute;
  width: 2px;
  background-color: #e2e8f0;
  transform: translateX(-50%);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Vue Flow Customizations */
:deep(.vue-flow__node-custom) {
  /* Ensure custom nodes handle selection correctly if needed */
}

/* Utility Classes */
.mt-4 {
  margin-top: 1rem;
}
</style>
