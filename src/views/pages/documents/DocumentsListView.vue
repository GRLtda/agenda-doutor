<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from 'vue-toastification'
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  Send,
  Loader2
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import DocumentStatusBadge from '@/components/documents/DocumentStatusBadge.vue'
import PdfViewer from '@/components/documents/PdfViewer.vue'

const router = useRouter()
const documentsStore = useDocumentsStore()
const patientsStore = usePatientsStore()
const toast = useToast()

// State
const searchQuery = ref('')
const statusFilter = ref('')
const documentTypeFilter = ref('')
const isFiltersOpen = ref(false)
const pdfPreview = ref(null)

// Computed
const documents = computed(() => documentsStore.documents)
const documentTypes = computed(() => documentsStore.documentTypes)
const pagination = computed(() => documentsStore.pagination)
const isLoading = computed(() => documentsStore.isLoading)

const statusOptions = [
  { value: '', label: 'Todos os Status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'awaiting_signature', label: 'Aguardando Assinatura' },
  { value: 'signed', label: 'Assinado' },
  { value: 'signature_failed', label: 'Falha na Assinatura' },
  { value: 'cancelled', label: 'Cancelado' },
]

const documentTypeOptions = computed(() => [
  { value: '', label: 'Todos os Tipos' },
  ...documentTypes.value.map(type => ({
    value: type._id,
    label: type.name
  }))
])

// Lifecycle
onMounted(async () => {
  await Promise.all([
    documentsStore.fetchDocumentTypes(),
    loadDocuments()
  ])
})

// Watchers
watch([statusFilter, documentTypeFilter], () => {
  loadDocuments(1)
})

// Methods
async function loadDocuments(page = pagination.value.page) {
  const params = {
    page,
    limit: pagination.value.limit
  }
  
  if (statusFilter.value) {
    params.status = statusFilter.value
  }
  
  if (documentTypeFilter.value) {
    params.documentTypeId = documentTypeFilter.value
  }
  
  await documentsStore.fetchDocuments(params)
}

function handleSearch() {
  // TODO: Implement search when backend supports it
  loadDocuments(1)
}

function goToPage(page) {
  if (page >= 1 && page <= pagination.value.pages) {
    loadDocuments(page)
  }
}

function createNewDocument() {
  router.push({ name: 'document-create' })
}

function viewDocument(doc) {
  router.push({ name: 'document-detail', params: { id: doc._id } })
}

function editDocument(doc) {
  router.push({ name: 'document-edit', params: { id: doc._id } })
}

async function handleDownload(doc) {
  const { success, data, error } = await documentsStore.downloadDocument(doc._id)
  if (success && data.pdfUrl) {
    window.open(data.pdfUrl, '_blank')
  } else {
    toast.error(error || 'Erro ao baixar documento')
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function clearFilters() {
  statusFilter.value = ''
  documentTypeFilter.value = ''
  searchQuery.value = ''
}
</script>

<template>
  <div class="documents-list-view">
    <!-- PDF Preview Modal -->
    <PdfViewer
      v-if="pdfPreview"
      :pdf-url="pdfPreview.url"
      :file-name="pdfPreview.name"
      :title="pdfPreview.title"
      @close="pdfPreview = null"
    />

    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <FileText :size="28" />
          Documentos
        </h1>
        <p class="page-subtitle">Gerencie receituários, atestados e contratos</p>
      </div>
      <AppButton @click="createNewDocument" variant="primary">
        <Plus :size="18" />
        Novo Documento
      </AppButton>
    </header>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <div class="search-box">
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por título ou paciente..."
          @keyup.enter="handleSearch"
        />
      </div>
      
      <div class="filter-group">
        <StyledSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Status"
          class="filter-select"
        />
        <StyledSelect
          v-model="documentTypeFilter"
          :options="documentTypeOptions"
          placeholder="Tipo"
          class="filter-select"
        />
        <button
          v-if="statusFilter || documentTypeFilter"
          @click="clearFilters"
          class="clear-filters-btn"
          title="Limpar filtros"
        >
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- Documents Table -->
    <div class="table-container">
      <div v-if="isLoading" class="loading-state">
        <Loader2 :size="32" class="spinner" />
        <span>Carregando documentos...</span>
      </div>

      <table v-else-if="documents.length > 0" class="documents-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Paciente</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Data</th>
            <th class="actions-col">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in documents" :key="doc._id">
            <td class="title-cell">
              <span class="doc-title">{{ doc.title }}</span>
              <span class="doc-version">v{{ doc.currentVersion }}</span>
            </td>
            <td>
              <span v-if="doc.patient" class="patient-name">
                {{ doc.patient.name }}
              </span>
              <span v-else class="text-muted">-</span>
            </td>
            <td>
              <span v-if="doc.documentType" class="doc-type">
                {{ doc.documentType.name }}
              </span>
              <span v-else class="text-muted">-</span>
            </td>
            <td>
              <DocumentStatusBadge :status="doc.status" size="small" />
            </td>
            <td class="date-cell">
              {{ formatDate(doc.createdAt) }}
            </td>
            <td class="actions-cell">
              <button @click="viewDocument(doc)" class="action-btn" title="Visualizar">
                <Eye :size="16" />
              </button>
              <button 
                v-if="doc.status === 'draft' || doc.status === 'signature_failed'" 
                @click="editDocument(doc)" 
                class="action-btn" 
                title="Editar"
              >
                <FileText :size="16" />
              </button>
              <button 
                v-if="doc.status === 'signed'" 
                @click="handleDownload(doc)" 
                class="action-btn" 
                title="Baixar"
              >
                <Download :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <FileText :size="64" class="empty-icon" />
        <h3>Nenhum documento encontrado</h3>
        <p>Crie seu primeiro documento clicando no botão acima.</p>
        <AppButton @click="createNewDocument" variant="secondary">
          <Plus :size="16" />
          Criar Documento
        </AppButton>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="pagination">
      <button 
        @click="goToPage(pagination.page - 1)" 
        :disabled="pagination.page <= 1"
        class="pagination-btn"
      >
        <ChevronLeft :size="18" />
      </button>
      
      <span class="pagination-info">
        Página {{ pagination.page }} de {{ pagination.pages }}
      </span>
      
      <button 
        @click="goToPage(pagination.page + 1)" 
        :disabled="pagination.page >= pagination.pages"
        class="pagination-btn"
      >
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.documents-list-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.page-title svg {
  color: #6366f1;
}

.page-subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 0.9375rem;
}

.filters-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  max-width: 400px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-select {
  min-width: 160px;
}

.clear-filters-btn {
  background: #fee2e2;
  border: none;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #dc2626;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: #fecaca;
}

.table-container {
  background: var(--branco, #fff);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6366f1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.documents-table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th {
  text-align: left;
  padding: 1rem 1.25rem;
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.documents-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9375rem;
  color: #374151;
}

.documents-table tr:last-child td {
  border-bottom: none;
}

.documents-table tr:hover td {
  background: #f9fafb;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.doc-title {
  font-weight: 500;
  color: #1f2937;
}

.doc-version {
  font-size: 0.75rem;
  color: #9ca3af;
}

.patient-name {
  font-weight: 500;
}

.doc-type {
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: #4b5563;
}

.text-muted {
  color: #9ca3af;
}

.date-cell {
  white-space: nowrap;
  color: #6b7280;
  font-size: 0.875rem;
}

.actions-col {
  text-align: center;
  width: 120px;
}

.actions-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 1rem;
}

.empty-icon {
  color: #d1d5db;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #1f2937;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.pagination-btn {
  background: var(--branco, #fff);
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .documents-list-view {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .filters-bar {
    flex-direction: column;
  }

  .search-box {
    max-width: none;
  }

  .filter-group {
    width: 100%;
    flex-wrap: wrap;
  }

  .filter-select {
    flex: 1;
    min-width: 140px;
  }

  .documents-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
