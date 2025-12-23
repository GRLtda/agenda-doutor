<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppointmentsStore } from '@/stores/appointments'
import { useRecordsStore } from '@/stores/records'
import { usePatientsStore } from '@/stores/patients'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useProceduresStore } from '@/stores/procedures' // ✨ Import Store
import { useLayoutStore } from '@/stores/layout'
import { useEditor, EditorContent} from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'

import EditorToolbar from '@/components/shared/EditorToolbar.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import RecordAttachments from '@/components/pages/appointments/RecordAttachments.vue'
import SaveStatusIndicator from '@/components/shared/SaveStatusIndicator.vue'
import AnamnesisAnswersModal from '@/components/pages/dashboard/AnamnesisAnswersModal.vue'

import {
  User,
  Calendar,
  Stethoscope,
  FileText,
  Image,
  Paperclip,
  ChevronRight,
  Clock,
  ArrowLeft,
  FlaskConical,
  FilePlus2,
  Pill,
  LoaderCircle,
  Menu,
  X,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2, // ✨ Ícone
  CheckCircle2,
  Pencil,
  Plus, // ✨ Import Plus icon
  Syringe, // ✨ Import Syringe icon for procedures
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import AddProcedureModal from '@/components/modals/AddProcedureModal.vue' // ✨ Import Modal
import CheckoutModal from '@/components/modals/CheckoutModal.vue' // ✨ Import Checkout Modal
import ImportBudgetModal from '@/components/modals/ImportBudgetModal.vue' // ✨ Import Budget Modal

const route = useRoute()
const router = useRouter()
const appointmentsStore = useAppointmentsStore()
const recordsStore = useRecordsStore()
const patientsStore = usePatientsStore()
const anamnesisStore = useAnamnesisStore()
const proceduresStore = useProceduresStore() // ✨ Initialize Store
const layoutStore = useLayoutStore()
const toast = useToast()

let debounceTimeout = null

const appointmentId = route.params.appointmentId
const patientId = route.params.patientId

const appointment = ref(null)
const patient = ref(null)
const activeTab = ref('record')
const selectedModel = ref(null)
const isViewMode = ref()
const isLoadingData = ref(true)

const isMobile = ref(false)
const isKeyboardOpen = ref(false)
const mobileToolbarStyle = ref({})
const isSidebarOpen = ref(false) 

const currentRecord = computed(() => recordsStore.currentRecord)
const saveStatus = ref('idle')
const lastSaved = ref(null)

// ✨ Sliding Indicator Logic
const sideMenuRef = ref(null)
const indicatorStyle = ref({
  top: '0px',
  height: '0px',
  opacity: 0
})

const updateIndicator = () => {
  nextTick(() => {
    if (!sideMenuRef.value) return
    
    // Find active button
    const activeBtn = sideMenuRef.value.querySelector('.is-active')
    
    if (activeBtn) {
      const navRect = sideMenuRef.value.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      
      indicatorStyle.value = {
        top: `${btnRect.top - navRect.top}px`,
        height: `${btnRect.height}px`,
        opacity: 1
      }
    } else {
      indicatorStyle.value = { ...indicatorStyle.value, opacity: 0 }
    }
  })
}

// Watch activeTab to update indicator
watch(activeTab, () => {
  updateIndicator()
}, { immediate: true })

// Update on resize too
const handleResize = () => {
  updateIndicator()
  handleViewportChange()
}

// ✨ State for "See More" functionality
const showAllPending = ref(false)
const showAllAnswered = ref(false)

// ✨ State for Anamnesis Modal
const selectedAnamnesis = ref(null)
const showAnamnesisModal = ref(false)
const isEditingAnamnesis = ref(false) // ✨ New state
const anamnesisTab = ref('pending') // 'pending' | 'answered'

function openAnamnesisModal(anamnesis, editMode = false) {
  selectedAnamnesis.value = anamnesis
  isEditingAnamnesis.value = editMode
  showAnamnesisModal.value = true
}

function handleAnamnesisSaved(updatedData) {
  isEditingAnamnesis.value = false
  // Atualiza o objeto selecionado com os novos dados (ex: status, updatedAt)
  if (selectedAnamnesis.value) {
    selectedAnamnesis.value = { ...selectedAnamnesis.value, ...updatedData }
  }
}

// ✨ Procedure Management State
const showAddProcedureModal = ref(false)
const isAddingProcedure = ref(false)

// ✨ Checkout State
const showCheckoutModal = ref(false)
const isProcessingCheckout = ref(false)

// ✨ Import Budget State
const showImportBudgetModal = ref(false)

async function handleDeleteProcedure(procedure) {
  if (!confirm('Tem certeza que deseja remover este procedimento?')) {
    return
  }
  
  // ✨ FIX: Use recordsStore instead of patientsStore because we are effectively editing the Record
  // The procedure ID here corresponds to the subdocument in the Record, not the Patient document
  const result = await recordsStore.removeProcedureFromRecord(currentRecord.value._id, procedure._id)
  
  if (result.success) {
      toast.success('Procedimento removido com sucesso!')
      // Record is automatically updated via store
  } else {
    toast.error(result.error || 'Erro ao remover procedimento')
  }
}

async function handleAddProcedure(payload) {
  isAddingProcedure.value = true
  try {
    const result = await recordsStore.addProcedureToRecord(payload)

    if (result.success) {
      toast.success('Procedimento adicionado com sucesso!')
      showAddProcedureModal.value = false
      // Refresh record to get updated procedures
      await recordsStore.fetchRecordByAppointmentId(appointmentId)
    } else {
      toast.error(result.error || 'Erro ao adicionar procedimento.')
    }
  } catch (error) {
    console.error(error)
    toast.error('Erro inesperado ao adicionar procedimento.')
  } finally {
    isAddingProcedure.value = false
  }
}

// ✨ Handle Budget Import
async function handleBudgetImported() {
  // Refresh record to get updated procedures from imported budget
  await recordsStore.fetchRecordByAppointmentId(appointmentId)
  toast.success('Procedimentos do orçamento adicionados!')
}

// Cronômetro
const elapsedTimeInSeconds = ref(0)
const timerInterval = ref(null)
const formattedElapsedTime = computed(() => {
  const hours = Math.floor(elapsedTimeInSeconds.value / 3600)
  const minutes = Math.floor((elapsedTimeInSeconds.value % 3600) / 60)
  const seconds = elapsedTimeInSeconds.value % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// ✨ Get procedures from current record
const currentAppointmentProcedures = computed(() => {
  if (!currentRecord.value || !currentRecord.value.procedures) return []
  return currentRecord.value.procedures
})

const recordModels = ref([
  { label: 'Anamnese Geral', value: 'anamnese-geral' },
  { label: 'Retorno', value: 'retorno' },
  { label: 'Avaliação Inicial', value: 'avaliacao-inicial' },
])

// ✨ FUNÇÃO ATUALIZADA PARA CALCULAR A POSIÇÃO CORRETA EM TEMPO REAL ✨
const handleViewportChange = () => {
  const isNowMobile = window.innerWidth <= 768
  isMobile.value = isNowMobile

  if (isNowMobile && window.visualViewport) {
    const viewport = window.visualViewport
    const windowHeight = window.innerHeight
    // Calcula a altura do teclado, considerando também a rolagem da página
    const keyboardHeight = windowHeight - (viewport.height + viewport.offsetTop)

    const isKeyboardUp = keyboardHeight > 100 // Uma tolerância para evitar falsos positivos

    if (isKeyboardOpen.value !== isKeyboardUp) {
      isKeyboardOpen.value = isKeyboardUp
    }

    if (isKeyboardUp) {
      // Quando o teclado está aberto, movemos a barra para cima
      mobileToolbarStyle.value = {
        transform: `translateY(-${keyboardHeight}px)`,
        visibility: 'visible',
      }
    } else {
      // Quando o teclado está fechado, escondemos a barra
      mobileToolbarStyle.value = {
        transform: 'translateY(100%)',
        visibility: 'hidden',
      }
    }
  } else {
    // Comportamento padrão para desktop ou navegadores sem suporte
    isKeyboardOpen.value = false
    mobileToolbarStyle.value = {
      transform: 'translateY(100%)',
      visibility: 'hidden',
    }
  }
}

async function autoSave() {
  let recordId = recordsStore.currentRecord?._id
  const content = editor.value.getHTML()

  if (recordsStore.currentRecord && recordsStore.currentRecord.content === content) {
    saveStatus.value = 'saved'
    return
  }

  const recordData = {
    patientId: patientId,
    appointmentId: appointmentId,
    content: content,
  }

  let result
  if (recordId) {
    result = await recordsStore.updateRecord(recordId, recordData)
  } else {
    result = await recordsStore.createRecord(recordData)
  }

  if (result.success) {
    saveStatus.value = 'saved'
    lastSaved.value = new Date()
  } else {
    saveStatus.value = 'error'
  }
}

const editor = useEditor({
  content: '',
  extensions: [StarterKit, Underline, BubbleMenuExtension],
  editorProps: {
    attributes: {
      class: 'prose focus:outline-none max-w-none',
    },
  },
  onUpdate() {
    if (isViewMode.value) return

    saveStatus.value = 'saving'
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      autoSave()
    }, 1500)
  },
})

const patientAge = computed(() => {
  if (patient.value && patient.value.birthDate) {
    const birthDate = new Date(patient.value.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return `${age} anos`
  }
  return 'N/A'
})

onMounted(async () => {
  isLoadingData.value = true // Manter o loading ativo

  await patientsStore.fetchPatientById(patientId)
  patient.value = patientsStore.selectedPatient

  // ✨ Buscar agendamento pelo ID diretamente (funciona para qualquer data)
  const { success, data } = await appointmentsStore.fetchAppointmentById(appointmentId)
  
  if (!success || !data) {
    toast.error('Agendamento não encontrado.')
    router.push('/app/atendimentos')
    return
  }

  appointment.value = data

  isViewMode.value = appointment.value.status === 'Realizado'

  // ✨ Atualizar status para "Iniciado" quando não estiver em modo de visualização
  if (!isViewMode.value && appointment.value.status !== 'Iniciado') {
    await appointmentsStore.updateAppointmentStatus(appointmentId, 'Iniciado')
  }

  await recordsStore.fetchRecordByAppointmentId(appointmentId)

  if (isViewMode.value) {
    editor.value.setEditable(false)
  }

  if (currentRecord.value) {
    editor.value.commands.setContent(currentRecord.value.content)
    saveStatus.value = 'saved'
    lastSaved.value = new Date(currentRecord.value.updatedAt)
  } else {
    const defaultRecordContent = ``
    editor.value.commands.setContent(defaultRecordContent)
    saveStatus.value = 'idle'
  }

  if (!isViewMode.value) {
    elapsedTimeInSeconds.value = currentRecord.value?.durationInSeconds || 0
    timerInterval.value = setInterval(() => {
      elapsedTimeInSeconds.value++
    }, 1000)
  }

  isLoadingData.value = false

  // ✨ ADICIONAR "ESCUTADORES" DE EVENTO MAIS ROBUSTOS ✨
  window.addEventListener('resize', handleResize)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize)
    window.visualViewport.addEventListener('scroll', handleViewportChange)
  }
  
  // Initial update
  setTimeout(updateIndicator, 100)
  handleViewportChange() // Verificação inicial

  // ✨ Fetch Anamneses & Procedures
  if (patientId) {
    await Promise.all([
      anamnesisStore.fetchAnamnesisForPatient(patientId),
      proceduresStore.fetchProcedures()
    ])
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  // ✨ REMOVER "ESCUTADORES" DE EVENTO ✨
  window.removeEventListener('resize', handleResize)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleResize)
    window.visualViewport.removeEventListener('scroll', handleViewportChange)
  }
})

function loadModel(modelValue) {
  let content = ''
  if (modelValue === 'anamnese-geral') {
    content = `
      <h2>Queixa Principal:</h2><p>...</p>
      <h2>Histórico da Doença Atual (HDA):</h2><p>...</p>
      <h2>Histórico Médico Pregresso (HMP):</h2><p>...</p>
      <h2>Exame Físico:</h2><p>...</p>
      <h2>Condutas/Plano Terapêutico:</h2><p>...</p>
    `
  } else if (modelValue === 'retorno') {
    content = `
      <h2>Evolução:</h2><p>...</p>
      <h2>Novas Queixas:</h2><p>...</p>
      <h2>Ajustes no Plano:</h2><p>...</p>
    `
  } else if (modelValue === 'avaliacao-inicial') {
    content = `
      <h2>Dados da Avaliação Inicial:</h2><p></p>
      <h2>Primeiras Impressões:</h2><p></p>
      <h2>Plano de Ação Inicial:</h2><p></p>
    `
  }
  editor.value.commands.setContent(content)
  saveStatus.value = 'saving'
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(autoSave, 500)
}

async function saveAndFinish() {
  if (!appointment.value) {
    toast.error('Erro ao finalizar: Dados do agendamento não encontrados.')
    return
  }



  // Salvar o prontuário antes de abrir o modal de checkout
  clearTimeout(debounceTimeout)
  await autoSave()

  if (saveStatus.value === 'error') {
    toast.error('Não foi possível salvar as últimas alterações. Tente novamente.')
    return
  }

  // Abrir modal de checkout
  showCheckoutModal.value = true
}

// ✨ Handle Checkout Confirmation
async function handleCheckoutConfirm(checkoutData) {
  isProcessingCheckout.value = true
  
  try {
    const result = await patientsStore.checkout(checkoutData)
    
    if (result.success) {
      toast.success('Atendimento finalizado com sucesso!')
      showCheckoutModal.value = false
      router.push('/app/atendimentos')
    } else {
      toast.error(result.error || 'Erro ao processar checkout.')
    }
  } catch (error) {
    console.error('Erro no checkout:', error)
    toast.error('Erro inesperado ao finalizar atendimento.')
  } finally {
    isProcessingCheckout.value = false
  }
}


const menuItems = [
  { id: 'record', label: 'Prontuario', icon: FileText },
  { id: 'patient-info', label: 'Informações', icon: User },
  { id: 'exams', label: 'Exames', icon: Stethoscope },
  { id: 'prescriptions', label: 'Prescrições', icon: Calendar },
  { id: 'documents', label: 'Documentos', icon: Paperclip },
  { id: 'images', label: 'Imagens e Anexos', icon: Image },
]

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div v-if="isLoadingData" class="loading-container">
    <LoaderCircle :size="48" class="animate-spin" />
    <p>Carregando atendimento...</p>
  </div>

  <div v-else class="in-progress-appointment-layout">
    <AddProcedureModal
      v-if="showAddProcedureModal"
      :appointment-id="appointmentId"
      :is-loading="isAddingProcedure"
      @close="showAddProcedureModal = false"
      @save="handleAddProcedure"
    />

    <CheckoutModal
      v-if="showCheckoutModal"
      :procedures="currentRecord?.procedures || []"
      :patient-id="patientId"
      :appointment-id="appointmentId"
      :patient-name="currentRecord?.patient?.name || 'Paciente'"
      :appointment-date="currentRecord?.appointmentDate || new Date().toLocaleDateString('pt-BR')"
      :appointment-time="currentRecord?.appointmentTime || '00:00'"
      @close="showCheckoutModal = false"
      @confirm="handleCheckoutConfirm"
    />

    <ImportBudgetModal
      v-if="showImportBudgetModal"
      :patient-id="patientId"
      :appointment-id="appointmentId"
      @close="showImportBudgetModal = false"
      @imported="handleBudgetImported"
    />

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="sidebar-overlay"></div>

    <aside class="left-sidebar" :class="{ 'is-mobile-open': isSidebarOpen }">
      <button @click="isSidebarOpen = false" class="mobile-close-btn">
        <X :size="24" />
      </button>

      <div v-if="patient" class="patient-card">
        <div class="avatar">{{ patient.name?.charAt(0) }}</div>
        <div class="patient-details">
          <div class="name">{{ patient.name }}</div>
          <div class="detail-row">
            <span>Idade</span>
            <span class="value">{{ patientAge }}</span>
          </div>
          <div class="detail-row">
            <span>Convênio</span>
            <span class="value">{{ patient.healthInsurance || '----' }}</span>
          </div>
          <div class="detail-row">
            <span>Primeiro Atend.</span>
            <span class="value">{{
              patient.firstAppointmentDate
                ? new Date(patient.firstAppointmentDate).toLocaleDateString('pt-BR')
                : 'N/A'
            }}</span>
          </div>
        </div>
      </div>
      <nav class="side-menu" ref="sideMenuRef">
        <!-- Indicador flutuante que desliza -->
        <div 
          class="sliding-indicator" 
          :style="{ 
            top: indicatorStyle.top, 
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity 
          }"
        ></div>

        <button
          v-for="item in menuItems"
          :key="item.id"
          :class="{ 'is-active': activeTab === item.id }"
          @click="activeTab = item.id"
        >
          <component :is="item.icon" :size="20" stroke-width="2" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <!-- ✨ Desktop Sidebar Footer -->
      <div class="sidebar-footer desktop-only">
        <AppButton @click="router.push('/app/atendimentos')" variant="default" class="w-full">
          <ArrowLeft :size="16" />
          Voltar
        </AppButton>
      </div>

      <div class="mobile-sidebar-footer">
        <div v-if="!isViewMode" class="footer-info-group">
          <div class="appointment-timer">
            <Clock :size="18" />
            <span>{{ formattedElapsedTime }}</span>
          </div>
          <SaveStatusIndicator :status="saveStatus" :last-saved="lastSaved" />
        </div>
        <AppButton @click="router.back()" variant="default">
          <ArrowLeft :size="16" />
          Voltar
        </AppButton>
        
        <!-- ✨ Finalizar Atendimento (Mobile Sidebar) -->
        <AppButton
          v-if="!isViewMode"
          @click="saveAndFinish"
          variant="secondary"
          class="mobile-finish-btn"
          :loading="recordsStore.isLoading || appointmentsStore.isLoading"
          :disabled="recordsStore.isLoading || appointmentsStore.isLoading"
        >
          Finalizar
          <ChevronRight :size="16" />
        </AppButton>
      </div>
    </aside>

    <!-- ✨ Main Content Wrapper (TopBar + Content) -->
    <div class="main-content-wrapper">
      <header class="top-bar">
        <div class="header-left">
          <button @click="isSidebarOpen = true" class="mobile-sidebar-toggle">
            <Menu :size="24" />
          </button>
          <div class="header-title">
            {{ isViewMode ? 'Visualizando Atendimento' : 'Novo Atendimento' }}
          </div>
        </div>
        <div class="header-center">
          <div v-if="!isViewMode" class="appointment-timer desktop-only">
            <Clock :size="18" />
            <span>{{ formattedElapsedTime }}</span>
          </div>
        </div>
        <div class="header-right">
          <div v-if="!isViewMode" class="appointment-timer mobile-only">
            <Clock :size="18" />
            <span>{{ formattedElapsedTime }}</span>
          </div>

          <SaveStatusIndicator
            v-if="!isViewMode"
            :status="saveStatus"
            :last-saved="lastSaved"
            class="desktop-only"
          />

          <AppButton
            v-if="!isViewMode"
            @click="saveAndFinish"
            variant="secondary"
            :loading="recordsStore.isLoading || appointmentsStore.isLoading"
            :disabled="recordsStore.isLoading || appointmentsStore.isLoading"
          >
            <span class="desktop-only">Finalizar</span>
            <ChevronRight :size="16" />
          </AppButton>
        </div>
      </header>

      <main
        class="editor-main-content"
        :class="{ 'keyboard-open-padding': isMobile && isKeyboardOpen }"
      >
        <div v-if="activeTab === 'record'" class="tab-content">
          <div class="editor-wrapper">
            <div v-if="editor && !isViewMode" class="editor-top-bar">
              <div class="modelos-dropdown">
                <StyledSelect
                  :options="recordModels"
                  v-model="selectedModel"
                  @update:modelValue="loadModel"
                  placeholder="Usar modelo"
                />
              </div>
            </div>

            <EditorToolbar v-if="!isViewMode" :editor="editor" />

            <div v-if="isViewMode" class="view-mode-header">
              <FileText :size="22" stroke-width="2.5" />
              <h3>Anotações do Atendimento</h3>
            </div>
            <EditorContent v-if="editor" :editor="editor" class="editor-content" />

            <div
              v-if="editor && isMobile"
              class="mobile-editor-toolbar"
              :style="mobileToolbarStyle"
            >
              <EditorToolbar :editor="editor" />
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'patient-info'" class="tab-content tab-content-fixed">
          <div class="patient-info-layout">
            <!-- Left Column: General Info -->
            <div class="info-column">
              <h3 class="column-title">Dados do Paciente</h3>
              
              <!-- Patient Card -->
              <div class="patient-profile-card">
                <div class="profile-header">
                  <div class="profile-avatar">
                    {{ patient?.name?.charAt(0) || 'P' }}
                  </div>
                  <div class="profile-info">
                    <h2 class="profile-name">{{ patient?.name || 'Nome do Paciente' }}</h2>
                    <div class="profile-contact">
                      <div class="contact-item" v-if="patient?.phone">
                        <Phone :size="14" />
                        <span>{{ patient.phone }}</span>
                      </div>
                      <div class="contact-item" v-if="patient?.email">
                        <Mail :size="14" />
                        <span>{{ patient.email }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Details Card -->
              <div class="info-card mt-4">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">CPF</span>
                    <span class="value">{{ patient?.cpf || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">DATA DE NASCIMENTO</span>
                    <span class="value">{{ patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">IDADE</span>
                    <span class="value">{{ patientAge }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">CONVÊNIO</span>
                    <span class="value">{{ patient?.healthInsurance || 'N/A' }}</span>
                  </div>
                </div>
              </div>

              <!-- ✨ Procedures Section -->
              <div class="procedures-section mt-6">
                <div class="section-header">
                  <h3 class="column-title mb-0">Procedimentos</h3>
                  <AppButton
                    v-if="!isViewMode"
                    variant="ghost"
                    size="sm"
                    @click="showAddProcedureModal = true"
                    class="btn-add-procedure"
                  >
                    <Plus :size="16" />
                    Adicionar
                  </AppButton>
                </div>

                <div class="procedures-list info-card mt-2">
                  <div v-if="currentAppointmentProcedures.length === 0" class="empty-list">
                    Nenhum procedimento registrado neste atendimento.
                  </div>
                  <ul v-else class="procedure-items">
                    <li v-for="(proc, index) in currentAppointmentProcedures" :key="index" class="procedure-item">
                      <div class="proc-icon">
                        <Syringe :size="18" />
                      </div>
                      <div class="proc-info">
                        <span class="proc-name">{{ proc.name }}</span>
                        <span class="proc-details">
                          {{ formatDate(proc.assignedAt) }}
                        </span>
                      </div>
                      <div class="proc-values">
                        <div v-if="proc.originalValue > proc.finalValue" class="original-price">
                          {{ formatCurrency(proc.originalValue) }}
                        </div>
                        <div class="final-price-row">
                          <span v-if="proc.originalValue > proc.finalValue" class="discount-badge">-{{ Math.round(((proc.originalValue - proc.finalValue) / proc.originalValue) * 100) }}%</span>
                          <span class="final-price">{{ formatCurrency(proc.finalValue) }}</span>
                        </div>
                        <AppButton 
                          v-if="!isViewMode" 
                          @click="handleDeleteProcedure(proc)" 
                          variant="ghost" 
                          size="sm" 
                          class="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remover Procedimento"
                        >
                              <Trash2 :size="14" />
                        </AppButton>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- ✨ Budgets Section -->
              <div class="budgets-section mt-6" v-if="!isViewMode">
                <div class="section-header">
                  <h3 class="column-title mb-0">Orçamentos</h3>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    @click="showImportBudgetModal = true"
                    class="btn-import-budget"
                  >
                    <Plus :size="16" />
                    Importar Orçamento
                  </AppButton>
                </div>
                <div class="info-card mt-2">
                  <p class="import-hint">
                    Importe um orçamento existente para adicionar todos os procedimentos automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <!-- Right Column: Anamneses (Scrollable) -->
            <div class="anamnesis-column">
              <h3 class="column-title">Anamneses</h3>
              
              <div class="anamnesis-scroll-area info-card">
                <!-- Tabs Header -->
                <div class="anamnesis-tabs">
                  <button 
                    class="tab-btn" 
                    :class="{ active: anamnesisTab === 'pending' }"
                    @click="anamnesisTab = 'pending'"
                  >
                    <Clock :size="18" />
                    Pendentes
                    <span class="count-badge" v-if="anamnesisStore.pendingAnamneses.length">
                      {{ anamnesisStore.pendingAnamneses.length }}
                    </span>
                  </button>
                  <button 
                    class="tab-btn" 
                    :class="{ active: anamnesisTab === 'answered' }"
                    @click="anamnesisTab = 'answered'"
                  >
                    <CheckCircle2 :size="18" />
                    Realizadas
                    <span class="count-badge" v-if="anamnesisStore.answeredAnamneses.length">
                      {{ anamnesisStore.answeredAnamneses.length }}
                    </span>
                  </button>
                </div>

                <!-- Pending Tab -->
                <div v-if="anamnesisTab === 'pending'" class="anamnesis-group">
                  <div v-if="anamnesisStore.pendingAnamneses.length === 0" class="empty-list">
                    Nenhuma anamnese pendente.
                  </div>
                  <div v-else class="list-wrapper">
                    <ul class="anamnesis-list">
                      <li 
                        v-for="anamnesis in anamnesisStore.pendingAnamneses" 
                        :key="anamnesis._id" 
                        class="anamnesis-item pending"
                      >
                        <div class="anamnesis-info">
                          <span class="anamnesis-name">{{ anamnesis.template?.name || 'Anamnese Sem Título' }}</span>
                          <span class="anamnesis-date">Enviada em: {{ new Date(anamnesis.createdAt).toLocaleDateString('pt-BR') }}</span>
                        </div>
                        <div class="anamnesis-actions">
                            <span class="status-badge pending">Pendente</span>
                            <AppButton 
                              v-if="!isViewMode" 
                              variant="ghost" 
                              size="sm" 
                              @click="openAnamnesisModal(anamnesis, true)" 
                              title="Responder"
                            >
                                <Pencil :size="14" />
                            </AppButton>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Answered Tab -->
                <div v-if="anamnesisTab === 'answered'" class="anamnesis-group">
                  <div v-if="anamnesisStore.answeredAnamneses.length === 0" class="empty-list">
                    Nenhuma anamnese realizada.
                  </div>
                  <div v-else class="list-wrapper">
                    <ul class="anamnesis-list">
                      <li 
                        v-for="anamnesis in anamnesisStore.answeredAnamneses" 
                        :key="anamnesis._id" 
                        class="anamnesis-item completed"
                      >
                        <div class="anamnesis-info">
                          <span class="anamnesis-name">{{ anamnesis.template?.name || 'Anamnese Sem Título' }}</span>
                          <span class="anamnesis-date">Respondida em: {{ new Date(anamnesis.updatedAt).toLocaleDateString('pt-BR') }}</span>
                        </div>
                        <AppButton variant="default" size="sm" @click="openAnamnesisModal(anamnesis)">
                          Ver Respostas
                        </AppButton>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'exams'" class="tab-content tab-content-padded">
          <div class="empty-state-container">
            <div class="empty-state">
              <div class="icon-wrapper">
                <FlaskConical :size="48" stroke-width="1.5" />
              </div>
              <h3 class="empty-title">Nenhum exame solicitado</h3>
              <p class="empty-description">
                Você pode adicionar solicitações de exames para este paciente. Eles ficarão
                registrados aqui.
              </p>
              <AppButton variant="primary" :disabled="true">Solicitar Exame</AppButton>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'prescriptions'" class="tab-content tab-content-padded">
          <div class="empty-state-container">
            <div class="empty-state">
              <div class="icon-wrapper">
                <Pill :size="48" stroke-width="1.5" />
              </div>
              <h3 class="empty-title">Nenhuma prescrição criada</h3>
              <p class="empty-description">
                Crie e gerencie as prescrições de medicamentos e tratamentos para o paciente.
              </p>
              <AppButton variant="primary" :disabled="true">Criar Prescrição</AppButton>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'documents'" class="tab-content tab-content-padded">
          <div class="empty-state-container">
            <div class="empty-state">
              <div class="icon-wrapper">
                <FilePlus2 :size="48" stroke-width="1.5" />
              </div>
              <h3 class="empty-title">Nenhum documento gerado</h3>
              <p class="empty-description">
                Gere atestados, laudos ou outros documentos personalizados para este atendimento.
              </p>
              <AppButton variant="primary" :disabled="true">Gerar Documento</AppButton>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'images'" class="tab-content tab-content-padded">
          <RecordAttachments
            :record="currentRecord"
            :patient-id="patientId"
            :appointment-id="appointmentId"
            :disabled="isViewMode"
          />
        </div>
      </main>
    </div>

    <AnamnesisAnswersModal
      v-if="selectedAnamnesis"
      :anamnesis="selectedAnamnesis"
      :is-open="showAnamnesisModal"
      :is-editing="isEditingAnamnesis"
      @close="showAnamnesisModal = false"
      @saved="handleAnamnesisSaved"
    />


  </div>
</template>

<style scoped>
.in-progress-appointment-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.tab-content-fixed {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.top-bar {
  background-color: #fafbfc;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  flex-shrink: 0;
}

/* Delete Button Style (reused logic) handled by utility classes now */

.patient-info-layout {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  height: 100%;
  overflow: hidden;
  background-color: #f8f9fa;
}

.column-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

.info-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* Prevent unwanted scrollbar */
}

.anamnesis-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}



/* Patient Profile Card */
.patient-profile-card {
  background-color: var(--branco);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

/* ✨ Procedures Styles */
.procedures-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.procedures-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
  flex-shrink: 0;
}

.procedures-list {
  flex: 1;
  overflow-y: auto;
  height: auto; /* Reset height to let flex handle it */
}



.procedure-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.procedure-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.procedure-item:last-child {
  border-bottom: none;
}

.proc-icon {
  color: var(--azul-principal);
  background-color: #eff6ff;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
}

.proc-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.proc-name {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.proc-details {
  font-size: 0.75rem;
  color: #6b7280;
}

.proc-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}

.original-price {
  font-size: 0.75rem;
  color: #9ca3af;
  text-decoration: line-through;
}

.final-price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.final-price {
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
}

.discount-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: #ef4444;
  background-color: #fef2f2;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

/* ✨ Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}



.modal-content {
  background-color: white;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-select, .form-input {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
}

.btn-confirm {
  padding: 0.5rem 1rem;
  background-color: var(--azul-principal);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #e0e7ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 600;
}

.profile-info {
  flex-grow: 1;
}

.profile-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.profile-contact {
  display: flex;
  gap: 1.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Info Card */
.info-card {
  background-color: var(--branco);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.anamnesis-scroll-area.info-card {
  padding: 0;
  border: 1px solid #e5e7eb;
  overflow: hidden; /* Container overflow hidden */
  display: flex;
  flex-direction: column;
  height: 100%; /* Force full height */
}

.mt-4 {
  margin-top: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.side-menu {
  flex-grow: 1;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative; /* Contexto de posicionamento para o indicador */
}

/* Indicador flutuante que desliza */
.sliding-indicator {
  position: absolute;
  left: 0;
  width: 3px;
  background-color: var(--azul-principal);
  border-radius: 0 2px 2px 0;
  transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  pointer-events: none;
  transform: scaleY(0.6);
  transform-origin: center;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-item .label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-item .value {
  font-size: 0.95rem;
  color: #111827;
  font-weight: 500;
}

/* Anamnesis Scroll Area */
.anamnesis-scroll-area {
  flex-grow: 1;
  /* overflow-y: auto; Removed, moved to .anamnesis-group */
}

/* Custom Scrollbar */
.anamnesis-scroll-area::-webkit-scrollbar {
  width: 6px;
}
.anamnesis-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.anamnesis-scroll-area::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
.anamnesis-scroll-area::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.anamnesis-group {
  padding: 1.5rem;
  overflow-y: auto; /* Scroll happens here */
  flex-grow: 1; /* Take remaining space */
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.anamnesis-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 1.5rem; /* Add padding to match card content */
  padding-top: 1rem;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn.active {
  color: var(--azul-principal);
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px; /* Overlap border */
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--azul-principal);
  border-radius: 2px 2px 0 0;
}

.count-badge {
  background-color: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  font-weight: 600;
}

.tab-btn.active .count-badge {
  background-color: #eff6ff;
  color: var(--azul-principal);
}

.group-header {
  display: none; /* Hide old headers */
}

.group-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.list-wrapper {
  display: flex;
  flex-direction: column;
}

.see-more-container {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
  position: relative;
}

/* Gradient effect for the button container */
.see-more-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(to bottom, rgba(248, 249, 250, 0), rgba(248, 249, 250, 1));
  pointer-events: none;
}

.btn-see-more-bottom {
  background: none;
  border: none;
  color: var(--azul-principal);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  transition: all 0.2s ease;
  z-index: 1; /* Ensure button is above gradient */
}

.btn-see-more-bottom:hover {
  opacity: 0.8;
}

.empty-list {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.75rem;
  text-align: center;
}

.anamnesis-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.anamnesis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: var(--branco);
  transition: all 0.2s ease;
}

.anamnesis-item:hover {
  border-color: var(--azul-principal);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.anamnesis-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.anamnesis-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.anamnesis-date {
  font-size: 0.8rem;
  color: #6b7280;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.pending {
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #ffedd5;
}



.anamnesis-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}


.header-left,
.header-right {
  flex: 1;
}
.header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}
.appointment-timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--cinza-texto);
  background-color: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
}

.content-area {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
}
.left-sidebar {
  width: 240px; /* Match Dashboard Sidebar width */
  background-color: #fafbfc;
  border-top-right-radius: 1rem; /* Dashboard aesthetic */
  padding: 1rem;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: 100dvh; /* Garante altura total */
}
.patient-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.patient-card .avatar {
  width: 48px;
  height: 48px;
  border-radius: 0.5rem; /* Square with radius like clinic logo */
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  border: 1px solid #e5e7eb;
}
.patient-card .patient-details .name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}
.patient-card .detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--cinza-texto);
  margin-bottom: 0.25rem;
}
.patient-card .detail-row .value {
  font-weight: 500;
  color: #333;
}
.side-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem; /* Match nav-links gap */
}
.side-menu button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #525866;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.2s ease,
              padding-left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.side-menu button:hover {
  background-color: #f0f2f5;
  color: var(--azul-principal);
  padding-left: 0.875rem;
}
.side-menu button.is-active {
  background-color: #eef2ff;
  color: var(--azul-principal);
  font-weight: 600;
  border-color: transparent;
}
.editor-main-content {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  border-radius: 1rem 0 0 0rem;
  border: 1px solid #e5e7eb;
  flex-direction: column;
}
.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.editor-wrapper {
  background-color: var(--branco);
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
}

.modelos-dropdown {
  width: 200px;
  flex-shrink: 0;
}

:deep(.bubble-menu .editor-toolbar) {
  background-color: #262626;
  padding: 0.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
:deep(.bubble-menu .toolbar-group) {
  border: none;
  background-color: transparent;
}
:deep(.bubble-menu .editor-toolbar button) {
  color: #a1a1aa;
}
:deep(.bubble-menu .editor-toolbar button:hover) {
  background-color: #3f3f46;
  color: white;
}
:deep(.bubble-menu .editor-toolbar button.is-active) {
  background-color: var(--azul-principal);
  color: white;
}

.view-mode-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #333;
  padding: 1rem 1.5rem;
  background-color: #f9fafb;
}
.view-mode-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.editor-top-bar {
  display: none;
  justify-content: flex-end;
  padding: 0.5rem 0.75rem;
  flex-shrink: 0;
}

.editor-content {
  flex-grow: 1;
  padding: 1.5rem;
  outline: none;
  font-size: 1rem;
  line-height: 1.6;
  overflow-y: auto;
}
.editor-content :deep(.ProseMirror) { min-height: 100%; }
.editor-content :deep(.ProseMirror strong) { font-weight: bold; }
.editor-content :deep(.ProseMirror em) { font-style: italic; }
.editor-content :deep(.ProseMirror h1),
.editor-content :deep(.ProseMirror h2),
.editor-content :deep(.ProseMirror h3) {
  font-family: 'Poppins', sans-serif;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}
.editor-content :deep(.ProseMirror h1) { font-size: 1.875rem; font-weight: 700; }
.editor-content :deep(.ProseMirror h2) { font-size: 1.5rem; font-weight: 600; }
.editor-content :deep(.ProseMirror h3) { font-size: 1.25rem; font-weight: 600; }
.editor-content :deep(.ProseMirror p) { margin-bottom: 1rem; }
.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  padding: 0;
}
.editor-content :deep(.ProseMirror li) { margin-bottom: 0.5rem; }
.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  margin-left: 0;
  color: #6b7280;
}
.editor-content :deep(.ProseMirror pre) {
  background: #f3f4f6;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
}
.editor-content :deep(.ProseMirror code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
}
.editor-content :deep(.ProseMirror a) {
  color: var(--azul-principal);
  text-decoration: underline;
}
.tab-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #333;
}

.tab-content-padded {
  padding: 1.5rem 2rem;
}

.empty-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--branco);
  border-radius: 0.75rem;
}

.is-disabled {
  cursor: not-allowed !important;
  opacity: 0.6;
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
  margin: 2rem;
  width: 100%;
  max-width: 600px;
}
.icon-wrapper {
  color: var(--azul-principal);
  margin-bottom: 1.5rem;
}
.empty-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}
.empty-description {
  max-width: 400px;
  color: var(--cinza-texto);
  margin-bottom: 2rem;
  line-height: 1.6;
}
.create-button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.create-button:hover {
  background-color: #3b82f6;
}

.mobile-sidebar-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 0.5rem;
}

.mobile-patient-name {
  display: none;
}

.mobile-only {
  display: none;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 4998;
  display: none;
}

.mobile-close-btn {
  display: none;
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cinza-texto);
}

.desktop-only {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-sidebar-footer {
  display: none;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}
.footer-info-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* ✨ ESTILO ATUALIZADO ✨ */
.mobile-editor-toolbar {
  position: fixed;
  bottom: 0; /* Começa fixo na parte de baixo */
  left: 0;
  right: 0;
  width: 100%;
  background-color: #262626;
  padding: 0.5rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  z-index: 100;
  visibility: hidden; /* Começa invisível */
  transform: translateY(100%); /* Começa fora da tela */
  /* A transição agora é mais simples e suave */
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), visibility 0.3s;
}

.mobile-editor-toolbar :deep(.editor-toolbar) {
  background-color: transparent;
  border: none;
  padding: 0;
  justify-content: center;
}

.mobile-editor-toolbar :deep(.toolbar-group) {
  border: none;
  background-color: transparent;
}

.mobile-editor-toolbar :deep(button) {
  color: #a1a1aa;
}

.mobile-editor-toolbar :deep(button:hover) {
  background-color: #3f3f46;
  color: white;
}

.mobile-editor-toolbar :deep(button.is-active) {
  background-color: var(--azul-principal);
  color: white;
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}

@media (max-width: 1024px) {
  .in-progress-appointment-layout {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }

  .main-content-wrapper {
    display: block;
    position: relative;
    height: auto;
    overflow: visible;
  }

  .editor-main-content {
    height: auto;
    overflow: visible;
  }

  .tab-content {
    height: auto;
  }

  .top-bar {
    padding: 0.75rem 1rem;
    display: flex; /* ✨ Show TopBar on Mobile */
    justify-content: space-between;
    gap: 0.5rem;
    position: relative; /* ✨ For absolute positioning of center element */
  }

  /* Hide Title on Mobile to save space */
  .header-title {
    display: none;
  }

  /* Hide Right Actions on Mobile (moved to sidebar) */
  .header-right .desktop-only,
  .header-right .btn-secondary-solid,
  .header-right .btn-finish-appointment {
    display: none;
  }
  
  .header-right {
    display: flex; /* Ensure container is visible for mobile timer */
    align-items: center;
  }

  /* Show Timer on Mobile (Right side) */
  .mobile-only.appointment-timer {
    display: flex;
    font-size: 0.85rem;
    padding: 0.3rem 0.6rem;
    background-color: #f3f4f6;
    border-radius: 99px;
    white-space: nowrap;
  }

  /* Center: Patient Name */
  .header-center {
    position: absolute; /* ✨ Absolute positioning for perfect center */  
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    align-items: center;
    width: auto;
    max-width: 50%; /* Prevent overlap with side elements */
    overflow: hidden;
  }

  .mobile-patient-name {
    display: block; /* ✨ Override global display: none */
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* Hide Desktop Timer on Mobile */
  .header-center .desktop-only {
    display: none;
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-title {
    font-size: 1.1rem;
  }

  .mobile-sidebar-toggle {
    display: block;
  }

  .sidebar-overlay {
    display: block;
  }

  .left-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    height: 100dvh;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
    z-index: 4999;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.1);
    background-color: var(--branco);
  }

  .left-sidebar.is-mobile-open {
    transform: translateX(0);
  }

  .mobile-close-btn {
    display: block;
  }

  .editor-main-content {
    width: 100%;
  }

  .btn-finish-appointment,
  .btn-secondary-solid {
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
  }
  .appointment-timer {
    font-size: 0.875rem;
    padding: 0.4rem 0.8rem;
  }
  .desktop-only {
    display: none;
  }
  .mobile-sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .mobile-finish-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {


  .editor-main-content.keyboard-open-padding .editor-content {
    padding-bottom: 80px;
  }

  /* ✨ Responsive Patient Info Layout ✨ */
  .patient-info-layout {
    flex-direction: column;
    padding: 1rem;
    height: auto;
    overflow-y: auto;
  }

  .info-column,
  .anamnesis-column {
    width: 100%;
    height: 100%;
    flex: none;
    overflow: visible;
  }

  .anamnesis-scroll-area.info-card {
     height: auto;
     max-height: 500px; /* Optional limit */
  }

  .profile-contact {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .anamnesis-tabs {
    padding: 1rem 0.5rem;
    gap: 0.5rem;
  }

  .tab-btn {
    flex: 1;
    justify-content: center;
    padding: 0.75rem 0.25rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  background-color: #f8f9fa;
  color: #6b7280;
  gap: 1rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 1rem;
}

.w-full {
  width: 100%;
}
</style>
