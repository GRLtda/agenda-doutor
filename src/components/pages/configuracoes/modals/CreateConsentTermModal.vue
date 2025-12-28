<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import { X, FileSignature } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import EditorToolbar from '@/components/shared/EditorToolbar.vue'

// TipTap imports
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Node, mergeAttributes, InputRule } from '@tiptap/core'

const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          return {
            'data-label': attributes.label,
          }
        },
      },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /({[a-zA-Z0-9_]+})$/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ label: match[1] }))
        },
      }),
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'variable-tag', 'data-type': 'variable' }), node.attrs.label]
  },
})

const props = defineProps({
  templateIdToEdit: { type: String, default: null },
  templateToDuplicate: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const isLoading = ref(false)
const templateName = ref('')
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

// Formato de tag para exibir no editor (estilizado como highlight)
function insertTag(tag) {
  if (editor.value) {
    editor.value.chain().focus().insertContent({
      type: 'variable',
      attrs: { label: tag }
    }).insertContent(' ').run() // Adiciona espaço após a tag
  }
}

function processContent(content) {
  if (!content) return ''
  // Substitui variáveis no formato {texto} por spans compatíveis com o Node
  return content.replace(/({[a-zA-Z0-9_]+})/g, (match) => {
    return `<span data-type="variable" data-label="${match}">${match}</span>`
  })
}

// Setup TipTap Editor
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Underline,
    VariableNode,
  ],
  editorProps: {
    attributes: {
      class: 'prose focus:outline-none max-w-none consent-editor-content',
    },
  },
})

onMounted(async () => {
  isLoading.value = true
  try {
    if (props.templateToDuplicate) {
      templateName.value = `${props.templateToDuplicate.name} (Cópia)`
      // Aguarda o editor estar pronto
      setTimeout(() => {
        if (editor.value) {
          editor.value.commands.setContent(processContent(props.templateToDuplicate.content) || '')
        }
      }, 100)
    } else if (props.templateIdToEdit) {
      const template = await consentTermsStore.fetchTemplateById(props.templateIdToEdit)
      if (template) {
        templateName.value = template.name
        setTimeout(() => {
          if (editor.value) {
            editor.value.commands.setContent(processContent(template.content) || '')
          }
        }, 100)
      } else {
        toast.error('Erro ao carregar modelo.')
        emit('close')
      }
    } else {
      // Novo template - conteúdo padrão em HTML
      const defaultContent = `
        <h1>Termo de Consentimento</h1>
        <p>Eu, <strong>{paciente}</strong>, portador(a) do CPF <strong>{cpf}</strong>, declaro que:</p>
        <ol>
          <li>Fui devidamente informado(a) sobre os procedimentos a serem realizados.</li>
          <li>Tive a oportunidade de esclarecer todas as minhas dúvidas.</li>
          <li>Autorizo a realização do(s) procedimento(s) proposto(s).</li>
        </ol>
        <p><strong>Local:</strong> {clinica}</p>
        <p><strong>Data:</strong> {data_atual}</p>
      `
      setTimeout(() => {
        if (editor.value) {
          editor.value.commands.setContent(processContent(defaultContent))
        }
      }, 100)
    }
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function focusEditor() {
  if (editor.value && !editor.value.isFocused) {
    editor.value.chain().focus().run()
  }
}

async function handleSubmit() {
  if (!templateName.value.trim()) {
    toast.error('O nome do modelo é obrigatório.')
    return
  }
  
  const content = editor.value?.getHTML() || ''
  if (!content.trim() || content === '<p></p>') {
    toast.error('O conteúdo do modelo é obrigatório.')
    return
  }

  isLoading.value = true
  try {
    const payload = {
      name: templateName.value.trim(),
      content: content,
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
            Crie um modelo de termo de consentimento com texto formatado e variáveis dinâmicas.
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
      />

      <div class="editor-section">
        <div class="editor-container">
          <label class="editor-label">Conteúdo do Termo</label>
          <div class="rich-editor-wrapper">
            <EditorToolbar v-if="editor" :editor="editor" />
            <div class="rich-editor-content" @click="focusEditor">
              <EditorContent v-if="editor" :editor="editor" style="height: 100%; outline: none;" />
            </div>
          </div>
        </div>

        <!-- Painel de Variáveis - Agora embaixo -->
        <div class="tags-panel">
          <div class="tags-panel-header">
            <span class="tags-panel-title">Variáveis Dinâmicas</span>
            <span class="tags-panel-hint">Clique para inserir no texto</span>
          </div>
          <div class="tags-list-horizontal">
            <button
              v-for="item in availableTags"
              :key="item.tag"
              @click="insertTag(item.tag)"
              class="tag-button-compact"
              :title="item.label"
            >
              <span class="tag-code">{{ item.tag }}</span>
            </button>
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

.mb-4 {
  margin-bottom: 1rem;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 400px;
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.editor-label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--preto);
  margin-bottom: 0.5rem;
}

.rich-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  overflow: hidden;
  background-color: var(--branco);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.rich-editor-wrapper:focus-within {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.rich-editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 300px;
  cursor: text;
}

.rich-editor-content :deep(.ProseMirror) {
  min-height: 100%;
  outline: none;
}

.rich-editor-content :deep(.ProseMirror p) {
  margin: 0 0 0.75rem 0;
}

.rich-editor-content :deep(.ProseMirror h1) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--preto);
}

.rich-editor-content :deep(.ProseMirror h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--preto);
}

.rich-editor-content :deep(.variable-tag) {
  background-color: #eef2ff;
  color: var(--azul-principal);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-block;
  margin: 0 0.1rem;
  user-select: all; /* Facilita selecionar a tag inteira */
}

.rich-editor-content :deep(.variable-tag.ProseMirror-selectednode) {
  background-color: #dbeafe; /* Azul um pouco mais escuro para indicar seleção */
  color: var(--azul-principal) !important; /* Força a cor do texto */
  outline: 1px solid var(--azul-principal);
}

.rich-editor-content :deep(.ProseMirror h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--preto);
}

.rich-editor-content :deep(.ProseMirror ul),
.rich-editor-content :deep(.ProseMirror ol) {
  padding-left: 1.5rem;
  margin: 0 0 0.75rem 0;
}

.rich-editor-content :deep(.ProseMirror li) {
  margin-bottom: 0.25rem;
}

.rich-editor-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--azul-principal);
  padding-left: 1rem;
  margin: 0 0 0.75rem 0;
  color: var(--cinza-texto);
}

.rich-editor-content :deep(.ProseMirror strong),
.rich-editor-content :deep(.ProseMirror b) {
  font-weight: 700;
  color: var(--preto);
}

.rich-editor-content :deep(.ProseMirror em),
.rich-editor-content :deep(.ProseMirror i) {
  font-style: italic;
}

.rich-editor-content :deep(.ProseMirror s),
.rich-editor-content :deep(.ProseMirror strike),
.rich-editor-content :deep(.ProseMirror del) {
  text-decoration: line-through;
}

.rich-editor-content :deep(.ProseMirror code) {
  background-color: #f3f4f6;
  color: #c026d3; /* Roxo para destacar código */
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875em;
}

/* Tags Panel - Layout Horizontal */
.tags-panel {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
}

.tags-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tags-panel-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--preto);
}

.tags-panel-hint {
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

.tags-list-horizontal {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-button-compact {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.625rem;
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.tag-button-compact:hover {
  border-color: var(--azul-principal);
  background-color: #eef2ff;
}

.tag-button-compact .tag-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.75rem;
  color: var(--azul-principal);
}

.tag-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.75rem;
  color: var(--azul-principal);
  background: #eef2ff;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.tag-label {
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

  .rich-editor-content {
    min-height: 250px;
  }
}
</style>
