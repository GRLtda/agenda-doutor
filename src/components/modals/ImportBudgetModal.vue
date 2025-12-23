<script setup>
import { ref, computed, onMounted } from 'vue'
import { X, Download, Package, Receipt, Check } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import { useBudgetsStore } from '@/stores/budgets'
import { useToast } from 'vue-toastification'

const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
  appointmentId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'imported'])

const budgetsStore = useBudgetsStore()
const toast = useToast()

const isLoading = ref(false)
const selectedBudgetId = ref(null)

onMounted(async () => {
  await budgetsStore.fetchBudgetsByPatient(props.patientId)
})

const availableBudgets = computed(() => {
  return budgetsStore.budgets.filter(b => b.status !== 'IMPORTED')
})

const statusLabels = {
  DRAFT: { text: 'Rascunho', class: 'status-draft' },
  SENT: { text: 'Enviado', class: 'status-sent' },
  APPROVED: { text: 'Aprovado', class: 'status-approved' },
  REJECTED: { text: 'Rejeitado', class: 'status-rejected' },
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

function selectBudget(budgetId) {
  selectedBudgetId.value = selectedBudgetId.value === budgetId ? null : budgetId
}

async function handleImport() {
  if (!selectedBudgetId.value) {
    toast.warning('Selecione um orçamento para importar.')
    return
  }

  isLoading.value = true
  const result = await budgetsStore.importBudgetToAppointment(
    selectedBudgetId.value,
    props.appointmentId
  )
  isLoading.value = false

  if (result.success) {
    toast.success(`Orçamento importado! ${result.data?.proceduresAdded || ''} procedimento(s) adicionado(s).`)
    emit('imported', result.data)
    emit('close')
  } else {
    toast.error(result.error || 'Erro ao importar orçamento.')
  }
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <h2 class="drawer-title">
          <Download :size="20" />
          Importar Orçamento
        </h2>
        <button @click="$emit('close')" class="close-btn-header">
          <X :size="24" />
        </button>
      </div>
    </template>

    <div class="drawer-body-content">
      <p class="description">
        Selecione um orçamento para importar os procedimentos para este atendimento.
      </p>

      <div v-if="budgetsStore.isLoading" class="loading-state">
        Carregando orçamentos...
      </div>

      <div v-else-if="availableBudgets.length === 0" class="empty-state">
        <Receipt :size="40" />
        <p>Nenhum orçamento disponível para importar.</p>
        <span class="hint">Orçamentos já importados não aparecem nesta lista.</span>
      </div>

      <ul v-else class="budgets-list">
        <li
          v-for="budget in availableBudgets"
          :key="budget._id"
          :class="['budget-item', { selected: selectedBudgetId === budget._id }]"
          @click="selectBudget(budget._id)"
        >
          <div class="budget-checkbox">
            <div class="checkbox-indicator">
              <Check v-if="selectedBudgetId === budget._id" :size="14" />
            </div>
          </div>

          <div class="budget-content">
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
              <span class="meta-item">{{ formatDate(budget.createdAt) }}</span>
            </div>

            <div class="budget-value">
              {{ formatCurrency(budget.totalFinal) }}
            </div>
          </div>
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">
          <X :size="18" />
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleImport"
          :loading="isLoading"
          :disabled="!selectedBudgetId || isLoading"
        >
          <Download :size="18" />
          Importar Orçamento
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn-header {
  display: none;
}

.drawer-body-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.loading-state {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.empty-state .hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.budgets-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.budget-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.budget-item:hover {
  background: #f3f4f6;
}

.budget-item.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.budget-checkbox {
  flex-shrink: 0;
  padding-top: 0.125rem;
}

.checkbox-indicator {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.2s ease;
}

.budget-item.selected .checkbox-indicator {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.budget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
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

.budget-value {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin-top: 0.25rem;
}

.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
}
</style>
