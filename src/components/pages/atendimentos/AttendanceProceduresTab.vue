<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useToast } from 'vue-toastification'
import { 
  Syringe, 
  Plus, 
  FileDown, 
  Trash2, 
  CheckCircle2, 
  Clock,
  DollarSign 
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import AddProcedureModal from '@/components/modals/AddProcedureModal.vue'
import ImportBudgetModal from '@/components/modals/ImportBudgetModal.vue'

const props = defineProps({
  patientId: { type: String, required: true },
  appointmentId: { type: String, required: true },
  record: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
})

const recordsStore = useRecordsStore()
const toast = useToast()

const showAddProcedureModal = ref(false)
const showImportBudgetModal = ref(false)
const isAddingProcedure = ref(false)

const procedures = computed(() => props.record?.procedures || [])

async function handleSaveProcedure(payload) {
  isAddingProcedure.value = true
  try {
    // O payload já contém appointmentId, procedureId, discountPercentage, quantity
    const result = await recordsStore.addProcedureToRecord(payload)
    if (result.success) {
      toast.success('Procedimento adicionado com sucesso!')
      showAddProcedureModal.value = false
    } else {
      toast.error(result.error || 'Erro ao adicionar procedimento')
    }
  } catch (error) {
    toast.error('Erro ao adicionar procedimento')
  } finally {
    isAddingProcedure.value = false
  }
}

async function handleDeleteProcedure(procedure) {
  if (!confirm('Tem certeza que deseja remover este procedimento?')) {
    return
  }
  
  const result = await recordsStore.removeProcedureFromRecord(props.record._id, procedure._id)
  
  if (result.success) {
    toast.success('Procedimento removido com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao remover procedimento')
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="procedures-tab">
    <!-- Header com botões -->
    <div class="tab-header">
      <div class="header-info">
        <Syringe :size="20" class="header-icon" />
        <h3>Procedimentos</h3>
      </div>
      <div class="header-actions" v-if="!disabled">
        <AppButton @click="showImportBudgetModal = true" variant="default" size="sm">
          <FileDown :size="16" />
          Importar Orçamento
        </AppButton>
        <AppButton @click="showAddProcedureModal = true" variant="primary" size="sm">
          <Plus :size="16" />
          Adicionar Procedimento
        </AppButton>
      </div>
    </div>

    <!-- Lista de Procedimentos -->
    <ul v-if="procedures.length > 0" class="procedures-list">
      <li v-for="proc in procedures" :key="proc._id" class="procedure-item">
        <div class="procedure-info">
          <div class="proc-main">
            <span class="proc-name">{{ proc.name }}</span>
          </div>
          <span class="proc-date">{{ formatDate(proc.assignedAt) }}</span>
        </div>
        <div class="procedure-values">
          <div v-if="proc.discountPercentage > 0 || proc.originalValue > proc.finalValue" class="discount-tag">
            -{{ proc.discountPercentage || Math.round(((proc.originalValue - proc.finalValue) / proc.originalValue) * 100) }}%
          </div>
          <div class="price-wrapper">
            <span v-if="proc.discountPercentage > 0 || proc.originalValue > proc.finalValue" class="original-price">
              {{ formatCurrency(proc.originalValue) }}
            </span>
            <span class="final-price">{{ formatCurrency(proc.finalValue) }}</span>
          </div>
          <button 
            v-if="!disabled" 
            @click="handleDeleteProcedure(proc)" 
            class="btn-icon delete-btn" 
            title="Remover Procedimento"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Total -->
    <div v-if="procedures.length > 0" class="procedures-total">
      <span class="total-label">Total:</span>
      <span class="total-value">
        {{ formatCurrency(procedures.reduce((sum, p) => sum + (p.finalValue || 0), 0)) }}
      </span>
    </div>

    <!-- Empty State -->
    <div v-if="procedures.length === 0" class="empty-state">
      <Syringe :size="40" class="empty-icon" />
      <p>Nenhum procedimento registrado neste atendimento</p>
    </div>

    <!-- Modals -->
    <AddProcedureModal
      v-if="showAddProcedureModal"
      :appointment-id="appointmentId"
      :is-loading="isAddingProcedure"
      @close="showAddProcedureModal = false"
      @save="handleSaveProcedure"
    />

    <ImportBudgetModal
      v-if="showImportBudgetModal"
      :patient-id="patientId"
      :appointment-id="appointmentId"
      @close="showImportBudgetModal = false"
    />
  </div>
</template>

<style scoped>
.procedures-tab {
  padding: 1rem 0;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  color: var(--azul-principal);
}

h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* Estilos da lista - igual ao PatientDetailView */
.procedures-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.procedure-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: box-shadow 0.2s;
}

.procedure-item:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.procedure-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.proc-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.proc-name {
  font-weight: 600;
  color: #111827;
}

.proc-date {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.procedure-values {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.discount-tag {
  font-size: 0.75rem;
  color: #ef4444;
  background-color: #fef2f2;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.price-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.original-price {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  text-decoration: line-through;
}

.final-price {
  font-weight: 600;
  color: #059669;
  font-size: 1rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: none;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn {
  color: #ef4444;
  opacity: 0.7;
}

.delete-btn:hover {
  background-color: #fef2f2;
  color: #dc2626;
  opacity: 1;
}

.procedures-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.total-label {
  font-weight: 500;
  color: var(--cinza-texto);
}

.total-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--azul-principal);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--cinza-texto);
  background: #f9fafb;
  border-radius: 0.75rem;
}

.empty-icon {
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions button {
    width: 100%;
    justify-content: center;
  }

  .procedure-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .procedure-info {
    width: 100%;
  }

  .procedure-values {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
