// src/components/pages/marketing/tabs/LogsTab.vue
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useCrmLogsStore } from '@/stores/crmLogs'
import { usePatientsStore } from '@/stores/patients' // Import patient store for search
import { History, SlidersHorizontal, User, Tag, AlertTriangle, CheckCircle, Clock, Eye, Send, Search, LoaderCircle, MessageSquare } from 'lucide-vue-next' // Added MessageSquare
import AppPagination from '@/components/global/AppPagination.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue' // Import SearchableSelect
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'

const logsStore = useCrmLogsStore()
const patientsStore = usePatientsStore() // Instantiate patient store

const logs = computed(() => logsStore.logs)
const pagination = computed(() => logsStore.pagination)
const isLoading = computed(() => logsStore.isLoading)
let debounceTimeout = null

const filters = ref({
  status: null,
  actionType: null,
  patientId: null,
  // Add date filters here later
})
const showFilters = ref(false)
const patientSearchQuery = ref(''); // Separate query for patient search input
const selectedPatientForFilter = ref(null); // To hold selected patient object

const statusOptions = computed(() => [
    { value: null, label: 'Todos Status' },
    ...logsStore.availableLogStatus.map(s => ({ value: s, label: logsStore.getStatusDescription(s) }))
]);

const actionTypeOptions = computed(() => [
    { value: null, label: 'Todos Tipos' },
    ...logsStore.availableActionTypes.map(t => ({ value: t, label: logsStore.getActionTypeDescription(t) }))
]);

 // Options for the patient search dropdown
 const patientSearchOptions = computed(() => {
   return (patientsStore.searchResults || []).map(p => ({ value: p._id, label: p.name }));
 });

onMounted(() => {
  logsStore.fetchFilterOptions()
  logsStore.fetchLogs(1, filters.value)
})

// Watch for changes in filters (excluding patientId initially)
 watch(() => ({ status: filters.value.status, actionType: filters.value.actionType }), (newFilters) => {
   // Debounce API call
   clearTimeout(debounceTimeout);
   debounceTimeout = setTimeout(() => {
       logsStore.fetchLogs(1, { ...newFilters, patientId: filters.value.patientId }); // Include patientId
   }, 500); // 500ms debounce
 }, { deep: true });

 // Watch specifically for patientId changes to trigger fetch immediately
 watch(() => filters.value.patientId, (newPatientId) => {
     logsStore.fetchLogs(1, filters.value); // Fetch immediately when patient filter changes
 });


 // Function to handle patient search input
 function handlePatientSearch(query) {
   clearTimeout(debounceTimeout);
   if (query && query.length > 1) { // Search only if query has 2+ chars
     debounceTimeout = setTimeout(() => {
       patientsStore.searchPatients(query);
     }, 300);
   } else {
     patientsStore.searchResults = []; // Clear results if query is short
   }
 }

function handlePageChange(newPage) {
  logsStore.fetchLogs(newPage, filters.value)
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  // Updated format for better readability
  return format(new Date(dateString), "dd/MM/yy HH:mm", { locale: ptBR })
}

function getStatusClass(status) {
  const lowerStatus = status?.toLowerCase() || '';
  if (lowerStatus.startsWith('error')) return 'status--error'
  if (lowerStatus === 'delivered' || lowerStatus === 'read') return 'status--success'
  if (lowerStatus === 'sent_attempt') return 'status--sending'
  return 'status--pending' // Default includes PENDING
}

// Function to show full error message (e.g., in a tooltip or modal later)
function showFullError(message) {
   alert(message || "Sem detalhes adicionais do erro."); // Simple alert for now
}
</script>

<template>
  <div class="logs-tab">
    <div class="logs-header">
       <h2><History :size="20"/> Histórico de Envios</h2>
       <button class="btn-secondary btn-filters" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="16" />
            <span>Filtros</span>
       </button>
    </div>

    <Transition name="slide-fade">
        <div v-show="showFilters" class="filters-container">
             <StyledSelect v-model="filters.status" :options="statusOptions" label="Status"/>
             <StyledSelect v-model="filters.actionType" :options="actionTypeOptions" label="Tipo de Ação"/>
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
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th><User :size="14" /> Paciente</th>
              <th><Tag :size="14" /> Gatilho / Modelo</th>
              <th><MessageSquare :size="14" /> Conteúdo</th>
              <th><Clock :size="14" /> Data/Hora</th>
              <th><CheckCircle :size="14" /> Status</th>
              <th><AlertTriangle :size="14" /> Detalhes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="state-cell">
                 <LoaderCircle :size="24" class="animate-spin"/> Carregando histórico...
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="state-cell">Nenhum registro encontrado com os filtros aplicados.</td>
            </tr>
            <tr v-for="log in logs" :key="log._id" class="log-row">
              <td class="patient-cell">
                <span v-if="log.patient" class="patient-name">{{ log.patient.name }}</span>
                <span v-else class="text-muted">N/A</span>
                <div v-if="log.patient">
                   <PatientPhoneDisplay 
                      :phone="log.recipientPhone || log.patient.phone" 
                      :country-code="log.patient.countryCode" 
                      :show-flag="false"
                      class="patient-phone"
                   />
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
                <button v-if="log.errorMessage" class="btn-icon error-icon" @click="showFullError(log.errorMessage)" title="Ver erro">
                   <AlertTriangle :size="16"/>
                </button>
                <span v-else-if="log.status === 'READ'" class="read-receipt" title="Mensagem lida pelo destinatário">
                   <Eye :size="16"/>
                </span>
                 <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
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
.logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.logs-header h2 { font-size: 1.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.btn-secondary { background: var(--branco); border: 1px solid #d1d5db; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-secondary:hover { background-color: #f9fafb; }
.btn-filters { font-size: 0.875rem; padding: 0.5rem 1rem; }

.filters-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1.5rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; margin-bottom: 1.5rem; }
/* Reset margin for grid items (Select, SearchableSelect inherit from FormInput potentially) */
.filters-container > :deep(.form-group),
.filters-container > :deep(.searchable-select) { margin-bottom: 0; }
.filters-container :deep(.form-label) { white-space: nowrap; } /* Evita quebra de linha no label */

/* Ajustes SearchableSelect dentro dos filtros */
.filters-container :deep(.searchable-select .input-wrapper) {
   padding-top: 0.5rem;
   padding-bottom: 0.5rem;
}
.filters-container :deep(.searchable-select .select-input) {
   font-size: 0.875rem; /* Fonte menor para combinar */
}

/* Filtros - Transition */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; max-height: 200px; overflow: hidden;}
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; margin-bottom: 0; transform: translateY(-10px); }

.table-wrapper { background-color: var(--branco); border: 1px solid #e5e7eb; border-radius: 1rem; overflow: hidden; }
.table-container { overflow-x: auto; min-height: 400px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: top; /* Alinha no topo para melhor leitura */ font-size: 0.875rem; }
tbody tr:last-child td { border-bottom: none; }
th { background-color: #f9fafb; color: var(--cinza-texto); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem; white-space: nowrap; vertical-align: middle; }
th svg { margin-right: 0.3rem; vertical-align: text-bottom; }

.log-row:hover { background-color: #f9fafb; }
.state-cell { padding: 3rem; text-align: center; color: var(--cinza-texto); font-size: 1rem; vertical-align: middle;}
.state-cell svg { vertical-align: middle; margin-right: 0.5rem; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ✨ Coluna Paciente Melhorada */
.patient-cell { width: 20%; }
.patient-name { display: block; font-weight: 600; color: var(--preto); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.patient-phone { display: block; color: var(--cinza-texto); font-size: 0.8rem; }

/* ✨ Coluna Gatilho/Modelo Melhorada */
.template-cell { width: 20%; }
.trigger-name { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.trigger-details { display: block; color: var(--cinza-texto); font-size: 0.75rem; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.content-cell { width: 25%; }
.content-cell p { display: -webkit-box; -webkit-line-clamp: 3; /* Aumenta para 3 linhas */ -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.5; max-height: calc(1.5em * 3); margin: 0; font-size: 0.8rem; /* Fonte menor para caber mais */ color: #4b5563; }
.date-cell { width: 13%; white-space: nowrap; font-size: 0.8rem; color: #4b5563; }
.status-cell { width: 12%; text-align: center; }
.details-cell { width: 10%; text-align: center; }

.status-badge { font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.7rem; /* Menor */ text-transform: capitalize; white-space: nowrap; display: inline-block; } /* Garante display inline */
.status--success { background-color: #dcfce7; color: #16a34a; }
.status--error { background-color: #fee2e2; color: #dc2626; }
.status--sending { background-color: #fefce8; color: #a16207; }
.status--pending { background-color: #eff6ff; color: #2563eb; }

.btn-icon { background: none; border: none; cursor: pointer; padding: 0.3rem; border-radius: 50%; display: inline-flex; color: var(--cinza-texto); }
.btn-icon.error-icon { color: #ef4444; }
.btn-icon:hover { background-color: #f3f4f6; }
.read-receipt { color: #16a34a; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.8rem; font-weight: 500;}
.text-muted { color: var(--cinza-texto); font-style: italic; font-size: 0.8rem; }

 /* Responsivo */
@media (max-width: 900px) {
    .filters-container { grid-template-columns: 1fr 1fr; }
    th, td { padding: 0.6rem 0.8rem; font-size: 0.8rem; }
    .content-cell p { -webkit-line-clamp: 2; max-height: calc(1.5em * 2); }
    .patient-cell, .template-cell { width: 22%; }
    .content-cell { width: 26%; }
    .date-cell, .status-cell, .details-cell { width: 10%; }
}

 @media (max-width: 768px) {
    .logs-header { flex-direction: column; align-items: stretch; gap: 1rem; }
    .btn-filters { width: 100%; justify-content: center; }
    .filters-container { grid-template-columns: 1fr; }
    /* Esconde colunas menos importantes no mobile */
    th:nth-child(3), td:nth-child(3), /* Conteúdo */
    th:nth-child(6), td:nth-child(6)  /* Detalhes */
    { display: none; }
    .patient-cell, .template-cell, .date-cell, .status-cell { width: auto; } /* Largura automática */
    table { table-layout: auto; } /* Tabela se ajusta ao conteúdo */
     .status-badge { font-size: 0.65rem; padding: 0.15rem 0.5rem; } /* Badge menor */
}
</style>
