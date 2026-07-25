<template>
  <div class="clinic-gallery-page">
    <MediaViewerModal
      :show="!!selectedFile"
      :file="selectedFile"
      @close="selectedFile = null"
    />

    <header class="gallery-header">
      <div>
        <h1 class="page-title">Galeria</h1>
        <p class="page-subtitle">Fotos e arquivos dos atendimentos da clínica</p>
      </div>

      <div class="result-summary">
        <Images :size="18" />
        <span>{{ pagination.total }} itens</span>
      </div>
    </header>

    <section class="filter-bar">
      <div class="search-box">
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchFilter"
          type="text"
          class="search-input"
          placeholder="Buscar paciente, tag ou descrição..."
          @input="handleSearchInput"
        />
        <button v-if="searchFilter" class="clear-search" @click="clearSearch" title="Limpar busca">
          <X :size="16" />
        </button>
      </div>

      <StyledSelect v-model="selectedCategory" :options="categoryOptions" class="compact-select">
        <template #prefix>
          <FolderOpen :size="14" class="select-prefix" />
        </template>
      </StyledSelect>

      <StyledSelect v-model="selectedFileType" :options="fileTypeOptions" class="compact-select">
        <template #prefix>
          <FileImage :size="14" class="select-prefix" />
        </template>
      </StyledSelect>

      <div class="date-range">
        <input v-model="fromDate" type="date" class="date-input" @change="reloadFirstPage" />
        <span class="date-separator">até</span>
        <input v-model="toDate" type="date" class="date-input" @change="reloadFirstPage" />
      </div>

      <div class="tag-filter" v-click-outside="() => (isTagMenuOpen = false)">
        <button
          type="button"
          class="tag-filter-button"
          :class="{ active: selectedTags.length > 0 }"
          @click="isTagMenuOpen = !isTagMenuOpen"
        >
          <Filter :size="16" />
          <span>Tags</span>
          <span v-if="selectedTags.length" class="tag-count">{{ selectedTags.length }}</span>
          <ChevronDown :size="14" :class="{ rotated: isTagMenuOpen }" />
        </button>

        <div v-if="isTagMenuOpen" class="tag-menu">
          <div class="tag-menu-header">
            <span>Tags</span>
            <button v-if="selectedTags.length" type="button" @click="clearTags">Limpar</button>
          </div>

          <div class="tag-mode" v-if="selectedTags.length > 1">
            <button :class="{ active: tagMode === 'or' }" @click="setTagMode('or')">Qualquer</button>
            <button :class="{ active: tagMode === 'and' }" @click="setTagMode('and')">Todas</button>
          </div>

          <div class="tag-list">
            <label
              v-for="tag in availableTags"
              :key="tag.name"
              class="tag-option"
              :class="{ selected: selectedTags.includes(tag.name) }"
            >
              <input v-model="selectedTags" type="checkbox" :value="tag.name" @change="reloadFirstPage" />
              <span>{{ tag.name }}</span>
              <small>{{ tag.count }}</small>
            </label>

            <div v-if="availableTags.length === 0" class="empty-tags">
              Nenhuma tag encontrada
            </div>
          </div>
        </div>
      </div>
    </section>

    <main class="gallery-content">
      <div v-if="store.loading && files.length === 0" class="state-block">
        <LoaderCircle :size="40" class="spin" />
        <span>Carregando galeria...</span>
      </div>

      <div v-else-if="!store.loading && files.length === 0" class="state-block">
        <ImageOff :size="44" />
        <h3>Nenhum item encontrado</h3>
        <p>Altere os filtros para ampliar a busca.</p>
      </div>

      <div v-else class="media-grid" :class="{ muted: store.loading }">
        <article
          v-for="file in files"
          :key="file._id"
          class="media-card"
          @click="openFile(file)"
        >
          <div class="thumb-frame">
            <img
              v-if="file.fileType === 'image' && getThumbnailUrl(file)"
              :src="getThumbnailUrl(file)"
              :alt="file.metadata?.description || file.metadata?.originalName || 'Imagem da galeria'"
              class="thumb-image"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
            <div v-else class="file-placeholder">
              <FileText :size="34" />
              <span>{{ fileTypeLabel(file.fileType) }}</span>
            </div>

            <div class="thumb-overlay">
              <span class="date-chip">
                <Calendar :size="12" />
                {{ formatShortDate(file.createdAt) }}
              </span>
              <span class="open-chip">
                <Maximize2 :size="14" />
              </span>
            </div>
          </div>

          <div class="media-info">
            <div class="patient-row">
              <div class="avatar">{{ file.patient?.name?.charAt(0)?.toUpperCase() || 'P' }}</div>
              <div>
                <button type="button" class="patient-name" @click.stop="goToPatient(file.patient?._id)">
                  {{ file.patient?.name || 'Paciente' }}
                </button>
                <span class="appointment-date">
                  {{ formatAppointment(file.appointment) }}
                </span>
              </div>
            </div>

            <p v-if="file.metadata?.description" class="description">
              {{ file.metadata.description }}
            </p>

            <div v-if="file.metadata?.tags?.length" class="tag-row">
              <button
                v-for="tag in file.metadata.tags.slice(0, 3)"
                :key="tag"
                type="button"
                class="mini-tag"
                @click.stop="toggleTag(tag)"
              >
                {{ tag }}
              </button>
              <span v-if="file.metadata.tags.length > 3" class="more-tags">
                +{{ file.metadata.tags.length - 3 }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </main>

    <footer v-if="pagination.totalPages > 1" class="pagination-bar">
      <span class="pagination-info">
        Página {{ pagination.page }} de {{ pagination.totalPages }}
      </span>
      <div class="pagination-actions">
        <button class="page-button" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">
          <ChevronLeft :size="18" /> Anterior
        </button>
        <button class="page-button" :disabled="pagination.page >= pagination.totalPages" @click="changePage(pagination.page + 1)">
          Próxima <ChevronRight :size="18" />
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  Filter,
  FolderOpen,
  ImageOff,
  Images,
  LoaderCircle,
  Maximize2,
  Search,
  X,
} from 'lucide-vue-next'
import { useGalleryStore } from '@/stores/gallery'
import StyledSelect from '@/components/global/StyledSelect.vue'
import MediaViewerModal from '@/views/pages/pacientes/components/MediaViewerModal.vue'

const router = useRouter()
const store = useGalleryStore()

const searchFilter = ref('')
const selectedCategory = ref('imagens')
const selectedFileType = ref('image')
const selectedTags = ref([])
const tagMode = ref('or')
const fromDate = ref('')
const toDate = ref('')
const isTagMenuOpen = ref(false)
const selectedFile = ref(null)

const categoryOptions = [
  { value: 'imagens', label: 'Imagens' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'all', label: 'Tudo' },
]

const fileTypeOptions = [
  { value: 'image', label: 'Fotos' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'document', label: 'Documentos' },
  { value: 'all', label: 'Todos' },
]

const files = computed(() => store.clinicGallery.files || [])
const availableTags = computed(() => store.clinicGallery.tags || [])
const pagination = computed(() => store.clinicGallery.pagination || {
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
})

function currentParams(page = pagination.value.page || 1) {
  return {
    page,
    limit: pagination.value.limit || 30,
    search: searchFilter.value.trim(),
    tags: selectedTags.value,
    tagMode: tagMode.value,
    category: selectedCategory.value,
    fileType: selectedFileType.value,
    from: fromDate.value,
    to: toDate.value,
  }
}

function loadGallery(page = 1) {
  store.fetchClinicGallery(currentParams(page))
}

function loadTags() {
  store.fetchClinicTags({
    category: selectedCategory.value,
    fileType: selectedFileType.value,
  })
}

const handleSearchInput = useDebounceFn(() => {
  loadGallery(1)
}, 450)

function reloadFirstPage() {
  loadGallery(1)
}

watch([selectedCategory, selectedFileType], () => {
  selectedTags.value = []
  tagMode.value = 'or'
  loadTags()
  loadGallery(1)
})

onMounted(() => {
  loadTags()
  loadGallery(1)
})

function clearSearch() {
  searchFilter.value = ''
  loadGallery(1)
}

function clearTags() {
  selectedTags.value = []
  tagMode.value = 'or'
  loadGallery(1)
}

function setTagMode(mode) {
  tagMode.value = mode
  loadGallery(1)
}

function toggleTag(tag) {
  const normalized = String(tag || '').toLowerCase()
  if (!normalized) return
  if (selectedTags.value.includes(normalized)) {
    selectedTags.value = selectedTags.value.filter((item) => item !== normalized)
  } else {
    selectedTags.value = [...selectedTags.value, normalized]
  }
  loadGallery(1)
}

async function openFile(file) {
  const result = await store.fetchGalleryItem(file._id)
  const fullFile = result.success ? result.data : file

  if (fullFile.fileType === 'image') {
    selectedFile.value = fullFile
    return
  }

  if (fullFile.signedUrl) {
    window.open(fullFile.signedUrl, '_blank', 'noopener')
  }
}

function goToPatient(patientId) {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

function changePage(page) {
  if (page < 1 || page > pagination.value.totalPages) return
  loadGallery(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatShortDate(dateString) {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function formatAppointment(appointment) {
  if (!appointment) return 'Sem atendimento vinculado'
  const date = appointment.startTime
    ? new Date(appointment.startTime).toLocaleDateString('pt-BR')
    : null
  return [appointment.type || 'Atendimento', date].filter(Boolean).join(' - ')
}

function fileTypeLabel(type) {
  const labels = {
    pdf: 'PDF',
    document: 'Documento',
    other: 'Arquivo',
    image: 'Imagem',
  }
  return labels[type] || 'Arquivo'
}

function getThumbnailUrl(file) {
  return file?.thumbnailUrl || file?.previewUrl || file?.signedUrl || ''
}
</script>

<style scoped>
.clinic-gallery-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  min-height: 0;
  background: #f8fafc;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 2rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.page-title {
  font-size: 2rem;
  line-height: 1.2;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.result-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 38px;
  padding: 0 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #475569;
  font-weight: 600;
  font-size: 0.875rem;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1 1 300px;
  max-width: 460px;
}

.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  min-height: 40px;
  padding: 0.625rem 2.4rem 0.625rem 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #334155;
  font-size: 0.875rem;
}

.search-input:focus,
.date-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 131, 246, 0.1);
}

.clear-search {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.compact-select {
  width: 150px;
}

.select-prefix {
  color: #64748b;
  margin-right: 0.25rem;
}

.date-range {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  min-height: 40px;
  width: 142px;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #334155;
  font-size: 0.875rem;
  padding: 0 0.65rem;
}

.date-separator {
  color: #64748b;
  font-size: 0.8125rem;
}

.tag-filter {
  position: relative;
}

.tag-filter-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #475569;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
}

.tag-filter-button.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.tag-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.7rem;
}

.rotated {
  transform: rotate(180deg);
}

.tag-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 280px;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
  z-index: 50;
  overflow: hidden;
}

.tag-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 0.9rem;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.tag-menu-header button {
  border: 0;
  background: transparent;
  color: #ef4444;
  font-weight: 700;
  cursor: pointer;
}

.tag-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.tag-mode button {
  min-height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 0.4rem;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
}

.tag-mode button.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.tag-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.4rem 0;
}

.tag-option {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 38px;
  padding: 0 0.9rem;
  cursor: pointer;
  color: #334155;
  font-size: 0.875rem;
}

.tag-option:hover,
.tag-option.selected {
  background: #f8fafc;
}

.tag-option input {
  width: 16px;
  height: 16px;
}

.tag-option small {
  color: #94a3b8;
}

.empty-tags {
  padding: 1rem;
  color: #94a3b8;
  font-size: 0.875rem;
  text-align: center;
}

.gallery-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.state-block {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #64748b;
  text-align: center;
}

.state-block h3 {
  color: #334155;
  margin: 0;
  font-size: 1.125rem;
}

.state-block p {
  margin: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.media-grid.muted {
  opacity: 0.65;
  pointer-events: none;
}

.media-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  content-visibility: auto;
  contain-intrinsic-size: 300px;
}

.media-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09);
}

.thumb-frame {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #e2e8f0;
  overflow: hidden;
}

.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  background: #f1f5f9;
  font-size: 0.875rem;
}

.thumb-overlay {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.55), transparent);
}

.date-chip,
.open-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 26px;
  padding: 0 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.375rem;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(4px);
  font-size: 0.75rem;
}

.open-chip {
  width: 28px;
  justify-content: center;
  padding: 0;
}

.media-info {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.patient-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 0.65rem;
}

.avatar {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eef2ff;
  color: var(--azul-principal);
  font-weight: 700;
}

.patient-name {
  display: block;
  max-width: 100%;
  border: 0;
  background: transparent;
  color: #1e293b;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: left;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-name:hover {
  color: var(--azul-principal);
}

.appointment-date {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description {
  margin: 0;
  color: #475569;
  font-size: 0.8125rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.mini-tag,
.more-tags {
  min-height: 24px;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  font-size: 0.72rem;
}

.mini-tag {
  cursor: pointer;
}

.mini-tag:hover {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 2rem;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}

.pagination-actions {
  display: flex;
  gap: 0.75rem;
}

.page-button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
}

.page-button:hover:not(:disabled) {
  color: var(--azul-principal);
  border-color: #cbd5e1;
  background: #f8fafc;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .gallery-header,
  .filter-bar,
  .gallery-content,
  .pagination-bar {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .gallery-header,
  .pagination-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-box,
  .compact-select,
  .date-input,
  .tag-filter,
  .tag-filter-button {
    width: 100%;
    max-width: none;
  }

  .date-range {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
  }

  .media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 520px) {
  .media-grid {
    grid-template-columns: 1fr;
  }

  .pagination-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
