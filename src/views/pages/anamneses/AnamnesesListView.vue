<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from 'vue-toastification'
import { useDebounceFn } from '@vueuse/core'
import {
  Search,
  ClipboardList,
  Phone,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  Download,
  Filter
} from 'lucide-vue-next'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const anamnesisStore = useAnamnesisStore()
const {
  allAnamnesesList,
  allTotal,
  allPage,
  allPages,
  allLimit,
  isLoading
} = storeToRefs(anamnesisStore)

const searchFilter = ref('')
const selectedStatus = ref('Ativos')

const statusOptions = [
  { value: 'Ativos', label: 'Excluir Expirados' },
  { value: 'Todos', label: 'Todos os Status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Preenchido', label: 'Preenchido' },
  { value: 'Expirado', label: 'Expirado' }
]

const loadData = () => {
  anamnesisStore.fetchAllAnamneses(allPage.value, allLimit.value, selectedStatus.value, searchFilter.value)
}

// Debounced search for better performance
const handleSearchInput = useDebounceFn(() => {
  allPage.value = 1 // Reset to first page
  loadData()
}, 500)

watch(selectedStatus, () => {
  allPage.value = 1 // Reset to first page
  loadData()
})

onMounted(() => {
  if (route.query.status) {
    const validStatuses = statusOptions.map(opt => opt.value)
    if (validStatuses.includes(route.query.status)) {
      selectedStatus.value = route.query.status
    }
  }
  loadData()
})

function formatDate(dateString) {
  if (!dateString) return '--'
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch (e) {
    return dateString
  }
}

function copyLink(link) {
  if (navigator.clipboard && link) {
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Link copiado!'))
      .catch(err => console.error('Erro ao copiar link:', err))
  }
}

async function handleDownloadPdf(patientId, anamnesisId) {
  if (!patientId || !anamnesisId) return
  await anamnesisStore.downloadPdf(patientId, anamnesisId)
}

function goToPatient(patientId) {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= allPages.value) {
    allPage.value = newPage
    loadData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const hasData = computed(() => allAnamnesesList.value.length > 0)
const showPagination = computed(() => allPages.value > 1)
</script>

<template>
  <div class="anamneses-list-container">
    <header class="page-header">
      <div class="header-left">
        <div>
          <h1 class="page-title">Anamneses</h1>
          <p class="page-subtitle">
            Gerencie todas as anamneses encaminhadas e preenchidas
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- Status Filter -->
        <StyledSelect
          v-model="selectedStatus"
          :options="statusOptions"
          class="status-filter"
        >
          <template #prefix>
            <div class="prefix-slot">
              <Filter :size="14" />
            </div>
          </template>
        </StyledSelect>

        <!-- Search Bar -->
        <div class="search-bar">
          <Search :size="18" class="search-icon" />
          <input
            v-model="searchFilter"
            type="text"
            placeholder="Buscar por paciente..."
            class="search-input"
            @input="handleSearchInput"
          />
          <button v-if="searchFilter" class="clear-search" @click="() => { searchFilter = ''; handleSearchInput(); }">
            <XCircle :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="list-wrapper">
      <!-- Loading State -->
      <div v-if="isLoading && !hasData" class="state-container">
        <LoaderCircle :size="40" class="animate-spin text-blue-500" />
        <p>Buscando anamneses...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && !hasData" class="state-container empty-state">
        <div class="empty-icon-wrapper">
          <AlertCircle :size="48" />
        </div>
        <h3 v-if="searchFilter">Nenhum resultado encontrado</h3>
        <h3 v-else>Nenhuma anamnese registrada</h3>
        <p v-if="searchFilter">Tente buscar por outro termo.</p>
        <p v-else>Você ainda não enviou nenhum formulário de anamnese para os seus pacientes.</p>
      </div>

      <!-- Anamneses List -->
      <div v-else class="anamneses-grid">
        <div
          v-for="anamnesis in allAnamnesesList"
          :key="anamnesis._id"
          class="anamnesis-card"
        >
          <div class="card-header">
            <div class="patient-info clickable" @click="goToPatient(anamnesis.patientId)" title="Ver perfil do paciente">
              <div class="patient-avatar">
                {{ anamnesis.patientName?.charAt(0)?.toUpperCase() || 'P' }}
              </div>
              <div class="patient-details">
                <h3 class="patient-name">{{ anamnesis.patientName || 'Nome não disponível' }}</h3>
                <div class="patient-phone">
                  <Phone :size="14" />
                  <PatientPhoneDisplay :phone="anamnesis.patientPhone" />
                </div>
              </div>
            </div>
            
            <span class="status-badge" :class="{
              'filled': anamnesis.status === 'Preenchido',
              'pending': anamnesis.status === 'Pendente',
              'expired': anamnesis.status === 'Expirado'
            }">
              {{ anamnesis.status }}
            </span>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="info-label">Modelo:</span>
              <span class="info-value font-medium">{{ anamnesis.templateName || '--' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Enviado em:</span>
              <span class="info-value">{{ formatDate(anamnesis.assignedDate) }}</span>
            </div>
            <div class="info-row" v-if="anamnesis.status === 'Pendente'">
              <span class="info-label">Expira em:</span>
              <span class="info-value text-red-500">{{ formatDate(anamnesis.expirationDate) }}</span>
            </div>
            <div class="info-row" v-if="anamnesis.status === 'Pendente'">
              <span class="info-label">WhatsApp notificado:</span>
              <div class="flex items-center gap-1 font-medium text-slate-700">
                <CheckCircle v-if="anamnesis.whatsappNotified" :size="14" class="text-green-500" />
                <XCircle v-else :size="14" class="text-red-500" />
                {{ anamnesis.whatsappNotified ? 'Sim' : 'Não' }}
              </div>
            </div>
          </div>

          <div class="card-action">
            <button
              v-if="anamnesis.status === 'Pendente' && anamnesis.anamnesisLink"
              class="action-btn copy-btn"
              @click="copyLink(anamnesis.anamnesisLink)"
            >
              <LinkIcon :size="16" /> Copiar Link
            </button>
            <button
              v-else-if="anamnesis.status === 'Expirado' && anamnesis.anamnesisLink"
              class="action-btn copy-btn"
              @click="copyLink(anamnesis.anamnesisLink)"
              disabled
              title="O link expirou."
              style="opacity: 0.5; cursor: not-allowed;"
            >
              <XCircle :size="16" /> Link Expirado
            </button>
            <button
              v-else-if="anamnesis.status === 'Preenchido'"
              class="action-btn pdf-btn"
              @click="handleDownloadPdf(anamnesis.patientId, anamnesis._id)"
            >
              <Download :size="16" /> Baixar PDF
            </button>
            <div v-else class="text-center text-sm text-gray-400 py-2">
              Nenhuma ação disponível
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination && !isLoading" class="pagination-container">
      <div class="pagination-info">
        Exibindo {{ (allPage - 1) * allLimit + 1 }} - {{ Math.min(allPage * allLimit, allTotal) }} de {{ allTotal }} anamneses
      </div>
      
      <div class="pagination-controls">
        <button
          class="page-btn"
          :disabled="allPage === 1"
          @click="changePage(allPage - 1)"
        >
          <ChevronLeft :size="18" /> Anterior
        </button>
        <span class="page-number">Página {{ allPage }} de {{ allPages }}</span>
        <button
          class="page-btn"
          :disabled="allPage === allPages"
          @click="changePage(allPage + 1)"
        >
          Próxima <ChevronRight :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anamneses-list-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  background-color: #f8fafc;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-filter {
  width: 180px;
}

.prefix-slot {
  display: flex;
  align-items: center;
  color: #64748b;
  margin-right: 0.25rem;
}

.search-bar {
  position: relative;
  width: 300px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 0.625rem 2.5rem;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 99px;
  font-size: 0.875rem;
  color: #334155;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 131, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
}

.clear-search:hover {
  color: #ef4444;
}

.list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #64748b;
  gap: 1rem;
}

.empty-icon-wrapper {
  color: #cbd5e1;
  margin-bottom: 0.5rem;
}

.empty-state h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.anamneses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.anamnesis-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.2s;
}

.anamnesis-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.patient-info.clickable {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
  margin: -0.25rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.patient-info.clickable:hover {
  background-color: #f8fafc;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  background: var(--azul-principal);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.125rem;
}

.patient-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.125rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.patient-phone {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: #64748b;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.pending {
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #ffedd5;
}

.status-badge.expired {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fee2e2;
}

.status-badge.filled {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #dcfce7;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.info-label {
  color: #64748b;
}

.info-value {
  color: #1e293b;
}

.card-action {
  padding: 1rem 1.25rem;
  background-color: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.copy-btn {
  background-color: white;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.copy-btn:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.pdf-btn {
  background-color: var(--azul-principal);
  border: 1px solid transparent;
  color: white;
}

.pdf-btn:hover {
  background-color: #2563eb;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  font-size: 0.875rem;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: var(--azul-principal);
  border-color: #cbd5e1;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

@media (max-width: 768px) {
  .pagination-info {
    display: none;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .status-filter, .search-bar {
    width: 100%;
  }

  .list-wrapper, .pagination-container {
    padding: 1rem;
  }

  .pagination-container {
    flex-direction: column;
    gap: 1rem;
  }

  .anamneses-grid {
    grid-template-columns: 1fr;
  }
}
</style>
