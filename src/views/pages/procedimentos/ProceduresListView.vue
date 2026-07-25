<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProceduresStore } from '@/stores/procedures'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Stethoscope,
  DollarSign,
  Tag,
  SlidersHorizontal,
  X,
  Check,
  Package,
  FileText,
  ArrowLeft,
  ArrowRight,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import CurrencyInput from '@/components/global/CurrencyInput.vue'
import Stepper from '@/components/pages/onboarding/Stepper.vue'

const proceduresStore = useProceduresStore()
const estoqueStore = useEstoqueStore()
const router = useRouter()
const toast = useToast()

const procedures = computed(() => proceduresStore.procedures)
const actionsMenuOpenFor = ref(null)
const selectedProcedure = ref(null)
const showFormModal = ref(false)
const isSaving = ref(false)
const currentStep = ref(1)

const formSteps = [
  { name: 'Dados', icon: FileText, subtitle: 'Identificação' },
  { name: 'Preço', icon: DollarSign, subtitle: 'Cobrança' },
  { name: 'Revisão', icon: Check, subtitle: 'Confirmar' },
]

const pricingOptions = [
  { value: 'FIXED', label: 'Preço Fixo' },
  { value: 'UNIT', label: 'Por Unidade' },
  { value: 'ML', label: 'Por mL' },
]

const costTypeOptions = [
  { value: 'FIXED', label: 'Custo fixo' },
  { value: 'UNIT', label: 'Por unidade' },
  { value: 'ML', label: 'Por mL' },
]

const commissionOptions = [
  { value: 'NONE', label: 'Sem comissao' },
  { value: 'FIXED', label: 'Valor fixo' },
  { value: 'PERCENT', label: 'Percentual' },
]

const previewRevenueCents = computed(() => Math.round(Number(selectedProcedure.value?.baseValue || 0) * 100))

const previewProcedureCostCents = computed(() => {
  const procedure = selectedProcedure.value || {}
  if (procedure.costType === 'UNIT' || procedure.costType === 'ML') {
    return Math.round(Number(procedure.costPerUnitValue || 0) * 100)
  }
  return Math.round(Number(procedure.defaultCostValue || 0) * 100)
})

const previewProfessionalCostCents = computed(() => {
  const procedure = selectedProcedure.value || {}
  if (procedure.professionalCommissionType === 'FIXED') {
    return Math.round(Number(procedure.professionalCommissionFixedValue || 0) * 100)
  }
  if (procedure.professionalCommissionType === 'PERCENT') {
    return Math.round(previewRevenueCents.value * (Number(procedure.professionalCommissionValue || 0) / 100))
  }
  return 0
})

const previewTotalCostCents = computed(() => previewProcedureCostCents.value + previewProfessionalCostCents.value)
const previewProfitCents = computed(() => previewRevenueCents.value - previewTotalCostCents.value)
const previewMarginPercent = computed(() => (
  previewRevenueCents.value > 0
    ? ((previewProfitCents.value / previewRevenueCents.value) * 100).toFixed(2)
    : '0.00'
))

function hydrateProcedureForm(procedure) {
  const commissionType = procedure.professionalCommissionType || 'NONE'
  return {
    ...procedure,
    costType: procedure.costType || procedure.pricingType || 'FIXED',
    defaultCostCents: Number(procedure.defaultCostCents || 0),
    costPerUnitCents: Number(procedure.costPerUnitCents || 0),
    defaultCostValue: Number(procedure.defaultCostCents || 0) / 100,
    costPerUnitValue: Number(procedure.costPerUnitCents || 0) / 100,
    professionalCommissionType: commissionType,
    professionalCommissionValue: commissionType === 'PERCENT' ? Number(procedure.professionalCommissionValue || 0) : 0,
    professionalCommissionFixedValue: commissionType === 'FIXED' ? Number(procedure.professionalCommissionValue || 0) / 100 : 0,
  }
}

onMounted(async () => {
  await Promise.all([
    proceduresStore.fetchProcedures(),
    estoqueStore.fetchKits({ limit: 100 })
  ])
})

function toggleActionsMenu(procedureId) {
  actionsMenuOpenFor.value = actionsMenuOpenFor.value === procedureId ? null : procedureId
}

function getKitForProcedure(procedureId) {
  if (!estoqueStore.kits) return null
  return estoqueStore.kits.find(k => (k.procedimentoId?._id || k.procedimentoId) === procedureId)
}

function goToKits() {
  router.push({ name: 'estoque-kits' })
}

function handleEdit(procedure) {
  selectedProcedure.value = hydrateProcedureForm(procedure)
  currentStep.value = 1
  showFormModal.value = true
  actionsMenuOpenFor.value = null
}

function handleNew() {
  selectedProcedure.value = {
    name: '',
    description: '',
    baseValue: 0,
    pricingType: 'FIXED',
    costType: 'FIXED',
    defaultCostCents: 0,
    costPerUnitCents: 0,
    defaultCostValue: 0,
    costPerUnitValue: 0,
    professionalCommissionType: 'NONE',
    professionalCommissionValue: 0,
    professionalCommissionFixedValue: 0,
  }
  currentStep.value = 1
  showFormModal.value = true
}

async function handleDelete(procedureId) {
  if (confirm('Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.')) {
    const { success } = await proceduresStore.deleteProcedure(procedureId)
    if (success) {
      toast.success('Procedimento excluído com sucesso!')
    } else {
      toast.error(proceduresStore.error || 'Não foi possível excluir o procedimento.')
    }
  }
  actionsMenuOpenFor.value = null
}

function closeModal() {
  showFormModal.value = false
  selectedProcedure.value = null
  currentStep.value = 1
}

function nextStep() {
  if (currentStep.value === 1 && !selectedProcedure.value?.name?.trim()) {
    toast.error('O nome do procedimento é obrigatório.')
    return
  }

  if (currentStep.value === 2 && selectedProcedure.value.baseValue <= 0) {
    toast.error('O valor deve ser maior que zero.')
    return
  }

  if (currentStep.value < formSteps.length) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

async function handleSave() {
  if (isSaving.value) return
  
  if (!selectedProcedure.value.name) {
    toast.error('O nome do procedimento é obrigatório.')
    return
  }
  
  // Allow 0 if it's intentional, but usually price > 0. The previous form checked > 0.
  // Let's keep the check but maybe allow 0 if it's a free procedure? 
  // The previous code: if (formData.value.price <= 0) return
  if (selectedProcedure.value.baseValue <= 0) {
    toast.error('O valor deve ser maior que zero.')
    return
  }

  isSaving.value = true

  try {
    const procedureData = { ...selectedProcedure.value }
    procedureData.defaultCostCents = Math.round(Number(procedureData.defaultCostValue || 0) * 100)
    procedureData.costPerUnitCents = Math.round(Number(procedureData.costPerUnitValue || 0) * 100)
    procedureData.professionalCommissionValue = procedureData.professionalCommissionType === 'FIXED'
      ? Math.round(Number(procedureData.professionalCommissionFixedValue || 0) * 100)
      : Number(procedureData.professionalCommissionValue || 0)
    delete procedureData.defaultCostValue
    delete procedureData.costPerUnitValue
    delete procedureData.professionalCommissionFixedValue
    
    let result
    if (procedureData._id) {
      result = await proceduresStore.updateProcedure(procedureData._id, procedureData)
      if (result.success) {
        toast.success('Procedimento atualizado com sucesso!')
      }
    } else {
      result = await proceduresStore.createProcedure(procedureData)
      if (result.success) {
        toast.success('Procedimento criado com sucesso!')
      }
    }

    if (!result.success) {
      toast.error(proceduresStore.error || 'Erro ao salvar procedimento.')
    } else {
      closeModal()
    }
  } finally {
    isSaving.value = false
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const getPricingTypeInfo = (type) => {
  switch (type) {
    case 'FIXED':
      return { label: 'Preço Fixo', class: 'tag-default' }
    case 'ML':
      return { label: 'Por ML', class: 'tag-ml' }
    case 'UNIT':
      return { label: 'Unidade', class: 'tag-unit' }
    default:
      return { label: type || 'N/A', class: 'tag-default' }
  }
}
</script>

<template>
  <div class="procedures-page">
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Procedimentos</h1>
        <p class="subtitle">Gerencie os procedimentos e seus valores.</p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="handleNew" class="add-procedure-btn">
          <Plus :size="16" />
          Adicionar Procedimento
        </AppButton>
      </div>
    </header>

    <div class="table-wrapper" :class="{ 'is-loading': proceduresStore.isLoading && procedures.length > 0 }">
      <div class="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th class="col-name">
                <div class="th-content">
                  <Stethoscope :size="14" />
                  <span>Nome do Procedimento</span>
                </div>
              </th>
              <th class="col-kit">
                <div class="th-content">
                  <Package :size="14" />
                  <span>Kit de Produtos</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <DollarSign :size="14" />
                  <span>Valor Base</span>
                </div>
              </th>
              <th class="col-type">
                <div class="th-content">
                  <Tag :size="14" />
                  <span>Tipo</span>
                </div>
              </th>
              <th class="actions-header">
                <div class="th-content">
                  <SlidersHorizontal :size="14" />
                  <span>Ações</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="proceduresStore.isLoading && procedures.length === 0">
              <tr v-for="n in 5" :key="`skel-desk-${n}`" class="skeleton-row">
                <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 40%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 30%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 40%"></div></td>
                <td class="actions-cell"><div class="skeleton skeleton-button"></div></td>
              </tr>
            </template>

            <template v-else-if="!proceduresStore.isLoading && procedures.length === 0">
              <tr>
                <td colspan="4" class="state-cell">
                  <div class="empty-state-content">
                    <div class="empty-state-icon-bg">
                      <Stethoscope :size="24" />
                    </div>
                    <h3 class="empty-state-title">Nenhum procedimento cadastrado</h3>
                    <p class="empty-state-text">
                      Comece adicionando um procedimento para gerenciar os valores.
                    </p>
                    <button @click="handleNew" class="btn-primary-sm">
                      <Plus :size="16" />
                      <span>Adicionar Procedimento</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr v-for="procedure in procedures" :key="procedure._id" class="procedure-row">
                <td class="procedure-name">
                  <div class="name-wrapper">
                    <span class="name">{{ procedure.name }}</span>
                    <span v-if="procedure.description" class="description">{{ procedure.description }}</span>
                  </div>
                </td>
                <td class="procedure-kit">
                  <div v-if="getKitForProcedure(procedure._id)" class="kit-link" @click="goToKits">
                    <Package :size="14" />
                    <span class="kit-name">{{ getKitForProcedure(procedure._id).nome }}</span>
                  </div>
                  <button v-else class="btn-outline-sm" @click="goToKits">
                    <Plus :size="14" />
                    <span>Vincular Kit</span>
                  </button>
                </td>
                <td class="procedure-value">{{ formatCurrency(procedure.baseValue) }}</td>
                <td class="procedure-type">
                  <span 
                    class="pricing-tag" 
                    :class="getPricingTypeInfo(procedure.pricingType).class"
                  >
                    {{ getPricingTypeInfo(procedure.pricingType).label }}
                  </span>
                </td>
                <td class="actions-cell" @click.stop>
                  <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)">
                    <button @click.stop="toggleActionsMenu(procedure._id)" class="btn-icon">
                      <MoreHorizontal :size="20" />
                    </button>
                    <Transition name="fade">
                      <div v-if="actionsMenuOpenFor === procedure._id" class="actions-dropdown">
                        <button @click.stop="handleEdit(procedure)" class="dropdown-item">
                          <Pencil :size="14" /> Editar
                        </button>
                        <button @click.stop="handleDelete(procedure._id)" class="dropdown-item delete">
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

      <!-- Mobile List -->
      <div class="mobile-list" v-auto-animate>
        <template v-if="proceduresStore.isLoading && procedures.length === 0">
          <div v-for="n in 5" :key="`skel-mob-${n}`" class="procedure-card skeleton-card">
            <div class="procedure-info-mobile">
              <div class="procedure-details-mobile">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text-sm"></div>
              </div>
            </div>
            <div class="skeleton skeleton-button"></div>
          </div>
        </template>

        <template v-else-if="procedures.length > 0">
          <div v-for="procedure in procedures" :key="procedure._id" class="procedure-card">
            <div class="procedure-info-mobile">
              <div class="procedure-icon">
                <Stethoscope :size="20" />
              </div>
              <div class="procedure-details-mobile">
                <span class="procedure-name">{{ procedure.name }}</span>
                <span class="procedure-value">{{ formatCurrency(procedure.baseValue) }}</span>
                <span 
                  class="pricing-tag mobile-tag" 
                  :class="getPricingTypeInfo(procedure.pricingType).class"
                >
                  {{ getPricingTypeInfo(procedure.pricingType).label }}
                </span>
                <div v-if="getKitForProcedure(procedure._id)" class="kit-link mobile-kit-link" @click="goToKits">
                  <Package :size="12" />
                  <span class="kit-name">{{ getKitForProcedure(procedure._id).nome }}</span>
                </div>
                <button v-else class="btn-outline-sm mobile-kit-btn" @click="goToKits">
                  <Plus :size="12" />
                  <span>Sem Kit</span>
                </button>
              </div>
            </div>

            <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)" @click.stop>
              <button @click.stop="toggleActionsMenu(procedure._id)" class="btn-icon">
                <MoreHorizontal :size="20" />
              </button>
              <Transition name="fade">
                <div v-if="actionsMenuOpenFor === procedure._id" class="actions-dropdown">
                  <button @click.stop="handleEdit(procedure)" class="dropdown-item">
                    <Pencil :size="14" /> Editar
                  </button>
                  <button @click.stop="handleDelete(procedure._id)" class="dropdown-item delete">
                    <Trash2 :size="14" /> Excluir
                  </button>
                </div>
              </Transition>
            </div>

          </div>
        </template>

        <div v-if="!proceduresStore.isLoading && procedures.length === 0" class="state-cell">
          <div class="empty-state-content">
            <div class="empty-state-icon-bg">
              <Stethoscope :size="24" />
            </div>
            <h3 class="empty-state-title">Nenhum procedimento cadastrado</h3>
            <p class="empty-state-text">Comece adicionando um procedimento para gerenciar os valores.</p>
            <button @click="handleNew" class="btn-primary-sm">
              <Plus :size="16" />
              <span>Adicionar Procedimento</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Formulário -->
    <!-- Side Drawer de Formulário -->
    <SideDrawer v-if="showFormModal" @close="closeModal" size="xl">
      <template #header>
        <div class="procedure-create-header">
          <div class="procedure-create-header-content">
            <h2 class="procedure-create-title">
              <div class="procedure-create-icon">
                <Stethoscope :size="24" />
              </div>
              {{ selectedProcedure._id ? 'Editar Procedimento' : 'Novo Procedimento' }}
            </h2>
            <p class="procedure-create-description">
              {{ selectedProcedure._id ? 'Atualize os dados e a precificação do procedimento.' : 'Cadastre o serviço com dados claros e preço base.' }}
            </p>
          </div>
          <button @click="closeModal" class="close-btn-header">
            <X :size="24" />
          </button>
        </div>
      </template>

      <div v-if="selectedProcedure" class="procedure-create-body">
        <div class="procedure-create-stepper">
          <Stepper :steps="formSteps" :currentStep="currentStep" />
        </div>

        <section v-show="currentStep === 1" class="procedure-create-step">
          <div class="procedure-create-card">
            <div class="procedure-create-card-header">
              <div>
                <h3>Dados do procedimento</h3>
                <p>Nome e descrição que aparecem nas telas clínicas e financeiras.</p>
              </div>
            </div>

            <div class="procedure-create-field">
              <label for="procedure-name">Nome do procedimento <span>*</span></label>
              <input
                id="procedure-name"
                v-model="selectedProcedure.name"
                type="text"
                class="procedure-create-input"
                placeholder="Ex: Consulta, Limpeza, Bioestimulador"
                required
                autofocus
              />
            </div>

            <div class="procedure-create-field">
              <label for="procedure-description">Descrição</label>
              <textarea
                id="procedure-description"
                v-model="selectedProcedure.description"
                class="procedure-create-textarea"
                placeholder="Descrição opcional do procedimento"
                rows="4"
              ></textarea>
            </div>
          </div>
        </section>

        <section v-show="currentStep === 2" class="procedure-create-step">
          <div class="procedure-create-card">
            <div class="procedure-create-card-header">
              <div>
                <h3>Precificação</h3>
                <p>Defina como o procedimento será cobrado nos atendimentos e orçamentos.</p>
              </div>
            </div>

            <div class="procedure-create-price-grid">
              <div class="procedure-create-field">
                <label>Tipo de cobrança</label>
                <StyledSelect v-model="selectedProcedure.pricingType" :options="pricingOptions" />
              </div>

              <div class="procedure-create-field">
                <label>Valor base <span>*</span></label>
                <CurrencyInput v-model="selectedProcedure.baseValue" placeholder="R$ 0,00" />
              </div>
            </div>

            <div class="procedure-create-card-header">
              <div>
                <h3>Custos e comissao</h3>
                <p>Defina o custo padrao usado na lucratividade dos atendimentos.</p>
              </div>
            </div>

            <div class="procedure-create-price-grid">
              <div class="procedure-create-field">
                <label>Tipo de custo</label>
                <StyledSelect v-model="selectedProcedure.costType" :options="costTypeOptions" />
              </div>

              <div class="procedure-create-field">
                <label>{{ selectedProcedure.costType === 'FIXED' ? 'Custo padrao' : 'Custo por unidade/ml' }}</label>
                <CurrencyInput
                  v-if="selectedProcedure.costType === 'FIXED'"
                  v-model="selectedProcedure.defaultCostValue"
                  placeholder="R$ 0,00"
                />
                <CurrencyInput
                  v-else
                  v-model="selectedProcedure.costPerUnitValue"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div class="procedure-create-price-grid">
              <div class="procedure-create-field">
                <label>Comissao profissional</label>
                <StyledSelect v-model="selectedProcedure.professionalCommissionType" :options="commissionOptions" />
              </div>

              <div class="procedure-create-field" v-if="selectedProcedure.professionalCommissionType !== 'NONE'">
                <label>{{ selectedProcedure.professionalCommissionType === 'PERCENT' ? 'Percentual' : 'Valor fixo' }}</label>
                <div v-if="selectedProcedure.professionalCommissionType === 'PERCENT'" class="percent-input-wrapper">
                  <input
                    v-model.number="selectedProcedure.professionalCommissionValue"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="procedure-create-input"
                  />
                  <span>%</span>
                </div>
                <CurrencyInput
                  v-else
                  v-model="selectedProcedure.professionalCommissionFixedValue"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </div>

          <div class="procedure-create-summary">
            <span>Prévia</span>
            <strong>{{ selectedProcedure.name || 'Novo procedimento' }}</strong>
            <p>{{ getPricingTypeInfo(selectedProcedure.pricingType).label }} · {{ formatCurrency(selectedProcedure.baseValue || 0) }}</p>
            <div class="margin-preview-grid">
              <div>
                <span>Receita</span>
                <strong>{{ formatCurrency(previewRevenueCents / 100) }}</strong>
              </div>
              <div>
                <span>Custo</span>
                <strong>{{ formatCurrency(previewTotalCostCents / 100) }}</strong>
              </div>
              <div>
                <span>Lucro</span>
                <strong :class="{ 'is-negative': previewProfitCents < 0 }">{{ formatCurrency(previewProfitCents / 100) }}</strong>
              </div>
              <div>
                <span>Margem</span>
                <strong :class="{ 'is-negative': previewProfitCents < 0 }">{{ previewMarginPercent }}%</strong>
              </div>
            </div>
          </div>
        </section>

        <section v-show="currentStep === 3" class="procedure-create-step">
          <div class="procedure-create-review">
            <div class="procedure-create-review-main">
              <span>Procedimento</span>
              <strong>{{ selectedProcedure.name }}</strong>
              <p>{{ selectedProcedure.description || 'Sem descrição informada.' }}</p>
            </div>

            <div class="procedure-create-review-grid">
              <div>
                <span>Tipo de cobrança</span>
                <strong>{{ getPricingTypeInfo(selectedProcedure.pricingType).label }}</strong>
              </div>
              <div>
                <span>Valor base</span>
                <strong>{{ formatCurrency(selectedProcedure.baseValue || 0) }}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="procedure-create-footer">
          <AppButton variant="default" @click="currentStep === 1 ? closeModal() : prevStep()">
            <component :is="currentStep === 1 ? X : ArrowLeft" :size="18" />
            {{ currentStep === 1 ? 'Cancelar' : 'Voltar' }}
          </AppButton>
          <AppButton
            variant="primary"
            @click="currentStep === formSteps.length ? handleSave() : nextStep()"
            :disabled="isSaving"
            :loading="isSaving"
          >
            <component :is="currentStep === formSteps.length ? Check : ArrowRight" :size="18" />
            {{ currentStep === formSteps.length ? (selectedProcedure._id ? 'Salvar Alterações' : 'Criar Procedimento') : 'Próximo' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style scoped>
.procedures-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--cinza-texto);
}

.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-decoration: none;
  height: 40px;
}

.btn-primary-sm:hover {
  background-color: var(--azul-escuro);
}

.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  position: relative;
}

.table-wrapper.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

.table-container {
  overflow-x: auto;
  min-height: 60vh;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 380px;
  margin: 0 auto;
}

.empty-state-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-state-text {
  color: var(--cinza-texto);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  text-align: center;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 1rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

.col-kit {
  width: 20%;
  min-width: 150px;
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

th.actions-header {
  width: 100px;
}

th.col-name {
  width: 35%;
}

th.col-type {
  width: 15%;
  min-width: 100px;
}

th.actions-header .th-content {
  justify-content: flex-end;
}

.procedure-row {
  transition: background-color 0.2s ease;
}

.procedure-row:hover td {
  background-color: #f9fafb;
}

.name-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.procedure-name .name {
  font-weight: 600;
  color: #111827;
}

.procedure-name .description {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.procedure-value {
  font-weight: 600;
  color: #059669;
}

.pricing-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
}

.tag-ml {
  background-color: #e0f2fe;
  color: #0369a1;
}

.tag-unit {
  background-color: #dcfce7;
  color: #15803d;
}

.tag-default {
  background-color: #f3f4f6;
  color: #374151;
}

.mobile-tag {
  align-self: flex-start;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
}

.kit-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--azul-principal);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: #eff6ff;
  width: fit-content;
  transition: all 0.2s ease;
}

.kit-link:hover {
  background-color: #dbeafe;
  transform: translateY(-1px);
}

.kit-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-outline-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  border: 1.5px dashed #cbd5e1;
  background-color: transparent;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline-sm:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
  background-color: #eff6ff;
}

.mobile-kit-link {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
}

.mobile-kit-btn {
  margin-top: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
}

.state-cell {
  padding: 4rem;
  text-align: center;
  color: var(--cinza-texto);
  font-size: 1rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
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
  text-decoration: none;
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

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.skeleton {
  background-color: #e5e7eb;
  border-radius: 0.5rem;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.skeleton-row,
.skeleton-card {
  pointer-events: none;
}

.skeleton-row:hover td {
  background-color: var(--branco) !important;
}

.skeleton-text {
  height: 1rem;
  width: 100%;
}

.skeleton-text-sm {
  height: 0.875rem;
  width: 70%;
  margin-top: 0.35rem;
}

.skeleton-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.actions-cell .skeleton-button {
  margin-left: auto;
}

.mobile-list {
  display: none;
}

.procedure-create-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.procedure-create-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.procedure-create-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.procedure-create-icon {
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.procedure-create-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0 2rem;
  line-height: 1.35;
}

.procedure-create-body {
  display: flex;
  flex-direction: column;
}

.procedure-create-stepper {
  margin-bottom: 2rem;
  padding: 0.5rem 0;
}

.procedure-create-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: procedureStepIn 0.25s ease;
}

@keyframes procedureStepIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.procedure-create-card,
.procedure-create-summary,
.procedure-create-review {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.procedure-create-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.procedure-create-card-header h3 {
  color: #111827;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.procedure-create-card-header p {
  color: #6b7280;
  font-size: 0.8125rem;
  margin: 0.25rem 0 0;
  line-height: 1.4;
}

.procedure-create-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.procedure-create-field label {
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
}

.procedure-create-field label span {
  color: #dc2626;
}

.procedure-create-input,
.procedure-create-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background: #fff;
  color: #111827;
  font-family: inherit;
  font-size: 0.9375rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.procedure-create-input {
  height: 44px;
  padding: 0 1rem;
}

.procedure-create-textarea {
  min-height: 104px;
  resize: vertical;
  padding: 0.75rem 1rem;
}

.procedure-create-input::placeholder,
.procedure-create-textarea::placeholder {
  color: #9ca3af;
}

.procedure-create-input:focus,
.procedure-create-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.procedure-create-price-grid,
.procedure-create-review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.procedure-create-summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.procedure-create-summary span,
.procedure-create-review span {
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.procedure-create-summary strong,
.procedure-create-review strong {
  color: #111827;
  font-size: 1rem;
}

.procedure-create-summary p,
.procedure-create-review p {
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.percent-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.percent-input-wrapper .procedure-create-input {
  padding-right: 2.5rem;
}

.percent-input-wrapper span {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  font-weight: 700;
}

.margin-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.margin-preview-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #f9fafb;
}

.margin-preview-grid span {
  color: #6b7280;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.margin-preview-grid strong {
  color: #111827;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.margin-preview-grid strong.is-negative {
  color: #dc2626;
}

.procedure-create-review {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.procedure-create-review-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.procedure-create-review-grid > div {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: #f9fafb;
}

.procedure-create-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.procedure-create-footer :deep(.app-button svg) {
  color: #111827;
  stroke: #111827;
}

/* Modal Styles */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.procedure-id {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
  font-weight: 500;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .add-procedure-btn {
    width: 100%;
    justify-content: center;
  }

  .table-wrapper {
    border: none;
    background-color: transparent;
    border-radius: 0;
    overflow: visible;
  }

  .table-container {
    display: none;
  }

  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow: visible;
  }

  .procedure-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background-color: var(--branco);
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    overflow: visible;
  }

  .procedure-info-mobile {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .procedure-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #eef2ff;
    color: var(--azul-principal);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .procedure-details-mobile {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex-grow: 1;
    gap: 0.25rem;
  }

  .procedure-details-mobile .procedure-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .procedure-details-mobile .procedure-value {
    color: #059669;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .procedure-details-mobile .aliases-count {
    color: var(--cinza-texto);
    font-size: 0.8rem;
  }

  .actions-wrapper {
    z-index: 100;
  }

  .actions-dropdown {
    bottom: calc(100% + 5px);
    top: auto;
    z-index: 100;
  }

  .mobile-list > .state-cell {
    padding: 2rem 0;
    background-color: transparent;
    border: none;
  }

  .procedure-create-header {
    padding: 1rem;
  }

  .procedure-create-description {
    margin-left: 0;
  }

  .procedure-create-stepper {
    margin-bottom: 1.25rem;
  }

  .procedure-create-card,
  .procedure-create-summary,
  .procedure-create-review {
    padding: 1rem;
  }

  .procedure-create-price-grid,
  .procedure-create-review-grid,
  .margin-preview-grid {
    grid-template-columns: 1fr;
  }

  .procedure-create-footer {
    padding: 1rem;
  }

  .procedure-create-footer :deep(.app-button) {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
