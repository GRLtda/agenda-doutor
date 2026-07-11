<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  FilePlus2,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Search,
  Trash2,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import TemplateEditor from '@/components/pages/marketing/TemplateEditor.vue'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'

const templatesStore = useCrmTemplatesStore()

const showEditor = ref(false)
const editingTemplateId = ref(null)
const templateIdToDelete = ref(null)
const searchQuery = ref('')

const templates = computed(() => templatesStore.templates)
const isLoading = computed(() => templatesStore.isLoading)

const templateCards = computed(() => {
  const normalizedSearch = normalizeText(searchQuery.value.trim())

  return templates.value
    .map((template) => {
      const sourceText = [template.title, template.content, template.footer].filter(Boolean).join(' ')
      const variables = [...new Set(sourceText.match(/{[a-zA-Z_]+}/g) || [])]
      const tags = Array.isArray(template.tags) ? template.tags.filter(Boolean) : []
      const configuredUsages = Array.isArray(template.usages) ? template.usages : []
      const buttonCount = template.interactive?.enabled
        ? (template.interactive?.buttons?.length || 0)
        : 0

      return {
        ...template,
        tags,
        variables,
        buttonCount,
        hasConfiguredUsage: configuredUsages.length > 0,
        usages: configuredUsages.filter((usage) => usage.isActive),
      }
    })
    .filter((template) => {
      if (!normalizedSearch) return true

      const searchableText = normalizeText([
        template.name,
        template.title,
        template.content,
        template.footer,
        ...template.tags,
        ...template.variables,
        ...template.usages.map((usage) => usage.name),
      ].filter(Boolean).join(' '))

      return searchableText.includes(normalizedSearch)
    })
})

onMounted(() => {
  templatesStore.fetchTemplates()
  templatesStore.fetchVariables()
})

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatUpdatedAt(value) {
  if (!value) return 'Sem data de atualização'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem data de atualização'

  return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).replace('.', '')}`
}

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
  editingTemplateId.value = null
  templatesStore.fetchTemplates()
}

function requestDelete(templateId) {
  templateIdToDelete.value = templateId
}

async function handleDelete(templateId) {
  await templatesStore.deleteTemplate(templateId)
  templateIdToDelete.value = null
}
</script>

<template>
  <TemplateEditor
    v-if="showEditor"
    :template-id="editingTemplateId"
    @close="closeEditor"
    @save="closeEditor"
  />

  <section v-else class="templates-page message-templates-page">
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Modelos de Mensagem</h1>
        <p class="subtitle">Crie e gerencie os modelos usados nas conversas com seus pacientes.</p>
      </div>

      <div class="header-actions">
        <label class="template-search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar modelo..."
            aria-label="Buscar modelo"
          />
        </label>

        <AppButton variant="primary" class="create-template-button" @click="openCreateEditor">
          <FilePlus2 :size="16" />
          Criar Novo Modelo
        </AppButton>
      </div>
    </header>

    <div v-if="isLoading && templates.length === 0" class="templates-grid" aria-label="Carregando modelos">
      <div v-for="index in 6" :key="index" class="template-card skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-preview"></div>
        <div class="skeleton skeleton-meta"></div>
      </div>
    </div>

    <div v-else-if="templateCards.length" class="templates-grid">
      <article
        v-for="template in templateCards"
        :key="template._id"
        class="template-card"
        tabindex="0"
        @click="openEditEditor(template._id)"
        @keydown.enter="openEditEditor(template._id)"
      >
        <div class="card-header">
          <div class="card-heading">
            <h2>{{ template.name }}</h2>
            <span v-if="template.buttonCount" class="interactive-badge">
              {{ template.buttonCount }} {{ template.buttonCount === 1 ? 'botão' : 'botões' }}
            </span>
          </div>

          <div
            v-click-outside="() => (templateIdToDelete = null)"
            class="template-actions"
            @click.stop
          >
            <button
              type="button"
              class="icon-button"
              title="Editar modelo"
              aria-label="Editar modelo"
              @click="openEditEditor(template._id)"
            >
              <Pencil :size="15" />
            </button>
            <button
              type="button"
              class="icon-button delete-button"
              title="Excluir modelo"
              aria-label="Excluir modelo"
              @click="requestDelete(template._id)"
            >
              <Trash2 :size="15" />
            </button>

            <Transition name="popover">
              <div v-if="templateIdToDelete === template._id" class="delete-confirmation">
                <strong>Excluir modelo?</strong>
                <p>O modelo “{{ template.name }}” será removido permanentemente.</p>
                <div class="confirmation-actions">
                  <AppButton
                    variant="outline"
                    size="sm"
                    @click="templateIdToDelete = null"
                  >
                    Cancelar
                  </AppButton>
                  <AppButton
                    variant="dangerous"
                    size="sm"
                    :loading="isLoading"
                    @click="handleDelete(template._id)"
                  >
                    Excluir
                  </AppButton>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="message-preview">
          <span class="preview-label">Prévia da mensagem</span>
          <h3 v-if="template.title">{{ template.title }}</h3>
          <p>{{ template.content || 'Este modelo ainda não possui conteúdo.' }}</p>
          <span v-if="template.footer" class="message-footer">{{ template.footer }}</span>
        </div>

        <div class="usage-section">
          <span class="usage-label">Usado em</span>
          <div v-if="template.usages.length" class="usage-list">
            <span
              v-for="usage in template.usages"
              :key="`${usage.source}-${usage.id}`"
              class="usage-pill"
              title="Uso ativo"
            >
              {{ usage.name }}
            </span>
          </div>
          <span v-else class="unused-label">
            {{ template.hasConfiguredUsage ? 'Nenhum uso ativo no momento' : 'Este modelo ainda não está sendo usado' }}
          </span>
        </div>

        <footer class="card-footer">
          <div class="variables-summary">
            <span v-if="template.variables.length">
              {{ template.variables.length }}
              {{ template.variables.length === 1 ? 'variável' : 'variáveis' }}
            </span>
            <span v-else>Sem variáveis</span>
          </div>
          <span>{{ formatUpdatedAt(template.updatedAt) }}</span>
        </footer>
      </article>
    </div>

    <div v-else-if="searchQuery.trim()" class="empty-state compact-empty-state">
      <div class="empty-icon"><Search :size="22" /></div>
      <h2>Nenhum modelo encontrado</h2>
      <p>Tente buscar pelo nome, conteúdo, tag ou variável utilizada.</p>
      <AppButton variant="outline" @click="searchQuery = ''">Limpar busca</AppButton>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon"><MessageSquareText :size="24" /></div>
      <h2>Nenhum modelo de mensagem</h2>
      <p>Crie seu primeiro modelo para agilizar a comunicação com seus pacientes.</p>
      <AppButton variant="primary" @click="openCreateEditor">
        <FilePlus2 :size="16" />
        Criar Modelo
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.templates-page {
  width: 100%;
  min-height: 0;
  color: #0f172a;
}

/* Keep this page isolated from legacy template-card styles still used in settings tabs. */
.templates-page.message-templates-page .page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.templates-page.message-templates-page .header-actions,
.templates-page.message-templates-page .template-search,
.templates-page.message-templates-page .card-header,
.templates-page.message-templates-page .card-footer {
  display: flex;
}

.templates-page.message-templates-page .templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
}

.templates-page.message-templates-page .template-card {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 1rem;
}

.templates-page.message-templates-page .message-preview {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.header-text {
  min-width: 240px;
}

.title {
  margin: 0 0 0.25rem;
  color: #0f172a;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
}

.subtitle {
  margin: 0;
  color: var(--cinza-texto);
  font-size: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.template-search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 280px;
  height: 38px;
  padding: 0 0.8rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #94a3b8;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.template-search:focus-within {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.template-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-family: var(--fonte-principal);
  font-size: 0.9rem;
}

.template-search input::placeholder {
  color: #94a3b8;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 0.85rem;
}

.template-card {
  display: flex;
  min-width: 0;
  min-height: 300px;
  flex-direction: column;
  overflow: visible;
  padding: 1rem;
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  outline: none;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 12px 28px rgba(15, 23, 42, 0.028);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.template-card:hover,
.template-card:focus-visible {
  border-color: #bfdbfe;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
  transform: translateY(-1px);
}

.template-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.13);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-heading h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interactive-badge {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 0.67rem;
  font-weight: 700;
  white-space: nowrap;
}

.template-actions {
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 0.18rem;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease;
}

.icon-button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.delete-button:hover {
  background: #fef2f2;
  color: #dc2626;
}

.message-preview {
  display: flex;
  flex-direction: column;
  margin-top: 0.30rem;
  padding: 0.75rem 0.8rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  background: #f8fafc;
}

.preview-label {
  margin-bottom: 0.35rem;
  color: #94a3b8;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.message-preview h3 {
  margin: 0 0 0.3rem;
  color: #1e293b;
  font-size: 0.82rem;
  font-weight: 700;
}

.message-preview p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #475569;
  font-size: 0.79rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.message-footer {
  margin-top: auto;
  padding-top: 0.4rem;
  color: #94a3b8;
  font-size: 0.69rem;
}

.usage-section {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  gap: 0.38rem;
  margin-top: 0.7rem;
}

.usage-label {
  color: #94a3b8;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.usage-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.usage-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  min-height: 26px;
  max-width: 100%;
  padding: 0 0.55rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.45rem;
  overflow: hidden;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.68rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.usage-pill small {
  color: #16a34a;
  font-size: 0.58rem;
  font-weight: 750;
  text-transform: uppercase;
}

.unused-label {
  color: #94a3b8;
  font-size: 0.72rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid #edf2f7;
  color: #94a3b8;
  font-size: 0.66rem;
}

.variables-summary {
  color: #64748b;
  font-weight: 650;
}

.delete-confirmation {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  z-index: 30;
  width: 260px;
  padding: 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.7rem;
  background: #fff;
  cursor: default;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.15);
}

.delete-confirmation strong {
  color: #0f172a;
  font-size: 0.85rem;
}

.delete-confirmation p {
  margin: 0.35rem 0 0.8rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.4;
}

.confirmation-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.empty-state {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 1px dashed #d7dee8;
  border-radius: 0.85rem;
  background: #fff;
  text-align: center;
}

.compact-empty-state {
  min-height: 300px;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
}

.empty-state h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 700;
}

.empty-state p {
  max-width: 430px;
  margin: 0.4rem 0 1.2rem;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.5;
}

.skeleton-card {
  gap: 0.8rem;
  cursor: default;
  pointer-events: none;
}

.skeleton {
  border-radius: 0.5rem;
  background: #e8edf4;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 48%;
  height: 18px;
}

.skeleton-preview {
  width: 100%;
  height: 104px;
}

.skeleton-meta {
  width: 70%;
  height: 24px;
  margin-top: auto;
}

@keyframes pulse {
  50% { opacity: 0.55; }
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 900px) {
  .templates-page.message-templates-page .templates-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .templates-page.message-templates-page .page-header {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 1.5rem;
  }

  .templates-page.message-templates-page .header-actions {
    width: 100%;
    flex-direction: column;
    margin-left: 0;
  }

  .template-search,
  .create-template-button {
    width: 100%;
  }

  .create-template-button {
    justify-content: center;
  }

  .templates-page.message-templates-page .templates-grid {
    grid-template-columns: 1fr;
  }

  .templates-page.message-templates-page .template-card {
    min-height: 288px;
  }

  .delete-confirmation {
    position: fixed;
    top: 50%;
    right: 1rem;
    left: 1rem;
    width: auto;
    transform: translateY(-50%);
  }
}
</style>
