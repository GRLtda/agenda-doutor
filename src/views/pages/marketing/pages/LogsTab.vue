// src/components/pages/marketing/tabs/LogsTab.vue
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCrmLogsStore } from '@/stores/crmLogs'
import { usePatientsStore } from '@/stores/patients'
import {
  SlidersHorizontal,
  User,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  LoaderCircle,
  MessageSquare
} from 'lucide-vue-next'
import AppPagination from '@/components/global/AppPagination.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'

const logsStore = useCrmLogsStore()
const patientsStore = usePatientsStore()
const router = useRouter()

const logs = computed(() => logsStore.logs)
const pagination = computed(() => logsStore.pagination)
const isLoading = computed(() => logsStore.isLoading)
let debounceTimeout = null

const filters = ref({
  status: null,
  actionType: null,
  patientId: null,
})
const showFilters = ref(false)

const statusOptions = computed(() => [
  { value: null, label: 'Todos Status' },
  ...logsStore.availableLogStatus.map((s) => ({ value: s, label: logsStore.getStatusDescription(s) }))
])

const actionTypeOptions = computed(() => [
  { value: null, label: 'Todos Tipos' },
  ...logsStore.availableActionTypes.map((t) => ({ value: t, label: logsStore.getActionTypeDescription(t) }))
])

const patientSearchOptions = computed(() => {
  return (patientsStore.searchResults || []).map((p) => ({ value: p._id, label: p.name }))
})

onMounted(() => {
  logsStore.fetchFilterOptions()
  logsStore.fetchLogs(1, filters.value)
})

watch(
  () => ({ status: filters.value.status, actionType: filters.value.actionType }),
  (newFilters) => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      logsStore.fetchLogs(1, { ...newFilters, patientId: filters.value.patientId })
    }, 500)
  },
  { deep: true }
)

watch(
  () => filters.value.patientId,
  () => {
    logsStore.fetchLogs(1, filters.value)
  }
)

function handlePatientSearch(query) {
  clearTimeout(debounceTimeout)
  if (query && query.length > 1) {
    debounceTimeout = setTimeout(() => {
      patientsStore.searchPatients(query)
    }, 300)
  } else {
    patientsStore.searchResults = []
  }
}

function handlePageChange(newPage) {
  logsStore.fetchLogs(newPage, filters.value)
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  return format(new Date(dateString), 'dd/MM/yy HH:mm', { locale: ptBR })
}

function getStatusClass(status) {
  const lowerStatus = status?.toLowerCase() || ''
  if (lowerStatus.startsWith('error')) return 'status--error'
  if (lowerStatus === 'delivered' || lowerStatus === 'read') return 'status--success'
  if (lowerStatus === 'sent_attempt') return 'status--sending'
  return 'status--pending'
}

function showFullError(message) {
  alert(message || 'Sem detalhes adicionais do erro.')
}

function openPatientProfile(patientId) {
  if (!patientId) return
  const routeData = router.resolve({
    name: 'detalhes-paciente',
    params: { id: patientId }
  })
  window.open(routeData.href, '_blank')
}

function getPatientInitial(log) {
  return log?.patient?.name?.charAt(0)?.toUpperCase() || '?'
}
</script>

<template>
  <div class="logs-tab">
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Histórico de Envios</h1>
        <p class="subtitle">Acompanhe o desempenho e os detalhes dos disparos de mensagens.</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary btn-filters" @click="showFilters = !showFilters">
          <SlidersHorizontal :size="16" />
          <span>Filtros</span>
        </button>
      </div>
    </header>

    <Transition name="slide-fade">
      <div v-show="showFilters" class="filters-container">
        <StyledSelect v-model="filters.status" :options="statusOptions" label="Status" />
        <StyledSelect v-model="filters.actionType" :options="actionTypeOptions" label="Tipo de Ação" />
        <SearchableSelect
          v-model="filters.patientId"
          :options="patientSearchOptions"
          label="Paciente"
          :loading="patientsStore.isLoading"
          @search="handlePatientSearch"
          empty-label="Buscar por nome..."
        />
      </div>
    </Transition>

    <div class="table-wrapper">
      <div class="table-container desktop-table">
        <table>
          <thead>
            <tr>
              <th>
                <div class="th-content">
                  <User :size="14" />
                  <span>Paciente</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Tag :size="14" />
                  <span>Gatilho / Modelo</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <MessageSquare :size="14" />
                  <span>Conteúdo</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Clock :size="14" />
                  <span>Data/Hora</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <CheckCircle :size="14" />
                  <span>Status</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <AlertTriangle :size="14" />
                  <span>Detalhes</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="state-cell">
                <LoaderCircle :size="24" class="animate-spin" /> Carregando histórico...
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="state-cell">Nenhum registro encontrado com os filtros aplicados.</td>
            </tr>
            <tr v-for="log in logs" :key="log._id" class="log-row">
              <td class="patient-cell">
                <div class="patient-info">
                  <div class="patient-avatar">{{ getPatientInitial(log) }}</div>
                  <div class="patient-meta">
                    <span
                      v-if="log.patient"
                      class="patient-name clickable"
                      @click="openPatientProfile(log.patient._id)"
                    >
                      {{ log.patient.name }}
                    </span>
                    <span v-else class="text-muted">N/A</span>
                    <div v-if="log.patient">
                      <PatientPhoneDisplay
                        :phone="log.recipientPhone || log.patient.phone"
                        :country-code="log.patient.countryCode"
                        :show-flag="false"
                        class="patient-phone"
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td class="template-cell">
                <span class="trigger-name">{{ logsStore.getTriggerOrTemplateName(log) }}</span>
                <small class="trigger-details">{{ logsStore.getTriggerDetails(log) }}</small>
              </td>
              <td class="content-cell">
                <p :title="log.messageContent">{{ log.messageContent }}</p>
              </td>
              <td class="date-cell">{{ formatDateTime(log.createdAt) }}</td>
              <td class="status-cell">
                <span class="status-badge" :class="getStatusClass(log.status)">
                  {{ logsStore.getStatusDescription(log.status) }}
                </span>
              </td>
              <td class="details-cell">
                <button
                  v-if="log.errorMessage"
                  class="btn-icon error-icon"
                  @click="showFullError(log.errorMessage)"
                  title="Ver erro"
                >
                  <AlertTriangle :size="16" />
                </button>
                <span v-else-if="log.status === 'READ'" class="read-receipt" title="Mensagem lida pelo destinatário">
                  <Eye :size="16" />
                </span>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mobile-cards-list">
        <div v-if="isLoading" class="mobile-state">
          <LoaderCircle :size="20" class="animate-spin" />
          <span>Carregando histórico...</span>
        </div>
        <div v-else-if="logs.length === 0" class="mobile-state">
          Nenhum registro encontrado com os filtros aplicados.
        </div>

        <article v-for="log in logs" :key="`mob-${log._id}`" class="mobile-log-card">
          <div class="mobile-log-top">
            <div class="patient-info">
              <div class="patient-avatar">{{ getPatientInitial(log) }}</div>
              <div class="patient-meta">
                <span
                  v-if="log.patient"
                  class="patient-name clickable"
                  @click="openPatientProfile(log.patient._id)"
                >
                  {{ log.patient.name }}
                </span>
                <span v-else class="text-muted">N/A</span>
                <div v-if="log.patient">
                  <PatientPhoneDisplay
                    :phone="log.recipientPhone || log.patient.phone"
                    :country-code="log.patient.countryCode"
                    :show-flag="false"
                    class="patient-phone"
                  />
                </div>
              </div>
            </div>
            <span class="status-badge" :class="getStatusClass(log.status)">
              {{ logsStore.getStatusDescription(log.status) }}
            </span>
          </div>

          <div class="mobile-log-row">
            <span class="mobile-log-label">Gatilho / Modelo</span>
            <span class="mobile-log-value trigger-name">{{ logsStore.getTriggerOrTemplateName(log) }}</span>
            <small class="trigger-details">{{ logsStore.getTriggerDetails(log) }}</small>
          </div>

          <div class="mobile-log-row">
            <span class="mobile-log-label">Conteúdo</span>
            <p class="mobile-log-content" :title="log.messageContent">{{ log.messageContent }}</p>
          </div>

          <div class="mobile-log-footer">
            <span class="mobile-log-date">{{ formatDateTime(log.createdAt) }}</span>
            <button
              v-if="log.errorMessage"
              class="btn-icon error-icon"
              @click="showFullError(log.errorMessage)"
              title="Ver erro"
            >
              <AlertTriangle :size="16" />
            </button>
            <span v-else-if="log.status === 'READ'" class="read-receipt" title="Mensagem lida pelo destinatário">
              <Eye :size="16" />
            </span>
            <span v-else class="text-muted">-</span>
          </div>
        </article>
      </div>

      <AppPagination
        v-if="!isLoading && pagination && pagination.pages > 1"
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
.logs-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--preto);
}

.subtitle {
  margin: 0;
  color: var(--cinza-texto);
  font-size: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-secondary {
  background: var(--branco);
  border: 1px solid #d1d5db;
  height: 40px;
  padding: 0 1rem;
  border-radius: 0.7rem;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #334155;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #f9fafb;
  border-color: #cbd5e1;
}

.btn-filters {
  font-size: 0.875rem;
}

.filters-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
}

.filters-container > :deep(.form-group),
.filters-container > :deep(.searchable-select) {
  margin-bottom: 0;
}

.filters-container :deep(.form-label) {
  white-space: nowrap;
}

.filters-container :deep(.searchable-select .input-wrapper) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.filters-container :deep(.searchable-select .select-input) {
  font-size: 0.875rem;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
  max-height: 220px;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  transform: translateY(-10px);
}

.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
  min-height: 420px;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
  font-size: 0.875rem;
}

tbody tr:last-child td {
  border-bottom: none;
}

th {
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  white-space: nowrap;
}

.th-content {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.log-row:hover {
  background-color: #f8fafc;
}

.state-cell {
  padding: 3rem;
  text-align: center;
  color: var(--cinza-texto);
  font-size: 1rem;
  vertical-align: middle;
}

.state-cell svg {
  vertical-align: middle;
  margin-right: 0.5rem;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.patient-cell {
  width: 24%;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  font-size: 1.05rem;
  flex-shrink: 0;
}

.patient-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.patient-name {
  display: block;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
  color: #0f172a;
}

.patient-name.clickable {
  cursor: pointer;
}

.patient-name.clickable:hover {
  color: var(--azul-principal);
}

.patient-phone {
  display: block;
  color: #64748b;
  font-size: 0.8rem;
}

.template-cell {
  width: 21%;
}

.trigger-name {
  display: block;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
}

.trigger-details {
  display: block;
  color: #64748b;
  font-size: 0.74rem;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-cell {
  width: 23%;
}

.content-cell p {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.45;
  max-height: calc(1.45em * 2);
  margin: 0;
  font-size: 0.82rem;
  color: #4b5563;
}

.date-cell {
  width: 13%;
  white-space: nowrap;
  font-size: 0.8rem;
  color: #4b5563;
}

.status-cell {
  width: 11%;
  text-align: center;
}

.details-cell {
  width: 8%;
  text-align: center;
}

.status-badge {
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-size: 0.7rem;
  text-transform: capitalize;
  white-space: nowrap;
  display: inline-block;
}

.status--success {
  background-color: #dcfce7;
  color: #16a34a;
}

.status--error {
  background-color: #fee2e2;
  color: #dc2626;
}

.status--sending {
  background-color: #fefce8;
  color: #a16207;
}

.status--pending {
  background-color: #eff6ff;
  color: #2563eb;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--cinza-texto);
}

.btn-icon.error-icon {
  color: #ef4444;
}

.btn-icon:hover {
  background-color: #f3f4f6;
}

.read-receipt {
  color: #16a34a;
  display: inline-flex;
  align-items: center;
}

.text-muted {
  color: #94a3b8;
  font-size: 0.8rem;
}

.mobile-cards-list {
  display: none;
}

.mobile-state {
  padding: 1.25rem;
  color: #64748b;
  font-size: 0.9rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.mobile-log-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  background: #ffffff;
  padding: 0.85rem;
}

.mobile-log-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.mobile-log-row {
  margin-top: 0.55rem;
}

.mobile-log-label {
  display: block;
  font-size: 0.68rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.12rem;
}

.mobile-log-value {
  font-size: 0.86rem;
}

.mobile-log-content {
  margin: 0;
  font-size: 0.82rem;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-log-footer {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-log-date {
  font-size: 0.78rem;
  color: #64748b;
}

@media (max-width: 980px) {
  .filters-container {
    grid-template-columns: 1fr 1fr;
  }

  th,
  td {
    padding: 0.65rem 0.75rem;
    font-size: 0.82rem;
  }

  .patient-cell {
    width: 26%;
  }

  .template-cell {
    width: 23%;
  }

  .content-cell {
    width: 22%;
  }

  .date-cell {
    width: 12%;
  }

  .status-cell,
  .details-cell {
    width: 8%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.85rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .header-actions {
    width: 100%;
  }

  .btn-filters {
    width: 100%;
    justify-content: center;
  }

  .filters-container {
    grid-template-columns: 1fr;
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .table-wrapper {
    border: none;
    border-radius: 0rem;
  }
}
</style>
