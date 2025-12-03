<script setup>
import { ref, onMounted, computed, watch, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useWorkflowsStore } from '@/stores/workflows'
import WorkflowNode from './WorkflowNode.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import dagre from 'dagre'
import { ArrowLeft, Save, Play, Plus, Trash2, GripVertical, X } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import { useToast } from 'vue-toastification'

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const route = useRoute()
const router = useRouter()
const workflowsStore = useWorkflowsStore()
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

onMounted(async () => {
  if (workflowId) {
    await Promise.all([
      workflowsStore.fetchWorkflowById(workflowId),
      workflowsStore.fetchNodeTypes()
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
        <button @click="goBack" class="back-btn">
          <ArrowLeft :size="20" />
        </button>
        <div class="workflow-info" v-if="!isLoading">
          <h1 class="workflow-title">{{ workflowsStore.currentWorkflow?.name || 'Carregando...' }}</h1>
          <span class="workflow-status" :class="{ active: workflowsStore.currentWorkflow?.isActive }">
             {{ workflowsStore.currentWorkflow?.isActive ? 'Ativo' : 'Rascunho' }}
          </span>
        </div>
        <div v-else class="skeleton skeleton-text" style="width: 200px; height: 24px;"></div>
      </div>
      
      <div class="header-actions">
         <AppButton variant="secondary" class="action-btn" @click="handleSave">
           <Save :size="16" /> Salvar
         </AppButton>
         <AppButton 
           :variant="workflowsStore.currentWorkflow?.isActive ? 'danger' : 'primary'" 
           class="action-btn" 
           @click="handleToggleStatus"
         >
           <component :is="workflowsStore.currentWorkflow?.isActive ? 'Pause' : 'Play'" :size="16" /> 
           {{ workflowsStore.currentWorkflow?.isActive ? 'Desativar' : 'Ativar' }}
         </AppButton>
      </div>
    </header>

    <div class="editor-layout">
      <!-- Sidebar for Adding Nodes -->
      <aside class="nodes-sidebar">
        <div class="sidebar-header">
          <h3>Blocos</h3>
        </div>
        <div class="nodes-list">
          <div v-for="typeDef in nodeTypesList" :key="typeDef.type" class="node-category">
            <h4 class="category-title">{{ typeDef.label }}</h4>
            <div 
              v-for="subtype in typeDef.subtypes" 
              :key="subtype.subtype"
              class="node-item"
              :class="`node-${typeDef.type}`"
              draggable="true"
              @dragstart="onDragStart($event, typeDef.type, subtype.subtype)"
            >
              <div class="node-item-icon">
                <GripVertical :size="14" />
              </div>
              <div class="node-item-content">
                <span class="node-item-label">{{ subtype.label }}</span>
                <span class="node-item-desc">{{ subtype.description }}</span>
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
          <span class="node-type-badge">{{ selectedNode?.type }}</span>
        </div>
      </template>

      <div v-if="selectedNode" class="node-edit-form">
        <!-- Common Fields -->
        <div class="form-group">
          <label>ID</label>
          <input type="text" :value="selectedNode._id" disabled class="input-disabled" />
        </div>

        <!-- Dynamic Fields based on Schema -->
        <template v-if="currentNodeSchema.length > 0">
          <div v-for="field in currentNodeSchema" :key="field.key" class="form-group">
            <label>
              {{ field.label }}
              <span v-if="field.required" class="text-red-500">*</span>
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

            <span v-if="field.helperText" class="helper-text">{{ field.helperText }}</span>
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

.editor-layout {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

/* Sidebar Styles */
.nodes-sidebar {
  width: 280px;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.nodes-list {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.node-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: grab;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.node-item:hover {
  border-color: var(--azul-principal);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.node-item:active {
  cursor: grabbing;
}

.node-item-icon {
  color: #9ca3af;
  margin-top: 2px;
}

.node-item-content {
  display: flex;
  flex-direction: column;
}

.node-item-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.node-item-desc {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
  line-height: 1.3;
}

/* Node Item Colors matching WorkflowNode */
.node-event { border-left: 3px solid #f59e0b; }
.node-action { border-left: 3px solid #3b82f6; }
.node-wait { border-left: 3px solid #6b7280; }
.node-condition { border-left: 3px solid #a855f7; }

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

.helper-text {
  font-size: 0.75rem;
  color: #6b7280;
}

.empty-schema-msg {
  color: #6b7280;
  font-style: italic;
  font-size: 0.9rem;
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
</style>
