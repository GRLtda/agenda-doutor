<script setup>
import { ref, onMounted, computed } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import { FilePlus2, Pencil, Trash2, Copy } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import CreateConsentTermModal from '@/components/pages/configuracoes/modals/CreateConsentTermModal.vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const consentTermsStore = useConsentTermsStore()
const toast = useToast()
const templates = computed(() => consentTermsStore.templates)
const isFetchingTemplates = computed(() => consentTermsStore.isFetchingTemplates)

const isModalOpen = ref(false)
const editingTemplateId = ref(null)
const templateIdToDelete = ref(null)
const templateToDuplicate = ref(null)

onMounted(() => {
  consentTermsStore.fetchTemplates()
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
  const template = await consentTermsStore.fetchTemplateById(templateId)
  if (template) {
    templateToDuplicate.value = template
    editingTemplateId.value = null
    isModalOpen.value = true
  }
}

async function handleDelete(templateId) {
  const { success } = await consentTermsStore.deleteTemplate(templateId)
  if (success) {
    toast.success('Modelo excluído com sucesso!')
    templateIdToDelete.value = null
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch (error) {
    return dateString
  }
}
</script>

<template>
  <div>
    <CreateConsentTermModal
      v-if="isModalOpen"
      :template-id-to-edit="editingTemplateId"
      :template-to-duplicate="templateToDuplicate"
      @close="closeModal"
    />

    <div class="header-actions">
      <AppButton @click="openCreateModal" variant="primary">
        <FilePlus2 :size="16" />
        Criar Novo Modelo
      </AppButton>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isFetchingTemplates" class="templates-grid">
      <div v-for="n in 3" :key="n" class="template-card skeleton-card">
        <div class="template-info">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-subtitle"></div>
        </div>
        <div class="template-actions">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-circle"></div>
        </div>
      </div>
    </div>

    <!-- Lista de Templates -->
    <div v-else-if="templates.length > 0" class="templates-grid">
      <div v-for="template in templates" :key="template._id" class="template-card">
        <div class="template-info">
          <div class="template-header-row">
            <span class="template-name">{{ template.name }}</span>
            <span class="template-status" :class="{ inactive: !template.isActive }">
              {{ template.isActive ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="template-dates">
            <span v-if="template.createdAt" title="Data de criação">
              Criado em: {{ formatDate(template.createdAt) }}
            </span>
            <span v-if="template.updatedAt" title="Última edição">
              Atualizado em: {{ formatDate(template.updatedAt) }}
            </span>
          </div>
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
          <AppButton
            @click="openEditModal(template._id)"
            variant="default"
            size="sm"
            title="Editar"
          >
            <Pencil :size="16" />
          </AppButton>

          <div class="delete-wrapper">
            <AppButton
              @click="templateIdToDelete = template._id"
              variant="default"
              size="sm"
              title="Excluir"
            >
              <Trash2 :size="16" />
            </AppButton>
            <Transition name="fade">
              <div v-if="templateIdToDelete === template._id" class="confirm-delete-popover">
                <p>Excluir este modelo?</p>
                <AppButton @click="handleDelete(template._id)" variant="dangerous" size="sm">
                  Excluir
                </AppButton>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="icon-wrapper">
        <FilePlus2 :size="48" />
      </div>
      <h3 class="empty-title">Nenhum modelo cadastrado</h3>
      <p class="empty-description">
        Comece criando seu primeiro modelo de termo de consentimento.
      </p>
      <AppButton @click="openCreateModal" variant="primary">
        <FilePlus2 :size="16" />
        Criar Novo Modelo
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
/* Skeleton Styles */
.skeleton {
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton-title {
  height: 1.25rem;
  width: 60%;
  margin-bottom: 0.5rem;
}

.skeleton-subtitle {
  height: 0.875rem;
  width: 30%;
}

.skeleton-circle {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
}

.skeleton-card {
  pointer-events: none;
}

/* Header */
.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

/* Grid */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: var(--branco);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.template-card:hover {
  border-color: var(--azul-principal-leve);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.template-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.template-name {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--preto);
}

.template-dates {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

.template-status {
  font-size: 0.75rem;
  font-weight: 500;
  color: #10b981;
  background: #d1fae5;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  width: fit-content;
}

.template-status.inactive {
  color: #6b7280;
  background: #f3f4f6;
}

.template-actions {
  position: relative;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}

.delete-wrapper {
  position: relative;
}

.confirm-delete-popover {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  white-space: nowrap;
}

.confirm-delete-popover p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--preto);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px dashed #d1d5db;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  margin-bottom: 1.5rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin-bottom: 0.5rem;
}

.empty-description {
  color: var(--cinza-texto);
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
}
</style>
