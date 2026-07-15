<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileSignature,
  FileText,
  ArrowLeft,
  ArrowRight,
  Plus,
  Repeat,
  Save,
  StickyNote,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import Stepper from '@/components/pages/onboarding/Stepper.vue'
import { useFinanceiroStore } from '@/stores/financeiro'
import { usePatientsStore } from '@/stores/patients'

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
const financeiroStore = useFinanceiroStore()
const patientsStore = usePatientsStore()

const form = reactive({
  title: '',
  patientId: '',
  partyName: '',
  categoryId: '',
  amount: '',
  dueDate: '',
  competenceDate: '',
  expectedPaymentMethod: '',
  notes: '',
  recurrenceEnabled: false,
  recurrenceEndDate: '',
  recurrenceMonthsAhead: 12,
})

const showCategoryForm = ref(false)
const categoryError = ref('')
const patientSearchQuery = ref('')
const currentStep = ref(1)
const attemptedSteps = reactive({
  1: false,
  2: false,
  3: false,
})
let patientSearchTimeout = null
const newCategory = reactive({
  name: '',
})

const steps = [
  { name: 'Identificação', icon: User, subtitle: 'Dados básicos' },
  { name: 'Valores', icon: DollarSign, subtitle: 'Datas e pagamento' },
  { name: 'Detalhes', icon: StickyNote, subtitle: 'Recorrência e notas' },
]

const isEditing = computed(() => Boolean(props.conta?._id))
const title = computed(() => {
  if (isEditing.value) return 'Editar conta'
  return props.tipo === 'RECEIVABLE' ? 'Nova conta a receber' : 'Nova despesa'
})
const canUseRecurrence = computed(() => props.tipo === 'PAYABLE' && !isEditing.value)
const categoryType = computed(() => props.tipo === 'RECEIVABLE' ? 'REVENUE' : 'EXPENSE')
const isReceivable = computed(() => props.tipo === 'RECEIVABLE')

const fieldErrors = computed(() => {
  const amountCents = reaisToCents(form.amount)
  const partyName = isReceivable.value ? selectedPatientName() : form.partyName.trim()

  return {
    title: attemptedSteps[1] && !form.title.trim() ? 'Informe o título.' : '',
    patientId: attemptedSteps[1] && isReceivable.value && !form.patientId ? 'Selecione o paciente.' : '',
    partyName: attemptedSteps[1] && !isReceivable.value && !partyName ? 'Informe o fornecedor.' : '',
    amount: attemptedSteps[2] && amountCents <= 0 ? 'Informe um valor maior que zero.' : '',
    dueDate: attemptedSteps[2] && !form.dueDate ? 'Informe o vencimento.' : '',
  }
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

const recurrenceEndDatePickerModel = computed({
  get: () => parseLocalDate(form.recurrenceEndDate),
  set: (value) => {
    form.recurrenceEndDate = formatDateForApi(value)
  },
})

const categoryOptions = computed(() => [
  { label: 'Sem categoria', value: '' },
  ...props.categorias.map((categoria) => ({
    label: categoria.name,
    value: categoria._id || categoria.id,
    isDefault: categoria.isDefault,
    canDelete: !categoria.isDefault,
  })),
])

const patientOptions = computed(() => {
  const source = patientSearchQuery.value.trim().length > 0
    ? patientsStore.searchResults
    : patientsStore.allPatients
  const options = (source || []).map((patient) => ({
    value: patient._id,
    label: patient.name,
  }))

  const currentPatientId = getId(props.conta?.party?.patientId)
  const currentPatientName = getCurrentPatientName()
  if (currentPatientId && currentPatientName && !options.some((option) => option.value === currentPatientId)) {
    options.unshift({
      value: currentPatientId,
      label: currentPatientName,
    })
  }

  return options
})

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

const recurrenceWindowOptions = [
  { label: 'Proximos 6 meses', value: 6 },
  { label: 'Proximos 12 meses', value: 12 },
  { label: 'Proximos 24 meses', value: 24 },
  { label: 'Proximos 36 meses', value: 36 },
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

function getId(value) {
  if (!value) return ''
  return typeof value === 'object' ? (value._id || value.id || '') : value
}

function getCurrentPatientName() {
  const patient = props.conta?.party?.patientId
  return typeof patient === 'object' ? (patient.name || props.conta?.party?.name || '') : (props.conta?.party?.name || '')
}

function resetForm() {
  form.title = props.conta?.title || ''
  form.patientId = getId(props.conta?.party?.patientId)
  form.partyName = props.conta?.party?.name || ''
  form.categoryId = props.conta?.categoryId?._id || props.conta?.categoryId || ''
  form.amount = props.conta ? centsToReais(props.conta.amountCents) : ''
  form.dueDate = dateForInput(props.conta?.dueDate)
  form.competenceDate = dateForInput(props.conta?.competenceDate || props.conta?.dueDate)
  form.expectedPaymentMethod = props.conta?.expectedPaymentMethod || ''
  form.notes = props.conta?.notes || ''
  form.recurrenceEnabled = false
  form.recurrenceEndDate = ''
  form.recurrenceMonthsAhead = 12
  showCategoryForm.value = false
  categoryError.value = ''
  patientSearchQuery.value = ''
  newCategory.name = ''
  currentStep.value = 1
  attemptedSteps[1] = false
  attemptedSteps[2] = false
  attemptedSteps[3] = false
}

async function createCategory() {
  const name = newCategory.name.trim()
  if (name.length < 2) {
    categoryError.value = 'Informe um nome com pelo menos 2 caracteres.'
    return
  }

  categoryError.value = ''
  const result = await financeiroStore.createCategoria({
    type: categoryType.value,
    name,
  })

  if (!result.success) {
    categoryError.value = result.error
    return
  }

  form.categoryId = result.data?._id || ''
  showCategoryForm.value = false
  newCategory.name = ''
}

async function deleteCategory(option) {
  if (!option?.value || option.isDefault) return
  const confirmed = window.confirm(`Excluir a categoria "${option.label}"?`)
  if (!confirmed) return

  categoryError.value = ''
  const result = await financeiroStore.deleteCategoria(option.value)
  if (!result.success) {
    categoryError.value = result.error
    return
  }

  if (form.categoryId === option.value) {
    form.categoryId = ''
  }
}

function handlePatientSearch(query) {
  patientSearchQuery.value = query || ''
  clearTimeout(patientSearchTimeout)

  if (!query) {
    patientSearchTimeout = setTimeout(() => {
      if (patientsStore.allPatients.length === 0 && !patientsStore.isLoading) {
        patientsStore.fetchAllPatients(1, 20)
      }
    }, 120)
    return
  }

  patientSearchTimeout = setTimeout(() => {
    patientsStore.searchPatients(query)
  }, 280)
}

function selectedPatientName() {
  return patientOptions.value.find((option) => option.value === form.patientId)?.label || form.partyName
}

function canAdvanceStep() {
  if (currentStep.value === 1) {
    return !fieldErrors.value.title && !fieldErrors.value.patientId && !fieldErrors.value.partyName
  }

  if (currentStep.value === 2) {
    return !fieldErrors.value.amount && !fieldErrors.value.dueDate
  }

  return true
}

function nextStep() {
  attemptedSteps[currentStep.value] = true
  if (!canAdvanceStep()) return
  if (currentStep.value < steps.length) currentStep.value += 1
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value -= 1
}

function submit() {
  attemptedSteps[1] = true
  attemptedSteps[2] = true
  attemptedSteps[3] = true

  const amountCents = reaisToCents(form.amount)
  const partyName = isReceivable.value ? selectedPatientName() : form.partyName.trim()
  if (!form.title.trim() || !partyName || (isReceivable.value && !form.patientId)) {
    currentStep.value = 1
    return
  }
  if (!form.dueDate || amountCents <= 0) {
    currentStep.value = 2
    return
  }

  const payload = {
    type: props.tipo,
    title: form.title.trim(),
    amountCents,
    dueDate: form.dueDate,
    competenceDate: form.competenceDate || form.dueDate,
    party: {
      type: isReceivable.value ? 'PATIENT' : 'SUPPLIER',
      name: partyName,
    },
    source: {
      type: props.tipo === 'PAYABLE' ? 'EXPENSE' : 'MANUAL',
    },
    notes: form.notes?.trim() || undefined,
  }

  if (isReceivable.value) payload.party.patientId = form.patientId
  if (form.categoryId) payload.categoryId = form.categoryId
  if (form.expectedPaymentMethod) payload.expectedPaymentMethod = form.expectedPaymentMethod
  if (canUseRecurrence.value && form.recurrenceEnabled) {
    payload.recurrence = {
      enabled: true,
      frequency: 'MONTHLY',
      monthsAhead: Number(form.recurrenceMonthsAhead) || 12,
    }
    if (form.recurrenceEndDate) payload.recurrence.endDate = form.recurrenceEndDate
  }

  emit('save', payload)
}

watch(() => props.conta, resetForm, { immediate: true })
watch(() => props.tipo, resetForm)

onMounted(() => {
  if (isReceivable.value && patientsStore.allPatients.length === 0) {
    patientsStore.fetchAllPatients(1, 20)
  }
})
</script>

<template>
  <SideDrawer size="xl" @close="$emit('close')">
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
        <div class="stepper-wrapper">
          <Stepper :steps="steps" :currentStep="currentStep" />
        </div>

        <div v-show="currentStep === 1" class="step-content">
          <section class="form-section">
          <div class="form-group">
            <label class="form-label">
              <FileText :size="14" />
              Título <span class="required-asterisk">*</span>
            </label>
            <input
              v-model="form.title"
              class="form-input"
              :class="{ 'has-error': fieldErrors.title }"
              type="text"
              placeholder="Ex: Consulta particular"
              required
            />
            <span v-if="fieldErrors.title" class="field-error">{{ fieldErrors.title }}</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <User :size="14" />
                {{ tipo === 'RECEIVABLE' ? 'Paciente' : 'Fornecedor' }}
                <span class="required-asterisk">*</span>
              </label>
              <SearchableSelect
                v-if="isReceivable"
                v-model="form.patientId"
                :options="patientOptions"
                :loading="patientsStore.isLoading"
                :search-value="patientSearchQuery"
                :error="Boolean(fieldErrors.patientId)"
                empty-label="Buscar paciente"
                required
                @search="handlePatientSearch"
              />
              <span v-if="fieldErrors.patientId" class="field-error">{{ fieldErrors.patientId }}</span>
              <input
                v-else
                v-model="form.partyName"
                class="form-input"
                :class="{ 'has-error': fieldErrors.partyName }"
                type="text"
                placeholder="Nome do fornecedor"
                required
              />
              <span v-if="fieldErrors.partyName" class="field-error">{{ fieldErrors.partyName }}</span>
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
              >
                <template #footer>
                  <div class="category-select-footer">
                    <button
                      v-if="!showCategoryForm"
                      type="button"
                      class="category-footer-action"
                      @click.stop="showCategoryForm = true"
                    >
                      <Plus :size="14" />
                      Criar nova categoria
                    </button>

                    <div v-else class="category-footer-form">
                      <input
                        v-model="newCategory.name"
                        class="category-footer-input"
                        type="text"
                        placeholder="Nome da categoria"
                        @keydown.enter.prevent="createCategory"
                      />
                      <div class="category-footer-actions">
                        <button
                          type="button"
                          class="category-footer-save"
                          :disabled="financeiroStore.loadingCategorias"
                          @click.stop="createCategory"
                        >
                          Criar
                        </button>
                        <button type="button" class="category-footer-cancel" @click.stop="showCategoryForm = false">
                          Cancelar
                        </button>
                      </div>
                      <span v-if="categoryError" class="inline-error">{{ categoryError }}</span>
                    </div>
                  </div>
                </template>
                <template #option-action="{ option }">
                  <button
                    v-if="option.canDelete"
                    type="button"
                    class="category-option-delete"
                    title="Excluir categoria"
                    @mousedown.prevent.stop="deleteCategory(option)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </template>
              </StyledSelect>
              <span v-if="categoryError && !showCategoryForm" class="inline-error">{{ categoryError }}</span>
            </div>
          </div>
          </section>
        </div>

        <div v-show="currentStep === 2" class="step-content">
          <section class="form-section">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <DollarSign :size="14" />
                Valor <span class="required-asterisk">*</span>
              </label>
              <input
                v-model="form.amount"
                class="form-input"
                :class="{ 'has-error': fieldErrors.amount }"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                required
              />
              <span v-if="fieldErrors.amount" class="field-error">{{ fieldErrors.amount }}</span>
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
                :class="{ 'has-error': fieldErrors.dueDate }"
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
              <span v-if="fieldErrors.dueDate" class="field-error">{{ fieldErrors.dueDate }}</span>
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
        </div>

        <div v-show="currentStep === 3" class="step-content">
          <section class="form-section">
            <div v-if="canUseRecurrence" class="recurrence-inline" :class="{ 'is-active': form.recurrenceEnabled }">
              <div class="recurrence-head">
                <button type="button" class="recurrence-toggle" @click="form.recurrenceEnabled = !form.recurrenceEnabled">
                  <span class="mini-switch" :class="{ 'is-on': form.recurrenceEnabled }"></span>
                  <span class="recurrence-label">
                    <Repeat :size="15" />
                    Repetir todo mês
                  </span>
                </button>
                <span class="recurrence-helper">
                  Gere despesas mensais automaticamente.
                </span>
              </div>

              <div v-if="form.recurrenceEnabled" class="recurrence-options">
                <StyledSelect
                  v-model="form.recurrenceMonthsAhead"
                  :options="recurrenceWindowOptions"
                  placeholder="Proximos 12 meses"
                  dropdown-direction="up"
                />
                <VueDatePicker
                  :model-value="recurrenceEndDatePickerModel"
                  @update:model-value="recurrenceEndDatePickerModel = $event"
                  class="date-picker-field recurrence-date"
                  :enable-time-picker="false"
                  locale="pt-BR"
                  format="dd/MM/yyyy"
                  placeholder="Sem data final"
                  auto-apply
                  teleport="body"
                  :z-index="12000"
                  :hide-input-icon="true"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <StickyNote :size="14" />
                Observações
              </label>
              <textarea v-model="form.notes" class="form-textarea" rows="4" placeholder="Informações internas"></textarea>
            </div>
          </section>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="drawer-footer space-between">
        <AppButton variant="default" @click="currentStep === 1 ? $emit('close') : prevStep()">
          <component :is="currentStep === 1 ? X : ArrowLeft" :size="17" />
          {{ currentStep === 1 ? 'Cancelar' : 'Voltar' }}
        </AppButton>
        <AppButton
          variant="primary"
          :loading="loading"
          @click="currentStep === steps.length ? submit() : nextStep()"
        >
          <component :is="currentStep === steps.length ? Save : ArrowRight" :size="17" />
          {{ currentStep === steps.length ? (isEditing ? 'Salvar alterações' : 'Adicionar') : 'Próximo' }}
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
}

.stepper-wrapper {
  margin-bottom: 1rem;
  padding: 0.5rem 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  font-weight: 600;
}

.inline-error {
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
}

.field-error {
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
}

.category-select-footer {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.category-footer-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 0.55rem;
  background: #f8fafc;
  color: var(--azul-principal, #2563eb);
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0.62rem 0.75rem;
  text-align: left;
}

.category-footer-action:hover {
  background: #eff6ff;
}

.category-footer-form {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.category-footer-input {
  width: 100%;
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 0.55rem;
  color: #111827;
  font: inherit;
  padding: 0 0.75rem;
}

.category-footer-input:focus {
  outline: none;
  border-color: var(--azul-principal, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.category-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.category-footer-save,
.category-footer-cancel {
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  min-height: 30px;
  padding: 0 0.65rem;
}

.category-footer-save {
  background: var(--azul-principal, #2563eb);
  color: #fff;
}

.category-footer-save:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.category-footer-cancel {
  background: transparent;
  color: #64748b;
}

.category-footer-cancel:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.category-option-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.76;
}

.category-option-delete:hover {
  background: #fee2e2;
  color: #dc2626;
  opacity: 1;
}

.recurrence-inline {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border: 1px solid #eef2f7;
  border-radius: 0.75rem;
  background: #f9fafb;
}

.recurrence-inline.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: #f8fbff;
}

.recurrence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.recurrence-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0;
}

.recurrence-toggle:hover,
.recurrence-inline.is-active .recurrence-toggle {
  color: #0f172a;
}

.mini-switch {
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  transition: background 0.18s ease;
}

.mini-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.18s ease;
}

.mini-switch.is-on {
  background: var(--azul-principal, #2563eb);
}

.mini-switch.is-on::after {
  transform: translateX(12px);
}

.recurrence-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.recurrence-helper {
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.35;
  text-align: right;
}

.recurrence-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: center;
}

.recurrence-options :deep(.form-group) {
  margin: 0;
}

.recurrence-options :deep(.select-button),
.recurrence-date :deep(.dp__input) {
  min-height: 38px;
  border-radius: 0.65rem;
  font-size: 0.86rem;
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
  padding: 0.75rem 1rem;
}

.form-textarea {
  min-height: 90px;
  padding: 0.75rem 1rem;
  resize: none;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.has-error,
.form-textarea.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
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

.date-picker-field.has-error :deep(.dp__input) {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
}

.date-picker-field :deep(.dp__input_icon) {
  display: none;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.drawer-footer.space-between {
  justify-content: space-between;
  width: 100%;
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

  .recurrence-inline {
    align-items: stretch;
    flex-direction: column;
  }

  .recurrence-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recurrence-helper {
    text-align: left;
  }

  .recurrence-options {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .recurrence-toggle {
    justify-content: flex-start;
  }

  .drawer-footer {
    padding: 1rem;
  }
}
</style>
