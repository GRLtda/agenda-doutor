<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'
import { ArrowLeft, Eye, MessageSquare, Tag, Save, LoaderCircle } from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  templateId: { type: String, default: null },
})
const emit = defineEmits(['close', 'save'])

const templatesStore = useCrmTemplatesStore()
const toast = useToast()

const templateName = ref('')
const templateContent = ref('')
const templateTags = ref('')
const editorError = ref(null)
const isLoading = ref(false)
const activeInfoTab = ref('variables')

const isEditMode = computed(() => !!props.templateId)
const availableVariables = computed(() => templatesStore.availableVariables)

// Regex para encontrar as variáveis no texto
const variableRegex = /({[a-zA-Z_]+})/g

// Computado para destacar variáveis no preview
const formattedPreview = computed(() => {
  let html = templateContent.value || ''

  // Escapa HTML básico para segurança no preview
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Aplica formatação básica do WhatsApp (negrito, itálico, riscado)
  html = html.replace(/\*(.*?)\*/g, '<b>$1</b>') // Negrito (*)
  html = html.replace(/_(.*?)_/g, '<i>$1</i>') // Itálico (_)
  html = html.replace(/~(.*?)~/g, '<s>$1</s>') // Riscado (~)

  // Destaca as variáveis
  html = html.replace(variableRegex, '<span class="variable-highlight">$1</span>')

  // Substitui quebras de linha por <br> para o HTML
  return html.replace(/\n/g, '<br>')
})

// Carrega dados do template se estiver editando
onMounted(async () => {
  if (isEditMode.value) {
    isLoading.value = true
    const { success, data } = await templatesStore.getTemplateById(props.templateId)
    if (success && data) {
      templateName.value = data.name
      templateContent.value = data.content
      templateTags.value = Array.isArray(data.tags) ? data.tags.join(', ') : ''
    } else {
      toast.error('Não foi possível carregar o modelo para edição.')
      emit('close')
    }
    isLoading.value = false
  }
  if (templatesStore.availableVariables.length <= 6) {
    templatesStore.fetchVariables()
  }
})

function insertVariable(variable) {
  templateContent.value += variable
}

async function handleSave() {
  editorError.value = null
  if (!templateName.value || !templateContent.value) {
    editorError.value = 'O nome e o conteúdo do modelo são obrigatórios.'
    toast.error(editorError.value)
    return
  }

  const payload = {
    name: templateName.value,
    content: templateContent.value,
    tags: templateTags.value
      ? templateTags.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
  }

  let success = false
  if (isEditMode.value) {
    const result = await templatesStore.updateTemplate(props.templateId, payload)
    success = result.success
  } else {
    const result = await templatesStore.createTemplate(payload)
    success = result.success
  }

  if (success) {
    emit('save')
  }
}
</script>

<template>
  <div class="template-editor-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button @click="$emit('close')" class="back-button">
          <ArrowLeft :size="18" />
        </button>
        <div class="header-text">
          <h1 class="title">{{ isEditMode ? 'Editar Modelo' : 'Novo Modelo' }}</h1>
          <p class="subtitle">Configure o conteúdo da mensagem automática</p>
        </div>
      </div>
      <div class="header-right">
        <button @click="$emit('close')" type="button" class="btn-secondary">
          Cancelar
        </button>
        <button
          @click="handleSave"
          type="button"
          class="btn-primary"
          :disabled="templatesStore.isLoading"
        >
          <LoaderCircle v-if="templatesStore.isLoading" :size="16" class="animate-spin" />
          <Save v-else :size="16" />
          {{ templatesStore.isLoading ? 'Salvando...' : 'Salvar Modelo' }}
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <LoaderCircle :size="32" class="animate-spin" />
      <span>Carregando modelo...</span>
    </div>

    <!-- Main Content -->
    <div v-else class="editor-content">
      <!-- Left Column: Form -->
      <div class="form-column">
        <!-- Card: Informações Básicas -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">
              <MessageSquare :size="18" />
            </div>
            <div class="card-header-text">
              <h3 class="card-title">Informações do Modelo</h3>
              <p class="card-subtitle">Nome e identificação do template</p>
            </div>
          </div>
          <div class="card-body">
            <FormInput
              v-model="templateName"
              label="Nome do Modelo"
              placeholder="Ex: Lembrete Consulta 24h"
              required
            />
            <FormInput
              v-model="templateTags"
              label="Tags (separadas por vírgula)"
              placeholder="Ex: Lembrete, Consulta, Agendamento"
            />
          </div>
        </div>

        <!-- Card: Conteúdo da Mensagem -->
        <div class="card card-message">
          <div class="card-header">
            <div class="card-icon icon-green">
              <Tag :size="18" />
            </div>
            <div class="card-header-text">
              <h3 class="card-title">Conteúdo da Mensagem</h3>
              <p class="card-subtitle">Texto que será enviado ao paciente</p>
            </div>
          </div>
          <div class="card-body">
            <textarea
              v-model="templateContent"
              placeholder="Digite sua mensagem aqui... Use *negrito*, _itálico_ ou ~riscado~. Insira variáveis clicando no painel à direita."
              rows="12"
              class="message-textarea"
            ></textarea>
            <div v-if="editorError" class="error-message">{{ editorError }}</div>
          </div>
        </div>
      </div>

      <!-- Right Column: Preview & Variables -->
      <div class="preview-column">
        <!-- Card: Preview -->
        <div class="card card-preview">
          <div class="card-header">
            <div class="card-icon icon-purple">
              <Eye :size="18" />
            </div>
            <div class="card-header-text">
              <h3 class="card-title">Pré-visualização</h3>
              <p class="card-subtitle">Como ficará no WhatsApp</p>
            </div>
          </div>
          <div class="card-body preview-body">
            <div class="preview-box">
              <div v-if="templateContent" class="whatsapp-bubble" v-html="formattedPreview"></div>
              <div v-else class="preview-placeholder">
                <MessageSquare :size="32" />
                <span>A pré-visualização aparecerá aqui</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card: Variáveis e Formatação -->
        <div class="card card-variables">
          <div class="info-tabs">
            <div class="info-tab-buttons">
              <button
                :class="{ active: activeInfoTab === 'variables' }"
                @click="activeInfoTab = 'variables'"
              >
                Variáveis
              </button>
              <button
                :class="{ active: activeInfoTab === 'formatting' }"
                @click="activeInfoTab = 'formatting'"
              >
                Formatação
              </button>
            </div>
            <div class="info-tab-content">
              <div v-if="activeInfoTab === 'variables'">
                <p class="info-text">Clique para inserir uma variável:</p>
                <ul class="variables-list">
                  <li
                    v-for="v in availableVariables"
                    :key="v.variable"
                    @click="insertVariable(v.variable)"
                  >
                    <code>{{ v.variable }}</code>
                    <span class="var-description">{{ v.description }}</span>
                  </li>
                </ul>
              </div>
              <div v-if="activeInfoTab === 'formatting'">
                <p class="info-text">Use estes caracteres para formatar:</p>
                <ul class="formatting-list">
                  <li><code>*texto*</code> para <b>negrito</b></li>
                  <li><code>_texto_</code> para <i>itálico</i></li>
                  <li><code>~texto~</code> para <s>riscado</s></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-editor-page {
  min-height: 100%;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: var(--branco);
  color: var(--cinza-texto);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-button:hover {
  background-color: #f9fafb;
  color: var(--preto);
}

.header-text {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--preto);
  line-height: 1.2;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 0.75rem;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--azul-principal) 0%, #4f84e5 100%);
  color: var(--branco);
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--branco);
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--cinza-texto);
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: #f9fafb;
  color: var(--preto);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--cinza-texto);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Editor Content */
.editor-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.form-column,
.preview-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.card {
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fafbfc;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  background: #eff6ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon.icon-green {
  background: #ecfdf5;
  color: #10b981;
}

.card-icon.icon-purple {
  background: #f3e8ff;
  color: #a855f7;
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0;
  line-height: 1.3;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin: 0;
}

.card-body {
  padding: 1.25rem;
}

/* Message Textarea */
.message-textarea {
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
  transition: all 0.2s;
}

.message-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.error-message {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  border-radius: 0.5rem;
}

/* Preview Card */
.card-preview {
  position: sticky;
  top: 1rem;
}

.preview-body {
  padding: 0;
}

.preview-box {
  background-color: #e5ddd5;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4ccc4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  padding: 1.25rem;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.whatsapp-bubble {
  background-color: #dcf8c6;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem 0.75rem 0.75rem 0.75rem;
  max-width: 90%;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 0.9rem;
  color: #303030;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.whatsapp-bubble :deep(.variable-highlight) {
  color: #005fff;
  font-weight: 600;
  background-color: rgba(0, 95, 255, 0.1);
  padding: 0 3px;
  border-radius: 3px;
}

.whatsapp-bubble :deep(b) { font-weight: bold; }
.whatsapp-bubble :deep(i) { font-style: italic; }
.whatsapp-bubble :deep(s) { text-decoration: line-through; }

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #a8a29e;
  height: 100%;
  min-height: 200px;
  font-size: 0.9rem;
}

/* Variables Card */
.card-variables {
  overflow: hidden;
}

.info-tabs {
  display: flex;
  flex-direction: column;
}

.info-tab-buttons {
  display: flex;
  background: #fafbfc;
  border-bottom: 1px solid #e5e7eb;
}

.info-tab-buttons button {
  flex: 1;
  padding: 0.85rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--cinza-texto);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.info-tab-buttons button.active {
  color: var(--azul-principal);
  border-bottom-color: var(--azul-principal);
  background: var(--branco);
}

.info-tab-content {
  padding: 1rem 1.25rem;
  max-height: 220px;
  overflow-y: auto;
}

.info-text {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin-bottom: 0.75rem;
}

.variables-list,
.formatting-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.variables-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: background 0.2s;
  font-size: 0.85rem;
}

.variables-list li:hover {
  background-color: #eff6ff;
}

.variables-list code {
  font-family: 'SF Mono', Monaco, monospace;
  background-color: #eef2ff;
  color: var(--azul-principal);
  padding: 0.2em 0.5em;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.var-description {
  color: var(--cinza-texto);
  font-size: 0.8rem;
}

.formatting-list li {
  padding: 0.4rem 0;
  font-size: 0.85rem;
}

.formatting-list code {
  font-family: 'SF Mono', Monaco, monospace;
  background-color: #f3f4f6;
  padding: 0.15em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

/* Custom Scrollbar */
.info-tab-content::-webkit-scrollbar { width: 4px; }
.info-tab-content::-webkit-scrollbar-track { background: transparent; }
.info-tab-content::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 2px; }

/* Responsive */
@media (max-width: 1024px) {
  .editor-content {
    grid-template-columns: 1fr;
  }
  
  .card-preview {
    position: static;
  }
  
  .preview-column {
    order: -1;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-left {
    width: 100%;
  }
  
  .header-right {
    width: 100%;
    justify-content: stretch;
  }
  
  .header-right button {
    flex: 1;
    justify-content: center;
  }
  
  .title {
    font-size: 1.25rem;
  }
}
</style>
