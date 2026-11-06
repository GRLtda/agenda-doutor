<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FolderPlus } from 'lucide-vue-next'
import { listGalleryFolders, createGalleryFolder, galleryError } from '@/api/gallery'
import GalleryDialog from '@/components/global/GalleryDialog.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const props = defineProps({
  patientId: { type: String, required: true },
  modelValue: { type: String, default: '' },
  disabled: Boolean,
  dark: Boolean,
  label: { type: String, default: 'Pasta de destino' },
})
const emit = defineEmits(['update:modelValue', 'created'])
const folders = ref([])
const loading = ref(false)
const error = ref('')
const creating = ref(false)
const saving = ref(false)
const name = ref('')
const options = computed(() => [
  { value: '', label: 'Sem pasta' },
  ...folders.value.map((folder) => ({ value: folder._id, label: folder.name })),
])
let revision = 0
async function load() {
  const current = ++revision
  loading.value = true
  try {
    const result = await listGalleryFolders(props.patientId)
    if (current === revision) {
      folders.value = result
      error.value = ''
    }
  } catch (cause) {
    if (current === revision) error.value = galleryError(cause)
  } finally {
    if (current === revision) loading.value = false
  }
}
watch(
  () => props.patientId,
  () => {
    folders.value = []
    creating.value = false
    load()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  revision++
})
async function create() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  const patientId = props.patientId
  try {
    const folder = await createGalleryFolder(patientId, name.value)
    if (patientId !== props.patientId) return
    folders.value.push(folder)
    emit('update:modelValue', folder._id)
    emit('created', folder)
    creating.value = false
  } catch (cause) {
    error.value = galleryError(cause)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="folder-select" :class="{ dark }" :aria-busy="loading">
    <StyledSelect
      class="folder-control"
      :model-value="modelValue"
      :options="options"
      :label="label"
      :disabled="disabled"
      :dark="dark"
      @open="load"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <button
      type="button"
      :disabled="disabled"
      class="create-folder"
      title="Criar pasta"
      aria-label="Criar pasta"
      @click="
        () => {
          name = ''
          error = ''
          creating = true
        }
      "
    >
      <FolderPlus :size="18" />
    </button>
    <p v-if="error && !creating" role="alert">
      {{ error }} <button type="button" @click="load">Tentar novamente</button>
    </p>
    <GalleryDialog :open="creating" title="Nova pasta" :busy="saving" @close="creating = false">
      <form @submit.prevent="create">
        <label
          >Nome da pasta<input
            v-model="name"
            autofocus
            required
            maxlength="80"
            placeholder="Ex.: Tratamento facial"
        /></label>
        <p v-if="error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="saving || !name.trim()">
          {{ saving ? 'Criando…' : 'Criar pasta' }}
        </button>
      </form>
    </GalleryDialog>
  </div>
</template>

<style scoped>
.folder-select {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 8px;
  width: 100%;
}
.folder-control {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.folder-control :deep(.form-label) {
  font-size: 12px;
  margin-bottom: 6px;
}
.folder-control :deep(.select-button) {
  min-height: 40px;
  font-size: 13px;
}
.create-folder {
  height: 40px;
  display: grid;
  place-items: center;
}
.dark .create-folder {
  background: #202124;
  border-color: #414349;
  color: #e2e8f0;
}
label {
  display: grid;
  gap: 6px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #64748b;
}
input {
  width: 100%;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  font: inherit;
}
button {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #1e293b;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
p {
  width: 100%;
  margin: 4px 0;
  color: #b91c1c;
  font-size: 13px;
}
form {
  display: grid;
  gap: 16px;
}
form button {
  justify-self: end;
  background: var(--azul-principal, #2563eb);
  color: white;
  border: 0;
}
</style>
