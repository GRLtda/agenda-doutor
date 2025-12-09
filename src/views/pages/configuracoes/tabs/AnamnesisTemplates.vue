<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useToast } from 'vue-toastification'
import { FilePlus2, Pencil, Trash2, Copy } from 'lucide-vue-next'
import CreateAnamnesisModal from '@/components/pages/configuracoes/modals/CreateAnamnesisModal.vue'
import AppButton from '@/components/global/AppButton.vue'

const anamnesisStore = useAnamnesisStore()
const toast = useToast()
const templates = computed(() => anamnesisStore.templates)

const isModalOpen = ref(false)
const editingTemplateId = ref(null)
const templateIdToDelete = ref(null)
const templateToDuplicate = ref(null)

onMounted(() => {
  anamnesisStore.fetchTemplates()
})

function closeModal() {
  isModalOpen.value = false
  editingTemplateId.value = null
  templateToDuplicate.value = null
}

function openCreateModal() {
  editingTemplateId.value = null
  templateToDuplicate.value = null
  isModalOpen.value = true
}

function openEditModal(templateId) {
  editingTemplateId.value = templateId
  templateToDuplicate.value = null
  isModalOpen.value = true
}

async function openDuplicateModal(templateId) {
  const templateData = await anamnesisStore.fetchTemplateById(templateId)

  if (templateData) {
    editingTemplateId.value = null
    templateToDuplicate.value = templateData
    isModalOpen.value = true
  } else {
    toast.error('Não foi possível carregar o modelo para duplicar.')
  }
}

async function handleDelete(templateId) {
  const { success } = await anamnesisStore.deleteTemplate(templateId)
  if (success) {
    toast.success('Modelo excluído com sucesso!')
  } else {
    toast.error('Não foi possível excluir o modelo.')
  }
  templateIdToDelete.value = null
}
</script>

<template>
  <div>
    <CreateAnamnesisModal
      v-if="isModalOpen"
      :template-id-to-edit="editingTemplateId"
      :template-to-duplicate="templateToDuplicate"
      @close="closeModal"
    />

    <div v-if="!anamnesisStore.isLoading && templates.length > 0" class="header-actions">
      <div>
        <h2>Modelos de Anamnese</h2>
        <p class="header-subtitle">Você tem {{ templates.length }} modelo(s) cadastrado(s).</p>
      </div>
      <AppButton variant="primary" @click="openCreateModal">
        <FilePlus2 :size="16" />
        Criar Novo Modelo
      </AppButton>
    </div>

    <div v-if="anamnesisStore.isLoading" class="templates-grid">
      <div v-for="n in 6" :key="n" class="template-card">
        <div class="template-info">
          <div class="skeleton skeleton-text" style="width: 70%; height: 1.5rem; margin-bottom: 0.5rem;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; height: 1rem;"></div>
        </div>

        <div class="template-actions">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-circle"></div>
        </div>
      </div>
    </div>

    <div v-else-if="templates.length > 0" class="templates-grid">
      <div v-for="template in templates" :key="template._id" class="template-card">
        <div class="template-info">
          <span class="template-name">{{ template.name }}</span>
          <span class="template-questions">
            {{ template.questionCount }}
            {{ template.questionCount === 1 ? 'pergunta' : 'perguntas' }}
          </span>
        </div>

        <div class="template-actions" v-click-outside="() => (templateIdToDelete = null)">
          <AppButton
            @click="openDuplicateModal(template._id)"
            variant="default"
            size="sm"
            title="Duplicar"
          >
            <Copy :size="16" />
          </AppButton>
          <AppButton @click="openEditModal(template._id)" variant="default" size="sm" title="Editar">
            <Pencil :size="16" />
          </AppButton>
          <AppButton
            @click="templateIdToDelete = template._id"
            variant="dangerous"
            size="sm"
            title="Excluir"
          >
            <Trash2 :size="16" />
          </AppButton>

          <Transition name="fade">
            <div v-if="templateIdToDelete === template._id" class="delete-confirmation">
              <h3>Excluir Modelo?</h3>
              <p class="confirmation-description">
                Esta ação é permanente e não poderá ser restaurada.
              </p>
              <div class="confirmation-buttons">
                <AppButton @click="templateIdToDelete = null" variant="secondary" size="sm">Cancelar</AppButton>
                <AppButton @click="handleDelete(template._id)" variant="dangerous" size="sm">
                  Excluir
                </AppButton>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="icon-wrapper">
        <FilePlus2 :size="48" />
      </div>
      <h3 class="empty-title">Nenhum modelo cadastrado</h3>
      <p class="empty-description">
        Comece criando seu primeiro modelo de anamnese para agilizar seus atendimentos.
      </p>
      <AppButton @click="openCreateModal" variant="primary">
        <FilePlus2 :size="16" />
        Criar Novo Modelo
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
/* --- ESTILOS DO SKELETON --- */
.skeleton {
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton-text {
  margin-bottom: 0.5rem;
}

.skeleton-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* --- ESTILOS ORIGINAIS ABAIXO --- */
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}
.header-subtitle {
  margin-top: 0.25rem;
  color: var(--cinza-texto);
}
.header-subtitle {
  margin-top: 0.25rem;
  color: var(--cinza-texto);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  min-height: 190px;
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}
.template-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.template-name {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--preto);
}
.template-questions {
  font-size: 0.875rem;
  color: var(--azul-principal);
  font-weight: 500;
}

.template-actions {
  position: relative;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}

.delete-confirmation {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  width: 240px;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.delete-confirmation h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}
.confirmation-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--cinza-texto);
  text-align: center;
  margin-bottom: 0.5rem;
}
.confirmation-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.confirmation-buttons button {
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-weight: 600;
  cursor: pointer;
}
.btn-cancel {
  background-color: var(--branco);
  color: var(--preto);
}
.btn-confirm-delete {
  background-color: #ef4444;
  color: var(--branco);
  border-color: #ef4444;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  border: 2px dashed #d1d5db;
  border-radius: 1rem;
  background-color: rgba(239, 246, 255, 0.5);
  text-align: center;
}
.icon-wrapper {
  color: var(--azul-principal);
  margin-bottom: 1.5rem;
}
.empty-title {
  font-family: var(--fonte-titulo);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin-bottom: 0.5rem;
}
.empty-description {
  max-width: 400px;
  color: var(--cinza-texto);
  margin-bottom: 2rem;
}
.empty-description {
  max-width: 400px;
  color: var(--cinza-texto);
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
  .btn-primary {
    justify-content: center;
  }
}
</style>
