<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Folder,
  FolderPlus,
  Images,
  UploadCloud,
  Search,
  Check,
  X,
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import AppPagination from '@/components/global/AppPagination.vue'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
import folderIcon from '@/assets/imgs/folder-icon-macos.webp'
import AppDateRangePicker from '@/components/global/AppDateRangePicker.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import StyledMultiSelect from '@/components/global/StyledMultiSelect.vue'
import GalleryDialog from '@/components/global/GalleryDialog.vue'
import GalleryFolderSelect from '@/components/pages/patients/GalleryFolderSelect.vue'
import PhotoViewerUpload from '@/components/pages/appointments/PhotoViewerUpload.vue'
import MediaViewerModal from './MediaViewerModal.vue'
import {
  listGalleryFiles,
  listGalleryFolders,
  listGalleryTags,
  createGalleryFolder,
  renameGalleryFolder,
  deleteGalleryFolder,
  moveGalleryFiles,
  getGalleryItem,
  deleteGalleryFile,
  uploadPatientPhoto,
  galleryDateRange,
  galleryError,
} from '@/api/gallery'
import { visibleGalleryTags } from '@/utils/galleryTags'
import {
  applyGalleryDelivery,
  galleryImageCandidates,
  recoverGalleryImage,
  revokeGalleryObjectUrl,
} from '@/utils/galleryImage'
import { compressImage, MAX_IMAGE_BYTES, IMAGE_ACCEPT, isSupportedPhoto } from '@/utils/imageUpload'

const props = defineProps({
  patientId: { type: String, required: true },
  picker: Boolean,
  maxSelection: { type: Number, default: 40 },
  excludedIds: { type: Array, default: () => [] },
  submitting: Boolean,
})
const emit = defineEmits(['choose', 'cancel'])
const toast = useToast()
const files = ref([])
const folders = ref([])
const tags = ref([])
const view = ref('files')
const activeFolder = ref('')
const search = ref('')
const filterTags = ref([])
const fileType = ref('image')
const dateRange = ref(null)
const fileTypeOptions = [
  { value: 'image', label: 'Fotos' },
  { value: 'all', label: 'Todas as mídias' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Documentos' },
  { value: 'other', label: 'Outros' },
]
function localDate(date) {
  if (!date) return ''
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
const loading = ref(false)
const metadataLoading = ref(false)
const error = ref('')
const metadataError = ref('')
const busy = ref(false)
const selected = ref(new Map())
const selectionMode = ref(props.picker)
const pagination = ref({ total: 0, page: 1, limit: 20, totalPages: 1 })
const selectedFile = ref(null)
const previewBusy = ref(false)
const dragDepth = ref(0)
const fileInput = ref(null)
const pendingFiles = ref([])
const preparing = ref(false)
const uploadFolder = ref('')
const failedPhotos = ref([])
const failedFolder = ref('')
const folderDialog = ref(false)
const editingFolder = ref(null)
const folderName = ref('')
const dialogError = ref('')
const moveDialog = ref(false)
const moveTarget = ref('')
const confirmDialog = ref(null)
const imageErrors = ref(new Set())
const thumbSrc = ref({})
const thumbFailed = new Map()
const thumbBusy = new Set()
let controller
let requestId = 0
let metadataId = 0
let previewId = 0
let timer
let disposed = false
const locked = computed(() => busy.value || props.submitting)
const currentFolder = computed(() =>
  folders.value.find((folder) => folder._id === activeFolder.value),
)
const title = computed(() => currentFolder.value?.name || '')
const tagOptions = computed(() =>
  visibleGalleryTags(tags.value.map((tag) => tag.name)).map((tag) => ({ value: tag, label: tag })),
)
const imageFiles = computed(() => files.value.filter((file) => file.fileType === 'image'))

async function load(page = 1) {
  controller?.abort()
  controller = new AbortController()
  const current = ++requestId
  const patientId = props.patientId
  loading.value = true
  error.value = ''
  files.value = []
  imageErrors.value = new Set()
  for (const url of Object.values(thumbSrc.value)) revokeGalleryObjectUrl(url)
  thumbSrc.value = {}
  thumbFailed.clear()
  thumbBusy.clear()
  try {
    const result = await listGalleryFiles(
      patientId,
      {
        page,
        limit: 20,
        folderId: activeFolder.value || undefined,
        fileType: props.picker ? 'image' : fileType.value,
        search: search.value,
        tags: filterTags.value.join(','),
        ...galleryDateRange(localDate(dateRange.value?.[0]), localDate(dateRange.value?.[1])),
      },
      controller.signal,
    )
    if (current !== requestId || disposed || patientId !== props.patientId) return
    files.value = result.files
    pagination.value = result.pagination
    if (page > result.pagination.totalPages) return load(result.pagination.totalPages)
  } catch (cause) {
    if (current === requestId && !controller.signal.aborted && !disposed)
      error.value = galleryError(cause)
  } finally {
    if (current === requestId && !disposed) loading.value = false
  }
}
async function refreshMetadata() {
  const current = ++metadataId
  const patientId = props.patientId
  metadataLoading.value = true
  const results = await Promise.allSettled([
    listGalleryFolders(patientId),
    listGalleryTags(patientId),
  ])
  if (current !== metadataId || disposed || patientId !== props.patientId) return
  const targets = [folders, tags]
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') targets[index].value = result.value
  })
  metadataError.value = results.some((result) => result.status === 'rejected')
    ? 'Não foi possível carregar todas as pastas e filtros.'
    : ''
  metadataLoading.value = false
}
async function refresh() {
  await Promise.all([load(1), refreshMetadata()])
}
watch(
  () => props.patientId,
  () => {
    clearTimeout(timer)
    files.value = []
    folders.value = []
    tags.value = []
    selected.value = new Map()
    selectedFile.value = null
    previewId++
    activeFolder.value = ''
    view.value = 'files'
    search.value = ''
    filterTags.value = []
    dateRange.value = null
    pendingFiles.value = []
    preparing.value = false
    failedPhotos.value = []
    folderDialog.value = false
    moveDialog.value = false
    confirmDialog.value = null
    refresh()
  },
  { immediate: true },
)
watch([search, filterTags, fileType, dateRange], () => {
  clearTimeout(timer)
  timer = setTimeout(() => load(1), 250)
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
  controller?.abort()
  requestId++
  metadataId++
  previewId++
  for (const url of Object.values(thumbSrc.value)) revokeGalleryObjectUrl(url)
})

function navigate(nextView, folder = '') {
  if (locked.value) return
  view.value = nextView
  activeFolder.value = folder
  if (!props.picker) selected.value = new Map()
  clearTimeout(timer)
  load(1)
}
function toggle(file) {
  if (locked.value || props.excludedIds.includes(file._id)) return
  if (selected.value.has(file._id)) selected.value.delete(file._id)
  else {
    if (props.picker && selected.value.size >= props.maxSelection) {
      error.value = `Selecione até ${props.maxSelection} foto(s).`
      return
    }
    if (selected.value.size >= 100) {
      error.value = 'Selecione até 100 arquivos por vez.'
      return
    }
    selected.value.set(file._id, file)
  }
}
async function preview(file) {
  if (selectionMode.value || props.picker) {
    toggle(file)
    return
  }
  const current = ++previewId
  const patientId = props.patientId
  previewBusy.value = true
  error.value = ''
  try {
    const detail = await getGalleryItem(file._id)
    if (current !== previewId || patientId !== props.patientId || disposed) return
    if (detail.fileType === 'image') selectedFile.value = detail
    else window.open(detail.signedUrl, '_blank', 'noopener,noreferrer')
  } catch (cause) {
    if (current === previewId) error.value = galleryError(cause)
  } finally {
    if (current === previewId) previewBusy.value = false
  }
}
async function changePreview(direction) {
  const index = imageFiles.value.findIndex((file) => file._id === selectedFile.value?._id)
  const target = imageFiles.value[index + direction]
  if (target) await preview(target)
}
function openFolderDialog(folder = null) {
  editingFolder.value = folder
  folderName.value = folder?.name || ''
  dialogError.value = ''
  folderDialog.value = true
}
async function saveFolder() {
  if (locked.value) return
  busy.value = true
  dialogError.value = ''
  const patientId = props.patientId
  try {
    if (editingFolder.value)
      await renameGalleryFolder(patientId, editingFolder.value._id, folderName.value)
    else await createGalleryFolder(patientId, folderName.value)
    if (patientId === props.patientId) {
      folderDialog.value = false
      await refreshMetadata()
    }
    toast.success('Pasta salva.')
  } catch (cause) {
    dialogError.value = galleryError(cause)
  } finally {
    busy.value = false
  }
}
async function move() {
  if (locked.value) return
  busy.value = true
  dialogError.value = ''
  const patientId = props.patientId
  try {
    await moveGalleryFiles(patientId, [...selected.value.keys()], moveTarget.value)
    if (patientId === props.patientId) {
      moveDialog.value = false
      selected.value = new Map()
      await refresh()
    }
    toast.success('Arquivos movidos.')
  } catch (cause) {
    dialogError.value = galleryError(cause)
  } finally {
    busy.value = false
  }
}
async function confirmRemoval() {
  if (locked.value) return
  busy.value = true
  dialogError.value = ''
  const patientId = props.patientId
  const action = confirmDialog.value
  try {
    if (action.folder) {
      await deleteGalleryFolder(patientId, action.folder._id)
      if (activeFolder.value === action.folder._id) {
        activeFolder.value = ''
        view.value = 'folders'
      }
      toast.success('Pasta excluída. As fotos continuam em Todas as fotos.')
    } else {
      const failures = []
      for (const id of action.ids) {
        try {
          await deleteGalleryFile(id)
          selected.value.delete(id)
        } catch (cause) {
          failures.push(galleryError(cause))
        }
      }
      if (failures.length)
        throw new Error(
          `${action.ids.length - failures.length} excluído(s); ${failures.length} preservado(s). ${failures[0]}`,
        )
      toast.success('Arquivos excluídos.')
    }
    confirmDialog.value = null
  } catch (cause) {
    dialogError.value = galleryError(cause)
  } finally {
    if (patientId === props.patientId) await refresh()
    busy.value = false
  }
}

function prepare(list) {
  if (locked.value || preparing.value || props.picker) return
  const images = Array.from(list || [])
  error.value = ''
  if (!images.length) return
  if (images.length > 100 || images.some((file) => !isSupportedPhoto(file))) {
    error.value = 'Selecione até 100 fotos PNG, JPG ou WEBP por envio.'
    return
  }
  uploadFolder.value = currentFolder.value?._id || ''
  pendingFiles.value = images
  preparing.value = true
}
function selectFiles(event) {
  prepare(event.target.files)
  event.target.value = ''
}
function drop(event) {
  dragDepth.value = 0
  prepare(event.dataTransfer?.files)
}
async function upload(photos, destination = uploadFolder.value) {
  if (locked.value || !photos?.length) return
  busy.value = true
  preparing.value = false
  pendingFiles.value = []
  const patientId = props.patientId
  const failed = []
  const notification = toast.upload({ title: 'Enviando fotos', progress: 0 })
  try {
    for (const [index, photo] of photos.entries()) {
      try {
        if (!isSupportedPhoto(photo.file)) throw new Error('Use fotos PNG, JPG ou WEBP.')
        let file = photo.file
        notification.update({
          fileName: file.name,
          description: `${index + 1} de ${photos.length}`,
          progress: (index / photos.length) * 100,
        })
        if (file.size > MAX_IMAGE_BYTES) {
          notification.update({ description: 'Comprimindo imagem…', progress: null })
          file = await compressImage(file)
        }
        await uploadPatientPhoto(patientId, { ...photo, file }, destination, (event) => {
          const fraction = event.total > 0 ? event.loaded / event.total : event.progress
          notification.update({
            progress: Number.isFinite(fraction)
              ? Math.min(99, ((index + fraction) / photos.length) * 100)
              : null,
            description: fraction >= 1 ? 'Salvando arquivo…' : `${index + 1} de ${photos.length}`,
          })
        })
      } catch (cause) {
        failed.push({ ...photo, error: galleryError(cause) })
      }
    }
    if (failed.length)
      notification.error(
        'Envio incompleto',
        `${photos.length - failed.length} enviada(s), ${failed.length} com falha. ${failed[0].error}`,
      )
    else notification.success('Fotos adicionadas', `${photos.length} foto(s) salva(s) na galeria.`)
    if (patientId === props.patientId && !disposed) {
      failedPhotos.value = failed
      failedFolder.value = destination
      await refresh()
    }
  } finally {
    busy.value = false
  }
}
function thumbnailSrc(file) {
  return thumbSrc.value[file._id] || galleryImageCandidates(file, 'thumb')[0] || ''
}
function replaceImageErrors(mutator) {
  const next = new Set(imageErrors.value)
  mutator(next)
  imageErrors.value = next
}
async function thumbnailError(file, event) {
  if (!file?._id || thumbBusy.has(file._id)) return
  const current = thumbnailSrc(file)
  const attribute = event?.target?.getAttribute?.('src')
  if (attribute && attribute !== current) return
  const failed = thumbFailed.get(file._id) || new Set()
  thumbFailed.set(file._id, failed)
  if (current) failed.add(current)
  const patientId = props.patientId
  thumbBusy.add(file._id)
  try {
    const result = await recoverGalleryImage({
      file,
      failed,
      prefer: 'thumb',
      refresh: () => getGalleryItem(file._id),
    })
    if (disposed || patientId !== props.patientId) {
      revokeGalleryObjectUrl(result?.url)
      return
    }
    if (result?.file) applyGalleryDelivery(file, result.file, file.createdAt)
    if (result?.url) {
      revokeGalleryObjectUrl(thumbSrc.value[file._id])
      thumbSrc.value = { ...thumbSrc.value, [file._id]: result.url }
      replaceImageErrors((next) => next.delete(file._id))
      return
    }
    if (result?.error) error.value = galleryError(result.error)
    replaceImageErrors((next) => next.add(file._id))
  } finally {
    thumbBusy.delete(file._id)
  }
}
async function renewThumbnail(file) {
  const patientId = props.patientId
  thumbFailed.set(file._id, new Set())
  try {
    const fresh = await getGalleryItem(file._id)
    if (patientId !== props.patientId || disposed) return
    const createdAt = file.createdAt
    Object.assign(file, fresh, { createdAt: createdAt || fresh?.createdAt })
    revokeGalleryObjectUrl(thumbSrc.value[file._id])
    const next = { ...thumbSrc.value }
    delete next[file._id]
    thumbSrc.value = next
    replaceImageErrors((errors) => errors.delete(file._id))
  } catch (cause) {
    if (patientId === props.patientId) error.value = galleryError(cause)
  }
}
</script>

<template>
  <section
    class="patient-gallery"
    :class="{ dragging: dragDepth > 0, picker }"
    :aria-busy="loading || busy"
    @dragenter.prevent="
      !locked && !picker && $event.dataTransfer?.types?.includes('Files') && dragDepth++
    "
    @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
    @dragover.prevent
    @drop.prevent.stop="drop"
  >
    <div v-if="dragDepth > 0 && !picker" class="drop-zone">
      <UploadCloud :size="36" /><strong>Solte as fotos para adicionar</strong
      ><span>PNG, JPG ou WEBP</span>
    </div>
    <header class="gallery-heading">
      <div>
        <div class="eyebrow">{{ picker ? 'GALERIA DO PACIENTE' : 'ARQUIVOS DO PACIENTE' }}</div>
        <h2>{{ picker ? 'Escolha as fotos do atendimento' : 'Galeria' }}</h2>
        <p>
          {{
            picker
              ? 'Selecione fotos existentes para anexar ao atendimento.'
              : 'Fotos, evolução e documentos em um só lugar.'
          }}
        </p>
      </div>
      <div v-if="!picker" class="heading-actions">
        <button class="btn" :disabled="locked" @click="openFolderDialog()">
          <FolderPlus :size="17" />Nova pasta</button
        ><button class="btn primary" :disabled="locked || preparing" @click="fileInput.click()">
          <UploadCloud :size="17" />{{ busy ? 'Aguarde…' : 'Adicionar fotos' }}
        </button>
      </div>
    </header>

    <nav class="gallery-tabs" aria-label="Visualiza&#231;&#245;es da galeria">
      <button :class="{ active: view === 'files' }" :disabled="locked" @click="navigate('files')">
        <Images :size="16" />Todas as fotos
      </button>
      <button
        :class="{ active: view === 'folders' }"
        :disabled="locked"
        @click="navigate('folders')"
      >
        <Folder :size="16" />Minhas pastas <span>{{ folders.length }}</span>
      </button>
    </nav>

    <div v-if="metadataError" class="feedback" role="alert">
      {{ metadataError }} <button @click="refreshMetadata">Tentar novamente</button>
    </div>
    <div v-if="failedPhotos.length && !picker" class="feedback" role="alert">
      <div>
        <strong>{{ failedPhotos.length }} foto(s) não foram enviadas.</strong>
        <p>{{ failedPhotos[0].error }}</p>
      </div>
      <button class="btn" :disabled="locked" @click="upload(failedPhotos, failedFolder)">
        Reenviar com falha</button
      ><button
        class="icon-btn"
        aria-label="Dispensar falhas"
        :disabled="locked"
        @click="failedPhotos = []"
      >
        <X :size="16" />
      </button>
    </div>

    <div v-if="currentFolder" class="section-heading">
      <div class="section-title">
        <button
          v-if="currentFolder"
          class="icon-btn"
          aria-label="Voltar"
          :disabled="locked"
          @click="navigate('folders')"
        >
          <ArrowLeft :size="18" />
        </button>
        <h3>{{ title }}</h3>
      </div>
    </div>

    <div v-if="view === 'folders' && !activeFolder" class="folder-grid">
      <AppDropdownActions
        v-for="folder in folders"
        :key="folder._id"
        context-menu
        :disabled="locked || picker"
        class="folder-actions"
      >
        <template #trigger>
          <article class="folder-card">
            <button class="folder-open" :disabled="locked" @click="navigate('folders', folder._id)">
              <div class="folder-art"><img :src="folderIcon" alt="" class="folder-icon" /></div>
              <strong>{{ folder.name }}</strong>
              <span
                >{{ folder.fileCount }} {{ folder.fileCount === 1 ? 'arquivo' : 'arquivos' }}</span
              >
            </button>
          </article>
        </template>
        <template #default="{ close }">
          <button
            type="button"
            role="menuitem"
            class="dropdown-item"
            :aria-label="'Renomear ' + folder.name"
            @click="
              () => {
                close()
                openFolderDialog(folder)
              }
            "
          >
            <Pencil :size="16" />Renomear
          </button>
          <button
            type="button"
            role="menuitem"
            class="dropdown-item delete"
            :aria-label="'Excluir pasta ' + folder.name"
            @click="
              () => {
                close()
                dialogError = ''
                confirmDialog = { folder }
              }
            "
          >
            <Trash2 :size="16" />Excluir pasta
          </button>
        </template>
      </AppDropdownActions>
      <div v-if="!folders.length" class="empty-gallery">
        <FolderPlus :size="42" />
        <h4>{{ metadataLoading ? 'Carregando pastas…' : 'Organize as fotos em pastas' }}</h4>
        <p>
          {{
            picker
              ? 'Este paciente ainda não tem pastas personalizadas.'
              : 'Crie pastas para tratamentos, antes e depois ou evolução.'
          }}
        </p>
        <button v-if="!picker" class="btn" :disabled="locked" @click="openFolderDialog()">
          Criar primeira pasta
        </button>
      </div>
    </div>
    <template v-else>
      <div class="gallery-filters">
        <label class="search-field"
          ><Search :size="17" /><input
            v-model="search"
            type="search"
            placeholder="Buscar nome, descrição ou tag"
            aria-label="Buscar arquivos" /></label
        ><StyledSelect
          v-if="!picker"
          v-model="fileType"
          class="type-filter"
          :options="fileTypeOptions"
          placeholder="Tipo de arquivo"
          :disabled="locked"
        /><StyledMultiSelect
          v-if="tagOptions.length"
          v-model="filterTags"
          class="tags-filter"
          :options="tagOptions"
          placeholder="Tags"
        /><AppDateRangePicker
          v-model="dateRange"
          class="period-picker"
          clearable
          :disabled="locked"
        /><button
          v-if="!picker"
          class="btn select-btn"
          :class="{ selected: selectionMode }"
          :disabled="locked"
          @click="
            () => {
              selectionMode = !selectionMode
              selected = new Map()
            }
          "
        >
          {{ selectionMode ? 'Cancelar seleção' : 'Selecionar' }}
        </button>
      </div>

      <div v-if="selected.size && !picker" class="selection-bar">
        <strong>{{ selected.size }} selecionado(s)</strong>
        <div>
          <button
            class="btn"
            :disabled="locked"
            @click="
              () => {
                moveTarget = ''
                dialogError = ''
                moveDialog = true
              }
            "
          >
            <Folder :size="15" />Mover para pasta</button
          ><button
            class="btn danger"
            :disabled="locked"
            @click="
              () => {
                dialogError = ''
                confirmDialog = { ids: [...selected.keys()] }
              }
            "
          >
            <Trash2 :size="15" />Excluir arquivos
          </button>
        </div>
      </div>
      <div v-if="error" class="feedback" role="alert">
        {{ error
        }}<button class="btn" :disabled="locked" @click="load(pagination.page)">
          Tentar novamente
        </button>
      </div>
      <div v-if="loading" class="gallery-loading" role="status">
        <Loader2 :size="24" class="spin" />Carregando arquivos…
      </div>
      <div v-else-if="!files.length && !error" class="empty-gallery">
        <Images :size="46" />
        <h4>
          {{
            search || filterTags.length || dateRange
              ? 'Nenhum resultado encontrado'
              : currentFolder
                ? 'Esta pasta está vazia'
                : 'Nenhum arquivo por aqui'
          }}
        </h4>
        <p>
          {{
            search || filterTags.length || from || to
              ? 'Ajuste os filtros para encontrar outros arquivos.'
              : picker
                ? 'Adicione fotos ao paciente para selecioná-las aqui.'
                : 'Adicione fotos para começar a acompanhar a evolução do paciente.'
          }}
        </p>
        <button
          v-if="!picker && !search"
          class="btn primary"
          :disabled="locked"
          @click="fileInput.click()"
        >
          Adicionar fotos
        </button>
      </div>
      <div v-else class="media-grid">
        <article
          v-for="file in files"
          :key="file._id"
          class="media-card"
          :class="{ chosen: selected.has(file._id), excluded: excludedIds.includes(file._id) }"
        >
          <button
            class="media-open"
            :disabled="locked || previewBusy || excludedIds.includes(file._id)"
            :aria-label="`${selectionMode || picker ? 'Selecionar' : 'Abrir'} ${file.metadata?.originalName || 'arquivo'}`"
            :aria-pressed="selectionMode || picker ? selected.has(file._id) : undefined"
            @click="preview(file)"
          >
            <div class="media-image">
              <span v-if="selectionMode || picker" class="check-circle"
                ><Check
                  v-if="selected.has(file._id) || excludedIds.includes(file._id)"
                  :size="14" /></span
              ><template v-if="file.fileType === 'image'"
                ><img
                  v-if="!imageErrors.has(file._id)"
                  :src="thumbnailSrc(file)"
                  :alt="
                    file.metadata?.description || file.metadata?.originalName || 'Foto do paciente'
                  "
                  loading="lazy"
                  decoding="async"
                  @error="thumbnailError(file, $event)"
                /><span v-else class="image-unavailable">Imagem indisponível</span></template
              ><FileText v-else :size="38" /><span
                v-if="excludedIds.includes(file._id)"
                class="origin-chip"
                >Já anexada</span
              ><span v-else-if="file.appointment" class="origin-chip">Foto de atendimento</span>
            </div>
            <div class="media-info">
              <strong :title="file.metadata?.originalName">{{
                file.metadata?.description || file.metadata?.originalName || 'Arquivo'
              }}</strong
              ><span>{{ new Date(file.createdAt).toLocaleDateString('pt-BR') }}</span>
              <div v-if="visibleGalleryTags(file.metadata?.tags).length" class="file-tags">
                <span
                  v-for="tag in visibleGalleryTags(file.metadata.tags).slice(0, 2)"
                  :key="tag"
                  >{{ tag }}</span
                >
              </div>
            </div></button
          ><button
            v-if="imageErrors.has(file._id)"
            class="renew-image"
            @click="renewThumbnail(file)"
          >
            Recarregar imagem
          </button>
        </article>
      </div>
      <AppPagination
        v-if="!loading && pagination.totalPages > 1"
        :current-page="pagination.page"
        :total-pages="pagination.totalPages"
        :total-items="pagination.total"
        :limit="pagination.limit"
        :show-page-jump="false"
        @page-change="load"
      />
    </template>

    <footer v-if="picker" class="picker-footer">
      <span>{{ selected.size }} de {{ maxSelection }} foto(s) selecionada(s)</span>
      <div>
        <button class="btn" :disabled="locked" @click="emit('cancel')">Cancelar</button
        ><button
          class="btn primary"
          :disabled="locked || !selected.size"
          @click="emit('choose', [...selected.keys()])"
        >
          {{ submitting ? 'Anexando…' : `Anexar ${selected.size || ''} foto(s)` }}
        </button>
      </div>
    </footer>
    <input
      ref="fileInput"
      type="file"
      :accept="IMAGE_ACCEPT"
      multiple
      hidden
      @change="selectFiles"
    />
    <PhotoViewerUpload
      :visible="preparing"
      :files="pendingFiles"
      :max-attachments="100"
      @close="
        () => {
          preparing = false
          pendingFiles = []
        }
      "
      @upload="upload"
      ><template #destination
        ><div class="upload-destination">
          <GalleryFolderSelect
            v-model="uploadFolder"
            :patient-id="patientId"
            dark
            @created="refreshMetadata"
          /></div></template
    ></PhotoViewerUpload>
    <MediaViewerModal
      :show="!!selectedFile"
      :file="selectedFile"
      :has-previous="imageFiles.findIndex((file) => file._id === selectedFile?._id) > 0"
      :has-next="
        imageFiles.findIndex((file) => file._id === selectedFile?._id) < imageFiles.length - 1
      "
      @previous="changePreview(-1)"
      @next="changePreview(1)"
      @close="
        () => {
          selectedFile = null
          previewId++
        }
      "
    />
    <GalleryDialog
      :open="folderDialog"
      :title="editingFolder ? 'Renomear pasta' : 'Nova pasta'"
      :busy="busy"
      @close="folderDialog = false"
      ><form class="gallery-form" @submit.prevent="saveFolder">
        <label
          >Nome da pasta<input
            v-model="folderName"
            autofocus
            required
            maxlength="80"
            placeholder="Ex.: Tratamento facial"
        /></label>
        <p v-if="dialogError" class="form-error" role="alert">{{ dialogError }}</p>
        <div class="form-actions">
          <button type="button" class="btn" :disabled="busy" @click="folderDialog = false">
            Cancelar</button
          ><button class="btn primary" :disabled="busy || !folderName.trim()">
            {{ busy ? 'Salvando…' : 'Salvar pasta' }}
          </button>
        </div>
      </form></GalleryDialog
    >
    <GalleryDialog
      :open="moveDialog"
      title="Mover arquivos para pasta"
      :busy="busy"
      @close="moveDialog = false"
      ><form class="gallery-form" @submit.prevent="move">
        <p>{{ selected.size }} arquivo(s) selecionado(s).</p>
        <GalleryFolderSelect
          v-model="moveTarget"
          :patient-id="patientId"
          :disabled="busy"
          @created="refreshMetadata"
        />
        <p v-if="dialogError" class="form-error" role="alert">{{ dialogError }}</p>
        <div class="form-actions">
          <button type="button" class="btn" :disabled="busy" @click="moveDialog = false">
            Cancelar</button
          ><button class="btn primary" :disabled="busy">
            {{ busy ? 'Movendo…' : 'Mover arquivos' }}
          </button>
        </div>
      </form></GalleryDialog
    >
    <GalleryDialog
      :open="!!confirmDialog"
      :title="confirmDialog?.folder ? 'Excluir pasta' : 'Excluir arquivos'"
      :busy="busy"
      @close="confirmDialog = null"
      ><div class="gallery-form">
        <p>
          {{
            confirmDialog?.folder
              ? `Excluir a pasta “${confirmDialog.folder.name}”? Os arquivos continuarão disponíveis em Todas as fotos.`
              : 'Excluir os arquivos selecionados definitivamente? Arquivos vinculados a prontuários serão preservados.'
          }}
        </p>
        <p v-if="dialogError" class="form-error" role="alert">{{ dialogError }}</p>
        <div class="form-actions">
          <button class="btn" :disabled="busy" @click="confirmDialog = null">Cancelar</button
          ><button class="btn danger" :disabled="busy" @click="confirmRemoval">
            {{ busy ? 'Excluindo…' : 'Confirmar exclusão' }}
          </button>
        </div>
      </div></GalleryDialog
    >
  </section>
</template>

<style scoped>
.patient-gallery {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-width: 0;
  min-height: 360px;
  color: #1e293b;
  background: #fff;
  border-radius: 12px;
}
.gallery-heading,
.section-heading,
.section-title,
.heading-actions,
.selection-bar,
.selection-bar > div,
.picker-footer,
.picker-footer > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gallery-heading,
.section-heading,
.selection-bar,
.picker-footer {
  justify-content: space-between;
  flex-wrap: wrap;
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.03em;
}
.gallery-heading p {
  margin: 5px 0 0;
  font-size: 13px;
  color: #64748b;
}
h3 {
  margin: 0;
  font-size: 16px;
}
.file-count {
  color: #94a3b8;
  font-size: 12px;
}
.btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn:hover,
.icon-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.btn.primary {
  background: var(--azul-principal, #2563eb);
  border-color: var(--azul-principal, #2563eb);
  color: #fff;
}
.btn.danger,
.icon-btn.danger {
  color: #b91c1c;
}
.btn.selected {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
.icon-btn {
  padding: 8px;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--azul-principal, #2563eb);
  outline-offset: 2px;
}
.gallery-tabs {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}
.gallery-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 9px 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}
.gallery-tabs button.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}
.gallery-tabs span {
  background: #e2e8f0;
  color: #64748b;
  border-radius: 4px;
  padding: 0 5px;
  font-size: 10px;
}
.gallery-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 180px;
  height: 40px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  padding: 0 0.875rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  color: #94a3b8;
}
.search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  height: 100%;
  padding: 0;
  font-size: 12px;
  background: transparent;
}
.search-field input:focus-visible {
  outline: none;
}
.search-field:focus-within {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 131, 246, 0.1);
}
.select-btn {
  height: 40px;
  box-sizing: border-box;
  border-radius: 0.75rem;
  border-color: #d1d5db;
  padding: 0 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.type-filter {
  width: 150px;
  margin: 0;
}
.type-filter :deep(.select-button),
.tags-filter :deep(.select-button) {
  min-height: 40px;
  font-size: 12px;
}
.period-picker {
  flex-shrink: 0;
}
.tags-filter {
  width: 140px;
  margin: 0;
}
.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 14px;
}
.folder-card {
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
  overflow: hidden;
  background: #fff;
}
.folder-open {
  display: grid;
  width: 100%;
  padding: 14px;
  text-align: left;
  gap: 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.folder-art {
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
  margin-bottom: 4px;
  overflow: hidden;
}
.folder-art img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}
.folder-open strong {
  font-size: 13px;
  overflow-wrap: anywhere;
  padding-right: 15px;
}
.folder-open > span,
.appointment-card > span {
  font-size: 11px;
  color: #94a3b8;
}
.folder-actions {
  display: block;
  min-width: 0;
}
.appointment-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 18px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}
.appointment-card svg {
  color: #60a5fa;
}
.appointment-card strong {
  font-size: 13px;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 14px;
  align-content: start;
}
.media-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}
.media-card.chosen {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}
.media-card.excluded {
  opacity: 0.6;
}
.media-open {
  width: 100%;
  display: block;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.media-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1.15;
  background: #f1f5f9;
  overflow: hidden;
  color: #94a3b8;
}
.media-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.media-open:hover img {
  transform: scale(1.03);
}
.media-info {
  display: grid;
  gap: 5px;
  padding: 10px 12px;
}
.media-info > strong {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.media-info > span {
  color: #94a3b8;
  font-size: 11px;
}
.origin-chip {
  position: absolute;
  bottom: 8px;
  left: 8px;
  max-width: calc(100% - 16px);
  padding: 4px 7px;
  background: #fffffff0;
  border-radius: 4px;
  color: #475569;
  font-size: 9px;
}
.check-circle {
  position: absolute;
  top: 9px;
  left: 9px;
  width: 21px;
  height: 21px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: white;
  display: grid;
  place-items: center;
  z-index: 1;
}
.chosen .check-circle {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}
.file-tags {
  display: flex;
  gap: 4px;
  overflow: hidden;
}
.file-tags span {
  font-size: 9px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
.image-unavailable {
  font-size: 12px;
}
.renew-image {
  display: block;
  width: 100%;
  border: 0;
  background: #eff6ff;
  padding: 7px;
  color: #1d4ed8;
  font-size: 11px;
  cursor: pointer;
}
.empty-gallery {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 230px;
  padding: 24px;
  color: #93b4dd;
  text-align: center;
}
.empty-gallery h4 {
  margin: 16px 0 6px;
  color: #475569;
  font-size: 15px;
}
.empty-gallery p {
  color: #94a3b8;
  font-size: 12px;
  margin: 0 0 16px;
  max-width: 330px;
}
.gallery-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 230px;
  color: #64748b;
  font-size: 13px;
}
.selection-bar {
  padding: 12px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  font-size: 12px;
  color: #1e40af;
}
.feedback {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: 12px;
}
.feedback p {
  margin: 4px 0 0;
}
.feedback > button:not(.btn):not(.icon-btn) {
  color: inherit;
  text-decoration: underline;
  background: none;
  border: 0;
  cursor: pointer;
}
.picker-footer {
  position: sticky;
  bottom: -22px;
  margin-top: auto;
  background: #fff;
  padding: 16px 0 0;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
  z-index: 2;
}
.picker {
  padding: 0;
}
.picker h2 {
  font-size: 20px;
}
.drop-zone {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: #eff6fff5;
  border: 2px dashed #60a5fa;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #2563eb;
  pointer-events: none;
}
.drop-zone span {
  font-size: 12px;
}
.upload-destination {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ffffff1a;
}
.gallery-form {
  display: grid;
  gap: 18px;
  font-size: 14px;
  color: #475569;
}
.gallery-form p {
  margin: 0;
  line-height: 1.6;
}
.gallery-form label {
  display: grid;
  gap: 7px;
  font-size: 13px;
}
.gallery-form input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.form-error {
  color: #b91c1c;
  font-size: 13px;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 769px) {
  .patient-gallery:not(.picker) {
    height: 100%;
    overflow-y: auto;
  }
}
@media (max-width: 640px) {
  .patient-gallery {
    padding: 14px;
    gap: 16px;
  }
  .picker {
    padding: 0;
  }
  .gallery-heading {
    align-items: flex-start;
  }
  .gallery-heading > div:first-child {
    width: 100%;
  }
  .heading-actions {
    flex-wrap: wrap;
  }
  .gallery-tabs {
    gap: 0;
  }
  .gallery-tabs button {
    padding: 8px 9px;
    font-size: 11px;
  }
  .media-grid,
  .folder-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .search-field {
    flex-basis: 100%;
  }
  .type-filter,
  .tags-filter {
    flex: 1;
    min-width: 120px;
  }
  .period-picker {
    flex-basis: 100%;
  }
  .select-btn {
    margin-left: auto;
  }
  .selection-bar > div {
    flex-wrap: wrap;
  }
  .picker-footer {
    bottom: -14px;
    gap: 10px;
  }
  .picker-footer > div {
    width: 100%;
    justify-content: flex-end;
  }
  .section-title {
    flex-wrap: wrap;
  }
  .media-info {
    padding: 9px;
  }
}
</style>
