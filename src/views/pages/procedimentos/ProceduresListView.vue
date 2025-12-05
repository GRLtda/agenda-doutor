<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProceduresStore } from '@/stores/procedures'
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
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const proceduresStore = useProceduresStore()
const router = useRouter()
const toast = useToast()

const procedures = computed(() => proceduresStore.procedures)
const actionsMenuOpenFor = ref(null)
const selectedProcedure = ref(null)
const showFormModal = ref(false)

onMounted(async () => {
  await proceduresStore.fetchProcedures()
})

function toggleActionsMenu(procedureId) {
  actionsMenuOpenFor.value = actionsMenuOpenFor.value === procedureId ? null : procedureId
}

function handleEdit(procedure) {
  selectedProcedure.value = { ...procedure }
  showFormModal.value = true
  actionsMenuOpenFor.value = null
}

function handleNew() {
  selectedProcedure.value = {
    name: '',
    description: '',
    baseValue: 0,
    pricingType: 'FIXED',
  }
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
}

async function handleSave() {
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

  const procedureData = { ...selectedProcedure.value }
  
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
      return { label: 'Por Unidade', class: 'tag-unit' }
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
              <th>
                <div class="th-content">
                  <Stethoscope :size="14" />
                  <span>Nome do Procedimento</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <DollarSign :size="14" />
                  <span>Valor Base</span>
                </div>
              </th>
              <th>
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
    <SideDrawer v-if="showFormModal" @close="closeModal">
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <h2 class="drawer-title">
              {{ selectedProcedure._id ? 'Editar Procedimento' : 'Novo Procedimento' }}
            </h2>
            <span v-if="selectedProcedure._id" class="procedure-id">
              ID #{{ selectedProcedure._id.slice(-6).toUpperCase() }}
            </span>
          </div>
          <button @click="closeModal" class="close-btn-header">
            <X :size="24" />
          </button>
        </div>
      </template>

      <ProcedureForm v-model="selectedProcedure" />

      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="closeModal" class="btn-cancel">
            <X :size="18" />
            Cancelar
          </AppButton>
          <AppButton variant="secondary" @click="handleSave" class="btn-save">
            <Check :size="18" />
            {{ selectedProcedure._id ? 'Salvar Alterações' : 'Criar Procedimento' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<script>
import ProcedureForm from './ProcedureForm.vue'

export default {
  components: {
    ProcedureForm,
    SideDrawer,
  },
}
</script>

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
  font-size: 2.25rem;
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
}
</style>
