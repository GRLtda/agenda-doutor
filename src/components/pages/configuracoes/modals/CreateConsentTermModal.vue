<script setup>
import { ref, onMounted, computed } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import { X, Tag, FileSignature } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'

const props = defineProps({
  templateIdToEdit: { type: String, default: null },
  templateToDuplicate: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const isLoading = ref(false)
const templateName = ref('')
const templateContent = ref('')
const activeTab = ref('variables') // 'variables' ou 'formatting'

const isEditMode = computed(() => !!props.templateIdToEdit)

// Tags disponíveis para inserção
const availableTags = [
  { tag: '{paciente}', label: 'Nome Completo do Paciente' },
  { tag: '{primeiro_nome}', label: 'Primeiro Nome' },
  { tag: '{cpf}', label: 'CPF do Paciente' },
  { tag: '{data_nascimento}', label: 'Data de Nascimento' },
  { tag: '{data_atual}', label: 'Data Atual' },
  { tag: '{clinica}', label: 'Nome da Clínica' },
  { tag: '{nome_medico}', label: 'Nome do Médico' },
]

onMounted(async () => {
  isLoading.value = true
  try {
    if (props.templateToDuplicate) {
      templateName.value = `${props.templateToDuplicate.name} (Cópia)`
      templateContent.value = props.templateToDuplicate.content || ''
    } else if (props.templateIdToEdit) {
      const template = await consentTermsStore.fetchTemplateById(props.templateIdToEdit)
      if (template) {
        templateName.value = template.name
        templateContent.value = template.content || ''
      } else {
        toast.error('Erro ao carregar modelo.')
        emit('close')
      }
    } else {
      // Novo template - conteúdo padrão
      templateContent.value = `# Termo de Consentimento

Eu, **{paciente}**, portador(a) do CPF **{cpf}**, declaro que:

1. Fui devidamente informado(a) sobre os procedimentos a serem realizados.
2. Tive a oportunidade de esclarecer todas as minhas dúvidas.
3. Autorizo a realização do(s) procedimento(s) proposto(s).

**Local:** {clinica}
**Data:** {data_atual}

{assinatura}`
    }
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }
})

function insertTag(tag) {
  templateContent.value += tag
}

async function handleSubmit() {
  if (!templateName.value.trim()) {
    toast.error('O nome do modelo é obrigatório.')
    return
  }
  if (!templateContent.value.trim()) {
    toast.error('O conteúdo do modelo é obrigatório.')
    return
  }

  isLoading.value = true
  try {
    const payload = {
      name: templateName.value.trim(),
      content: templateContent.value,
    }

    if (isEditMode.value) {
      await consentTermsStore.updateTemplate(props.templateIdToEdit, payload)
      toast.success('Modelo atualizado com sucesso!')
    } else {
      await consentTermsStore.createTemplate(payload)
      toast.success('Modelo criado com sucesso!')
    }
    emit('close')
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao salvar modelo.'
    toast.error(errorMessage)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <SideDrawer @close="emit('close')" size="xl">
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <div class="title-row">
            <FileSignature :size="24" class="header-icon" />
            <h2>{{ isEditMode ? 'Editar Modelo' : 'Novo Modelo de Termo' }}</h2>
          </div>
          <p class="subtitle">
            Crie um modelo de termo de consentimento com texto e tags dinâmicas.
          </p>
        </div>
        <div class="header-right">
          <button @click="emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando...</p>
    </div>

    <!-- Content -->
    <div v-else class="drawer-content">
      <FormInput
        v-model="templateName"
        label="Nome do Modelo"
        placeholder="Ex: Termo de Consentimento para Procedimentos Estéticos"
        class="mb-4"
      />

      <div class="editor-section">
        <div class="editor-container">
          <label class="editor-label">Conteúdo do Termo (Markdown)</label>
          <textarea
            v-model="templateContent"
            class="markdown-editor"
            placeholder="Digite o conteúdo do termo aqui..."
          ></textarea>
        </div>

        <div class="tags-panel">
          <div class="panel-tabs">
            <button 
              :class="['panel-tab', { active: activeTab === 'variables' }]"
              @click="activeTab = 'variables'"
            >
              Variáveis
            </button>
            <button 
              :class="['panel-tab', { active: activeTab === 'formatting' }]"
              @click="activeTab = 'formatting'"
            >
              Formatação
            </button>
          </div>

          <!-- Tab Variáveis -->
          <div v-if="activeTab === 'variables'" class="tab-content">
            <p class="panel-description">Clique para inserir no texto</p>
            <div class="tags-list">
              <button
                v-for="item in availableTags"
                :key="item.tag"
                @click="insertTag(item.tag)"
                class="tag-button"
              >
                <span class="tag-code">{{ item.tag }}</span>
                <span class="tag-label">{{ item.label }}</span>
              </button>
            </div>
          </div>

          <!-- Tab Formatação -->
          <div v-if="activeTab === 'formatting'" class="tab-content">
            <p class="panel-description">Use os seguintes caracteres para formatar:</p>
            <div class="format-list">
              <div class="format-item">
                <code class="format-code">**texto**</code>
                <span class="format-result">para <strong>negrito</strong></span>
              </div>
              <div class="format-item">
                <code class="format-code">_texto_</code>
                <span class="format-result">para <em>itálico</em></span>
              </div>
              <div class="format-item">
                <code class="format-code"># Título</code>
                <span class="format-result">para título grande</span>
              </div>
              <div class="format-item">
                <code class="format-code">## Subtítulo</code>
                <span class="format-result">para subtítulo</span>
              </div>
              <div class="format-item">
                <code class="format-code">1. Item</code>
                <span class="format-result">para lista numerada</span>
              </div>
              <div class="format-item">
                <code class="format-code">- Item</code>
                <span class="format-result">para lista com bullet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="emit('close')">
          Cancelar
        </AppButton>
        <AppButton variant="primary" @click="handleSubmit" :loading="isLoading">
          <span v-if="isEditMode">Salvar Alterações</span>
          <span v-else>Criar Modelo</span>
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  color: var(--azul-principal);
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin: 0;
}

.mobile-close-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cinza-texto);
}

.drawer-content {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mb-4 {
  margin-bottom: 1rem;
}

.editor-section {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  flex: 1;
  min-height: 400px;
}

.editor-container {
  display: flex;
  flex-direction: column;
}

.editor-label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--preto);
  margin-bottom: 0.5rem;
}

.markdown-editor {
  flex: 1;
  width: 100%;
  min-height: 350px;
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  resize: none;
  background-color: #fafafa;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.markdown-editor:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.tags-panel {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0;
  height: fit-content;
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.panel-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--cinza-texto);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  border-bottom: 2px solid transparent;
}

.panel-tab:hover {
  color: var(--azul-principal);
}

.panel-tab.active {
  color: var(--azul-principal);
  border-bottom-color: var(--azul-principal);
}

.tab-content {
  padding: 1rem;
}

.panel-description {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin: 0 0 1rem 0;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tag-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background-color 0.2s;
}

.tag-button:hover {
  border-color: var(--azul-principal);
  background-color: #eef2ff;
}

.tag-button.tag-signature {
  border-color: #10b981;
  background-color: #ecfdf5;
}

.tag-button.tag-signature:hover {
  background-color: #d1fae5;
}

.tag-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.75rem;
  color: var(--azul-principal);
  background: #eef2ff;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.tag-signature .tag-code {
  color: #059669;
  background: #d1fae5;
}

.tag-label {
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

.format-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.format-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.format-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  color: #c026d3;
  background: #fdf4ff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  width: fit-content;
}

.format-result {
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

.drawer-footer {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  border-top: 1px solid #f3f4f6;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--azul-principal);
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .mobile-close-btn {
    display: block;
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: auto;
  }

  .tags-panel {
    order: 1;
    max-height: none;
  }

  .tab-content {
    max-height: 200px;
    overflow-y: auto;
  }

  .editor-container {
    order: 2;
  }

  .markdown-editor {
    min-height: 250px;
  }
}
</style>
