<script setup>
import { computed, reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const props = defineProps({
  tipo: {
    type: String,
    required: true,
    validator: (value) => ['RECEIVABLE', 'PAYABLE'].includes(value),
  },
  conta: {
    type: Object,
    default: null,
  },
  categorias: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  title: '',
  partyName: '',
  categoryId: '',
  amount: '',
  dueDate: '',
  competenceDate: '',
  expectedPaymentMethod: '',
  notes: '',
})

const isEditing = computed(() => Boolean(props.conta?._id))
const title = computed(() => {
  if (isEditing.value) return 'Editar conta'
  return props.tipo === 'RECEIVABLE' ? 'Nova conta a receber' : 'Nova despesa'
})

const categoryOptions = computed(() => [
  { label: 'Sem categoria', value: '' },
  ...props.categorias.map((categoria) => ({
    label: categoria.name,
    value: categoria._id || categoria.id,
  })),
])

const paymentOptions = [
  { label: 'Nao informado', value: '' },
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'PIX', value: 'PIX' },
  { label: 'Cartao de credito', value: 'CARTAO_CREDITO' },
  { label: 'Cartao de debito', value: 'CARTAO_DEBITO' },
  { label: 'Boleto', value: 'BOLETO' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Outro', value: 'OUTRO' },
]

function dateForInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function centsToReais(value) {
  const cents = Number(value || 0)
  return (cents / 100).toFixed(2)
}

function reaisToCents(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}

function resetForm() {
  form.title = props.conta?.title || ''
  form.partyName = props.conta?.party?.name || ''
  form.categoryId = props.conta?.categoryId?._id || props.conta?.categoryId || ''
  form.amount = props.conta ? centsToReais(props.conta.amountCents) : ''
  form.dueDate = dateForInput(props.conta?.dueDate)
  form.competenceDate = dateForInput(props.conta?.competenceDate || props.conta?.dueDate)
  form.expectedPaymentMethod = props.conta?.expectedPaymentMethod || ''
  form.notes = props.conta?.notes || ''
}

function submit() {
  const amountCents = reaisToCents(form.amount)
  if (!form.title.trim() || !form.partyName.trim() || !form.dueDate || amountCents <= 0) return

  const payload = {
    type: props.tipo,
    title: form.title.trim(),
    amountCents,
    dueDate: form.dueDate,
    competenceDate: form.competenceDate || form.dueDate,
    party: {
      type: props.tipo === 'RECEIVABLE' ? 'PATIENT' : 'SUPPLIER',
      name: form.partyName.trim(),
    },
    source: {
      type: props.tipo === 'PAYABLE' ? 'EXPENSE' : 'MANUAL',
    },
    notes: form.notes?.trim() || undefined,
  }

  if (form.categoryId) payload.categoryId = form.categoryId
  if (form.expectedPaymentMethod) payload.expectedPaymentMethod = form.expectedPaymentMethod

  emit('save', payload)
}

watch(() => props.conta, resetForm, { immediate: true })
watch(() => props.tipo, resetForm)
</script>

<template>
  <SideDrawer size="md" @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <div>
          <h2>{{ title }}</h2>
          <p>{{ tipo === 'RECEIVABLE' ? 'Receita prevista ou em aberto.' : 'Despesa prevista ou em aberto.' }}</p>
        </div>
        <button type="button" class="mobile-close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>
    </template>

    <form class="finance-form" @submit.prevent="submit">
      <div class="form-group">
        <label>Titulo</label>
        <input v-model="form.title" type="text" placeholder="Ex: Consulta particular" required />
      </div>

      <div class="form-group">
        <label>{{ tipo === 'RECEIVABLE' ? 'Paciente ou convenio' : 'Fornecedor' }}</label>
        <input v-model="form.partyName" type="text" placeholder="Nome" required />
      </div>

      <StyledSelect
        v-model="form.categoryId"
        label="Categoria"
        :options="categoryOptions"
        placeholder="Sem categoria"
      />

      <div class="form-grid">
        <div class="form-group">
          <label>Valor</label>
          <input v-model="form.amount" type="number" min="0" step="0.01" placeholder="0,00" required />
        </div>
        <div class="form-group">
          <label>Vencimento</label>
          <input v-model="form.dueDate" type="date" required />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Competencia</label>
          <input v-model="form.competenceDate" type="date" />
        </div>
        <StyledSelect
          v-model="form.expectedPaymentMethod"
          label="Forma prevista"
          :options="paymentOptions"
          placeholder="Nao informado"
        />
      </div>

      <div class="form-group">
        <label>Observacoes</label>
        <textarea v-model="form.notes" rows="4" placeholder="Informacoes internas"></textarea>
      </div>
    </form>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">Fechar</AppButton>
        <AppButton variant="primary" :loading="loading" @click="submit">
          {{ isEditing ? 'Salvar alteracoes' : 'Adicionar' }}
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--preto);
}

.drawer-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.finance-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-size: 0.95rem;
  min-height: 44px;
  padding: 0 0.85rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group textarea {
  padding: 0.75rem 0.85rem;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .drawer-footer {
    padding: 1rem;
  }
}
</style>
