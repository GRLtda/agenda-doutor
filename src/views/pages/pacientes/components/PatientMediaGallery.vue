<template>
  <div class="media-gallery-container">
    <!-- Header / Breadcrumbs -->
    <div class="gallery-header">
      <div class="breadcrumbs">
        <span 
          v-for="(crumb, index) in store.breadcrumbs" 
          :key="index"
          class="breadcrumb-item"
          :class="{ active: index === store.breadcrumbs.length - 1 }"
          @click="navigate(crumb)"
        >
          {{ crumb.name }}
          <span v-if="index < store.breadcrumbs.length - 1" class="separator">/</span>
        </span>
      </div>
      
      <div class="actions">
        <!-- Placeholder para Upload ou Toggle View -->
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando arquivos...</p>
    </div>

    <!-- Conteúdo -->
    <div v-else class="gallery-content">
      
      <!-- Visão de Pastas (Root) -->
      <div v-if="store.breadcrumbs.length === 1" class="folder-grid">
        <!-- Card Pasta -->
        <div 
          v-for="folder in store.folders" 
          :key="folder.folderId" 
          class="folder-card"
          @click="openFolder(folder.folderId)"
        >
          <img src="@/assets/imgs/folder-icon-macos.webp" alt="Folder" class="folder-icon" />
          <div class="folder-info">
            <span class="folder-name">{{ folder.folderName }}</span>
            <span class="folder-meta">{{ folder.fileCount }} itens</span>
             <span class="folder-date" v-if="folder.appointmentDate">
              {{ new Date(folder.appointmentDate).toLocaleDateString('pt-BR') }}
            </span>
          </div>
        </div>
        
        <!-- Empty State Pastas -->
        <div v-if="store.folders.length === 0" class="empty-state">
          <p>Nenhum arquivo encontrado.</p>
        </div>
      </div>

      <!-- Visão de Arquivos (Dentro da Pasta) -->
      <div v-else class="files-view">
        
        <!-- Toolbar de Filtro e Busca -->
        <div class="gallery-toolbar">
          <div class="toolbar-main-row">
            <div class="search-box">
              <Search :size="16" class="search-icon" />
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Buscar por tag ou descrição..." 
                class="search-input"
              />
              <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
                  <X :size="14" />
              </button>
            </div>

            <!-- Dropdown de Tags -->
            <div class="filter-dropdown-container" v-if="availableTags.length > 0">
              <button 
                class="toolbar-btn" 
                :class="{ 'has-filters': filterTags.length > 0 }"
                @click="isFilterDropdownOpen = !isFilterDropdownOpen"
                title="Filtrar por Tags"
              >
                <Filter :size="16" />
                <span class="btn-label-desktop">Tags</span>
                <span v-if="filterTags.length > 0" class="filter-count-badge">{{ filterTags.length }}</span>
                <ChevronDown :size="14" class="chevron-icon" :class="{ rotated: isFilterDropdownOpen }" />
              </button>

              <!-- Menu Dropdown -->
              <div v-if="isFilterDropdownOpen" class="filter-dropdown-menu">
                <div class="dropdown-header">
                  <span>Filtrar Tags</span>
                  <button v-if="filterTags.length > 0" @click="filterTags = []" class="clear-filter-btn">
                    Limpar
                  </button>
                </div>
                <div class="dropdown-list">
                  <label 
                    v-for="tag in availableTags" 
                    :key="tag" 
                    class="dropdown-item"
                    :class="{ selected: filterTags.includes(tag) }"
                  >
                    <input 
                      type="checkbox" 
                      :value="tag"
                      v-model="filterTags"
                    />
                    <span class="tag-label">{{ tag }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="files-grid">
          <MediaPreviewCard
            v-for="file in filteredFiles"
            :key="file._id"
            :file="file"
            :selection-mode="false"
            @click="previewFile(file)"
          />
          
          <div v-if="filteredFiles.length === 0" class="empty-state">
            <p v-if="searchQuery || filterTags.length > 0">Nenhum arquivo encontrado com os filtros atuais.</p>
            <p v-else>Pasta vazia.</p>
          </div>
        </div>

        <!-- Paginação -->
        <div 
            v-if="store.currentFolderContent.pagination && store.currentFolderContent.pagination.totalPages > 1" 
            class="pagination-controls"
        >
            <button 
                class="pagination-btn" 
                :disabled="store.currentFolderContent.pagination.page === 1"
                @click="changePage(store.currentFolderContent.pagination.page - 1)"
            >
                Anterior
            </button>
            <span class="pagination-info">
                Página {{ store.currentFolderContent.pagination.page }} de {{ store.currentFolderContent.pagination.totalPages }}
            </span>
            <button 
                class="pagination-btn" 
                :disabled="store.currentFolderContent.pagination.page >= store.currentFolderContent.pagination.totalPages"
                @click="changePage(store.currentFolderContent.pagination.page + 1)"
            >
                Próxima
            </button>
        </div>

      </div>

    </div>

    <!-- Visualizador Rico -->
    <MediaViewerModal 
      :show="!!selectedFile"
      :file="selectedFile"
      @close="closePreview"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useGalleryStore } from '@/stores/gallery';
import MediaPreviewCard from './MediaPreviewCard.vue';
import MediaViewerModal from './MediaViewerModal.vue';
import { Search, X, Filter, ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  patientId: {
    type: String,
    required: true
  }
});

const store = useGalleryStore();
const selectedFile = ref(null);

// Filtering State
const searchQuery = ref('');
const filterTags = ref([]);
const isFilterDropdownOpen = ref(false);

onMounted(() => {
  store.fetchFolders(props.patientId);
  store.resetNavigation();
});

// Reset filters when navigating (changing folders)
watch(() => store.currentFolderContent.folder, () => {
    searchQuery.value = '';
    filterTags.value = [];
    isFilterDropdownOpen.value = false;
});

// Computed: Tags disponíveis nos arquivos da pasta atual
const availableTags = computed(() => {
  const tags = new Set();
  const files = store.currentFolderContent.files || [];
  files.forEach(file => {
    if (file.metadata?.tags) {
      file.metadata.tags.forEach(t => tags.add(t));
    }
  });
  return Array.from(tags).sort();
});

// Computed: Arquivos Filtrados
const filteredFiles = computed(() => {
  let files = store.currentFolderContent.files || [];
  const query = searchQuery.value.trim().toLowerCase();
  const activeTags = filterTags.value;

  // 1. Filtro por Texto (Tag ou Descrição ou Nome)
  if (query) {
    files = files.filter(file => {
      const description = file.metadata?.description?.toLowerCase() || '';
      const originalName = file.metadata?.originalName?.toLowerCase() || '';
      const tags = file.metadata?.tags?.map(t => t.toLowerCase()) || [];
      
      return description.includes(query) || 
             originalName.includes(query) ||
             tags.some(t => t.includes(query));
    });
  }

  // 2. Filtro por Tags Selecionadas
  if (activeTags.length > 0) {
    files = files.filter(file => {
       const fileTags = file.metadata?.tags || [];
       return fileTags.some(t => activeTags.includes(t));
    });
  }

  return files;
});


function navigate(crumb) {
  if (crumb.id === null) {
    store.resetNavigation();
    store.fetchFolders(props.patientId); // Refresh forces reset
  } else {
    // Se fosse suportar navegação aninhada mais profunda, aqui seria diferente. 
    // Como é só 1 nível, não fazer nada se clicar na pasta atual
  }
}

function openFolder(folderId) {
    // Se folderId for null (arquivos gerais), passar 'general' ou tratar na store
    const id = folderId || 'general';
    store.fetchFolderContent(props.patientId, id, 1);
}

function changePage(newPage) {
    if (!store.currentFolderContent.folder) return;
    
    // Identificar folderId atual (pode ser 'all', 'general' ou ID)
    let folderId = 'general';
    const folderType = store.currentFolderContent.folder.type;
    // Se folder.type for 'all', folderId='all'. Se null ('Arquivos Gerais'), folderId='general' (mas a store guarda folderinfo, não o ID direto).
    // O ID está no breadcrumb!
    
    // Melhor: store.breadcrumbs[1].id
    if (store.breadcrumbs.length > 1) {
        folderId = store.breadcrumbs[1].id;
    }
    
    store.fetchFolderContent(props.patientId, folderId, newPage);
}

function previewFile(file) {
  if (file.fileType === 'image') {
    selectedFile.value = file;
  } else {
    window.open(file.signedUrl, '_blank');
  }
}

function closePreview() {
  selectedFile.value = null;
}
</script>

<style scoped>
/* ... styles ... */

.media-gallery-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  background-color: #fff;
  border-radius: 8px;
  position: relative;
}


.gallery-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; 
}

.files-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Grids */
.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 2rem;
  justify-content: start;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  flex: 1;
  /* Internal scroll */
  overflow-y: auto;
  align-content: start;
  padding-right: 4px;
}

@media (max-width: 768px) {
  .files-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 0.75rem;
  }
}

/* Toolbar Styles */
.gallery-toolbar {
  display: flex;
  flex-direction: column; 
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  margin-top: auto; /* Push to bottom if space allows */
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
  background: white;
  
  /* Sticky fallback if internal scroll fails and container grows */
  position: sticky;
  bottom: 0;
  z-index: 10;
}

/* ... rest of styles ... */

.breadcrumbs {
  font-size: 1.1rem;
  font-weight: 500;
  color: #666;
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: #007bff;
}

.breadcrumb-item.active {
  color: #333;
  cursor: default;
  font-weight: 600;
}

.separator {
  margin: 0 0.5rem;
  color: #ccc;
}

.toolbar-main-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #9ca3af;
}

.gallery-header {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
}

/* Dropdown de Tags */
.filter-dropdown-container {
  position: relative;
}

.filter-count-badge {
  background: #3b82f6;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0 0.35rem;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-icon {
  transition: transform 0.2s ease;
  color: #9ca3af;
}
.chevron-icon.rotated {
  transform: rotate(180deg);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f9fafb;
}

.toolbar-btn.has-filters {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.filter-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 220px;
  z-index: 50;
  overflow: hidden;
  animation: fadeIn 0.1s ease-out;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f9fafb;
}

.clear-filter-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.dropdown-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.selected {
  background: #eff6ff;
}

.dropdown-item.selected .tag-label {
  color: #2563eb;
  font-weight: 500;
}

.dropdown-item input[type="checkbox"] {
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  background-color: white;
  margin: 0;
  cursor: pointer;
  display: grid;
  place-content: center;
}

.dropdown-item input[type="checkbox"]::before {
  content: "";
  width: 0.65rem;
  height: 0.65rem;
  transform: scale(0);
  transition: 0.1s transform ease-in-out;
  box-shadow: inset 1rem 1rem white;
  transform-origin: center;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  background-color: white;
}

.dropdown-item input[type="checkbox"]:checked {
  background-color: #2563eb;
  border-color: #2563eb;
}

.dropdown-item input[type="checkbox"]:checked::before {
  transform: scale(1);
}

.tag-label {
  font-size: 0.875rem;
  color: #374151;
  text-transform: capitalize;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scrollbar do dropdown */
.dropdown-list::-webkit-scrollbar {
  width: 4px;
}
.dropdown-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

/* Folder Card */
.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;
  text-align: center;
}

.folder-card:hover {
  background-color: #f5f5f7;
}

.folder-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}

.folder-info {
  display: flex;
  flex-direction: column;
}

.folder-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  word-break: break-word;
  max-width: 100%;
}

.folder-meta {
  font-size: 0.75rem;
  color: #888;
}
.folder-date {
    font-size: 0.7rem;
    color: #aaa;
}

/* Loading & Empty */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #888;
  width: 100%;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}
.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}</style>
