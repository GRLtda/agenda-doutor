// src/components/pages/marketing/tabs/TemplatesTab.vue
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'
import { FilePlus2, Pencil, Trash2, LoaderCircle, CheckCircle, Archive } from 'lucide-vue-next'
import TemplateEditor from '@/components/pages/marketing/TemplateEditor.vue' // Importa o editor

const templatesStore = useCrmTemplatesStore()
const templates = computed(() => templatesStore.templates)
const isLoading = computed(() => templatesStore.isLoading)

const showEditor = ref(false)
const editingTemplateId = ref(null)
const templateIdToDelete = ref(null)

onMounted(() => {
  templatesStore.fetchTemplates()
  templatesStore.fetchVariables() // Busca as variáveis também
})

function openCreateEditor() {
  editingTemplateId.value = null
  showEditor.value = true
}

function openEditEditor(templateId) {
  editingTemplateId.value = templateId
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingTemplateId.value = null // Limpa o ID ao fechar
  templatesStore.fetchTemplates() // Garante que a lista está atualizada
}

async function handleDelete(templateId) {
  await templatesStore.deleteTemplate(templateId)
  templateIdToDelete.value = null // Fecha o popover após a ação
}

async function handlePublish(template) {
  if (!template.currentVersionId) return
  await templatesStore.publishTemplate(template._id, template.currentVersionId)
}

async function handleDeprecate(template) {
  if (!template.currentVersionId) return
  await templatesStore.deprecateVersion(template._id, template.currentVersionId)
}
</script>

<template>
  <div>
    <TemplateEditor
      v-if="showEditor"
      :template-id="editingTemplateId"
      @close="closeEditor"
      @save="closeEditor"
    />

    <div v-else>
      <div class="header-actions">
        <div>
          <h2>Modelos de Mensagem</h2>
          <p class="header-subtitle">Crie e gerencie seus templates para WhatsApp.</p>
        </div>
        <button @click="openCreateEditor" class="btn-primary">
          <FilePlus2 :size="16" />
          Criar Novo Modelo
        </button>
      </div>

      <div v-if="isLoading && templates.length === 0" class="loading-state">
          <LoaderCircle :size="32" class="animate-spin"/> Carregando modelos...
      </div>

      <div v-else-if="!isLoading && templates.length > 0" class="templates-grid">
        <div v-for="template in templates" :key="template._id" class="template-card">
           <div class="template-info">
              <div class="template-title-row">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-badge">{{ template.type || 'TEXT' }}</span>
                <span class="template-status" :class="template.status?.toLowerCase()">{{ template.status || 'DRAFT' }}</span>
              </div>
              <span class="template-preview">{{ template.content.substring(0, 100) }}{{ template.content.length > 100 ? '...' : '' }}</span>
           </div>
          <div class="template-actions" v-click-outside="() => (templateIdToDelete = null)">
            <button
              v-if="template.currentVersionId && template.status !== 'ACTIVE'"
              @click="handlePublish(template)"
              class="btn-icon"
              title="Publicar"
            >
              <CheckCircle :size="16" />
            </button>
            <button
              v-if="template.currentVersionId && template.status === 'ACTIVE'"
              @click="handleDeprecate(template)"
              class="btn-icon"
              title="Descontinuar versão"
            >
              <Archive :size="16" />
            </button>
            <button @click="openEditEditor(template._id)" class="btn-icon" title="Editar">
              <Pencil :size="16" />
            </button>
            <button
              @click.stop="templateIdToDelete = template._id"
              class="btn-icon btn-delete"
              title="Excluir"
            >
              <Trash2 :size="16" />
            </button>

            <Transition name="fade">
              <div v-if="templateIdToDelete === template._id" class="delete-confirmation">
                <h3>Excluir Modelo?</h3>
                <p>Esta ação não pode ser desfeita.</p>
                <div class="confirmation-buttons">
                  <button @click.stop="templateIdToDelete = null" class="btn-cancel">Cancelar</button>
                  <button @click.stop="handleDelete(template._id)" class="btn-confirm-delete">
                    Excluir
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="icon-wrapper"><FilePlus2 :size="48" /></div>
        <h3 class="empty-title">Nenhum modelo de mensagem criado</h3>
        <p class="empty-description">
          Nenhum template migrado ainda. Execute o script de migração em modo dry-run ou crie um novo template V2.
        </p>
        <button @click="openCreateEditor" class="create-button">Criar Modelo</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos Header e Botões (Reutilizados de AnamnesisTemplates) */
.header-actions { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.header-subtitle { margin-top: 0.25rem; color: var(--cinza-texto); }
.btn-primary, .create-button { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; background-color: var(--azul-principal); color: var(--branco); font-size: 1rem; font-weight: 600; cursor: pointer; transition: background-color .3s ease; }
.btn-primary:hover, .create-button:hover { background-color: var(--azul-escuro); }
.loading-state { text-align: center; color: var(--cinza-texto); padding: 2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }


/* Grid de Templates */
.templates-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
.template-card { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background-color: var(--branco); border: 1px solid #e5e7eb; border-radius: 1rem; transition: box-shadow .2s ease; gap: 1rem; }
.template-card:hover { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
.template-info { flex-grow: 1; min-width: 0; }
.template-title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
.template-name { font-weight: 600; display: block; }
.template-badge, .template-status { font-size: 0.68rem; font-weight: 700; padding: 0.18rem 0.45rem; border-radius: 999px; background: #eef2ff; color: #3730a3; }
.template-status.active { background: #dcfce7; color: #166534; }
.template-status.draft { background: #fef3c7; color: #92400e; }
.template-status.deprecated { background: #f3f4f6; color: #4b5563; }
.template-preview { font-size: 0.875rem; color: var(--cinza-texto); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Ações e Confirmação (Reutilizados de AnamnesisTemplates) */
.template-actions { position: relative; display: flex; gap: 0.5rem; flex-shrink: 0; }
.btn-icon { padding: 0.5rem; background: none; border: none; border-radius: 50%; cursor: pointer; color: var(--cinza-texto); transition: all .2s ease; }
.btn-icon:hover { background-color: #f3f4f6; color: var(--preto); }
.btn-delete:hover { background-color: #fee2e2; color: #ef4444; }
.delete-confirmation { position: absolute; right: 0; top: calc(100% + 0.5rem); width: 240px; background-color: var(--branco); border: 1px solid #e5e7eb; border-radius: 0.75rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1); padding: 1rem; z-index: 10; text-align: center; }
.delete-confirmation h3 { margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600; }
.delete-confirmation p { margin: 0 0 1rem 0; font-size: 0.875rem; color: var(--cinza-texto); }
.confirmation-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.confirmation-buttons button { padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #d1d5db; font-weight: 600; cursor: pointer; }
.btn-cancel { background-color: var(--branco); color: var(--preto); }
.btn-confirm-delete { background-color: #ef4444; color: var(--branco); border-color: #ef4444; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }

/* Estado Vazio (Reutilizado de AnamnesisTemplates) */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; border: 2px dashed #d1d5db; border-radius: 1rem; background-color: rgba(239, 246, 255, 0.5); text-align: center; margin-top: 2rem; }
.icon-wrapper { color: var(--azul-principal); margin-bottom: 1.5rem; }
.empty-title { font-size: 1.25rem; font-weight: 600; color: var(--preto); margin-bottom: 0.5rem; }
.empty-description { max-width: 400px; color: var(--cinza-texto); margin-bottom: 2rem; }

/* Responsivo */
@media (max-width: 768px) {
  .header-actions { flex-direction: column; align-items: stretch; gap: 1.5rem; }
  .btn-primary { justify-content: center; }
  .template-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .template-actions { width: 100%; justify-content: flex-end; }
}
</style>
