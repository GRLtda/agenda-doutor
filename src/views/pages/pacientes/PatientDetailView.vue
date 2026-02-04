<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { generateAnamnesisPdf } from '@/helpers/pdf-generator'
import { formatPhone } from '@/directives/phone-mask.js'
import { formatCPF } from '@/directives/cpf-mask.js'

import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { useStatusBadge } from '@/composables/useStatusBadge'

import {
  FileDown,
  ArrowLeft,
  Edit,
  Clipboard,
  FileText,
  CheckSquare,
  Copy,
  History,
  Eye,
  ClipboardList,
  MapPin,
  ClipboardCheck,
  ClipboardPlus,
  CalendarPlus,
  AlertTriangle,
  Stethoscope,
  Trash2,
  MessageSquare,
  Receipt,
  FileSignature,
  RotateCcw,
  Syringe,
  Calendar,
  Hash,
  Activity,
  Briefcase,
  Play,
  Folder
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import AppTabs from '@/components/global/AppTabs.vue'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import PhoneInputWithDDI from '@/components/global/PhoneInputWithDDI.vue'
import { fetchAddressByCEP } from '@/api/external'
import AssignAnamnesisModal from '@/components/pages/pacientes/modals/AssignAnamnesisModal.vue'
import AnamnesisAnswersModal from '@/components/pages/dashboard/AnamnesisAnswersModal.vue'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import PdfPreviewModal from '@/components/pages/pacientes/modals/PdfPreviewModal.vue'
import AddProcedureModal from '@/components/modals/AddProcedureModal.vue'
import PatientNotesTab from '@/components/pages/pacientes/PatientNotesTab.vue'
import PatientBudgetsTab from '@/components/pages/pacientes/PatientBudgetsTab.vue'
import PatientConsentTermsTab from '@/components/pages/pacientes/PatientConsentTermsTab.vue'
import PatientMediaGallery from '@/views/pages/pacientes/components/PatientMediaGallery.vue'

const route = useRoute()
const router = useRouter()
const patientsStore = usePatientsStore()
const anamnesisStore = useAnamnesisStore()
const appointmentsStore = useAppointmentsStore()
const authStore = useAuthStore()
const toast = useToast()

const isEditing = ref(false)
const isAssignModalOpen = ref(false)
const editablePatient = ref(null)
const activeTab = computed({
  get() {
    const tabMap = {
      'anamnese': 'anamneses',
      'historico': 'history',
      'procedimentos': 'procedures',
      'anotacoes': 'notes',
      'orcamentos': 'budgets',
      'orcamentos': 'budgets',
      'termos': 'termos',
      'galeria': 'media'
    }
    return tabMap[route.params.tab] || 'details'
  },
  set(newValue) {
    const reverseMap = {
      'anamneses': 'anamnese',
      'history': 'historico',
      'procedures': 'procedimentos',
      'notes': 'anotacoes',
      'budgets': 'orcamentos',
      'budgets': 'orcamentos',
      'termos': 'termos',
      'media': 'galeria',
      'details': undefined // Remove param for details
    }
    const tabParam = reverseMap[newValue]
    
    // Maintain current query params when switching tabs
    router.push({ 
      name: 'detalhes-paciente', 
      params: { 
        id: patient.value?._id || route.params.id, 
        tab: tabParam 
      },
      query: route.query
    })
  }
})
const viewingAnamnesis = ref(null)
const isCreateAppointmentModalOpen = ref(false)
const pdfPreview = ref({ url: null, name: null })

// Estado para o modal de detalhes do atendimento
const isAppointmentModalOpen = ref(false)
const selectedAppointment = ref(null)

// Estado para controlar loading de reabrir atendimento (apenas o card específico)
const reopeningAppointmentId = ref(null)

const patient = computed(() => patientsStore.selectedPatient)
const clinic = computed(() => authStore.user?.clinic)
const answeredAnamneses = computed(() => anamnesisStore.answeredAnamneses)
const pendingAnamneses = computed(() => anamnesisStore.pendingAnamneses)
const patientHistory = computed(() => 
  (appointmentsStore.patientAppointments || []).filter(app => app.status !== 'Agendado')
)

const genderOptions = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
]

const lastAppointment = computed(() => {
  if (patientHistory.value && patientHistory.value.length > 0) {
    return [...patientHistory.value].sort(
      (a, b) => new Date(b.startTime) - new Date(a.startTime),
    )[0]
  }
  return null
})

async function loadPatientData(patientId) {
    if (!patientId) return

    // 1. FORÇA O RESET VISUAL: Limpa o paciente atual *antes* de buscar o novo.
    // Isso garante que v-else-if="patient" falhe e v-if="patientsStore.isLoading && !patient" seja ativado.
    patientsStore.selectedPatient = null

    // Reseta estados visuais/de edição
    isEditing.value = false
    // activeTab is now computed, no need to reset manually
    // activeTab.value = 'details'

    // 2. Busca os dados do novo paciente
    await patientsStore.fetchPatientById(patientId)
    await anamnesisStore.fetchAnamnesisForPatient(patientId)
    await appointmentsStore.fetchAppointmentsByPatient(patientId)
}

// HOOK: Chama a função de carregamento quando o componente é montado
onMounted(() => {
    loadPatientData(route.params.id)
    if (route.query.edit === 'true') {
        isEditing.value = true
    }
})

// HOOK CRÍTICO: Chama a função de carregamento quando a ROTA MUDA
onBeforeRouteUpdate(async (to, from) => {
    if (to.params.id !== from.params.id) {
        await loadPatientData(to.params.id)
    }
})


// CORREÇÃO: Formata a data para YYYY-MM-DD no modo edição
watch(patient, (newVal) => {
  if (newVal) {
    editablePatient.value = JSON.parse(JSON.stringify({
      ...newVal,
      address: newVal.address || {},
      birthDate: newVal.birthDate,
    }))
  }
})

watch(
  () => editablePatient.value?.address?.cep,
  async (newCep) => {
    if (newCep && editablePatient.value) {
      const numericCep = newCep.replace(/\D/g, '')
      if (numericCep.length === 8) {
        const address = await fetchAddressByCEP(numericCep)
        if (address) {
          editablePatient.value.address = {
            ...editablePatient.value.address,
            street: address.street,
            district: address.neighborhood,
            city: address.city,
            state: address.state,
            // Garante que o complemento existente seja mantido
            complement: editablePatient.value.address.complement || '',
          }
        }
      }
    }
  },
)

function cancelEditing() {
  isEditing.value = false
  // Reverte para o estado original
  editablePatient.value = JSON.parse(JSON.stringify(patient.value))
}

async function handleSaveChanges() {
  const payload = JSON.parse(JSON.stringify(editablePatient.value))

  // Lógica de salvamento aqui...

  const { success } = await patientsStore.updatePatient(patient.value._id, payload)
  if (success) {
    toast.success('Paciente atualizado com sucesso!')
    isEditing.value = false
    await patientsStore.fetchPatientById(patient.value._id)
  } else {
    toast.error('Erro ao atualizar o paciente.')
  }
}

const formattedBirthDate = computed(() => {
  if (patient.value?.birthDate) {
    return new Date(patient.value.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }
  return ''
})

function formatSimpleDate(dateString) {
  if (!dateString) return ''
  
  // If it's a date string (YYYY-MM-DD)
  if (dateString.length === 10 && dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  // Fallback for full ISO strings with time
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function handleCopyLink(token) {
  if (!token) {
    toast.error('Token inválido ou não encontrado.');
    return;
  }
  const link = `${window.location.origin}/anamnese/${token}`
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      toast.info('Link de resposta copiado!')
    }).catch(err => {
      console.error('Falha ao copiar: ', err)
      toast.error('Erro ao copiar link.')
    })
  } else {
     // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.info('Link de resposta copiado!')
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        toast.error('Erro ao copiar link.')
      }
      document.body.removeChild(textArea);
  }
}

async function handleGeneratePdf(anamnesis) {
  if (!patient.value || !clinic.value) {
    toast.error('Dados do paciente ou da clínica não carregados.')
    return
  }

  const loadingToast = toast.info('Gerando PDF...', { timeout: false })

  const fullTemplate = await anamnesisStore.fetchTemplateById(anamnesis.template._id)

  if (!fullTemplate) {
    toast.dismiss(loadingToast)
    toast.error('Não foi possível carregar o modelo da anamnese para gerar o PDF.')
    return
  }

  const completeAnamnesisData = { ...anamnesis, template: fullTemplate }
  const { fileName, pdfDataUri } = await generateAnamnesisPdf(
    completeAnamnesisData,
    patient.value,
    clinic.value,
  )

  toast.dismiss(loadingToast)
  pdfPreview.value = { url: pdfDataUri, name: fileName }
}

// FUNÇÃO AUXILIAR PARA TRATAR VALORES VAZIOS
function displayValue(value) {
  return value && String(value).trim() !== '' ? value : 'Não informado'
}

// COMPUTED PROPERTY: Verifica quais informações opcionais estão faltando
const missingInfo = computed(() => {
  if (!patient.value) return []

  const missing = []
  const p = patient.value
  const address = p.address || {}

  // Dados Pessoais Opcionais
  if (!p.cpf || p.cpf.replace(/\D/g, '').length < 11) {
    missing.push('CPF')
  }
  if (!p.email || p.email.trim() === '') {
    missing.push('E-mail')
  }

  // Endereço (Consideramos incompleto se não tiver rua)
  if (!address.street || address.street.trim() === '') {
    missing.push('Endereço (Rua, Número, CEP)')
  } else {
    // Se a rua existe, verificamos o complemento separadamente
    if (!address.complement || address.complement.trim() === '') {
      missing.push('Complemento do Endereço')
    }
  }

  return missing
})

// --- PROCEDIMENTOS ---
const isAddProcedureModalOpen = ref(false)

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

async function handleAddProcedure(payload) {
  const { success } = await patientsStore.addProcedureToPatient(patient.value._id, payload)
  if (success) {
    toast.success('Procedimento adicionado com sucesso!')
    isAddProcedureModalOpen.value = false
    // Não precisamos recarregar tudo, pois o addProcedureToPatient atualiza o selectedPatient
  } else {
    toast.error(patientsStore.error || 'Erro ao adicionar procedimento.')
  }
}

async function handleDeleteProcedure(procedure) {
  if (!confirm('Tem certeza que deseja remover este procedimento?')) {
    return
  }

  const result = await patientsStore.removeProcedureFromPatient(patient.value._id, procedure._id)
  if (result.success) {
    toast.success('Procedimento removido com sucesso!')
    // Sucesso (store já atualizou o patient local)
  } else {
    toast.error(result.error || 'Erro ao remover procedimento.')
  }
}

// --- FUNÇÕES DO MODAL DE ATENDIMENTO ---
function openAppointmentModal(appointment) {
  // Injetar os dados do paciente que já temos disponível
  const appointmentWithPatient = {
    ...appointment,
    patient: patient.value
  }
  
  selectedAppointment.value = {
    originalEvent: appointmentWithPatient,
    start: appointment.startTime,
    end: appointment.endTime
  }
  isAppointmentModalOpen.value = true
}

function closeAppointmentModal() {
  isAppointmentModalOpen.value = false
  selectedAppointment.value = null
}

async function reopenAppointment(appointment) {
  if (!confirm('Deseja reabrir este atendimento? Isso permitirá alterá-lo novamente.')) {
    return
  }

  const previousStatus = appointment.status
  appointment.status = 'Iniciado'
  reopeningAppointmentId.value = appointment._id

  try {
    const result = await appointmentsStore.updateAppointmentStatus(appointment._id, 'Iniciado')
    if (result.success) {
      toast.success('Atendimento reaberto!')
    } else {
      appointment.status = previousStatus
      toast.error('Erro ao reabrir atendimento.')
    }
  } catch (error) {
    appointment.status = previousStatus
    console.error('Erro ao reabrir atendimento:', error)
    toast.error('Erro ao reabrir atendimento. Tente novamente.')
  } finally {
    reopeningAppointmentId.value = null
  }
}

async function deleteAppointment(appointment) {
  if (!confirm('Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.')) {
    return
  }

  const result = await appointmentsStore.deleteAppointment(appointment._id)
  if (result.success) {
    toast.success('Atendimento excluído!')
    await appointmentsStore.fetchAppointmentsByPatient(patient.value._id)
  } else {
    toast.error('Erro ao excluir atendimento.')
  }
}
</script>

<template>
  <div class="patient-detail-view">
    <CreateAppointmentModal
      v-if="isCreateAppointmentModalOpen"
      @close="isCreateAppointmentModalOpen = false"
    />
    <AssignAnamnesisModal
      v-if="isAssignModalOpen"
      :patient-id="patient?._id"
      @close="isAssignModalOpen = false"
    />
    <AnamnesisAnswersModal
      v-if="viewingAnamnesis"
      :anamnesis="viewingAnamnesis"
      :is-open="!!viewingAnamnesis"
      :is-editing="false"
      @close="viewingAnamnesis = null"
    />
    <PdfPreviewModal
      v-if="pdfPreview.url"
      :pdf-url="pdfPreview.url"
      :file-name="pdfPreview.name"
      @close="pdfPreview = { url: null, name: null }"
    />
    <AddProcedureModal
      v-if="isAddProcedureModalOpen"
      :patient-id="patient?._id"
      @close="isAddProcedureModalOpen = false"
      @save="handleAddProcedure"
    />
    <AppointmentDetailsModal
      v-if="isAppointmentModalOpen && selectedAppointment"
      :event="selectedAppointment"
      :has-previous="false"
      :has-next="false"
      :current-index="0"
      :total-count="1"
      @close="closeAppointmentModal"
    />

    <div v-if="patientsStore.isLoading && !patient" class="loading-state">
      Carregando dados do paciente...
    </div>

    <div v-else-if="patient">
      <header class="patient-header">
        <div class="patient-info">
          <div class="patient-avatar">
            {{ patient.name.charAt(0) }}
          </div>
          <div class="patient-title-wrapper">
            <div class="name-and-status">
              <h1 class="patient-name">{{ patient.name }}</h1>
              <div v-if="missingInfo.length > 0" class="missing-info-badge" :title="`Faltam: ${missingInfo.join(', ')}`">
                  <AlertTriangle :size="20" />
                  <div class="missing-info-tooltip">
                      <span class="tooltip-title">Faltam informações:</span>
                      <ul class="tooltip-list">
                          <li v-for="item in missingInfo" :key="item">{{ item }}</li>
                      </ul>
                  </div>
              </div>
            </div>
            <div class="patient-meta">
              <span>ID: #{{ patient._id.slice(-6).toUpperCase() }}</span>
              <PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" />
            </div>
          </div>
        </div>
        <div class="header-actions">
          <AppButton @click="isAssignModalOpen = true" variant="secondary">
            <Clipboard :size="16" />
            Aplicar Anamnese
          </AppButton>
          <AppButton v-if="!isEditing" @click="isEditing = true" variant="primary">
            <Edit :size="16" />
            Editar
          </AppButton>
        </div>
      </header>

      <div class="tabs-container-wrapper">
        <AppTabs 
          :model-value="activeTab" 
          @update:model-value="activeTab = $event"
          :items="[
            { value: 'details', label: 'Detalhes', icon: ClipboardList },
            { value: 'anamneses', label: 'Anamneses', icon: FileText },
            { value: 'history', label: 'Histórico', icon: History },
            { value: 'procedures', label: 'Procedimentos', icon: Stethoscope },
            { value: 'notes', label: 'Anotações', icon: MessageSquare },
            { value: 'budgets', label: 'Orçamentos', icon: Receipt },
            { value: 'termos', label: 'Termos', icon: FileSignature },
            { value: 'media', label: 'Galeria', icon: Folder },
          ]"
        />
      </div>

      <div class="tab-content unified-card">
        <Transition name="fade" mode="out-in">
          <div :key="activeTab" class="unified-card-content">
            <div v-if="activeTab === 'media'">
                <PatientMediaGallery :patient-id="patient._id" />
            </div>
            <div v-if="activeTab === 'details'">
              <div v-if="isEditing && editablePatient">
                <form @submit.prevent="handleSaveChanges">
                  <section class="card-section">
                    <h3 class="section-title"><ClipboardList class="title-icon" :size="18" /> Dados Pessoais</h3>
                    <div class="section-content grid-2-cols">
                      <FormInput
                        v-model="editablePatient.name"
                        label="Nome Completo"
                        placeholder="Nome do paciente"
                        required
                      />
                      <!-- Campo de Data com VueDatePicker -->
                      <div class="form-group">
                        <label class="form-label">Data de Nascimento</label>
                        <VueDatePicker
                          v-model="editablePatient.birthDate"
                          locale="pt-BR"
                          format="dd/MM/yyyy"
                          auto-apply
                          :enable-time-picker="false"
                          :teleport="true"
                          placeholder="dd/mm/aaaa"
                          model-type="yyyy-MM-dd"
                          :clearable="false"
                        >
                          <template #trigger>
                            <div class="custom-date-trigger">
                              <span v-if="editablePatient.birthDate">{{ formatSimpleDate(editablePatient.birthDate) }}</span>
                              <span v-else class="placeholder-text">dd/mm/aaaa</span>
                              <Calendar :size="16" class="icon-slate" />
                            </div>
                          </template>
                        </VueDatePicker>
                      </div>

                      <FormInput
                        v-model="editablePatient.cpf"
                        label="CPF"
                        placeholder="000.000.000-00"
                        cpf-mask
                      />
                      <div class="phone-input-wrapper">
                        <PhoneInputWithDDI
                          v-model="editablePatient.phone"
                          v-model:countryCode="editablePatient.countryCode"
                          label="Telefone"
                          required
                        />
                      </div>
                      <FormInput
                        v-model="editablePatient.email"
                        label="E-mail"
                        placeholder="email@exemplo.com"
                        type="email"
                      />
                      <StyledSelect
                        v-model="editablePatient.gender"
                        label="Gênero"
                        :options="genderOptions"
                      />
                    </div>
                  </section>

                  <div class="divider"></div>

                  <section class="card-section">
                    <h3 class="section-title"><MapPin class="title-icon" :size="18" /> Endereço</h3>
                    <div class="section-content grid-2-cols">
                      <FormInput v-model="editablePatient.address.cep" label="CEP" />
                      <FormInput
                        v-model="editablePatient.address.street"
                        label="Rua / Logradouro"
                      />
                      <FormInput v-model="editablePatient.address.number" label="Número" />
                      <FormInput
                        v-model="editablePatient.address.complement"
                        label="Complemento (Opcional)"
                      />
                      <FormInput v-model="editablePatient.address.district" label="Bairro" />
                      <FormInput v-model="editablePatient.address.city" label="Cidade" />
                      <FormInput v-model="editablePatient.address.state" label="Estado" />
                    </div>
                  </section>

                  <footer class="edit-form-footer">
                    <AppButton @click="cancelEditing" type="button" variant="secondary">
                      Cancelar
                    </AppButton>
                    <AppButton type="submit" variant="primary">Salvar Alterações</AppButton>
                  </footer>
                </form>
              </div>
              <div v-else>
                <section class="card-section">
                  <h3 class="section-title"><ClipboardList class="title-icon" :size="18" /> Dados Pessoais</h3>
                  <div class="section-content grid-2-cols">
                    <div class="detail-item">
                      <span class="label">Data de Nasc.</span>
                      <strong class="value">{{ formattedBirthDate || 'Não informado' }}</strong>
                    </div>
                    <div class="detail-item">
                      <span class="label">Gênero</span>
                      <strong class="value">{{ patient.gender || 'Não informado' }}</strong>
                    </div>
                    <div class="detail-item">
                      <span class="label">CPF</span>
                      <strong class="value">{{ displayValue(formatCPF(patient.cpf)) }}</strong
                      >
                    </div>
                    <div class="detail-item">
                      <span class="label">Telefone</span>
                      <strong class="value" :class="{ 'text-red-500 flex items-center gap-1': patient.isInvalidWhatsapp }">
                          <PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" />
                          <div v-if="patient.isInvalidWhatsapp" class="invalid-whatsapp-badge" title="Este número não possui WhatsApp ou é inválido.">
                             <AlertTriangle class="title-icon" :size="14" />
                             <span class="text-xs">Inválido</span>
                          </div>
                      </strong>
                    </div>
                    <div class="detail-item">
                      <span class="label">E-mail</span>
                      <strong class="value">{{ displayValue(patient.email) }}</strong
                      >
                    </div>
                  </div>
                </section>

                <div class="divider"></div>

                <section class="card-section">
                  <h3 class="section-title"><MapPin class="title-icon" :size="18" /> Endereço</h3>
                  <div
                    v-if="patient.address && patient.address.street"
                    class="section-content grid-2-cols"
                  >
                    <div class="detail-item">
                      <span class="label">Logradouro</span>
                      <strong class="value"
                        >{{ patient.address.street || 'Não informado' }}, {{ patient.address.number || 'S/N' }}</strong
                      >
                    </div>
                    <div class="detail-item">
                      <span class="label">Complemento</span>
                      <strong class="value">{{ displayValue(patient.address.complement) }}</strong
                      >
                    </div>
                    <div class="detail-item">
                      <span class="label">Bairro</span>
                      <strong class="value">{{ displayValue(patient.address.district) }}</strong
                      >
                    </div>
                    <div class="detail-item">
                      <span class="label">Cidade / Estado</span>
                      <strong class="value"
                        >{{ patient.address.city || 'Não informado' }} - {{ patient.address.state || 'UF' }}</strong
                      >
                    </div>
                    <div class="detail-item">
                      <span class="label">CEP</span>
                      <strong class="value">{{ displayValue(patient.address.cep) }}</strong
                      >
                    </div>
                  </div>
                  <div v-else>
                    <p class="empty-list-message">Endereço não cadastrado.</p>
                  </div>
                </section>

                <div class="divider"></div>

                <section class="card-section">
                  <h3 class="section-title"><History class="title-icon" :size="18" /> Histórico Recente</h3>
                  <div class="section-content">
                    <div v-if="lastAppointment" class="last-appointment-item">
                      <span class="label">Último Atendimento</span>
                      <div class="value-with-badge">
                        <strong>{{ formatSimpleDate(lastAppointment.startTime) }}</strong>
                        <span
                          :class="useStatusBadge(lastAppointment.status).badgeClass"
                          :style="useStatusBadge(lastAppointment.status).badgeStyle"
                          >{{ useStatusBadge(lastAppointment.status).displayText }}</span
                        >
                      </div>
                    </div>
                    <p v-else class="empty-list-message">Nenhum atendimento anterior registrado.</p>
                  </div>
                </section>
              </div>
            </div>

            <div v-if="activeTab === 'anamneses'" class="card-section">
              <div class="anamnesis-section">
                <h3 class="section-title"><CheckSquare class="title-icon" :size="18" /> Respondidas</h3>
                <ul v-if="answeredAnamneses.length > 0" class="anamnesis-list">
                  <li v-for="item in answeredAnamneses" :key="item._id" class="anamnesis-item">
                    <div class="anamnesis-info clickable" @click="viewingAnamnesis = item">
                      <span class="anamnesis-name">{{
                        item.template?.name || 'Modelo não encontrado'
                      }}</span>
                      <span class="anamnesis-date"
                        >Respondida em {{ formatSimpleDate(item.updatedAt) }}</span
                      >
                    </div>
                    <!-- <button
                      @click.stop="handleGeneratePdf(item)"
                      class="btn-icon"
                      title="Visualizar PDF"
                    >
                      <FileDown class="title-icon" :size="16" />
                    </button> -->
                  </li>
                </ul>

                <div v-else class="empty-state-card">
                  <div class="empty-state-icon">
                    <ClipboardCheck :size="40" />
                  </div>
                  <h4 class="empty-state-title">Nenhuma anamnese respondida</h4>
                  <p class="empty-state-text">
                    As anamneses preenchidas pelo paciente aparecerão aqui.
                  </p>
                </div>
              </div>

              <div class="anamnesis-section">
                <h3 class="section-title"><FileText class="title-icon" :size="18" /> Pendentes</h3>
                <ul v-if="pendingAnamneses.length > 0" class="anamnesis-list">
                  <li v-for="item in pendingAnamneses" :key="item._id" class="anamnesis-item">
                    <div class="anamnesis-info">
                      <span class="anamnesis-name">{{
                        item.template?.name || 'Modelo não encontrado'
                      }}</span>
                      <span class="anamnesis-date"
                        >Vence em {{ formatSimpleDate(item.patientAccessTokenExpires) }}</span
                      >
                    </div>
                    <button
                      @click.stop="handleCopyLink(item.patientAccessToken)"
                      class="btn-icon"
                      title="Copiar link de resposta"
                    >
                      <Copy :size="16" />
                    </button>
                  </li>
                </ul>
                <div v-else class="empty-state-card">
                  <div class="empty-state-icon">
                    <ClipboardPlus :size="40" />
                  </div>
                  <h4 class="empty-state-title">Nenhuma anamnese pendente</h4>
                  <p class="empty-state-text">
                    Você pode aplicar um modelo de anamnese para gerar um link de resposta para o
                    paciente.
                  </p>
                  <AppButton @click="isAssignModalOpen = true" variant="secondary">
                    <Clipboard :size="16" />
                    Aplicar Anamnese
                  </AppButton>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'history'" class="card-section">
              <div class="history-section">
                <h3 class="title-historico"><History class="title-icon" :size="20" /> Histórico de Atendimentos</h3>
                <div v-if="appointmentsStore.isLoading" class="loading-state">
                  Carregando histórico...
                </div>
                <div v-else-if="patientHistory.length > 0" class="history-grid">
                  <div 
                    v-for="item in patientHistory" 
                    :key="item._id" 
                    class="history-card"
                    @click="openAppointmentModal(item)"
                  >
                    <!-- Card Header - Data + Valor + Procedimentos -->
                    <div class="card-header">
                      <div class="card-header-content">
                        <div class="card-header-date">
                          <Calendar :size="14" />
                          <span>{{ formatSimpleDate(item.startTime) }}</span>
                        </div>
                        <div class="card-header-stats">
                          <span :class="['card-revenue-inline', { 'zero': !item.procedures || item.procedures.length === 0 || item.procedures.reduce((sum, p) => sum + (p.finalValue || 0), 0) === 0 }]">
                            {{ item.procedures && item.procedures.length > 0 
                              ? formatCurrency(item.procedures.reduce((sum, p) => sum + (p.finalValue || 0), 0)) 
                              : 'R$ 0,00' 
                            }}
                          </span>
                          <span class="card-divider">•</span>
                          <span class="card-procedures-inline">
                            <Syringe :size="12" />
                            {{ item.procedures?.length || 0 }} proc.
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Card Body - ID, Status, Tipo -->
                    <div class="card-body">
                      <div class="card-info-row">
                        <span class="card-label"><Hash :size="12" /> ID</span>
                        <span class="appointment-id">#{{ item._id.slice(-6).toUpperCase() }}</span>
                      </div>
                      <div class="card-info-row">
                        <span class="card-label"><Activity :size="12" /> Status</span>
                        <span
                          :class="useStatusBadge(item.status).badgeClass"
                          :style="useStatusBadge(item.status).badgeStyle"
                        >
                          {{ useStatusBadge(item.status).displayText }}
                        </span>
                      </div>
                      <div class="card-info-row">
                        <span class="card-label"><Briefcase :size="12" /> Tipo</span>
                        <span class="card-type">{{ item.type || 'Consulta' }}</span>
                      </div>
                    </div>

                    <!-- Card Footer - Botões de Ação -->
                    <div class="card-footer">
                      <div class="card-footer-actions">
                        <!-- Botão Continuar para Iniciado -->
                        <router-link
                          v-if="item.status === 'Iniciado'"
                          :to="reopeningAppointmentId === item._id ? '' : `/atendimentos/${item._id}/patient/${patient._id}`"
                          :class="['btn-footer-action', 'primary', { 'disabled': reopeningAppointmentId === item._id }]"
                          @click.stop
                        >
                          <Play :size="14" />
                          <span>Continuar</span>
                        </router-link>
                        <!-- Botão Reabrir para Realizado -->
                        <button
                          v-if="item.status === 'Realizado'"
                          @click.stop="reopenAppointment(item)"
                          class="btn-footer-action"
                          title="Reabrir Atendimento"
                          :disabled="reopeningAppointmentId === item._id"
                        >
                          <RotateCcw :size="14" :class="{ 'spin': reopeningAppointmentId === item._id }" />
                          <span>{{ reopeningAppointmentId === item._id ? 'Reabrindo...' : 'Reabrir' }}</span>
                        </button>
                        <!-- Botão Ver Relatório para Realizado -->
                        <router-link
                          v-if="item.status === 'Realizado'"
                          :to="`/atendimentos/${item._id}/patient/${patient._id}`"
                          class="btn-footer-action primary"
                          @click.stop
                        >
                          <Eye :size="14" />
                          <span>Ver Relatório</span>
                        </router-link>
                      </div>
                      <button
                        @click.stop="deleteAppointment(item)"
                        class="btn-icon-action delete"
                        title="Excluir Atendimento"
                        :disabled="reopeningAppointmentId === item._id"
                      >
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state-card">
                  <div class="empty-state-icon">
                    <History :size="40" />
                  </div>
                  <h4 class="empty-state-title">Nenhum histórico encontrado</h4>
                  <p class="empty-state-text">
                    Este paciente ainda não possui atendimentos registrados. Que tal agendar o
                    primeiro?
                  </p>
                  <AppButton @click="isCreateAppointmentModalOpen = true" variant="secondary">
                    <CalendarPlus :size="16" />
                    Agendar Atendimento
                  </AppButton>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'procedures'" class="card-section">
              <div class="procedures-section">
                <div class="section-header-row">
                  <h3 class="title-procedures"><Stethoscope class="title-icon" :size="20" /> Procedimentos Realizados</h3>
                </div>

                <ul v-if="patient.procedures && patient.procedures.length > 0" class="procedures-list">
                  <li v-for="proc in patient.procedures" :key="proc._id" class="procedure-item">
                    <div class="procedure-info">
                      <div class="proc-main">
                        <span class="proc-name">{{ proc.name }}</span>
                      </div>
                      <span class="proc-date">{{ formatSimpleDate(proc.assignedAt) }}</span>
                    </div>
                    <div class="procedure-values">
                      <div v-if="proc.discountPercentage > 0" class="discount-tag">
                        -{{ proc.discountPercentage }}%
                      </div>
                      <div class="price-wrapper">
                        <span v-if="proc.discountPercentage > 0" class="original-price">
                          {{ formatCurrency(proc.originalValue) }}
                        </span>
                        <span class="final-price">{{ formatCurrency(proc.finalValue) }}</span>
                      </div>

                    </div>
                  </li>
                </ul>

                <div v-else class="empty-state-card">
                  <div class="empty-state-icon">
                    <Stethoscope :size="40" />
                  </div>
                  <h4 class="empty-state-title">Nenhum procedimento registrado</h4>
                  <p class="empty-state-text">
                    Adicione procedimentos ao paciente para manter o histórico financeiro e clínico.
                  </p>
                </div>
              </div>
            </div>
            <div v-if="activeTab === 'notes'" class="card-section">
              <PatientNotesTab :patient-id="patient._id" />
            </div>
            <div v-if="activeTab === 'budgets'" class="card-section">
              <PatientBudgetsTab :patient-id="patient._id" />
            </div>
            <div v-if="activeTab === 'termos'" class="card-section">
              <PatientConsentTermsTab :patient-id="patient._id" />
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-detail-view {
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 0 1.5rem;
  overflow-y: overlay;
}

/*
  Cores Laranja (Aviso):
  - #f59e0b (Amber-500) para o ícone.
  - #fffbe6 (Amber-50) para o background.
*/

/* ESTILO DO TOOLTIP/AVISO */
.name-and-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.missing-info-badge {
  position: relative;
  cursor: help;
  color: #f59e0b; /* Laranja Icone */
  background-color: #fffbe6; /* Laranja Background Claro */
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.missing-info-tooltip {
  visibility: hidden;
  opacity: 0;
  width: 250px;
  /* ALTERAÇÕES PARA FUNDO CLARO (ESTILO DROPDOWN) */
  background-color: var(--branco, #ffffff);
  color: #374151; /* Texto escuro */
  border: 1px solid #e5e7eb; /* Borda leve */

  text-align: left;
  border-radius: 0.5rem;
  padding: 1rem;
  position: absolute;
  z-index: 10;

  /* POSICIONAMENTO PARA ABRIR PARA BAIXO */
  top: 100%;
  left: 0;
  right: auto;
  transform: translateY(10px);

  transition: opacity 0.3s, visibility 0.3s, transform 0.3s;
  font-size: 0.875rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Sombra mais suave */

  max-width: calc(100vw - 40px);
}

.title-icon {
  color: var(--azul-principal);
}

.missing-info-tooltip::after {
  /* Triângulo para o topo, apontando para cima (corrigido para fundo claro) */
  content: "";
  position: absolute;
  top: -5px;
  left: 5px;
  right: auto;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent var(--branco, #ffffff) transparent; /* Cor do triângulo branca */
}
.missing-info-badge:hover .missing-info-tooltip {
  visibility: visible;
  opacity: 1;
}

.invalid-whatsapp-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background-color: #fef2f2;
    color: #ef4444;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #fca5a5;
    font-size: 0.75rem;
    font-weight: 500;
}
.tooltip-title {
    font-weight: 700;
    display: block;
    margin-bottom: 0.5rem;
    color: #1f2937; /* Cor do título mais escura */
}

/* Delete Button Style */
.delete-btn {
  color: #ef4444; /* Vermelho */
  opacity: 0.7;
}
.delete-btn:hover {
  background-color: #fef2f2;
  color: #dc2626;
  opacity: 1;
}

.tooltip-list {
    /* Corrigido de ul para .tooltip-list */
    list-style: disc;
    padding-left: 1.25rem;
    margin: 0;
}
.tooltip-list li {
    margin-bottom: 0.25rem;
    line-height: 1.2;
}

/* ESTILO DO LOADING STATE */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    font-size: 1.2rem;
    color: var(--cinza-texto, #6b7280);
    /* Se quiser um esqueleto, adicione aqui o HTML/CSS. Por enquanto, é texto. */
}

/* Estilos existentes */
.patient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.patient-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1;
  min-width: 200px;
}
.patient-avatar {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
}
.patient-name {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.patient-title-wrapper {
  min-width: 0;
  flex: 1;
}
.patient-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  font-size: 0.875rem;
}
.header-actions {
  display: flex;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .header-actions {
    width: 100%;
  }
  .header-actions .app-button {
    flex: 1;
    justify-content: center;
  }
}
.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
  overflow-x: auto; /* Permitir scroll em telas pequenas */
}


/* ESTILOS DA ABA DE PROCEDIMENTOS */
.procedures-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-procedures {
  font-size: 1rem;
  font-weight: 600;
  color: var(--preto);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.procedures-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.procedure-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: box-shadow 0.2s;
}

.procedure-item:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.procedure-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.proc-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.proc-name {
  font-weight: 600;
  color: #111827;
}

.proc-alias-badge {
  font-size: 0.75rem;
  background-color: #eef2ff;
  color: var(--azul-principal);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
}

.proc-date {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.procedure-values {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.discount-tag {
  font-size: 0.75rem;
  color: #ef4444;
  background-color: #fef2f2;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.price-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.original-price {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  text-decoration: line-through;
}

.final-price {
  font-weight: 600;
  color: #059669;
  font-size: 1rem;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.875rem;
}


.unified-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  height: calc(100vh - 300px);
  overflow-y: auto;
  position: relative;
}
.unified-card-content {
  height: 100%;
}
.card-section {
  padding: 1.5rem 2rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0 0 1.5rem 0;
}
.divider {
  height: 1px;
  background-color: #f3f4f6;
}
.section-content.grid-2-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem 2rem;
}
.detail-item,
.last-appointment-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.label {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  text-transform: uppercase;
}
.value {
  font-size: 1rem;
  font-weight: 500;
}
.edit-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #f3f4f6;
  background-color: #f9fafb;
}
.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.btn-primary {
  background-color: var(--azul-principal);
  color: var(--branco);
}
.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

/* ESTILO ADICIONADO PARA MENSAGENS DE LISTA VAZIA */
.empty-list-message {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

.anamnesis-section,
.history-section {
  margin-bottom: 2.5rem;
}
.anamnesis-section h3,
.history-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.0rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--preto);
}
.anamnesis-list,
.history-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
}

/* Grid de Cards de Histórico */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.history-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.history-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
  border-color: #d1d5db;
}


.tabs-container-wrapper {
  display: flex;
  width: 100%;
  margin-bottom: 1rem;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.card-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-header-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-procedures-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Card Body */
.card-body {
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.card-type {
  font-size: 0.875rem;
  color: #374151;
}

.card-date {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.card-revenue {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.card-no-revenue {
  font-size: 1.5rem;
  font-weight: 700;
  color: #d1d5db;
}

/* Card Header Date */
.card-header-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid #f3f4f6;
  background-color: #fafafa;
}

.card-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-footer-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  color: #4b5563;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
}

.btn-footer-action:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-footer-action.primary {
  background: var(--azul-principal);
  color: white;
  border-color: var(--azul-principal);
}

.btn-footer-action.primary:hover {
  opacity: 0.9;
}

.btn-footer-action:disabled,
.btn-footer-action.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-icon-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

.card-footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-revenue-inline {
  font-size: 0.875rem;
  font-weight: 700;
  color: #059669;
}

.card-revenue-inline.zero {
  color: #9ca3af;
}

.card-divider {
  color: #d1d5db;
  font-size: 0.75rem;
}

.card-procedures {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.card-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--azul-principal);
  text-decoration: none;
  transition: opacity 0.15s;
}

.card-view-btn:hover {
  opacity: 0.8;
}

/* Botão de deletar */
.btn-icon-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon-action.delete {
  color: #9ca3af;
}

.btn-icon-action.delete:hover {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #ef4444;
}

/* Legacy styles */
.history-item-new {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
}

.history-item-new:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.history-item-new.realizado { border-left-color: #94a3b8; }
.history-item-new.agendado { border-left-color: #3b82f6; }
.history-item-new.confirmado { border-left-color: #eab308; }
.history-item-new.cancelado { border-left-color: #ef4444; }
.history-item-new.em-atendimento { border-left-color: #a855f7; }
.history-item-new.iniciado { border-left-color: #22c55e; }

.history-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  gap: 1rem;
}

.history-main-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1;
}

.history-date-new {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.9375rem;
}

/* Estilos do novo layout do histórico */
.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  gap: 1rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

.history-item-header:hover {
  background-color: #fafafa;
}

.history-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-grow: 1;
}

.history-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.appointment-id {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.history-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #f3f4f6;
  background-color: #fafafa;
}

.history-footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.procedures-count {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #059669;
  font-weight: 500;
}

.no-procedures {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.procedures-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.procedures-divider {
  color: #d1d5db;
  font-size: 0.75rem;
}

.procedures-revenue {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #059669;
}

.history-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon-action.reopen {
  color: #2563eb;
}

.btn-icon-action.reopen:hover {
  background-color: #eff6ff;
}

.btn-icon-action.delete {
  color: #9ca3af;
}

.btn-icon-action.delete:hover {
  background-color: #fef2f2;
  color: #ef4444;
}

.history-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  background-color: #f8fafc;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.history-action-btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.history-date {
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.anamnesis-date {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--cinza-texto);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}
.btn-icon:hover {
  background-color: #f3f4f6;
  color: var(--preto);
}

.anamnesis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.anamnesis-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.anamnesis-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
}

.anamnesis-info.clickable {
  cursor: pointer;
}

.anamnesis-name {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.status-badge {
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8rem;
  text-transform: capitalize;
  white-space: nowrap;
}
.status-badge.realizado {
  background-color: #f0fdf4;
  color: #16a34a;
}
.status-badge.agendado {
  background-color: #eff6ff;
  color: #2563eb;
}
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem;
  border: 2px dashed #d1d5db;
  border-radius: 1rem;
}
.empty-state-icon {
  color: var(--azul-principal);
  margin-bottom: 1rem;
}
.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}
.empty-state-text {
  max-width: 400px;
  color: var(--cinza-texto);
  line-height: 1.6;
}
.empty-state-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (max-width: 768px) {
  .patient-detail-view {
    padding: 0rem;
  }
  .card-section {
    padding: 0.5rem;
  }
  .unified-card {
    background-color: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }
  .patient-header {
    align-items: center;
  }
  .patient-info {
    width: 100%;
  }
  .patient-name {
    font-size: 1.75rem;
  }
  .header-actions {
    width: 100%;
  }
  .btn-secondary,
  .btn-primary {
    padding: 0.75rem 1rem;
    flex-grow: 1;
  }
  .btn-edit .btn-text {
    display: none;
  }

  /* Estilos específicos para o tooltip em telas pequenas para evitar corte */
  .missing-info-tooltip {
    right: 0;
    left: auto;
  }
  .missing-info-tooltip::after {
    left: auto;
    right: 15px;
  }
}

/* Estilos para o VueDatePicker customizado */
.form-group {
  margin-bottom: 1.25rem;
  text-align: left;
}
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}
.custom-date-trigger {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: var(--branco);
  font-size: 1rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.custom-date-trigger:hover {
  border-color: var(--azul-principal);
}
.placeholder-text {
  color: #9ca3af;
}
</style>
