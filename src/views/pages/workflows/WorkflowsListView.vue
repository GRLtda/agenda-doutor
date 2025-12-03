<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowsStore } from '@/stores/workflows'
import { useToast } from 'vue-toastification'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Workflow,
  Play,
  Pause,
  Calendar,
  Activity
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

const workflowsStore = useWorkflowsStore()
const router = useRouter()
const toast = useToast()

const workflows = computed(() => workflowsStore.workflows)
const actionsMenuOpenFor = ref(null)

onMounted(async () => {
  await workflowsStore.fetchWorkflows()
})

function goToWorkflow(id) {
  if (actionsMenuOpenFor.value === id) return
  router.push(`/app/workflows/${id}`)
}

function toggleActionsMenu(id) {
  actionsMenuOpenFor.value = actionsMenuOpenFor.value === id ? null : id
}

async function handleCreate() {
  try {
    const newWorkflow = await workflowsStore.createWorkflow({
      name: 'Novo Workflow',
      description: 'Descrição do workflow'
    })
    router.push(`/app/workflows/${newWorkflow._id}`)
  } catch (error) {
    // Erro já tratado no store
  }
}

async function handleDelete(id) {
  if (confirm('Tem certeza que deseja excluir este workflow?')) {
    await workflowsStore.deleteWorkflow(id)
  }
  actionsMenuOpenFor.value = null
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="workflows-list-page">
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Workflows</h1>
        <p class="subtitle">Automatize processos e gerencie fluxos de trabalho.</p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="handleCreate" class="add-btn">
          <Plus :size="16" />
          Novo Workflow
        </AppButton>
      </div>
    </header>

    <div class="table-wrapper" :class="{ 'is-loading': workflowsStore.loading && workflows.length > 0 }">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="icon-header"></th>
              <th>
                <div class="th-content">
                  <Workflow :size="14" />
                  <span>Nome</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Activity :size="14" />
                  <span>Status</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Calendar :size="14" />
                  <span>Criado em</span>
                </div>
              </th>
              <th class="actions-header">
                <div class="th-content">
                  <span>Ações</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="workflowsStore.loading && workflows.length === 0">
              <tr v-for="n in 5" :key="`skel-${n}`" class="skeleton-row">
                <td><div class="skeleton skeleton-icon"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 40%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 30%"></div></td>
                <td class="actions-cell"><div class="skeleton skeleton-button"></div></td>
              </tr>
            </template>

            <template v-else-if="!workflowsStore.loading && workflows.length === 0">
              <tr>
                <td colspan="5" class="state-cell">
                  <div class="empty-state-content">
                    <div class="empty-state-icon-bg">
                      <Workflow :size="24" />
                    </div>
                    <h3 class="empty-state-title">Nenhum workflow encontrado</h3>
                    <p class="empty-state-text">
                      Crie seu primeiro fluxo de automação.
                    </p>
                    <AppButton variant="primary" @click="handleCreate" class="btn-primary-sm">
                      <Plus :size="16" />
                      <span>Criar Workflow</span>
                    </AppButton>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr
                v-for="workflow in workflows"
                :key="workflow._id"
                class="workflow-row"
                @click="goToWorkflow(workflow._id)"
              >
                <td>
                  <div class="workflow-icon">
                    <Workflow :size="20" />
                  </div>
                </td>
                <td>
                  <div class="workflow-info">
                    <span class="workflow-name">{{ workflow.name }}</span>
                    <span class="workflow-desc">{{ workflow.description }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="{ active: workflow.isActive }">
                    {{ workflow.isActive ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td>{{ formatDate(workflow.createdAt) }}</td>
                <td class="actions-cell" @click.stop>
                  <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)">
                    <button @click.stop="toggleActionsMenu(workflow._id)" class="btn-icon">
                      <MoreHorizontal :size="20" />
                    </button>
                    <Transition name="fade">
                      <div v-if="actionsMenuOpenFor === workflow._id" class="actions-dropdown">
                        <button @click.stop="goToWorkflow(workflow._id)" class="dropdown-item">
                          <Pencil :size="14" /> Editar
                        </button>
                         <!-- Futuro: Ativar/Desativar -->
                        <button @click.stop="handleDelete(workflow._id)" class="dropdown-item delete">
                          <Trash2 :size="14" /> Excluir
                        </button>
                      </div>
                    </Transition>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: #111827;
}
.subtitle {
  color: var(--cinza-texto);
}
.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
}
.table-container {
  overflow-x: auto;
  min-height: 50vh;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 1rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}
th {
  background-color: #f9fafb;
  color: var(--cinza-texto);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.workflow-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.workflow-row:hover td {
  background-color: #f9fafb;
}
.workflow-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
}
.workflow-info {
  display: flex;
  flex-direction: column;
}
.workflow-name {
  font-weight: 600;
  color: #111827;
}
.workflow-desc {
  font-size: 0.85rem;
  color: var(--cinza-texto);
}
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #f3f4f6;
  color: #6b7280;
}
.status-badge.active {
  background-color: #dcfce7;
  color: #166534;
}
.actions-cell {
  text-align: right;
}
.actions-wrapper {
  position: relative;
  display: inline-block;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: var(--cinza-texto);
}
.btn-icon:hover {
  background-color: #f3f4f6;
}
.actions-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  width: 140px;
  padding: 0.5rem;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border-radius: 0.5rem;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}
.dropdown-item:hover {
  background-color: #f3f4f6;
}
.dropdown-item.delete {
  color: #ef4444;
}
.dropdown-item.delete:hover {
  background-color: #fee2e2;
}
.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
}
.empty-state-icon-bg {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin-bottom: 1.5rem;
}
.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.empty-state-text {
  color: var(--cinza-texto);
  margin-bottom: 1.5rem;
}

/* Skeleton */
.skeleton {
  background-color: #e5e7eb;
  border-radius: 0.5rem;
  animation: pulse 1.5s infinite;
}
.skeleton-icon {
  width: 40px;
  height: 40px;
}
.skeleton-text {
  height: 1rem;
}
.skeleton-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-left: auto;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
