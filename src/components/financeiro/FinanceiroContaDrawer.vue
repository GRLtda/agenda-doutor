<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileSignature,
  FileText,
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
let patientSearchTimeout = null
const newCategory = reactive({
  name: '',
})

const isEditing = computed(() => Boolean(props.conta?._id))
const title = computed(() => {
  if (isEditing.value) return 'Editar conta'
  return props.tipo === 'RECEIVABLE' ? 'Nova conta a receber' : 'Nova despesa'
})
const canUseRecurrence = computed(() => props.tipo === 'PAYABLE' && !isEditing.value)
const categoryType = computed(() => props.tipo === 'RECEIVABLE' ? 'REVENUE' : 'EXPENSE')
const isReceivable = computed(() => props.tipo === 'RECEIVABLE')

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

function submit() {
  const amountCents = reaisToCents(form.amount)
  const partyName = isReceivable.value ? selectedPatientName() : form.partyName.trim()
  if (!form.title.trim() || !partyName || !form.dueDate || amountCents <= 0) return
  if (isReceivable.value && !form.patientId) return

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
                {{ tipo === 'RECEIVABLE' ? 'Paciente' : 'Fornecedor' }}
                <span class="required-asterisk">*</span>
              </label>
              <SearchableSelect
                v-if="isReceivable"
                v-model="form.patientId"
                :options="patientOptions"
                :loading="patientsStore.isLoading"
                :search-value="patientSearchQuery"
                empty-label="Buscar paciente"
                required
                @search="handlePatientSearch"
              />
              <input
                v-else
                v-model="form.partyName"
                class="form-input"
                type="text"
                placeholder="Nome do fornecedor"
                required
              />
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

        <div v-if="canUseRecurrence" class="recurrence-inline" :class="{ 'is-active': form.recurrenceEnabled }">
          <button type="button" class="recurrence-toggle" @click="form.recurrenceEnabled = !form.recurrenceEnabled">
            <span class="mini-switch" :class="{ 'is-on': form.recurrenceEnabled }"></span>
            <span class="recurrence-label">
              <Repeat :size="14" />
              Repetir todo mes
            </span>
          </button>

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

.inline-error {
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
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
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: -0.25rem;
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
  padding: 0.15rem 0;
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

.recurrence-options {
  display: grid;
  grid-template-columns: minmax(160px, 190px) minmax(150px, 190px);
  gap: 0.5rem;
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

  .recurrence-inline {
    align-items: stretch;
    flex-direction: column;
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
