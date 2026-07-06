<script setup>
import { computed, reactive, watch } from 'vue'
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileSignature,
  FileText,
  Save,
  StickyNote,
  Tag,
  User,
  X,
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
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

const dueDatePickerModel = computed({
  get: () => parseLocalDate(form.dueDate),
  set: (value) => {
    form.dueDate = formatDateForApi(value)
  },
})

const competenceDatePickerModel = computed({
  get: () => parseLocalDate(form.competenceDate),
  set: (value) => {
    form.competenceDate = formatDateForApi(value)
  },
})

const categoryOptions = computed(() => [
  { label: 'Sem categoria', value: '' },
  ...props.categorias.map((categoria) => ({
    label: categoria.name,
    value: categoria._id || categoria.id,
  })),
])

const paymentOptions = [
  { label: 'Não informado', value: '' },
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'PIX', value: 'PIX' },
  { label: 'Cartão de crédito', value: 'CARTAO_CREDITO' },
  { label: 'Cartão de débito', value: 'CARTAO_DEBITO' },
  { label: 'Boleto', value: 'BOLETO' },
  { label: 'Transferência', value: 'TRANSFERENCIA' },
  { label: 'Outro', value: 'OUTRO' },
]

function dateForInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function parseLocalDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateForApi(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  <SideDrawer size="lg" @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <div class="header-content">
          <h2 class="drawer-title">
            <div class="header-icon">
              <FileSignature :size="22" />
            </div>
            {{ title }}
          </h2>
          <p class="drawer-description">
            {{ tipo === 'RECEIVABLE' ? 'Receita prevista ou em aberto.' : 'Despesa prevista ou em aberto.' }}
          </p>
        </div>
        <button type="button" class="close-btn-header" @click="$emit('close')">
          <X :size="22" />
        </button>
      </div>
    </template>

    <form class="finance-form" @submit.prevent="submit">
      <div class="drawer-body-content">
        <section class="form-section">
          <div class="form-group">
            <label class="form-label">
              <FileText :size="14" />
              Título <span class="required-asterisk">*</span>
            </label>
            <input v-model="form.title" class="form-input" type="text" placeholder="Ex: Consulta particular" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <User :size="14" />
                {{ tipo === 'RECEIVABLE' ? 'Paciente ou convênio' : 'Fornecedor' }}
                <span class="required-asterisk">*</span>
              </label>
              <input v-model="form.partyName" class="form-input" type="text" placeholder="Nome" required />
            </div>
            <div class="form-group">
              <label class="form-label">
                <Tag :size="14" />
                Categoria
              </label>
              <StyledSelect
                v-model="form.categoryId"
                :options="categoryOptions"
                placeholder="Sem categoria"
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <DollarSign :size="14" />
                Valor <span class="required-asterisk">*</span>
              </label>
              <input v-model="form.amount" class="form-input" type="number" min="0" step="0.01" placeholder="0,00" required />
            </div>
            <div class="form-group">
              <label class="form-label">
                <Calendar :size="14" />
                Vencimento <span class="required-asterisk">*</span>
              </label>
              <VueDatePicker
                :model-value="dueDatePickerModel"
                @update:model-value="dueDatePickerModel = $event"
                class="date-picker-field"
                :enable-time-picker="false"
                locale="pt-BR"
                format="dd/MM/yyyy"
                placeholder="dd/mm/aaaa"
                auto-apply
                teleport="body"
                :z-index="12000"
                :clearable="false"
                :hide-input-icon="true"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <Calendar :size="14" />
                Competência
              </label>
              <VueDatePicker
                :model-value="competenceDatePickerModel"
                @update:model-value="competenceDatePickerModel = $event"
                class="date-picker-field"
                :enable-time-picker="false"
                locale="pt-BR"
                format="dd/MM/yyyy"
                placeholder="dd/mm/aaaa"
                auto-apply
                teleport="body"
                :z-index="12000"
                :hide-input-icon="true"
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <CreditCard :size="14" />
                Forma prevista
              </label>
              <StyledSelect
                v-model="form.expectedPaymentMethod"
                :options="paymentOptions"
                placeholder="Não informado"
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-group">
            <label class="form-label">
              <StickyNote :size="14" />
              Observações
            </label>
            <textarea v-model="form.notes" class="form-textarea" rows="4" placeholder="Informações internas"></textarea>
          </div>
        </section>
      </div>
    </form>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">
          <X :size="17" />
          Fechar
        </AppButton>
        <AppButton variant="primary" :loading="loading" @click="submit">
          <Save :size="17" />
          {{ isEditing ? 'Salvar alterações' : 'Adicionar' }}
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

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.drawer-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--fonte-titulo);
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
}

.drawer-description {
  margin: 0 0 0 2rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.close-btn-header {
  display: none;
}

.drawer-body-content,
.finance-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 650;
}

.required-asterisk {
  color: #dc2626;
}

.form-input,
.form-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background: #fff;
  color: #111827;
  font-family: inherit;
  font-size: 0.9375rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input {
  height: 44px;
  padding: 0 1rem;
}

.form-textarea {
  min-height: 96px;
  padding: 0.75rem 1rem;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group :deep(.select-button) {
  min-height: 44px;
  border-color: #d1d5db;
  border-radius: 0.75rem;
  box-shadow: none;
  font-size: 0.9375rem;
}

.form-group :deep(.select-button:focus),
.form-group :deep(.select-button:focus-visible) {
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-picker-field :deep(.dp__main) {
  width: 100%;
}

.date-picker-field :deep(.dp__input_wrap) {
  width: 100%;
}

.date-picker-field :deep(.dp__input) {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  color: #111827;
  font-family: inherit;
  font-size: 0.9375rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0;
  padding-bottom: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-picker-field :deep(.dp__input:hover) {
  border-color: #9ca3af;
}

.date-picker-field :deep(.dp__input_focus) {
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-picker-field :deep(.dp__input_icon) {
  display: none;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
  appearance: none;
}

@media (max-width: 768px) {
  .drawer-header {
    padding: 1.15rem 1rem;
  }

  .drawer-description {
    margin-left: 0;
  }

  .close-btn-header {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #6b7280;
    padding: 0.45rem;
    cursor: pointer;
  }

  .form-row {
    flex-direction: column;
  }

  .drawer-footer {
    padding: 1rem;
  }
}
</style>
