<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowLeft, LoaderCircle, Trash2, UserRound } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import AppButton from '@/components/global/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'

const props = defineProps({
  templateId: { type: String, default: null },
})

const emit = defineEmits(['close', 'save'])

const templatesStore = useCrmTemplatesStore()
const clinicStore = useClinicStore()
const authStore = useAuthStore()
const toast = useToast()

const templateName = ref('')
const templateTitle = ref('')
const templateContent = ref('')
const templateFooter = ref('')
const templateTags = ref('')
const interactiveEnabled = ref(false)
const interactiveButtonType = ref('reply')
const interactiveButtons = ref([
  { displayText: '', id: '', url: '', phoneNumber: '' },
])
const editorError = ref(null)
const isLoading = ref(false)
const isVariablesMenuOpen = ref(false)
const messageTextarea = ref(null)
const clinicLogoError = ref(false)

const isEditMode = computed(() => Boolean(props.templateId))
const availableVariables = computed(() => templatesStore.availableVariables)
const quickVariables = computed(() => availableVariables.value.slice(0, 6))
const extraVariables = computed(() => availableVariables.value.slice(6))
const messageLength = computed(() => templateContent.value.length)
const activeClinic = computed(() => clinicStore.currentClinic || authStore.user?.clinic || {})
const clinicName = computed(() => activeClinic.value?.name || 'Sua clínica')
const clinicLogo = computed(() => activeClinic.value?.logoUrl || '')

const visibleInteractiveButtons = computed(() =>
  interactiveButtons.value
    .map((button, index) => ({
      type: interactiveButtonType.value,
      displayText: button.displayText?.trim(),
      id: button.id?.trim() || `btn_${index + 1}`,
      url: button.url?.trim(),
      phoneNumber: button.phoneNumber?.trim(),
    }))
    .filter((button) => {
      if (!button.displayText) return false
      if (button.type === 'url') return Boolean(button.url)
      if (button.type === 'call') return Boolean(button.phoneNumber)
      return true
    }),
)

const previewValues = computed(() => ({
  '{paciente}': 'Marina Souza',
  '{primeiro_nome}': 'Marina',
  '{nome_medico}': 'Dra. Ana Martins',
  '{clinica}': clinicName.value,
  '{data_consulta}': '20/07/2026',
  '{hora_consulta}': '14:30',
  '{link_anamnese}': 'clinica.app/anamnese',
  '{link_termos}': 'clinica.app/termos',
  '{link_termo}': 'clinica.app/termos',
}))

watch(clinicLogo, () => {
  clinicLogoError.value = false
})

const variableRegex = /({[a-zA-Z_]+})/g

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatWhatsappPreview(value) {
  let html = escapeHtml(value)
  const previewVariables = []

  html = html.replace(variableRegex, (variable) => {
    const index = previewVariables.length
    const sample = previewValues.value[variable] || variable
    previewVariables.push(`<span class="variable-preview">${escapeHtml(sample)}</span>`)
    return `%%VARIABLE${index}%%`
  })

  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')
  html = html.replace(/~(.*?)~/g, '<s>$1</s>')
  html = html.replace(/%%VARIABLE(\d+)%%/g, (_, index) => previewVariables[Number(index)])

  return html.replace(/\n/g, '<br>')
}

const formattedTitlePreview = computed(() => formatWhatsappPreview(templateTitle.value))
const formattedBodyPreview = computed(() => formatWhatsappPreview(templateContent.value))
const formattedFooterPreview = computed(() => formatWhatsappPreview(templateFooter.value))

onMounted(async () => {
  if (isEditMode.value) {
    isLoading.value = true
    const { success, data } = await templatesStore.getTemplateById(props.templateId)

    if (success && data) {
      templateName.value = data.name
      templateTitle.value = data.title || ''
      templateContent.value = data.content
      templateFooter.value = data.footer || ''
      templateTags.value = Array.isArray(data.tags) ? data.tags.join(', ') : ''
      interactiveEnabled.value = Boolean(data.interactive?.enabled)
      interactiveButtonType.value = data.interactive?.buttons?.[0]?.type || 'reply'
      interactiveButtons.value = Array.isArray(data.interactive?.buttons) && data.interactive.buttons.length
        ? data.interactive.buttons.slice(0, 3).map((button) => ({
            displayText: button.displayText || button.text || '',
            id: button.id || '',
            url: button.url || '',
            phoneNumber: button.phoneNumber || '',
          }))
        : [{ displayText: '', id: '', url: '', phoneNumber: '' }]
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

async function replaceTextareaSelection(replacement, selectionOffset = replacement.length) {
  const textarea = messageTextarea.value
  const start = textarea?.selectionStart ?? templateContent.value.length
  const end = textarea?.selectionEnd ?? start

  templateContent.value = `${templateContent.value.slice(0, start)}${replacement}${templateContent.value.slice(end)}`

  await nextTick()
  messageTextarea.value?.focus()
  const cursorPosition = start + selectionOffset
  messageTextarea.value?.setSelectionRange(cursorPosition, cursorPosition)
}

function insertVariable(variable) {
  isVariablesMenuOpen.value = false
  replaceTextareaSelection(variable)
}

async function applyFormatting(marker) {
  const textarea = messageTextarea.value
  const start = textarea?.selectionStart ?? templateContent.value.length
  const end = textarea?.selectionEnd ?? start
  const selectedText = templateContent.value.slice(start, end) || 'texto'
  const replacement = `${marker}${selectedText}${marker}`

  templateContent.value = `${templateContent.value.slice(0, start)}${replacement}${templateContent.value.slice(end)}`

  await nextTick()
  messageTextarea.value?.focus()
  messageTextarea.value?.setSelectionRange(start + marker.length, start + marker.length + selectedText.length)
}

function addInteractiveButton() {
  if (interactiveButtons.value.length >= 3) return
  interactiveButtons.value.push({ displayText: '', id: '', url: '', phoneNumber: '' })
}

function removeInteractiveButton(index) {
  interactiveButtons.value.splice(index, 1)
  if (!interactiveButtons.value.length) {
    interactiveButtons.value.push({ displayText: '', id: '', url: '', phoneNumber: '' })
  }
}

async function handleSave() {
  editorError.value = null

  if (!templateName.value.trim() || !templateContent.value.trim()) {
    editorError.value = 'O nome e o conteúdo do modelo são obrigatórios.'
    toast.error(editorError.value)
    return
  }

  const payload = {
    name: templateName.value.trim(),
    title: templateTitle.value.trim(),
    content: templateContent.value,
    footer: templateFooter.value.trim(),
    tags: templateTags.value
      ? templateTags.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    interactive: {
      enabled: interactiveEnabled.value && visibleInteractiveButtons.value.length > 0,
      type: 'buttons',
      buttons: visibleInteractiveButtons.value.map((button) => ({
        type: button.type,
        displayText: button.displayText,
        id: button.id,
        url: button.url,
        phoneNumber: button.phoneNumber,
      })),
      buttonText: '',
      listSections: [],
    },
  }

  const result = isEditMode.value
    ? await templatesStore.updateTemplate(props.templateId, payload)
    : await templatesStore.createTemplate(payload)

  if (result.success) emit('save')
}
</script>

<template>
  <section class="template-editor-page">
    <header class="page-header">
      <div class="header-left">
        <button
          type="button"
          class="back-button"
          aria-label="Voltar para modelos"
          title="Voltar"
          @click="emit('close')"
        >
          <ArrowLeft :size="18" />
        </button>
        <div class="page-copy">
          <h1 class="title">{{ isEditMode ? 'Editar modelo' : 'Novo modelo' }}</h1>
          <p class="subtitle">Crie a mensagem e acompanhe o resultado em tempo real.</p>
        </div>
      </div>

      <div class="header-actions">
        <AppButton variant="outline" @click="emit('close')">Cancelar</AppButton>
        <AppButton
          variant="primary"
          :loading="templatesStore.isLoading && !isLoading"
          @click="handleSave"
        >
          Salvar modelo
        </AppButton>
      </div>
    </header>

    <div v-if="isLoading" class="loading-state">
      <LoaderCircle :size="28" class="animate-spin" />
      <span>Carregando modelo...</span>
    </div>

    <div v-else class="editor-workspace">
      <article class="editor-panel">
        <div class="panel-header">
          <div>
            <h2>Conteúdo do modelo</h2>
            <p>Organize a mensagem que será enviada ao paciente.</p>
          </div>
          <span class="required-note">* Obrigatório</span>
        </div>

        <div class="editor-form">
          <div class="field-grid field-grid--identity">
            <label class="field">
              <span>Nome do modelo <b>*</b></span>
              <input
                v-model="templateName"
                type="text"
                placeholder="Ex: Confirmação de consulta"
                autocomplete="off"
              />
            </label>

            <label class="field">
              <span>Tags</span>
              <input
                v-model="templateTags"
                type="text"
                placeholder="Consulta, lembrete"
                autocomplete="off"
              />
            </label>
          </div>

          <div class="section-divider"></div>

          <div class="field-grid">
            <label class="field">
              <span>Título</span>
              <input
                v-model="templateTitle"
                type="text"
                maxlength="60"
                placeholder="Ex: Sua consulta está confirmada"
              />
            </label>

            <label class="field">
              <span>Rodapé</span>
              <input
                v-model="templateFooter"
                type="text"
                maxlength="60"
                placeholder="Ex: Equipe {clinica}"
              />
            </label>
          </div>

          <div class="message-field">
            <div class="message-label-row">
              <label for="template-body">Mensagem <b>*</b></label>
              <div class="format-actions" aria-label="Formatação da mensagem">
                <button type="button" title="Negrito" @click="applyFormatting('*')">
                  <strong>B</strong>
                </button>
                <button type="button" title="Itálico" @click="applyFormatting('_')">
                  <em>I</em>
                </button>
                <button type="button" title="Riscado" @click="applyFormatting('~')">
                  <s>S</s>
                </button>
              </div>
            </div>
            <textarea
              id="template-body"
              ref="messageTextarea"
              v-model="templateContent"
              rows="7"
              placeholder="Olá {primeiro_nome}, sua consulta está confirmada para {data_consulta} às {hora_consulta}."
            ></textarea>
            <span class="character-count">{{ messageLength }} caracteres</span>
          </div>

          <div class="variables-row">
            <span class="variables-label">Inserir variável</span>
            <div class="variable-chips">
              <button
                v-for="variable in quickVariables"
                :key="variable.variable"
                type="button"
                class="variable-chip"
                :title="variable.description"
                @click="insertVariable(variable.variable)"
              >
                {{ variable.variable }}
              </button>

              <div
                v-if="extraVariables.length"
                v-click-outside="() => (isVariablesMenuOpen = false)"
                class="variables-more"
              >
                <button
                  type="button"
                  class="variable-chip variable-chip--more"
                  :aria-expanded="isVariablesMenuOpen"
                  @click="isVariablesMenuOpen = !isVariablesMenuOpen"
                >
                  +{{ extraVariables.length }} variáveis
                </button>

                <Transition name="popover">
                  <div v-if="isVariablesMenuOpen" class="variables-popover">
                    <button
                      v-for="variable in extraVariables"
                      :key="variable.variable"
                      type="button"
                      @click="insertVariable(variable.variable)"
                    >
                      <code>{{ variable.variable }}</code>
                      <span>{{ variable.description }}</span>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <div v-if="editorError" class="error-message" role="alert">{{ editorError }}</div>

          <div class="interactive-section" :class="{ 'is-open': interactiveEnabled }">
            <div class="interactive-summary">
              <div>
                <h3>Botões na mensagem</h3>
                <p>Adicione até três ações rápidas. Este recurso é opcional.</p>
              </div>
              <label class="compact-switch">
                <input v-model="interactiveEnabled" type="checkbox" />
                <span aria-hidden="true"></span>
                <span class="sr-only">Ativar botões na mensagem</span>
              </label>
            </div>

            <Transition name="expand">
              <div v-if="interactiveEnabled" class="interactive-editor">
                <div class="button-type-control" aria-label="Tipo dos botões">
                  <button
                    v-for="option in [
                      { value: 'reply', label: 'Resposta' },
                      { value: 'url', label: 'Link' },
                      { value: 'call', label: 'Telefone' },
                    ]"
                    :key="option.value"
                    type="button"
                    :class="{ active: interactiveButtonType === option.value }"
                    @click="interactiveButtonType = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <div class="buttons-editor">
                  <div
                    v-for="(button, index) in interactiveButtons"
                    :key="index"
                    class="button-row"
                  >
                    <label class="field field--compact">
                      <span>Texto do botão</span>
                      <input
                        v-model="button.displayText"
                        type="text"
                        maxlength="20"
                        placeholder="Ex: Confirmar"
                      />
                    </label>

                    <label v-if="interactiveButtonType === 'reply'" class="field field--compact">
                      <span>ID interno</span>
                      <input
                        v-model="button.id"
                        type="text"
                        maxlength="256"
                        placeholder="Ex: confirmar"
                      />
                    </label>

                    <label v-else-if="interactiveButtonType === 'url'" class="field field--compact">
                      <span>URL</span>
                      <input
                        v-model="button.url"
                        type="text"
                        maxlength="256"
                        placeholder="Ex: {link_anamnese}"
                      />
                    </label>

                    <label v-else class="field field--compact">
                      <span>Telefone</span>
                      <input
                        v-model="button.phoneNumber"
                        type="text"
                        maxlength="20"
                        placeholder="Ex: 5511999999999"
                      />
                    </label>

                    <button
                      type="button"
                      class="remove-button"
                      :disabled="interactiveButtons.length === 1"
                      title="Remover botão"
                      aria-label="Remover botão"
                      @click="removeInteractiveButton(index)"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>

                  <AppButton
                    variant="outline"
                    size="sm"
                    :disabled="interactiveButtons.length >= 3"
                    class="add-button"
                    @click="addInteractiveButton"
                  >
                    Adicionar botão
                  </AppButton>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </article>

      <aside class="preview-panel">
        <div class="panel-header preview-panel-header">
          <div>
            <h2>Pré-visualização</h2>
            <p>Visão do paciente no WhatsApp.</p>
          </div>
          <span class="live-status"><i></i> Em tempo real</span>
        </div>

        <div class="whatsapp-preview">
          <div class="conversation-header">
            <div class="clinic-avatar">
              <img
                v-if="clinicLogo && !clinicLogoError"
                :src="clinicLogo"
                :alt="`Logo de ${clinicName}`"
                @error="clinicLogoError = true"
              />
              <UserRound v-else :size="22" aria-hidden="true" />
            </div>
            <div>
              <strong>{{ clinicName }}</strong>
              <span>Conta comercial</span>
            </div>
          </div>

          <div class="conversation-body">
            <span class="day-pill">Hoje</span>

            <div class="message-group">
              <div class="message-bubble" :class="{ 'is-empty': !templateContent }">
                <template v-if="templateContent">
                  <div
                    v-if="templateTitle"
                    class="bubble-title"
                    v-html="formattedTitlePreview"
                  ></div>
                  <div class="bubble-content" v-html="formattedBodyPreview"></div>
                  <div
                    v-if="templateFooter"
                    class="bubble-footer"
                    v-html="formattedFooterPreview"
                  ></div>
                </template>
                <span v-else class="empty-preview-text">
                  Sua mensagem aparecerá aqui enquanto você escreve.
                </span>
                <time>10:42</time>
              </div>

              <div
                v-if="interactiveEnabled && visibleInteractiveButtons.length"
                class="preview-buttons"
              >
                <button
                  v-for="button in visibleInteractiveButtons"
                  :key="button.id"
                  type="button"
                >
                  {{ button.displayText }}
                </button>
              </div>
            </div>
          </div>

          <div class="preview-caption">
            <span>{{ templateName || 'Modelo sem nome' }}</span>
            <span>Dados de exemplo são usados na prévia</span>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.template-editor-page {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  height: calc(100vh - 7.5rem);
  min-height: 0;
  overflow: hidden;
  color: #0f172a;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.header-left,
.header-actions {
  display: flex;
  align-items: center;
}

.header-left {
  gap: 0.8rem;
  min-width: 0;
}

.header-actions {
  gap: 0.65rem;
  margin-left: auto;
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #e5eaf1;
  border-radius: 0.65rem;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.back-button:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.page-copy {
  min-width: 0;
}

.title {
  margin: 0;
  color: #0f172a;
  font-family: var(--fonte-titulo);
  font-size: clamp(1.45rem, 1.3vw + 1rem, 2rem);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.12;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.loading-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  color: #64748b;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(350px, 0.84fr);
  flex: 1;
  min-height: 0;
  gap: 0.85rem;
}

.editor-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 12px 28px rgba(15, 23, 42, 0.028);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
  min-height: 62px;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #edf2f7;
  background: #fbfcfe;
}

.panel-header h2,
.interactive-summary h3 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: 0;
}

.panel-header p,
.interactive-summary p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.78rem;
}

.required-note {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
}

.editor-form {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 0.7rem;
  overflow-y: auto;
  padding: 0.9rem 1rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.field-grid--identity {
  grid-template-columns: minmax(220px, 1.1fr) minmax(180px, 0.9fr);
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.38rem;
}

.field > span,
.message-label-row > label {
  color: #334155;
  font-size: 0.78rem;
  font-weight: 650;
}

.field b,
.message-label-row b {
  color: #ef4444;
  font-weight: 650;
}

.field input,
.message-field textarea {
  width: 100%;
  border: 1px solid #e5eaf1;
  border-radius: 0.65rem;
  outline: none;
  background: #fff;
  color: #0f172a;
  font-family: var(--fonte-principal);
  font-size: 0.88rem;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.field input {
  height: 38px;
  padding: 0 0.75rem;
}

.field input::placeholder,
.message-field textarea::placeholder {
  color: #a1aab8;
}

.field input:focus,
.message-field textarea:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.section-divider {
  height: 1px;
  flex-shrink: 0;
  background: #f1f5f9;
}

.message-field {
  display: flex;
  flex: 1 1 170px;
  min-height: 170px;
  flex-direction: column;
  position: relative;
}

.message-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 27px;
  margin-bottom: 0.38rem;
}

.format-actions {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 0.5rem;
  background: #fff;
}

.format-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 27px;
  border: 0;
  border-right: 1px solid #e5eaf1;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.75rem;
}

.format-actions button:last-child {
  border-right: 0;
}

.format-actions button:hover {
  background: #f8fafc;
  color: #0f172a;
}

.message-field textarea {
  flex: 1;
  min-height: 136px;
  resize: none;
  padding: 0.75rem 0.8rem 1.7rem;
  line-height: 1.5;
}

.character-count {
  position: absolute;
  right: 0.65rem;
  bottom: 0.45rem;
  color: #94a3b8;
  font-size: 0.68rem;
  pointer-events: none;
}

.variables-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  flex-shrink: 0;
}

.variables-label {
  padding-top: 0.35rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
}

.variable-chips {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.variable-chip {
  min-height: 27px;
  padding: 0 0.55rem;
  border: 1px solid #dbeafe;
  border-radius: 0.45rem;
  background: #eff6ff;
  color: #2563eb;
  cursor: pointer;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 650;
  white-space: nowrap;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.variable-chip:hover {
  border-color: #93c5fd;
  background: #dbeafe;
}

.variable-chip--more {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-family: var(--fonte-principal);
}

.variables-more {
  position: relative;
}

.variables-popover {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.45rem);
  z-index: 20;
  display: flex;
  width: min(330px, 80vw);
  max-height: 230px;
  flex-direction: column;
  overflow-y: auto;
  padding: 0.4rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.7rem;
  background: #fff;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.13);
}

.variables-popover button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.55rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.variables-popover button:hover {
  background: #f8fafc;
}

.variables-popover code {
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 650;
}

.variables-popover span {
  overflow: hidden;
  color: #64748b;
  font-size: 0.74rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-message {
  flex-shrink: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid #fecaca;
  border-radius: 0.55rem;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.78rem;
}

.interactive-section {
  flex-shrink: 0;
  padding-top: 0.7rem;
  border-top: 1px solid #edf2f7;
}

.interactive-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.compact-switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
}

.compact-switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.compact-switch > span:not(.sr-only) {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.2s ease;
}

.compact-switch > span:not(.sr-only)::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  content: '';
  transition: transform 0.2s ease;
}

.compact-switch input:checked + span {
  background: #2563eb;
}

.compact-switch input:checked + span::after {
  transform: translateX(16px);
}

.compact-switch input:focus-visible + span {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.interactive-editor {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.button-type-control {
  display: flex;
  align-self: start;
  flex-direction: column;
  overflow: hidden;
  padding: 0.2rem;
  border: 1px solid #e5eaf1;
  border-radius: 0.6rem;
  background: #f8fafc;
}

.button-type-control button {
  min-height: 30px;
  padding: 0 0.65rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
}

.button-type-control button.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.buttons-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
}

.button-row {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr) 34px;
  align-items: end;
  gap: 0.5rem;
}

.field--compact {
  gap: 0.25rem;
}

.field--compact > span {
  font-size: 0.7rem;
}

.field--compact input {
  height: 34px;
  font-size: 0.8rem;
}

.remove-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #e5eaf1;
  border-radius: 0.55rem;
  background: #fff;
  color: #94a3b8;
  cursor: pointer;
}

.remove-button:hover:not(:disabled) {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.remove-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-button {
  align-self: flex-start;
}

.preview-panel-header {
  min-height: 62px;
}

.live-status {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.live-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.whatsapp-preview {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  background: #f8fafc;
}

.conversation-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
  min-height: 58px;
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.clinic-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #e9edef;
  color: #94a3b8;
}

.clinic-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conversation-header > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.conversation-header strong {
  color: #111827;
  font-size: 0.84rem;
  font-weight: 650;
}

.conversation-header span {
  color: #64748b;
  font-size: 0.68rem;
}

.conversation-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: flex-start;
  overflow-y: auto;
  padding: 1rem;
  background-color: #efeae2;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.18)),
    radial-gradient(circle at 1px 1px, rgba(91, 80, 68, 0.08) 1px, transparent 0);
  background-size: auto, 22px 22px;
}

.day-pill {
  align-self: center;
  margin-bottom: 1rem;
  padding: 0.3rem 0.7rem;
  border-radius: 0.35rem;
  background: rgba(255, 255, 255, 0.88);
  color: #667781;
  font-size: 0.65rem;
  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06);
}

.message-group {
  width: min(86%, 520px);
}

.message-bubble {
  position: relative;
  min-width: 160px;
  padding: 0.72rem 0.8rem 1.2rem;
  border-radius: 0.25rem 0.7rem 0.7rem 0.7rem;
  background: #fff;
  color: #1f2937;
  font-size: 0.86rem;
  line-height: 1.48;
  overflow-wrap: anywhere;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1);
}

.message-bubble::before {
  position: absolute;
  top: 0;
  left: -7px;
  width: 0;
  height: 0;
  border-top: 8px solid #fff;
  border-left: 8px solid transparent;
  content: '';
}

.message-bubble.is-empty {
  color: #94a3b8;
}

.bubble-title {
  margin-bottom: 0.3rem;
  color: #111827;
  font-weight: 700;
}

.bubble-footer {
  margin-top: 0.45rem;
  color: #7c8792;
  font-size: 0.73rem;
}

.message-bubble time {
  position: absolute;
  right: 0.55rem;
  bottom: 0.3rem;
  color: #8696a0;
  font-size: 0.61rem;
}

.message-bubble :deep(.variable-preview) {
  color: #166534;
  font-weight: 600;
}

.message-bubble :deep(strong) { font-weight: 700; }
.message-bubble :deep(em) { font-style: italic; }
.message-bubble :deep(s) { text-decoration: line-through; }

.preview-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.28rem;
}

.preview-buttons button {
  min-height: 36px;
  border: 0;
  border-radius: 0.45rem;
  background: #fff;
  color: #0284c7;
  cursor: default;
  font-size: 0.8rem;
  font-weight: 650;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.preview-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 42px;
  flex-shrink: 0;
  padding: 0.55rem 0.9rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  color: #94a3b8;
  font-size: 0.68rem;
}

.preview-caption span:first-child {
  overflow: hidden;
  color: #475569;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: opacity 0.2s ease, max-height 0.25s ease, margin 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 440px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .template-editor-page {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .editor-workspace {
    grid-template-columns: 1fr;
  }

  .editor-panel {
    max-height: none;
  }

  .editor-form {
    overflow: visible;
  }

  .message-field {
    min-height: 230px;
  }

  .preview-panel {
    min-height: 520px;
  }
}

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    margin-left: 0;
  }

  .header-actions :deep(.app-button) {
    flex: 1;
  }

  .field-grid,
  .field-grid--identity {
    grid-template-columns: 1fr;
  }

  .variables-row {
    flex-direction: column;
    gap: 0.4rem;
  }

  .interactive-editor {
    grid-template-columns: 1fr;
  }

  .button-type-control {
    flex-direction: row;
  }

  .button-type-control button {
    flex: 1;
    text-align: center;
  }

  .button-row {
    grid-template-columns: 1fr 34px;
  }

  .button-row .field:first-child {
    grid-column: 1 / -1;
  }

  .preview-panel {
    min-height: 460px;
  }

  .preview-caption span:last-child {
    display: none;
  }
}
</style>
