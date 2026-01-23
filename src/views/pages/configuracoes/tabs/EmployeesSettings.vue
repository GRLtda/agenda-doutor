<script setup>
import { ref, onMounted, computed } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import { useAuthStore } from '@/stores/auth'
import { usePlanAccess } from '@/composables/usePlanAccess'
import { useToast } from 'vue-toastification'
import {
  UserPlus,
  MoreHorizontal,
  Trash2,
  UserCog,
  UserCheck,
  Clock,
  Mail,
  Users,
  XCircle,
  Copy,
} from 'lucide-vue-next'
import InviteEmployeeModal from '@/components/pages/configuracoes/modals/InviteEmployeeModal.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'

const employeesStore = useEmployeesStore()
const authStore = useAuthStore()
const { currentPlan } = usePlanAccess()
const toast = useToast()

const isModalOpen = ref(false)
const actionsMenuOpenFor = ref(null)
const editingRoleFor = ref(null)
const selectedRole = ref('')

const currentUser = computed(() => authStore.user)

onMounted(() => {
  employeesStore.fetchEmployees()
})

const roleOptions = computed(() => {
  const options = [
    { value: 'recepcionista', label: 'Recepcionista' },
    { value: 'medico', label: 'Médico(a)' },
    { value: 'gerente', label: 'Gerente' },
  ]
  
  if (currentPlan.value === 'basic') {
    return options.filter(opt => opt.value !== 'medico')
  }
  
  return options
})

function getRoleLabel(roleValue) {
  if (roleValue === 'owner') return 'Proprietário'
  const role = roleOptions.value.find((r) => r.value === roleValue)
  return role ? role.label : 'N/D'
}

function openEditRole(employee) {
  actionsMenuOpenFor.value = null
  selectedRole.value = employee.role
  editingRoleFor.value = employee._id
}

async function handleUpdateRole(employeeId) {
  const { success } = await employeesStore.updateEmployeeRole(employeeId, selectedRole.value)
  if (success) {
    toast.success('Cargo atualizado com sucesso!')
  } else {
    toast.error('Erro ao atualizar cargo.')
  }
  editingRoleFor.value = null
}

async function handleDelete(employeeId) {
  actionsMenuOpenFor.value = null
  if (confirm('Tem certeza que deseja demitir este funcionário? Esta ação não pode ser desfeita.')) {
    const { success } = await employeesStore.deactivateEmployee(employeeId)
    if (success) {
      toast.success('Funcionário desativado com sucesso!')
    } else {
      toast.error('Não foi possível desativar o funcionário.')
    }
  }
}

async function handleCancelInvite(inviteId) {
  if (confirm('Tem certeza que deseja cancelar este convite?')) {
    const { success } = await employeesStore.cancelPendingInvitation(inviteId)
    if (success) {
      toast.success('Convite cancelado com sucesso!')
    } else {
      toast.error('Não foi possível cancelar o convite.')
    }
  }
}

function isOwner(employee) {
  return employee.role === 'owner'
}

function copyInviteLink(token) {
  if (!token) return
  
  const origin = window.location.origin
  const link = `${origin}/register?invitationToken=${token}`

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.info('Link copiado!')
      })
      .catch((err) => {
        console.error('Erro ao copiar:', err)
        toast.error('Falha ao copiar o link.')
      })
  } else {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = link
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      toast.info('Link copiado!')
    } catch (err) {
      console.error('Erro ao copiar (fallback):', err)
      toast.error('Falha ao copiar o link.')
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
</script>

<template>
  <div>
    <InviteEmployeeModal v-if="isModalOpen" @close="isModalOpen = false" />

    <Teleport to="#tab-actions">
      <AppButton
        v-if="currentUser?.role === 'owner' || currentUser?.role === 'gerente'"
        @click="isModalOpen = true"
        variant="primary"
      >
        <UserPlus :size="16" />
        Convidar Funcionário
      </AppButton>
    </Teleport>

    <div class="section-container">
      <h3 class="section-title"><UserCheck :size="20" /> Equipe Ativa</h3>

      <ul v-if="employeesStore.isLoading" class="item-list">
        <li v-for="n in 3" :key="n" class="list-item">
          <div class="item-main-info">
            <div class="skeleton skeleton-avatar"></div>
            <div class="item-details" style="width: 100%">
              <div class="skeleton skeleton-text" style="width: 40%"></div>
              <div class="skeleton skeleton-text" style="width: 60%"></div>
            </div>
          </div>
          <div class="item-role">
            <div class="skeleton skeleton-badge"></div>
          </div>
          <div class="item-actions">
            <div class="skeleton skeleton-icon"></div>
          </div>
        </li>
      </ul>

      <ul v-else-if="employeesStore.activeEmployees.length > 0" class="item-list">
        <li v-for="employee in employeesStore.activeEmployees" :key="employee._id" class="list-item">
          <div class="item-main-info">
            <div class="item-avatar">{{ employee.name.charAt(0) }}</div>
            <div class="item-details">
              <span class="item-name">{{ employee.name }}</span>
              <span class="item-email">{{ employee.email }}</span>
            </div>
          </div>
          <div class="item-role">
            <div v-if="editingRoleFor === employee._id" class="role-select-wrapper">
              <StyledSelect
                v-model="selectedRole"
                :options="roleOptions"
                @update:modelValue="handleUpdateRole(employee._id)"
                @blur="editingRoleFor = null"
              />
            </div>
            <span v-else class="role-badge" :class="`role--${employee.role}`">{{
              getRoleLabel(employee.role)
            }}</span>
          </div>
          <div class="item-actions" @click.stop>
            <div
              v-if="
                !isOwner(employee) &&
                (currentUser?.role === 'owner' || currentUser?.role === 'gerente')
              "
              class="actions-wrapper"
              v-click-outside="() => (actionsMenuOpenFor = null)"
            >
              <AppButton @click.stop="actionsMenuOpenFor = employee._id" variant="default" size="sm" class="btn-icon">
                <MoreHorizontal :size="20" />
              </AppButton>
              <Transition name="fade">
                <div v-if="actionsMenuOpenFor === employee._id" class="actions-dropdown">
                  <button @click="openEditRole(employee)" class="dropdown-item">
                    <UserCog :size="14" /> Alterar Cargo
                  </button>
                  <button @click="handleDelete(employee._id)" class="dropdown-item delete">
                    <Trash2 :size="14" /> Demitir
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </li>
      </ul>

      <div v-else class="empty-state">
        <div class="icon-wrapper"><Users :size="48" /></div>
        <h3 class="empty-title">Sua equipe começa aqui</h3>
        <p class="empty-description">
          Você ainda não possui funcionários cadastrados. Comece convidando o primeiro membro.
        </p>
        <AppButton @click="isModalOpen = true" variant="primary">
          <UserPlus :size="16" />
          Convidar Funcionário
        </AppButton>
      </div>
    </div>

    <div class="section-container">
      <h3 class="section-title"><Clock :size="20" /> Convites Pendentes</h3>

      <ul v-if="employeesStore.isLoading" class="item-list">
        <li v-for="n in 2" :key="n" class="list-item">
          <div class="item-main-info">
            <div class="skeleton skeleton-avatar"></div>
            <div class="item-details" style="width: 100%">
              <div class="skeleton skeleton-text" style="width: 70%"></div>
            </div>
          </div>
          <div class="item-role">
            <div class="skeleton skeleton-badge"></div>
          </div>
          <div class="item-actions pending-actions">
             <div class="skeleton skeleton-text" style="width: 80px; margin-right: 10px"></div>
             <div class="skeleton skeleton-icon"></div>
          </div>
        </li>
      </ul>

      <ul v-else-if="employeesStore.pendingInvitations.length > 0" class="item-list">
        <li
          v-for="invite in employeesStore.pendingInvitations"
          :key="invite._id"
          class="list-item is-pending"
        >
          <div class="item-main-info">
            <div class="item-avatar-placeholder"><Mail :size="20" /></div>
            <div class="item-details">
              <span class="item-email only-email">{{ invite.email }}</span>
            </div>
          </div>
          <div class="item-role">
            <span class="role-badge" :class="`role--${invite.role}`">{{
              getRoleLabel(invite.role)
            }}</span>
          </div>
          <div class="item-actions pending-actions">
            <span class="pending-text">Aguardando aceite</span>
            <AppButton
              @click="copyInviteLink(invite.token)"
              variant="default"
              size="sm"
              title="Copiar link de convite"
            >
              <Copy :size="18" />
            </AppButton>
            <AppButton
              @click="handleCancelInvite(invite._id)"
              variant="dangerous"
              size="sm"
              title="Cancelar convite"
            >
              <XCircle :size="20" />
            </AppButton>
          </div>
        </li>
      </ul>

      <div v-else class="empty-list-card">Nenhum convite pendente no momento.</div>
    </div>
  </div>
</template>

<style scoped>
/* --- STYLES EXISTENTES (Mantidos) --- */
.section-container {
  margin-bottom: 2.5rem;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--preto);
}

.section-title svg {
  color: var(--azul-principal);
}
.state-cell,
.empty-list-card {
  padding: 2rem;
  text-align: center;
  color: var(--cinza-texto);
  background-color: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.item-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}
.item-main-info {
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}
.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.item-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.item-name {
  font-weight: 600;
}
.item-email {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-email.only-email {
  color: #374151;
  font-weight: 500;
  font-size: 1rem;
}
.item-role {
  width: 150px;
  text-align: center;
  flex-shrink: 0;
}
.role-select-wrapper {
  max-width: 150px;
}
.role-badge {
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8rem;
  text-transform: capitalize;
}
.role--medico {
  background-color: #e0f2fe;
  color: #0ea5e9;
}
.role--recepcionista {
  background-color: #fefce8;
  color: #a16207;
}
.role--gerente {
  background-color: #f0fdf4;
  color: #16a34a;
}
.role--owner {
  background-color: #dd9b17;
  color: #ffffff;
}
.item-actions {
  width: 150px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.pending-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  width: auto;
  min-width: 150px;
}

.list-item.is-pending {
  background-color: #f9fafb;
}
.item-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pending-text {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  font-style: italic;
  white-space: nowrap;
}

.actions-wrapper {
  position: relative;
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
  width: 160px;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  border: 2px dashed #d1d5db;
  border-radius: 1rem;
  background-color: rgba(239, 246, 255, 0.5);
  text-align: center;
}
.icon-wrapper {
  color: var(--azul-principal);
  margin-bottom: 1.5rem;
}
.empty-title {
  font-family: var(--fonte-titulo);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin-bottom: 0.5rem;
}
.empty-description {
  max-width: 400px;
  color: var(--cinza-texto);
  margin-bottom: 2rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  .list-item {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.75rem 1rem;
    padding: 1rem;
    align-items: center;
  }
  .item-main-info {
    grid-column: 1 / -1;
  }
  .item-role {
    grid-column: 1;
    width: auto;
    text-align: left;
  }
  .item-actions {
    grid-column: 2;
    width: auto;
    justify-content: flex-end;
  }

  .pending-actions {
    justify-content: flex-end;
    gap: 0.5rem;
    width: auto;
  }
  .pending-text {
    display: none;
  }

}

/* --- NOVOS ESTILOS DE SKELETON --- */
.skeleton {
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-text {
  height: 0.875rem;
  margin-bottom: 0.5rem;
}
.skeleton-text:last-child {
  margin-bottom: 0;
}

.skeleton-badge {
  height: 24px;
  width: 100px;
  border-radius: 99px;
  margin: 0 auto; /* Centraliza no desktop */
}

.skeleton-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

/* Ajuste Skeleton Mobile */
@media (max-width: 768px) {
  .skeleton-badge {
    margin: 0; /* Alinha a esquerda no mobile */
  }
}
</style>
