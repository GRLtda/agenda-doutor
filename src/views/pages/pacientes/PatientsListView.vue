<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from 'vue-toastification'
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Hash,
  User,
  Phone,
  Users,
  SlidersHorizontal,
} from 'lucide-vue-next'
import AppPagination from '@/components/global/AppPagination.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'

const patientsStore = usePatientsStore()
const router = useRouter()
const toast = useToast()

const patients = computed(() => patientsStore.allPatients)
const pagination = computed(() => patientsStore.pagination)
const actionsMenuOpenFor = ref(null)
// const isInitialLoad = ref(true) // ❌ REMOVIDO

const selectedPatientId = ref(null)
let debounceTimeout = null

const patientSearchOptions = computed(() => {
  return (patientsStore.searchResults || []).map((p) => ({ value: p._id, label: p.name }))
})

function handlePatientSearch(query) {
  clearTimeout(debounceTimeout)
  if (query) {
    debounceTimeout = setTimeout(() => {
      patientsStore.searchPatients(query)
    }, 300)
  } else {
    patientsStore.searchResults = []
  }
}

watch(selectedPatientId, (newId) => {
  if (newId) {
    router.push(`/pacientes/${newId}`)
  }
})

onMounted(async () => {
  await patientsStore.fetchAllPatients(1)
  // isInitialLoad.value = false // ❌ REMOVIDO
})

function handlePageChange(newPage) {
  patientsStore.fetchAllPatients(newPage)
}

function goToPatient(patientId) {
  if (actionsMenuOpenFor.value === patientId) {
    return
  }
  router.push(`/pacientes/${patientId}`)
}

function toggleActionsMenu(patientId) {
  actionsMenuOpenFor.value = actionsMenuOpenFor.value === patientId ? null : patientId
}

async function handleDelete(patientId) {
  if (confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
    // A lógica de exclusão foi removida daqui pois não foi solicitada alteração nela
    // Mantendo o foco na formatação do telefone
    const { success } = await patientsStore.deletePatient(patientId)
    if (success) {
      toast.success('Paciente excluído com sucesso!')
    } else {
      toast.error(patientsStore.error || 'Não foi possível excluir o paciente.')
    }
  }
  actionsMenuOpenFor.value = null
}

const formatCPF = (cpf) => {
  if (!cpf) return null
  const cpfDigits = cpf.replace(/\D/g, '')
  if (cpfDigits.length !== 11) return cpf
  return cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
</script>

<template>
  <div class="patients-list-page">
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Pacientes</h1>
        <p class="subtitle">Gerencie todos os pacientes da sua clínica.</p>
      </div>
      <div class="header-actions">
        <SearchableSelect
          v-model="selectedPatientId"
          :options="patientSearchOptions"
          :loading="patientsStore.isLoading"
          @search="handlePatientSearch"
          empty-label="Buscar paciente por nome..."
          class="patient-search"
        />
        <AppButton variant="primary" to="/pacientes/novo" class="add-patient-btn">
          <UserPlus :size="16" />
          Adicionar Paciente
        </AppButton>
      </div>
    </header>

    <div
      class="table-wrapper"
      :class="{ 'is-loading': patientsStore.isLoading && patients.length > 0 }"
    >
      <div class="table-container desktop-only">
        <table>
            <thead>
              <tr>
                <th class="avatar-header"></th>
                <th class="name-header">
                  <div class="th-content">
                    <User :size="14" />
                    <span>Nome do Paciente</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Hash :size="14" />
                    <span>CPF</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Phone :size="14" />
                    <span>Telefone</span>
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
            <template v-if="patientsStore.isLoading && patients.length === 0">
              <tr v-for="n in 10" :key="`skel-desk-${n}`" class="skeleton-row">
                <td><div class="skeleton skeleton-avatar"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 80%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
                <td><div class="skeleton skeleton-text" style="width: 70%"></div></td>
                <td class="actions-cell"><div class="skeleton skeleton-button"></div></td>
              </tr>
            </template>

            <template v-else-if="!patientsStore.isLoading && patients.length === 0">
              <tr>
                <td colspan="5" class="state-cell">
                  <div class="empty-state-content">
                    <div class="empty-state-icon-bg">
                      <Users :size="24" />
                    </div>
                    <h3 class="empty-state-title">Nenhum paciente encontrado</h3>
                    <p class="empty-state-text">
                      Comece cadastrando um novo paciente para vê-lo aqui.
                    </p>
                    <router-link to="/pacientes/novo" class="btn-primary-sm">
                      <UserPlus :size="16" />
                      <span>Adicionar Paciente</span>
                    </router-link>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr
                v-for="patient in patients"
                :key="patient._id"
                class="patient-row"
                @click="goToPatient(patient._id)"
              >
                <td>
                  <div class="patient-avatar">{{ patient.name.charAt(0).toUpperCase() }}</div>
                </td>
                <td class="patient-name">{{ patient.name }}</td>
                <td>
                   <span v-if="formatCPF(patient.cpf)">{{ formatCPF(patient.cpf) }}</span>
                   <span v-else class="text-muted" title="Não informado">—</span>
                </td>
                <td class="patient-phone">
                    <PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" :show-flag="true" />
                </td>
                <td class="actions-cell" @click.stop>
                  <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)">
                    <button @click.stop="toggleActionsMenu(patient._id)" class="btn-icon">
                      <MoreHorizontal :size="20" />
                    </button>
                    <Transition name="fade">
                      <div v-if="actionsMenuOpenFor === patient._id" class="actions-dropdown">
                        <router-link
                          :to="`/pacientes/${patient._id}?edit=true`"
                          class="dropdown-item"
                        >
                          <Pencil :size="14" /> Editar
                        </router-link>
                        <button
                          @click.stop="handleDelete(patient._id)"
                          class="dropdown-item delete"
                        >
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

      <div class="mobile-list" v-auto-animate>
        <template v-if="patientsStore.isLoading && patients.length === 0">
          <div v-for="n in 10" :key="`skel-mob-${n}`" class="patient-card skeleton-card">
            <div class="patient-info-mobile">
              <div class="skeleton skeleton-avatar"></div>
              <div class="patient-details-mobile">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text-sm"></div>
              </div>
            </div>
            <div class="skeleton skeleton-button"></div>
          </div>
        </template>

        <template v-else-if="patients.length > 0">
          <div
            v-for="patient in patients"
            :key="patient._id"
            class="patient-card"
            @click="goToPatient(patient._id)"
          >
            <div class="patient-info-mobile">
              <div class="patient-avatar">{{ patient.name.charAt(0).toUpperCase() }}</div>
              <div class="patient-details-mobile">
                <span class="patient-name">{{ patient.name }}</span>
                <span class="patient-cpf-masked">{{ formatCPF(patient.cpf) }}</span>
              </div>
            </div>

            <div
              class="actions-wrapper"
              v-click-outside="() => (actionsMenuOpenFor = null)"
              @click.stop
            >
              <button @click.stop="toggleActionsMenu(patient._id)" class="btn-icon">
                <MoreHorizontal :size="20" />
              </button>
              <Transition name="fade">
                <div v-if="actionsMenuOpenFor === patient._id" class="actions-dropdown">
                  <router-link
                    :to="`/pacientes/${patient._id}?edit=true`"
                    class="dropdown-item"
                  >
                    <Pencil :size="14" /> Editar
                  </router-link>
                  <button @click.stop="handleDelete(patient._id)" class="dropdown-item delete">
                    <Trash2 :size="14" /> Excluir
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </template>

        <div v-if="!patientsStore.isLoading && patients.length === 0" class="state-cell">
          <div class="empty-state-content">
            <div class="empty-state-icon-bg">
              <Users :size="24" />
            </div>
            <h3 class="empty-state-title">Nenhum paciente encontrado</h3>
            <p class="empty-state-text">Comece cadastrando um novo paciente para vê-lo aqui.</p>
            <router-link to="/pacientes/novo" class="btn-primary-sm">
              <UserPlus :size="16" />
              <span>Adicionar Paciente</span>
            </router-link>
          </div>
        </div>
      </div>

      <AppPagination
        v-if="pagination && pagination.pages > 1"
        :current-page="pagination.page"
        :total-pages="pagination.pages"
        :total-items="pagination.total"
        :limit="pagination.limit"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
/* ... (estilos anteriores permanecem os mesmos) ... */
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
.patient-search {
  width: 280px;
}
.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.subtitle {
  color: var(--cinza-texto);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.25rem;
  border-radius: 0.5rem; /* Slightly less rounded than before, closer to reference */
  border: none;
  background: linear-gradient(180deg, #5b8bf7 0%, var(--azul-principal) 100%); /* More discrete gradient */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(59, 130, 246, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
  color: var(--branco);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  height: 38px; /* Reduced height */
}
.btn-primary:hover {
  background: linear-gradient(180deg, #6ba0f9 0%, #468bf7 100%); /* Slightly lighter on hover */
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.btn-primary:active {
  transform: translateY(0);
}

.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem; /* Padding menor */
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 0.95rem; /* Fonte menor */
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-decoration: none;
  height: 40px; /* Altura menor */
}
.btn-primary-sm:hover {
  background-color: var(--azul-escuro);
}

.patient-search :deep(.input-wrapper) {
  height: 38px; /* Match button height */
  border-radius: 0.5rem; /* Match button radius */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-size: 0.95rem;
}
.patient-search :deep(.input-wrapper:has(.select-input:focus)) {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
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
  background-color: #eef2ff; /* Mesmo azul do avatar */
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
  white-space: nowrap;
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
.avatar-header {
  width: 72px;
}
th.actions-header {
  width: 100px;
}
th.actions-header .th-content {
  justify-content: flex-end;
}
.patient-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.patient-row:hover td {
  background-color: #f9fafb;
}
.patient-avatar {
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
.patient-name {
  font-weight: 600;
  color: #111827;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name-header {
  width: 400px; /* Force consistent width */
  max-width: 400px;
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
  background-color: #e5e7eb; /* Cor cinza clara */
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
  /* Remove o hover de linhas/cards do skeleton */
  pointer-events: none;
}

.skeleton-row:hover td {
  background-color: var(--branco) !important; /* Previne o hover da linha */
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
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
  width: 36px; /* Tamanho aprox. do btn-icon */
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.actions-cell .skeleton-button {
  margin-left: auto; /* Alinha à direita na célula de ações desktop */
}
.mobile-list {
  display: none; /* Escondido por padrão */
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    flex-direction: column-reverse; /* Coloca o botão de adicionar por último */
  }
  .patient-search,
  .add-patient-btn {
    width: 100%;
  }
  .mobile-list > .state-cell {
    padding: 2rem 0;
    background-color: transparent;
    border: none;
  }
  .add-patient-btn {
    justify-content: center;
  }
  .table-wrapper {
    /* ✨ Corrigido para garantir que o container da lista móvel não corte o dropdown */
    border: none;
    background-color: transparent;
    border-radius: 0;
    overflow: visible; /* IMPORTANTE: Garante que o dropdown não seja cortado */
  }
  .table-container {
    display: none; /* Esconde a tabela no mobile */
  }

  /* Mostra e estiliza a lista no mobile */
  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow: visible; /* Garante que o dropdown não seja cortado por este container */
  }
  .patient-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: var(--branco);
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    cursor: pointer;
    overflow: visible; /* IMPORTANTE: Garante que o dropdown dentro dele não seja cortado */
  }
  .patient-info-mobile {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .patient-details-mobile {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex-grow: 1;
  }
  .patient-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .patient-cpf-masked {
    color: var(--cinza-texto);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    flex-shrink: 1;
    text-overflow: ellipsis;

    /* Efeito de degradê no final do CPF */
    mask-image: linear-gradient(to right, black 70%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 70%, transparent 100%);
  }

  /* ✨ CORREÇÃO CRÍTICA AQUI: Aumentar Z-INDEX e garantir posicionamento superior */
  .actions-wrapper {
    z-index: 100; /* Garante que ele fique acima dos cards vizinhos */
  }

  .actions-dropdown {
    position: absolute;
    right: 0;
    /* Faz o menu abrir para cima (bottom: 100%) mais uma margem de 5px */
    bottom: calc(100% + 5px);
    top: auto; /* Anula o valor de desktop */
    z-index: 100; /* Mantém o z-index alto */
  }

  .mobile-list > .state-cell {
    padding: 2rem 0;
  }
}
</style>
