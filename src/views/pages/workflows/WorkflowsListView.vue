<script setup>
import WorkflowCatalog from '@/components/pages/workflows/WorkflowCatalog.vue'
import { BookOpen } from 'lucide-vue-next'
import WorkflowListActions from '@/components/pages/workflows/WorkflowListActions.vue'
import AppTableList from '@/components/global/AppTableList.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { useMediaQuery } from '@vueuse/core'
import { Search, SlidersHorizontal } from 'lucide-vue-next'
import workflowsEmpty from '@/assets/illustrations/workflows-empty.svg?raw'
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowsStore } from '@/stores/workflows'
import { useToast } from 'vue-toastification'
import { Plus, Workflow, Activity, X, Check, Pause, Play, Trash2, Clock } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import FormInput from '@/components/global/FormInput.vue'

const workflowsStore = useWorkflowsStore()
const router = useRouter()
const toast = useToast()

const workflows = computed(() => workflowsStore.workflows)

// Estado do modal de criação
const showCreateModal = ref(false)
const showCatalog = ref(false)
const newWorkflowData = ref({
  name: '',
  description: ''
})
const isCreating = ref(false)

// Estado do modal de edição
const showEditModal = ref(false)
const editWorkflowData = ref({
  _id: null,
  name: '',
  description: ''
})
const isEditing = ref(false)

onMounted(async () => {
  await reloadWorkflows()
})

function goToWorkflow(id) {
  router.push(`/workflows/${id}`)
}

function openCreateModal() {
  newWorkflowData.value = {
    name: '',
    description: ''
  }
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  newWorkflowData.value = {
    name: '',
    description: ''
  }
}

async function handleCreate() {
  if (!newWorkflowData.value.name.trim()) {
    nameError.value = 'O nome do workflow é obrigatório.'
    return
  }

  isCreating.value = true
  try {
    const newWorkflow = await workflowsStore.createWorkflow({
      name: newWorkflowData.value.name.trim(),
      description: newWorkflowData.value.description.trim()
    })
    closeCreateModal()
    router.push(`/workflows/${newWorkflow._id}`)
  } catch (error) {
    // Erro já tratado no store
  } finally {
    isCreating.value = false
  }
}

const actionBusy = ref(false)
async function runAction(action, ids) {
  if (actionBusy.value || !ids.length) return
  const question=action==='archive'?'Excluir os workflows selecionados? Eles serão arquivados e as execuções em andamento serão canceladas.':action==='deactivate'?'Inativar os workflows selecionados e cancelar suas execuções em andamento?':'Ativar os workflows selecionados? Os rascunhos sem versão publicada serão publicados.'
  if (!confirm(question)) return
  actionBusy.value=true
  try {
    const results=await workflowsStore.bulkAction([...ids],action)
    const failed=results.filter(result=>!result.success)
    await reloadWorkflows(); await nextTick()
    selectedKeys.value=failed.map(result=>result.id).filter(id=>visibleWorkflows.value.some(item=>item._id===id))
    if(failed.length)toast.error(`${failed.length} workflow(s) não foram alterados. ${failed[0].message || 'Tente novamente.'}`)
    else toast.success(action==='archive'?'Workflows excluídos.':action==='deactivate'?'Workflows inativados e execuções canceladas.':'Workflows ativados.')
  } catch {toast.error('Não foi possível concluir a ação. Tente novamente.')} finally {actionBusy.value=false}
}
function handleDelete(id) { return runAction('archive',[id]) }
const executionLabels={queued:'Na fila',running:'Em execução',waiting:'Aguardando',completed:'Concluída',failed:'Falhou',canceled:'Cancelada',interrupted:'Interrompida',restarted:'Reiniciada'}
function executionDate(workflow) { return workflow.lastExecution?.startedAt ? new Date(workflow.lastExecution.startedAt).toLocaleString('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Nunca executado' }

function openEditModal(workflow) {
  editWorkflowData.value = {
    _id: workflow._id,
    name: workflow.name,
    description: workflow.description || ''
  }

  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editWorkflowData.value = {
    _id: null,
    name: '',
    description: ''
  }
}

async function handleEdit() {
  if (!editWorkflowData.value.name.trim()) {
    nameError.value = 'O nome do workflow é obrigatório.'
    return
  }

  isEditing.value = true
  try {
    await workflowsStore.updateWorkflow(editWorkflowData.value._id, {
      name: editWorkflowData.value.name.trim(),
      description: editWorkflowData.value.description.trim()
    })
    toast.success('Workflow atualizado com sucesso!')
    closeEditModal()
  } catch (error) {
    // Erro já tratado no store
  } finally {
    isEditing.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}
const search = ref('')
const status = ref('')
const page = ref(1)
const selectedKeys = ref([])
const filtersOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 768px)')
const nameError = ref('')
watch([() => newWorkflowData.value.name, () => editWorkflowData.value.name], () => { nameError.value = '' })
const statusOptions = [{ value: '', label: 'Todos' }, { value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }]
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const hasFilters = computed(() => !!(search.value.trim() || status.value))
const filteredWorkflows = computed(() => workflows.value.filter(workflow => {
  const matchesStatus = !status.value || (status.value === 'active' ? workflow.isActive : !workflow.isActive)
  return matchesStatus && normalize(`${workflow.name} ${workflow.description || ''}`).includes(normalize(search.value.trim()))
}))
const pagination = computed(() => ({ page: page.value, pages: Math.max(1, Math.ceil(filteredWorkflows.value.length / 10)), total: filteredWorkflows.value.length, limit: 10 }))
const visibleWorkflows = computed(() => filteredWorkflows.value.slice((page.value - 1) * 10, page.value * 10))
watch([search, status], () => { page.value = 1; selectedKeys.value = [] })
watch(() => pagination.value.pages, pages => { page.value = Math.min(page.value, pages) })
watch(visibleWorkflows, () => { selectedKeys.value = [] })
function clearFilters() { search.value = ''; status.value = '' }
async function reloadWorkflows() { workflowsStore.error = null; await workflowsStore.fetchWorkflows() }
</script>


<template>
  <div class="workflows-list-page">
    <header class="page-header"><div><h1 class="title">Workflows</h1><p class="subtitle">Automatize processos e gerencie fluxos de trabalho.</p></div><div class="workflow-header-actions"><AppButton variant="outline" aria-label="Catálogo de workflows" @click="showCatalog = true"><BookOpen :size="18" /><span>Catálogo de workflows</span></AppButton><AppButton variant="primary" class="add-btn" aria-label="Novo workflow" @click="nameError = ''; openCreateModal()"><Plus :size="18" /><span>Novo workflow</span></AppButton></div></header>
    <AppTableList v-model:selected-keys="selectedKeys" :items="visibleWorkflows" selectable :pagination="pagination" @page-change="page = $event">
      <template #filters>
        <div class="workflow-filters" :class="{ expanded: filtersOpen }">
          <div class="search-field"><Search :size="17" class="search-icon" /><FormInput v-model="search" type="search" placeholder="Buscar por nome ou descrição" /><button v-if="search" class="clear-search" aria-label="Limpar busca" @click="search = ''"><X :size="15" /></button></div>
          <AppButton variant="outline" class="filter-toggle" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen"><SlidersHorizontal :size="16" />Filtros</AppButton>
          <div class="advanced-filters" :inert="isMobile && !filtersOpen"><div class="advanced-inner">
            <StyledSelect v-model="status" :options="statusOptions" placeholder="Filtrar por status"><template #prefix><span class="select-prefix"><Activity :size="14" />Status:</span></template></StyledSelect>
            <AppButton variant="outline" class="clear-filters" :disabled="!hasFilters" @click="clearFilters">Limpar</AppButton>
          </div></div>
        </div>
      </template>
      <template #header-info><div class="workflow-bulk-bar"><span>{{selectedKeys.length ? `${selectedKeys.length} selecionado(s)` : `${filteredWorkflows.length} workflows`}}</span><div v-if="selectedKeys.length" class="bulk-buttons"><AppButton variant="outline" :disabled="actionBusy" @click="runAction('activate',selectedKeys)"><Play :size="15" />Ativar</AppButton><AppButton variant="outline" :disabled="actionBusy" @click="runAction('deactivate',selectedKeys)"><Pause :size="15" />Inativar</AppButton><AppButton variant="outline" class="bulk-delete" :disabled="actionBusy" @click="runAction('archive',selectedKeys)"><Trash2 :size="15" />Excluir</AppButton></div></div></template>
      <template #default="{ isSelected, selectRow, selectAll, allSelected, someSelected }">
        <div v-if="workflowsStore.loading" class="results-scroll" aria-label="Carregando workflows" aria-busy="true"><div v-for="n in 6" :key="n" class="skeleton-item"><AppSkeleton width="40px" height="40px" border-radius="8px" /><div><AppSkeleton width="60%" /><AppSkeleton width="80%" height="12px" /></div><AppSkeleton width="70px" /></div></div>
        <div v-else-if="workflowsStore.error" class="list-state" role="alert"><p>Não foi possível carregar os workflows.</p><AppButton variant="outline" @click="reloadWorkflows">Tentar novamente</AppButton></div>
        <div v-else-if="!filteredWorkflows.length" class="list-state"><AppEmptyState title="Nenhum workflow encontrado" :text="hasFilters ? 'Ajuste ou limpe os filtros para ver os workflows.' : 'Seus fluxos de automação aparecerão aqui.'"><template #illustration><div class="empty-illustration" aria-hidden="true" v-html="workflowsEmpty"></div></template></AppEmptyState></div>
        <template v-else>
          <label class="select-page"><Checkbox :disabled="actionBusy" :model-value="someSelected ? 'indeterminate' : allSelected" aria-label="Selecionar workflows desta página" @update:model-value="selectAll($event === true)" />Selecionar página</label>
          <div class="results-scroll desktop-table"><table><caption class="sr-only">Workflows da clínica</caption><thead><tr><th class="selection-cell"><Checkbox :disabled="actionBusy" :model-value="someSelected ? 'indeterminate' : allSelected" aria-label="Selecionar workflows desta página" @update:model-value="selectAll($event === true)" /></th><th scope="col">Workflow</th><th scope="col">Última execução</th><th scope="col">Status</th><th scope="col" class="actions-cell">Ações</th></tr></thead><tbody>
            <tr v-for="workflow in visibleWorkflows" :key="workflow._id" class="workflow-row" :class="{ selected: isSelected(workflow) }" @click="goToWorkflow(workflow._id)">
              <td class="selection-cell" @click.stop><Checkbox :disabled="actionBusy" :model-value="isSelected(workflow)" :aria-label="`Selecionar ${workflow.name}`" @update:model-value="selectRow(workflow, $event === true)" /></td>
              <td><div class="workflow-identity"><div class="workflow-icon"><Workflow :size="20" /></div><div class="workflow-info"><router-link :to="`/workflows/${workflow._id}`" class="workflow-name" @click.stop>{{ workflow.name }}</router-link><span class="workflow-desc" :title="workflow.description">{{ workflow.description || 'Sem descrição' }}</span></div></div></td>
              <td><div class="last-execution"><span>{{executionDate(workflow)}}</span><small v-if="workflow.lastExecution">{{executionLabels[workflow.lastExecution.status] || workflow.lastExecution.status}}</small></div></td><td><span class="status-badge" :class="{ active: workflow.isActive }">{{workflow.isActive?'Ativo':workflow.status==='draft'?'Rascunho':'Inativo'}}</span></td>
              <td class="actions-cell"><WorkflowListActions :active="workflow.isActive" :selected="isSelected(workflow)" :disabled="actionBusy" @select="selectRow(workflow,!isSelected(workflow))" @activate="runAction('activate',[workflow._id])" @deactivate="runAction('deactivate',[workflow._id])" @edit="nameError = ''; openEditModal(workflow)" @delete="handleDelete(workflow._id)" /></td>
            </tr>
          </tbody></table></div>
          <div class="results-scroll mobile-cards">
            <article v-for="workflow in visibleWorkflows" :key="workflow._id" class="workflow-card" :class="{ selected: isSelected(workflow) }">
              <div class="card-header"><Checkbox :disabled="actionBusy" :model-value="isSelected(workflow)" :aria-label="`Selecionar ${workflow.name}`" @update:model-value="selectRow(workflow, $event === true)" /><div class="workflow-icon"><Workflow :size="20" /></div><div class="workflow-info"><router-link :to="`/workflows/${workflow._id}`" class="workflow-name" :title="workflow.name">{{ workflow.name }}</router-link><span class="workflow-desc" :title="workflow.description">{{ workflow.description || 'Sem descrição' }}</span></div><WorkflowListActions :active="workflow.isActive" :selected="isSelected(workflow)" :disabled="actionBusy" @select="selectRow(workflow,!isSelected(workflow))" @activate="runAction('activate',[workflow._id])" @deactivate="runAction('deactivate',[workflow._id])" @edit="nameError = ''; openEditModal(workflow)" @delete="handleDelete(workflow._id)" /></div>
              <div class="card-footer"><span class="status-badge" :class="{ active: workflow.isActive }">{{workflow.isActive?'Ativo':workflow.status==='draft'?'Rascunho':'Inativo'}}</span><span class="mobile-execution"><Clock :size="13" />{{executionDate(workflow)}}<small v-if="workflow.lastExecution"> · {{executionLabels[workflow.lastExecution.status]}}</small></span></div>
            </article>
          </div>
        </template>
      </template>
    </AppTableList>
    <WorkflowCatalog v-if="showCatalog" @close="showCatalog=false" />
    <!-- Modal Lateral para Criação de Workflow -->
    <SideDrawer v-if="showCreateModal" @close="closeCreateModal">
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <h2 class="drawer-title">Novo Workflow</h2>
            <span class="drawer-subtitle">Defina o nome e descrição do seu workflow</span>
          </div>
          <button @click="closeCreateModal" class="close-btn-header">
            <X :size="24" />
          </button>
        </div>
      </template>

      <div class="workflow-form">
        <FormInput
          v-model="newWorkflowData.name"
          label="Nome do Workflow"
          placeholder="Ex: Lembrete de consulta"
          :required="true" :error="nameError"
        />

        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea
            v-model="newWorkflowData.description"
            class="form-textarea"
            placeholder="Descreva o objetivo deste workflow..."
            rows="4"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="closeCreateModal" class="btn-cancel">
            <X :size="18" />
            Cancelar
          </AppButton>
          <AppButton
            variant="secondary"
            @click="handleCreate"
            :disabled="isCreating || !newWorkflowData.name.trim()"
            class="btn-save"
          >
            <Check :size="18" />
            {{ isCreating ? 'Criando...' : 'Criar Workflow' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>

    <!-- Modal Lateral para Edição de Workflow -->
    <SideDrawer v-if="showEditModal" @close="closeEditModal">
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <h2 class="drawer-title">Editar Workflow</h2>
            <span class="drawer-subtitle">Atualize as informações do seu workflow</span>
          </div>
          <button @click="closeEditModal" class="close-btn-header">
            <X :size="24" />
          </button>
        </div>
      </template>

      <div class="workflow-form">
        <FormInput
          v-model="editWorkflowData.name"
          label="Nome do Workflow"
          placeholder="Ex: Lembrete de consulta"
          :required="true" :error="nameError"
        />

        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea
            v-model="editWorkflowData.description"
            class="form-textarea"
            placeholder="Descreva o objetivo deste workflow..."
            rows="4"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="closeEditModal" class="btn-cancel">
            <X :size="18" />
            Cancelar
          </AppButton>
          <AppButton
            variant="secondary"
            @click="handleEdit"
            :disabled="isEditing || !editWorkflowData.name.trim()"
            class="btn-save"
          >
            <Check :size="18" />
            {{ isEditing ? 'Salvando...' : 'Salvar Alterações' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>
<style scoped>
.workflows-list-page { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; }
.workflows-list-page > :deep(.app-table-list-container) { flex: 1; height: auto; min-height: 0; }
.workflows-list-page :deep(.list-content) { min-height: 0; overflow: hidden; }
.workflows-list-page :deep(.filters-header) { background: #fff; padding: 1rem 1.25rem; }
.workflows-list-page :deep(.filters-content) { min-width: 0; }
.page-header { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.title { font-size: 2rem; font-weight: 700; color: var(--preto); }
.subtitle { color: var(--cinza-texto); }
.workflow-filters { display: grid; width: 100%; grid-template-columns: minmax(200px, 1fr) minmax(180px, 240px) 88px; gap: .75rem; align-items: center; }
.workflow-filters :deep(.form-group) { margin: 0; }
.advanced-filters, .advanced-inner { display: contents; }
.select-prefix { display: flex; align-items: center; gap: .35rem; color: #64748b; font-size: .8125rem; font-weight: 600; white-space: nowrap; }
.clear-filters { width: 88px; justify-self: end; }
.search-field { position: relative; }
.search-field :deep(.form-input) { height: 44px; padding-left: 2.5rem; padding-right: 2.25rem; border-color: #d1d5db; box-shadow: 0 1px 2px #0f172a0a; }
.search-field :deep(.form-input:focus) { border-color: var(--azul-principal); box-shadow: 0 0 0 3px #3b83f61a; }
.search-field :deep(input::-webkit-search-cancel-button) { -webkit-appearance: none; }
.search-icon { position: absolute; left: .875rem; top: 50%; transform: translateY(-50%); z-index: 1; color: #94a3b8; pointer-events: none; }
.clear-search { position: absolute; right: .625rem; top: 50%; transform: translateY(-50%); width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 6px; background: #f1f5f9; color: #64748b; cursor: pointer; }
.results-scroll { flex: 1; min-height: 0; overflow: auto; }
.list-state { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
.empty-illustration { width: 180px; max-width: 100%; }.empty-illustration :deep(svg) { width: 100%; height: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1rem 1.25rem; text-align: left; vertical-align: middle; border-bottom: 1px solid #e5e7eb; white-space: nowrap; font-size: .875rem; }
th { position: sticky; top: 0; z-index: 1; height: 44px; padding-top: 0; padding-bottom: 0; background: #f5f6f8; font-size: .75rem; font-weight: 500; color: #64748b; }
.selection-cell { width: 48px; padding-right: .5rem; line-height: 0; }.actions-cell { text-align: right; width: 70px; }
.workflow-row { cursor: pointer; }.workflow-row:hover, .workflow-row.selected { background: #f0f4fc; }
.workflow-identity, .card-header { display: flex; align-items: center; gap: .75rem; }
.workflow-icon { flex-shrink: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--azul-principal); background: #eef2ff; border-radius: 8px; }
.workflow-info { display: flex; flex-direction: column; gap: .25rem; min-width: 0; flex: 1; }
.workflow-name { font-weight: 600; color: var(--preto); text-decoration: none; }.workflow-desc { color: #64748b; font-size: .8125rem; }
.workflow-name, .workflow-desc { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { display: inline-flex; padding: .25rem .625rem; border-radius: 6px; font-size: .75rem; color: #64748b; background: #f1f5f9; }.status-badge.active { background: #edf3ff; color: var(--azul-principal); }
.mobile-cards, .select-page, .filter-toggle { display: none; }
.skeleton-item { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }.skeleton-item > div:nth-child(2) { flex: 1; display: flex; flex-direction: column; gap: .5rem; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
@media(max-width: 768px) {
  .title { font-size: 1.5rem; }.subtitle { font-size: .8125rem; }.add-btn { width: 40px; height: 40px; padding: 0; flex-shrink: 0; }.add-btn span { display: none; }
  .workflows-list-page > :deep(.app-table-list-container) { background: transparent; }.workflows-list-page :deep(.filters-header) { padding: 0 0 .75rem; background: transparent; border: 0; }
  .workflow-filters { grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; }.filter-toggle { display: inline-flex; height: 44px; }
  .advanced-filters { display: grid; grid-column: 1 / -1; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 200ms, opacity 200ms; }.advanced-inner { display: grid; grid-template-columns: minmax(0,1fr) 88px; min-height: 0; overflow: hidden; gap: .5rem; }.expanded .advanced-filters { grid-template-rows: 1fr; opacity: 1; }
  .desktop-table { display: none; }.mobile-cards { display: flex; flex-direction: column; gap: .75rem; scrollbar-gutter: stable; padding: 2px 8px 2px 2px; }
  .select-page { display: flex; flex-shrink: 0; align-items: center; gap: .625rem; padding: 5px 4px 10px; color: #64748b; font-size: .75rem; }
  .workflow-card { flex-shrink: 0; padding: .875rem; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }.workflow-card.selected { background: #edf3ff; border-color: var(--azul-principal); }
  .workflow-name { font-size: .875rem; }.workflow-desc { font-size: .75rem; }.card-header { gap: .5rem; }.card-footer { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-top: 1rem; color: #64748b; font-size: .75rem; }
  .workflows-list-page :deep(.pagination-container) { flex-shrink: 0; padding: .5rem 0 0; background: transparent; min-height: 44px; border: 0; }.workflows-list-page :deep(.summary-text), .workflows-list-page :deep([aria-label='Primeira página']), .workflows-list-page :deep([aria-label='Última página']) { display: none; }
}
@media(prefers-reduced-motion: reduce) { .advanced-filters { transition: none; } }.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drawer-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.drawer-subtitle {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.workflow-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group {
  text-align: left;
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: var(--branco);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.form-textarea::placeholder {
  color: #9ca3af;
}

.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.btn-cancel,
.btn-save {
  flex: 1;
}

@media (min-width: 768px) {
  .btn-cancel,
  .btn-save {
    flex: 1;
    width: auto;
  }
}

.workflow-header-actions {display:flex;align-items:center;gap:10px;flex-shrink:0;}
@media(max-width:768px) { .page-header { flex-wrap:wrap; }.workflow-header-actions {width:100%;justify-content:flex-end;}.workflow-header-actions :deep(.app-button) {font-size:.75rem;} }

.workflow-bulk-bar {display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;color:#475569;font-size:.75rem;}.bulk-buttons {display:flex;align-items:center;gap:8px;}.bulk-delete {color:#dc2626;}.last-execution {display:flex;flex-direction:column;gap:4px;white-space:nowrap;}.last-execution small {color:#64748b;font-size:.7rem;}.mobile-execution {display:flex;align-items:center;gap:5px;flex-wrap:wrap;}.workflow-row td:first-child {width:44px;}
@media(max-width:768px) {.workflow-bulk-bar {align-items:flex-start;flex-direction:column;}.bulk-buttons {width:100%;}.bulk-buttons :deep(.app-button) {flex:1;font-size:.7rem;padding:0 8px;}.card-footer {align-items:flex-start;flex-direction:column;}}
</style>
