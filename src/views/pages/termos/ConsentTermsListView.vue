<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useDebounceFn } from '@vueuse/core'
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSignature,
  Filter,
  Link as LinkIcon,
  LoaderCircle,
  Phone,
  Search,
  Send,
  XCircle,
} from 'lucide-vue-next'
import { useConsentTermsStore } from '@/stores/consent-terms'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import ViewConsentTermModal from '@/components/pages/pacientes/modals/ViewConsentTermModal.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const consentTermsStore = useConsentTermsStore()

const {
  allTermsList,
  allTotal,
  allPage,
  allPages,
  allLimit,
  isLoading,
} = storeToRefs(consentTermsStore)

const searchFilter = ref('')
const selectedStatus = ref('Ativos')
const viewingTerm = ref(null)
const sendingTermId = ref(null)
const downloadingTermId = ref(null)

const statusOptions = [
  { value: 'Ativos', label: 'Excluir Expirados' },
  { value: 'Todos', label: 'Todos os Status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Assinado', label: 'Assinado' },
  { value: 'Expirado', label: 'Expirado' },
]

const hasData = computed(() => allTermsList.value.length > 0)
const showPagination = computed(() => allPages.value > 1)

function loadData() {
  consentTermsStore.fetchAllTerms(
    allPage.value,
    allLimit.value,
    selectedStatus.value,
    searchFilter.value,
  )
}

const handleSearchInput = useDebounceFn(() => {
  allPage.value = 1
  loadData()
}, 500)

watch(selectedStatus, () => {
  allPage.value = 1
  loadData()
})

onMounted(() => {
  if (route.query.status) {
    const validStatuses = statusOptions.map((option) => option.value)
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

function getPublicLink(term) {
  if (!term?.termLink) return ''
  return /^https?:\/\//i.test(term.termLink) ? term.termLink : `https://${term.termLink}`
}

async function copyLink(term) {
  const link = getPublicLink(term)
  if (!link) return

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = link
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      textArea.remove()
      if (!successful) throw new Error('copy command failed')
    }
    toast.success('Link copiado!')
  } catch (err) {
    toast.error('Não foi possível copiar o link.')
  }
}

function goToPatient(patientId) {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

function openTerm(term) {
  if (!term?.patientId || !term?._id) return
  viewingTerm.value = { patientId: term.patientId, termId: term._id }
}

async function handleDownloadPdf(term) {
  if (!term?.patientId || !term?._id || term.status !== 'Assinado') return
  downloadingTermId.value = term._id
  await consentTermsStore.downloadPdf(term.patientId, term._id, term.templateName || 'termo')
  downloadingTermId.value = null
}

async function handleSendPdf(term) {
  if (!term?.patientId || !term?._id || term.status !== 'Assinado') return
  sendingTermId.value = term._id
  await consentTermsStore.sendPdfToPatient(term.patientId, term._id)
  sendingTermId.value = null
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= allPages.value) {
    allPage.value = newPage
    loadData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function clearSearch() {
  searchFilter.value = ''
  handleSearchInput()
}
</script>

<template>
  <div class="terms-list-container">
    <ViewConsentTermModal
      v-if="viewingTerm"
      :patient-id="viewingTerm.patientId"
      :term-id="viewingTerm.termId"
      @close="viewingTerm = null"
    />

    <header class="page-header">
      <div>
        <h1 class="page-title">Termos</h1>
        <p class="page-subtitle">
          Acompanhe todos os termos enviados, pendentes e assinados da clínica
        </p>
      </div>

      <div class="header-actions">
        <StyledSelect v-model="selectedStatus" :options="statusOptions" class="status-filter">
          <template #prefix>
            <div class="prefix-slot">
              <Filter :size="14" />
            </div>
          </template>
        </StyledSelect>

        <div class="search-bar">
          <Search :size="18" class="search-icon" />
          <input
            v-model="searchFilter"
            type="text"
            placeholder="Buscar por paciente ou modelo..."
            class="search-input"
            @input="handleSearchInput"
          />
          <button v-if="searchFilter" class="clear-search" @click="clearSearch">
            <XCircle :size="16" />
          </button>
        </div>
      </div>
    </header>

    <div class="list-wrapper">
      <div v-if="isLoading && !hasData" class="state-container">
        <LoaderCircle :size="40" class="animate-spin text-blue-500" />
        <p>Buscando termos...</p>
      </div>

      <div v-else-if="!isLoading && !hasData" class="state-container empty-state">
        <div class="empty-icon-wrapper">
          <AlertCircle :size="48" />
        </div>
        <h3 v-if="searchFilter">Nenhum resultado encontrado</h3>
        <h3 v-else>Nenhum termo registrado</h3>
        <p v-if="searchFilter">Tente buscar por outro paciente ou modelo.</p>
        <p v-else>Os termos enviados aos pacientes aparecerão aqui.</p>
      </div>

      <div v-else class="terms-grid">
        <div v-for="term in allTermsList" :key="term._id" class="term-card">
          <div class="card-header">
            <div class="patient-info clickable" @click="goToPatient(term.patientId)" title="Ver perfil do paciente">
              <div class="patient-avatar">
                {{ term.patientName?.charAt(0)?.toUpperCase() || 'P' }}
              </div>
              <div class="patient-details">
                <h3 class="patient-name">{{ term.patientName || 'Nome não disponível' }}</h3>
                <div class="patient-phone">
                  <Phone :size="14" />
                  <PatientPhoneDisplay :phone="term.patientPhone" />
                </div>
              </div>
            </div>

            <span
              class="status-badge"
              :class="{
                signed: term.status === 'Assinado',
                pending: term.status === 'Pendente',
                expired: term.status === 'Expirado',
              }"
            >
              {{ term.status }}
            </span>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="info-label">Modelo:</span>
              <span class="info-value font-medium">{{ term.templateName || '--' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Enviado em:</span>
              <span class="info-value">{{ formatDate(term.assignedDate) }}</span>
            </div>
            <div v-if="term.status === 'Assinado'" class="info-row">
              <span class="info-label">Assinado em:</span>
              <span class="info-value text-green-600">{{ formatDate(term.signedDate) }}</span>
            </div>
            <div v-if="term.status === 'Pendente'" class="info-row">
              <span class="info-label">Expira em:</span>
              <span class="info-value text-orange-600">{{ formatDate(term.expirationDate) }}</span>
            </div>
            <div v-if="term.status === 'Expirado'" class="info-row">
              <span class="info-label">Expirou em:</span>
              <span class="info-value text-red-500">{{ formatDate(term.expirationDate) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">WhatsApp notificado:</span>
              <div class="notification-value">
                <CheckCircle v-if="term.whatsappNotified" :size="14" class="text-green-500" />
                <XCircle v-else :size="14" class="text-red-500" />
                {{ term.whatsappNotified ? 'Sim' : 'Não' }}
              </div>
            </div>
          </div>

          <div class="card-action">
            <button
              v-if="term.status === 'Pendente' && term.termLink"
              class="action-btn copy-btn"
              @click="copyLink(term)"
            >
              <LinkIcon :size="16" /> Copiar Link
            </button>
            <button
              v-else-if="term.status === 'Expirado'"
              class="action-btn copy-btn disabled"
              disabled
              title="O link expirou."
            >
              <XCircle :size="16" /> Link Expirado
            </button>
            <div v-else-if="term.status === 'Assinado'" class="signed-actions">
              <button
                class="icon-action"
                title="Ver termo"
                @click="openTerm(term)"
              >
                <Eye :size="16" />
              </button>
              <button
                class="icon-action primary"
                title="Baixar PDF"
                :disabled="downloadingTermId === term._id"
                @click="handleDownloadPdf(term)"
              >
                <LoaderCircle v-if="downloadingTermId === term._id" :size="16" class="animate-spin" />
                <Download v-else :size="16" />
              </button>
              <button
                class="icon-action success"
                title="Enviar PDF ao paciente"
                :disabled="sendingTermId === term._id"
                @click="handleSendPdf(term)"
              >
                <LoaderCircle v-if="sendingTermId === term._id" :size="16" class="animate-spin" />
                <Send v-else :size="16" />
              </button>
            </div>
            <button v-else class="action-btn copy-btn" @click="openTerm(term)">
              <FileSignature :size="16" /> Ver Termo
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPagination && !isLoading" class="pagination-container">
      <div class="pagination-info">
        Exibindo {{ (allPage - 1) * allLimit + 1 }} - {{ Math.min(allPage * allLimit, allTotal) }} de {{ allTotal }} termos
      </div>

      <div class="pagination-controls">
        <button class="page-btn" :disabled="allPage === 1" @click="changePage(allPage - 1)">
          <ChevronLeft :size="18" /> Anterior
        </button>
        <span class="page-number">Página {{ allPage }} de {{ allPages }}</span>
        <button class="page-btn" :disabled="allPage === allPages" @click="changePage(allPage + 1)">
          Próxima <ChevronRight :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terms-list-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
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
  width: 320px;
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
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
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

.terms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.term-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.2s;
}

.term-card:hover {
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
  color: #ffffff;
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

.patient-phone,
.notification-value {
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

.status-badge.signed {
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
  gap: 1rem;
  font-size: 0.875rem;
}

.info-label {
  color: #64748b;
  flex-shrink: 0;
}

.info-value {
  color: #1e293b;
  text-align: right;
}

.font-medium {
  font-weight: 500;
}

.text-green-500 {
  color: #22c55e;
}

.text-green-600 {
  color: #16a34a;
}

.text-orange-600 {
  color: #ea580c;
}

.text-red-500 {
  color: #ef4444;
}

.card-action {
  padding: 1rem 1.25rem;
  background-color: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.action-btn,
.icon-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn {
  width: 100%;
  padding: 0.625rem;
}

.copy-btn {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.copy-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.signed-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.icon-action {
  height: 38px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
}

.icon-action:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.icon-action.primary {
  background: var(--azul-principal);
  color: #ffffff;
  border-color: transparent;
}

.icon-action.success {
  background: #16a34a;
  color: #ffffff;
  border-color: transparent;
}

.icon-action:disabled {
  cursor: wait;
  opacity: 0.75;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #ffffff;
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
  background: #ffffff;
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

  .status-filter,
  .search-bar {
    width: 100%;
  }

  .list-wrapper,
  .pagination-container {
    padding: 1rem;
  }

  .pagination-container {
    flex-direction: column;
    gap: 1rem;
  }

  .terms-grid {
    grid-template-columns: 1fr;
  }
}
</style>
