<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { getCloudinaryUrl } from '@/helpers/cloudinary'
import { Folder, Image as ImageIcon, ChevronLeft, Calendar } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
})

const recordsStore = useRecordsStore()
const toast = useToast()

const isLoading = ref(false)
const rawRecords = ref([])
const viewMode = ref('root') // 'root' | 'folders' | 'images'
const activeFolder = ref(null) // 'dateString'

// Fetch records on mount
onMounted(async () => {
    await fetchMedia()
})

async function fetchMedia() {
    isLoading.value = true
    const { success, data } = await recordsStore.fetchRecordsByPatient(props.patientId)
    if (success && data && data.data) {
        rawRecords.value = data.data
    } else {
        toast.error("Erro ao carregar mídias.")
    }
    isLoading.value = false
}

// Group attachments by Appointment Date
const groupedMedia = computed(() => {
    const groups = {}

    // Helper to add image to a group
    const addImageToGroup = (dateKey, attachment, recordId) => {
        if (!groups[dateKey]) {
            groups[dateKey] = []
        }
        groups[dateKey].push({
            ...attachment,
            recordId // keep track of source record
        })
    }

    rawRecords.value.forEach(record => {
        if (record.attachments && record.attachments.length > 0) {
            let dateKey = 'Sem Data'
            if (record.appointment && record.appointment.startTime) {
                const date = new Date(record.appointment.startTime)
                dateKey = date.toLocaleDateString('pt-BR') // DD/MM/YYYY
            } else {
                 const date = new Date(record.createdAt)
                 dateKey = date.toLocaleDateString('pt-BR') // Fallback to record creation date
            }

            record.attachments.forEach(att => addImageToGroup(dateKey, att, record._id))
        }
    })

    // Sort dates descending (newest first)
    // Convert DD/MM/YYYY to comparable format
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === 'Sem Data') return 1
        if (b === 'Sem Data') return -1
        const [dayA, monthA, yearA] = a.split('/').map(Number)
        const [dayB, monthB, yearB] = b.split('/').map(Number)
        return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA)
    })

    const sortedGroups = []
    sortedKeys.forEach(key => {
        sortedGroups.push({
            date: key,
            images: groups[key]
        })
    })

    return sortedGroups
})

// Current images to display based on selection
const currentImages = computed(() => {
    if (!activeFolder.value) return []
    const folder = groupedMedia.value.find(g => g.date === activeFolder.value)
    return folder ? folder.images : []
})

// Image Viewer State
const selectedImage = ref(null)
function openImageViewer(url) {
    selectedImage.value = url
}
function closeImageViewer() {
    selectedImage.value = null
}

function handleOpenProntuarios() {
    viewMode.value = 'folders'
}

function handleOpenFolder(date) {
    activeFolder.value = date
    viewMode.value = 'images'
}

function handleBack() {
    if (viewMode.value === 'images') {
        viewMode.value = 'folders'
        activeFolder.value = null
    } else if (viewMode.value === 'folders') {
        viewMode.value = 'root'
    }
}
</script>

<template>
    <div class="media-tab-container">
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
            Carregando mídia...
        </div>

        <!-- ROOT VIEW: Shows "Prontuários" folder -->
        <div v-else-if="viewMode === 'root'" class="folders-grid-view">
             <div 
                v-if="groupedMedia.length > 0"
                class="folder-card"
                @click="handleOpenProntuarios"
            >
                <div class="folder-icon-wrapper">
                    <Folder :size="40" class="folder-icon" />
                    <span class="badge">{{ groupedMedia.length }}</span>
                </div>
                <div class="folder-info">
                    <span class="folder-name">Prontuários</span>
                    <span class="folder-subtitle">Ver atendimentos</span>
                </div>
            </div>
             <div v-else class="empty-state">
                <ImageIcon :size="48" class="text-gray-300 mb-4" />
                <p class="text-gray-500">Nenhuma mídia encontrada.</p>
            </div>
        </div>

        <!-- FOLDERS VIEW: List of dates -->
        <div v-else-if="viewMode === 'folders'" class="view-container">
            <header class="folder-header">
                <button @click="handleBack" class="back-btn">
                    <ChevronLeft :size="20" />
                    Voltar
                </button>
                <h3>Prontuários</h3>
            </header>

            <div class="folders-grid-view">
                <div 
                    v-for="group in groupedMedia" 
                    :key="group.date" 
                    class="folder-card"
                    @click="handleOpenFolder(group.date)"
                >
                    <div class="folder-icon-wrapper">
                        <Folder :size="40" class="folder-icon" />
                        <span class="badge">{{ group.images.length }}</span>
                    </div>
                    <div class="folder-info">
                        <span class="folder-name">{{ group.date }}</span>
                        <span class="folder-subtitle">{{ group.images.length }} foto(s)</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- IMAGES VIEW: Images inside a date folder -->
        <div v-else-if="viewMode === 'images'" class="images-view">
            <header class="folder-header">
                <button @click="handleBack" class="back-btn">
                    <ChevronLeft :size="20" />
                    Voltar
                </button>
                <h3><Calendar :size="18"/> {{ activeFolder }}</h3>
            </header>

            <div v-if="currentImages.length > 0" class="images-grid">
                <div 
                    v-for="img in currentImages" 
                    :key="img._id" 
                    class="media-card"
                    @click="openImageViewer(img.url)"
                >
                    <img 
                        :src="getCloudinaryUrl(img.url, { width: 300, height: 300, crop: 'fill' })" 
                        alt="Mídia do paciente"
                        loading="lazy"
                    />
                </div>
            </div>
            <div v-else class="empty-folder">
                <p>Esta pasta está vazia.</p>
            </div>
        </div>

        <!-- Fullscreen Viewer -->
        <div v-if="selectedImage" class="fullscreen-viewer" @click="closeImageViewer">
            <img :src="selectedImage" alt="Fullscreen" />
        </div>
    </div>
</template>

<style scoped>
.media-tab-container {
    padding: 1.5rem;
    min-height: 300px;
}

.loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #6b7280;
}

/* FOLDERS GRID */
.folders-grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1.5rem;
}

.folder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: #f9fafb;
    border: 1px solid transparent;
}

.folder-card:hover {
    transform: translateY(-2px);
    background-color: #f3f4f6;
    border-color: #e5e7eb;
}

.folder-icon-wrapper {
    position: relative;
    margin-bottom: 0.75rem;
    color: var(--azul-principal); /* Amber-400 folder color */
}

.folder-icon {
    fill: currentColor;
    fill-opacity: 0.2;
}

.badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background-color: #ef4444;
    color: white;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 0.1rem 0.4rem;
    border-radius: 9999px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.folder-info {
    display: flex;
    flex-direction: column;
}

.folder-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.95rem;
}

.folder-subtitle {
    font-size: 0.75rem;
    color: #9ca3af;
}

/* IMAGES VIEW */
.folder-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
}

.back-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #4b5563;
    font-weight: 500;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background 0.2s;
}

.back-btn:hover {
    background-color: #f3f4f6;
}

.folder-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--azul-principal);
}

.images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
}

.media-card {
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: opacity 0.2s;
}

.media-card:hover {
    opacity: 0.9;
}

.media-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* FULLSCREEN VIEWER */
.fullscreen-viewer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0,0,0,0.9);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
}

.fullscreen-viewer img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}
</style>
