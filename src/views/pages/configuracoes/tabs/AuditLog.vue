<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { usePatientsStore } from '@/stores/patients'
import { useEmployeesStore } from '@/stores/employees'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, Calendar, FileText, Clock, ChevronDown, SlidersHorizontal, AlertCircle } from 'lucide-vue-next'
import AppPagination from '@/components/global/AppPagination.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const auditStore = useAuditStore()
const patientsStore = usePatientsStore()
const employeesStore = useEmployeesStore()

// --- Estados para filtros ---
const selectedUserId = ref(null)
const selectedEntity = ref(null)
// ---

const currentPage = ref(1)
const patientNameMap = ref({})
const expandedLogId = ref(null)

const logs = computed(() => auditStore.logs)
const pagination = computed(() => auditStore.pagination)

// --- Opções para os filtros ---
const userOptions = computed(() => {
  const users = employeesStore.activeEmployees.map((emp) => ({
    value: emp._id,
    label: emp.name,
  }))
  return [{ value: null, label: 'Todos os Usuários' }, ...users]
})

const entityOptions = ref([
  { value: null, label: 'Todas as Ações' },
  { value: 'Appointment', label: 'Agendamentos' },
  { value: 'Patient', label: 'Pacientes' },
  { value: 'Clinic', label: 'Clínica' },
])
// ---

async function fetchData() {
  const params = {
    page: currentPage.value,
    limit: 20,
    userId: selectedUserId.value || undefined,
    entity: selectedEntity.value || undefined,
  }
  await auditStore.fetchLogs(params)
}

onMounted(() => {
  fetchData()
  employeesStore.fetchEmployees()
})

function handlePageChange(newPage) {
  currentPage.value = newPage
  fetchData()
}

function applyFilters() {
  currentPage.value = 1
  fetchData()
}

watch(selectedUserId, applyFilters)
watch(selectedEntity, applyFilters)

watch(logs, async (newLogs) => {
  if (!newLogs || newLogs.length === 0) return

  const patientIdsToFetch = new Set()
  for (const log of newLogs) {
    if (log.action === 'APPOINTMENT_CREATE' && log.details?.patientId) {
      if (!patientNameMap.value[log.details.patientId]) {
        patientIdsToFetch.add(log.details.patientId)
      }
    }
    if (log.details?.changes) {
      for (const change of log.details.changes) {
        if (change.field === 'patient' && change.new) {
          if (!patientNameMap.value[change.new]) {
            patientIdsToFetch.add(change.new)
          }
        }
      }
    }
    if (log.entity === 'Patient' && log.entityId) {
      if (!patientNameMap.value[log.entityId]) {
        patientIdsToFetch.add(log.entityId)
      }
    }
  }

  for (const patientId of patientIdsToFetch) {
    if (!patientNameMap.value[patientId]) {
      const { data } = await patientsStore.fetchPatientById(patientId)
      patientNameMap.value[patientId] = data ? data.name : `ID ${patientId.slice(-6)}`
    }
  }
})

function formatDateTime(dateString) {
  if (!dateString) return ''
  return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const distance = formatDistanceToNowStrict(date, { locale: ptBR, addSuffix: true })

  if (new Date().getTime() - date.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }
  return distance
}

function formatAction(action) {
  const labels = {
    APPOINTMENT_CREATE: 'criou um agendamento',
    APPOINTMENT_UPDATE: 'atualizou um agendamento',
    APPOINTMENT_STATUS_CHANGE: 'alterou o status de um agendamento',
    APPOINTMENT_DELETE: 'excluiu um agendamento',
    PATIENT_CREATE: 'criou um paciente',
    PATIENT_UPDATE: 'atualizou um paciente',
    PATIENT_DELETE: 'excluiu um paciente',
    CLINIC_UPDATE: 'atualizou os dados da clínica',
  }
  return labels[action] || action.replace(/_/g, ' ').toLowerCase()
}

function translateEntity(entity) {
  const labels = {
    Appointment: 'Agendamento',
    Patient: 'Paciente',
    Clinic: 'Clínica',
    User: 'Usuário'
  }
  return labels[entity] || entity
}

function formatLogSummary(log) {
  const userName = `<strong class="user-name-summary">${log.user?.name || 'Usuário'}</strong>`
  const actionText = formatAction(log.action)
  let target = ''

  try {
    if (log.action === 'APPOINTMENT_CREATE') {
      const patientId = log.details?.changes?.find((c) => c.field === 'patient')?.new
      target = `para <strong>${patientNameMap.value[patientId] || '...'}</strong>`
    } else if (log.action === 'APPOINTMENT_STATUS_CHANGE') {
      const newStatus = log.details?.changes?.find((c) => c.field === 'status')?.new
      target = `para <strong>${newStatus}</strong>`
    } else if (log.action === 'APPOINTMENT_DELETE') {
      const patientId = log.details?.changes?.find((c) => c.field === 'patient')?.old
       if (patientId) {
          target = `de <strong>${patientNameMap.value[patientId] || '...'}</strong>`
       }
    } else if (log.action === 'PATIENT_CREATE') {
      const patientName = log.details?.changes?.find((c) => c.field === 'name')?.new
      target = `<strong>${patientName || '...'}</strong>`
    } else if (log.action === 'PATIENT_UPDATE') {
      const patientName = patientNameMap.value[log.entityId]
      target = `<strong>${patientName || '...'}</strong>`
    } else if (log.action === 'CLINIC_UPDATE') {
      target = ''
    }
  } catch (e) {
    console.error('Erro ao formatar resumo do log:', e, log)
  }

  return `${userName} ${actionText} ${target}`
}

function getEntityIcon(entity) {
  if (entity === 'Appointment') return Calendar
  if (entity === 'Patient') return User
  if (entity === 'Clinic') return FileText
  return Clock
}

function toggleExpand(log) {
  if (!log.details?.changes?.length) {
    return
  }
  expandedLogId.value = expandedLogId.value === log._id ? null : log._id
}

function formatValue(value, field) {
  if (value === null || value === undefined) return null

  if (field === 'patient') {
    return patientNameMap.value[value] || `ID ...${String(value).slice(-6)}`
  }
  if (field === 'startTime' || field === 'endTime') {
    return formatDateTime(value)
  }
  return value
}

function formatChange(change) {
  const fieldLabels = {
    status: 'Status',
    patient: 'Paciente',
    startTime: 'Início',
    endTime: 'Término',
    name: 'Nome',
    cpf: 'CPF',
    phone: 'Telefone',
    type: 'Tipo',
    notes: 'Observações',
    isReturn: 'É Retorno?',
    originAppointment: 'Agendamento Origem'
  }

  const field = fieldLabels[change.field] || change.field
  const from = formatValue(change.old, change.field)
  const to = formatValue(change.new, change.field)
  
  // Tratamento específico para booleanos ou vazios
  const formatDisplay = (val) => {
      if (val === true) return 'Sim'
      if (val === false) return 'Não'
      if (val === '') return 'Vazio'
      return val
  }

  if (from === null && to === null) {
      // Caso update onde só tem field e sem old/new explícito (ex: notes no json do usuário)
      return `alterou ${field}`
  }

  if (from === null) {
    return `definiu ${field} como <span class="change-new">"${formatDisplay(to)}"</span>`
  }
  if (to === null) {
     if (change.field === 'patient' || change.field === 'status') {
         // Para deletes, pode mostrar apenas "era X"
         return `${field} era <span class="change-old">"${formatDisplay(from)}"</span>`
     }
    return `removeu ${field} (era <span class="change-old">"${formatDisplay(from)}"</span>)`
  }
  return `alterou ${field} de <span class="change-old">"${formatDisplay(from)}"</span> para <span class="change-new">"${formatDisplay(to)}"</span>`
}
</script>

<template>
  <div class="audit-log-container">
    <div class="filters-header">
      <SlidersHorizontal :size="18" class="filters-icon" />
      <div class="filter-group">
        <StyledSelect
          v-model="selectedUserId"
          :options="userOptions"
          :loading="employeesStore.isLoading"
        />
        <StyledSelect v-model="selectedEntity" :options="entityOptions" />
      </div>

      <div class="retention-info" title="O sistema mantém registros dos últimos 30 dias">
         <AlertCircle :size="14" />
         <span>Histórico de 30 dias</span>
      </div>
    </div>

    <div v-if="auditStore.isLoading && logs.length === 0" class="loading-state">
      Carregando histórico de auditoria...
    </div>

    <div v-else-if="logs.length === 0" class="empty-state">
      <h3>Nenhum resultado encontrado</h3>
      <p>Tente ajustar os filtros ou verifique mais tarde.</p>
    </div>

    <div v-else class="log-list-wrapper">
      <ul class="audit-list">
        <li v-for="log in logs" :key="log._id" class="audit-item-wrapper">
          <div
            class="audit-item"
            @click="toggleExpand(log)"
            :class="{
              'is-expandable': log.details?.changes?.length > 0,
              'is-expanded': expandedLogId === log._id,
            }"
          >
            <div class="log-icon-wrapper">
              <component :is="getEntityIcon(log.entity)" :size="18" />
            </div>

            <div class="user-avatar-mobile">
              {{ log.user?.name.charAt(0) || '?' }}
            </div>

            <div class="log-content">
              <div class="log-summary" v-html="formatLogSummary(log)"></div>
              <div class="log-timestamp-mobile">
                {{ formatRelativeTime(log.createdAt) }}
              </div>

              <div class="log-header-desktop">
                <span class="user-name">{{ log.user?.name || 'Usuário Desconhecido' }}</span>
                <span class="log-action">{{ formatAction(log.action) }}</span>
              </div>
              <div class="log-details-desktop">
                <span class="entity-info"
                  >{{ translateEntity(log.entity) }} (ID: ...{{ log.entityId.slice(-6) }})</span
                >
              </div>
            </div>

            <div class="log-timestamp-desktop">
              <span class="timestamp-text">{{ formatDateTime(log.createdAt) }}</span>
              <ChevronDown
                v-if="log.details?.changes?.length > 0"
                :size="16"
                class="expand-icon"
              />
            </div>
          </div>

          <Transition name="expand">
            <div v-if="expandedLogId === log._id" class="changes-details-wrapper">
              <h4 class="changes-title">Alterações:</h4>
              <ul class="changes-list">
                <li v-for="(change, index) in log.details.changes" :key="index" class="change-item">
                  <span class="change-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="change-description" v-html="formatChange(change)"></span>
                </li>
              </ul>
            </div>
          </Transition>
        </li>
      </ul>

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
.audit-log-container {
  height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  background: white;
}

.filters-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.filters-icon {
  color: var(--cinza-texto);
  flex-shrink: 0;
}
.filters-label {
  display: none;
}
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.filter-group :deep(.form-group) {
  margin-bottom: 0;
}
.filter-group :deep(.select-button) {
  background-color: var(--branco);
  min-width: 180px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
}
.filter-group :deep(.arrow-icon) {
  width: 16px;
  height: 16px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--cinza-texto);
  background-color: var(--branco);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin-bottom: 0.5rem;
}

.log-list-wrapper {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow: hidden;
}

.audit-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex-grow: 1;
}

.audit-item-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
}
.audit-item-wrapper:has(.is-expanded) {
  border-color: #d1d5db;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.audit-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.audit-item.is-expandable {
  cursor: pointer;
}
.audit-item.is-expanded {
  border-bottom: 1px solid #f3f4f6;
}
.log-icon-wrapper {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
}
.user-avatar-mobile {
  display: none;
}
.log-content {
  flex-grow: 1;
  min-width: 0;
}

.log-summary,
.log-timestamp-mobile {
  display: none;
}

.log-header-desktop {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.user-name {
  font-weight: 600;
  color: var(--preto);
  font-size: 1rem;
}
.log-action {
  font-size: 0.8rem;
  color: var(--cinza-texto);
}
.log-details-desktop {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  word-break: break-all;
}
.log-timestamp-desktop {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  flex-shrink: 0;
  padding-top: 2px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}
.expand-icon {
  color: #9ca3af;
  transition: transform 0.3s ease;
}
.audit-item.is-expanded .expand-icon {
  transform: rotate(180deg);
}

.changes-details-wrapper {
  padding: 0.75rem 1rem 1rem 1rem;
  overflow: hidden;
}
.changes-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--cinza-texto);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}
.changes-list {
  list-style: none;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  border-left: 2px solid #0d924d;
  gap: 0.5rem;
}
.change-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.change-number {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--cinza-texto);
}
.change-description {
  font-size: 0.8rem;
  color: #374151;
  line-height: 1.5;
}

:deep(.change-old) {
  color: #c81e1e;
  text-decoration: line-through;
  background-color: #fef2f2;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}
:deep(.change-new) {
  color: #0d924d;
  background-color: #f0fdf4;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.expand-enter-active {
  animation: expand-in 0.3s ease;
  overflow: hidden;
}
.expand-leave-active {
  animation: expand-in 0.3s ease reverse;
  overflow: hidden;
}
@keyframes expand-in {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

:deep(.pagination-container) {
  margin-top: 0;
  border-top: 1px solid #e5e7eb;
  background-color: var(--branco);
  border-radius: 0;
  padding: 0.75rem 1.25rem;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .audit-log-container {
    min-height: auto;
    height: 100%;
    border-radius: 0;
    border: none;
  }

  .log-icon-wrapper {
    display: none;
  }

  .changes-list {
    padding-left: 10px !important;
  }

  .change-item {
    gap: 5px !important;
  }

  /* ✨ INÍCIO DAS ALTERAÇÕES NO FILTRO ✨ */
  .filters-header {
    flex-direction: column; /* ✨ ALTERADO: Empilha os itens */
    align-items: stretch; /* ✨ ALTERADO: Faz os filhos ocuparem 100% da largura */
    gap: 0.75rem; /* ✨ ALTERADO: Ajusta o espaçamento entre os filtros */
    padding: 1rem; /* ✨ ALTERADO: Ajusta o padding */
    overflow-x: hidden; /* ✨ ALTERADO: Remove o scroll horizontal */
    border-radius: 0;
    border-left: none;
    border-right: none;
    /* ✨ REMOVIDO: scrollbar-width: none; */
  }
  .filters-header::-webkit-scrollbar {
    display: none; /* (Mantido para garantir) */
  }

  .filters-icon {
    display: none; /* ✨ ALTERADO: Esconde o ícone de filtro */
  }
  .filters-label {
    display: none;
  }
  .filter-group {
    flex-direction: column; /* ✨ ALTERADO: Empilha os selects */
    flex-grow: 1; /* ✨ ALTERADO: Deixa o grupo crescer */
    width: 100%; /* ✨ NOVO: Garante 100% da largura */
  }
  .filter-group :deep(.select-button) {
    min-width: 100%; /* ✨ ALTERADO: Ocupa 100% */
    width: 100%; /* ✨ ALTERADO: Ocupa 100% */
    white-space: nowrap; /* (Mantido) */
  }
  /* ✨ FIM DAS ALTERAÇÕES NO FILTRO ✨ */

  .audit-list {
    padding: 0;
  }
  .audit-item-wrapper {
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
  }
  .audit-item-wrapper:first-child {
    border-top: 1px solid #e5e7eb;
  }

  .audit-item {
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    flex-wrap: nowrap;
  }

  .log-header-desktop,
  .log-details-desktop,
  .log-timestamp-desktop {
    display: none;
  }

  .log-summary,
  .log-timestamp-mobile {
    display: block;
  }

  .user-avatar-mobile {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: #eef2ff;
    color: var(--azul-principal);
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .log-icon-wrapper {
    width: 28px;
    height: 28px;
    background-color: transparent;
    color: var(--cinza-texto);
  }
  .log-icon-wrapper :deep(svg) {
    width: 18px;
    height: 18px;
  }

  .log-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .log-summary {
    font-size: 0.9rem;
    color: var(--preto);
    line-height: 1.4;
    word-break: break-word;
  }
  .log-summary :deep(strong) {
    font-weight: 700;
  }
  .log-summary :deep(.user-name-summary) {
    font-weight: 700;
  }

  .log-timestamp-mobile {
    font-size: 0.8rem;
    color: var(--cinza-texto);
  }

  .expand-icon {
    margin-left: auto;
    flex-shrink: 0;
  }

  .audit-item {
    padding-right: 0.5rem;
  }

  .changes-details-wrapper {
    padding: 0.5rem 1rem 1rem 1rem;
  }
  .changes-list {
    padding-left: calc(28px + 28px + 0.75rem + 0.75rem);
  }
  .change-item {
    gap: 0.5rem;
  }
  .change-number {
    flex-shrink: 0;
  }

  :deep(.pagination-container) {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  :deep(.pagination-container) {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

.retention-info {
  margin-left: auto; /* Empurra para a direita */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
  background-color: #f3f4f6;
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  cursor: help;
}
.retention-info:hover {
  color: #4b5563;
  background-color: #e5e7eb;
}

@media (max-width: 768px) {
  .retention-info {
    margin-left: 0;
    width: fit-content;
  }
}
</style>
