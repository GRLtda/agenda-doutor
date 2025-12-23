<script setup>
import { ref, onMounted, watch } from 'vue'
import { Receipt, Plus, Eye, Send, Trash2, FileDown, Package } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import { useBudgetsStore } from '@/stores/budgets'
import { useToast } from 'vue-toastification'
import BudgetModal from '@/components/modals/BudgetModal.vue'

const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
})

const budgetsStore = useBudgetsStore()
const toast = useToast()

const showBudgetModal = ref(false)
const editingBudget = ref(null)
const sendingBudgetId = ref(null)

onMounted(() => {
  if (props.patientId) {
    budgetsStore.fetchBudgetsByPatient(props.patientId)
  }
})

watch(() => props.patientId, (newId) => {
  if (newId) {
    budgetsStore.clearBudgets()
    budgetsStore.fetchBudgetsByPatient(newId)
  }
})

const statusLabels = {
  DRAFT: { text: 'Rascunho', class: 'status-draft' },
  SENT: { text: 'Enviado', class: 'status-sent' },
  APPROVED: { text: 'Aprovado', class: 'status-approved' },
  REJECTED: { text: 'Rejeitado', class: 'status-rejected' },
  IMPORTED: { text: 'Importado', class: 'status-imported' },
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function handleCreateBudget() {
  editingBudget.value = null
  showBudgetModal.value = true
}

function handleEditBudget(budget) {
  if (budget.status === 'IMPORTED') {
    toast.warning('Orçamentos importados não podem ser editados.')
    return
  }
  editingBudget.value = budget
  showBudgetModal.value = true
}

function handleBudgetSaved() {
  showBudgetModal.value = false
  editingBudget.value = null
}

async function handleSendWhatsApp(budget) {
  sendingBudgetId.value = budget._id
  const result = await budgetsStore.sendBudgetWhatsApp(budget._id)
  sendingBudgetId.value = null

  if (result.success) {
    toast.success('Orçamento enviado via WhatsApp!')
  } else {
    toast.error(result.error || 'Erro ao enviar via WhatsApp.')
  }
}

async function handleDeleteBudget(budget) {
  if (!confirm(`Tem certeza que deseja excluir o orçamento "${budget.name}"?`)) {
    return
  }

  const result = await budgetsStore.deleteBudget(budget._id)
  if (result.success) {
    toast.success('Orçamento excluído.')
  } else {
    toast.error(result.error || 'Erro ao excluir orçamento.')
  }
}

async function handleDownloadPdf(budget) {
  const result = await budgetsStore.downloadPdf(budget._id, budget.name)
  if (!result.success) {
    toast.error(result.error || 'Erro ao baixar PDF.')
  }
}
</script>

<template>
  <div class="budgets-tab">
    <BudgetModal
      v-if="showBudgetModal"
      :patient-id="patientId"
      :budget="editingBudget"
      @close="showBudgetModal = false"
      @saved="handleBudgetSaved"
    />

    <div class="section-header-row">
      <h3 class="title-budgets">
        <Receipt :size="20" />
        Orçamentos
      </h3>
      <AppButton @click="handleCreateBudget" variant="primary" class="btn-sm">
        <Plus :size="16" />
        Criar Orçamento
      </AppButton>
    </div>

    <div v-if="budgetsStore.isLoading" class="loading-state">
      Carregando orçamentos...
    </div>

    <ul v-else-if="budgetsStore.budgets.length > 0" class="budgets-list">
      <li v-for="budget in budgetsStore.budgets" :key="budget._id" class="budget-item">
        <div class="budget-main">
          <div class="budget-info">
            <div class="budget-header">
              <span class="budget-name">{{ budget.name }}</span>
              <span :class="['status-badge', statusLabels[budget.status]?.class]">
                {{ statusLabels[budget.status]?.text || budget.status }}
              </span>
            </div>
            <div class="budget-meta">
              <span class="meta-item">
                <Package :size="12" />
                {{ budget.procedures?.length || 0 }} procedimento(s)
              </span>
              <span class="meta-item">
                {{ formatDate(budget.createdAt) }}
              </span>
            </div>
          </div>

          <div class="budget-values">
            <div v-if="budget.totalDiscount > 0" class="discount-info">
              <span class="original-value">{{ formatCurrency(budget.totalOriginal) }}</span>
              <span class="discount-badge">-{{ formatCurrency(budget.totalDiscount) }}</span>
            </div>
            <span class="final-value">{{ formatCurrency(budget.totalFinal) }}</span>
          </div>
        </div>

        <div class="budget-actions">
          <button
            @click="handleEditBudget(budget)"
            class="action-btn"
            title="Visualizar/Editar"
            :disabled="budget.status === 'IMPORTED'"
          >
            <Eye :size="16" />
          </button>
          <button
            @click="handleDownloadPdf(budget)"
            class="action-btn"
            title="Baixar PDF"
          >
            <FileDown :size="16" />
          </button>
          <button
            @click="handleSendWhatsApp(budget)"
            class="action-btn send-btn"
            title="Enviar via WhatsApp"
            :disabled="sendingBudgetId === budget._id"
          >
            <Send :size="16" />
          </button>
          <button
            @click="handleDeleteBudget(budget)"
            class="action-btn delete-btn"
            title="Excluir"
            :disabled="budget.status === 'IMPORTED'"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </li>
    </ul>

    <div v-else class="empty-state-card">
      <div class="empty-state-icon">
        <Receipt :size="40" />
      </div>
      <h4 class="empty-state-title">Nenhum orçamento cadastrado</h4>
      <p class="empty-state-text">
        Crie orçamentos para o paciente e envie diretamente via WhatsApp.
      </p>
      <AppButton @click="handleCreateBudget" variant="secondary">
        <Plus :size="16" />
        Criar Orçamento
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.budgets-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.title-budgets {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.btn-sm {
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
}

.loading-state {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.budgets-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.budget-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.budget-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.budget-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.budget-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.budget-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.budget-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
}

.status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-draft {
  background: #f3f4f6;
  color: #6b7280;
}

.status-sent {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-approved {
  background: #d1fae5;
  color: #059669;
}

.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}

.status-imported {
  background: #fef3c7;
  color: #b45309;
}

.budget-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.budget-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.discount-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.original-value {
  font-size: 0.75rem;
  color: #9ca3af;
  text-decoration: line-through;
}

.discount-badge {
  font-size: 0.6875rem;
  color: #dc2626;
  font-weight: 600;
}

.final-value {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.budget-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #111827;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.send-btn:hover:not(:disabled) {
  background: #dcfce7;
  color: #16a34a;
}

.action-btn.delete-btn:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}

.empty-state-card {
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-state-icon {
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.empty-state-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.empty-state-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  max-width: 280px;
}
</style>
