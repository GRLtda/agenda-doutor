<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { fetchAddressByCEP } from '@/api/external'

// Icons for tabs
import {
  ClipboardList,
  FileText,
  History,
  Stethoscope,
  MessageSquare,
  Receipt,
  FileSignature,
  Folder
} from 'lucide-vue-next'

// Modals
import AssignAnamnesisModal from '@/components/pages/pacientes/modals/AssignAnamnesisModal.vue'
import AnamnesisAnswersModal from '@/components/pages/dashboard/AnamnesisAnswersModal.vue'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import PdfPreviewModal from '@/components/pages/pacientes/modals/PdfPreviewModal.vue'
import AddProcedureModal from '@/components/modals/AddProcedureModal.vue'

// Shell & Tabs
import PatientShell from './components/PatientShell.vue'
import PatientDetailsTab from './components/PatientDetailsTab.vue'
import PatientAnamnesesTab from './components/PatientAnamnesesTab.vue'
import PatientHistoryTab from './components/PatientHistoryTab.vue'
import PatientProceduresTab from './components/PatientProceduresTab.vue'

// Refactored tab components
import PatientNotesTab from './components/tabs/PatientNotesTab.vue'
import PatientBudgetsTab from './components/tabs/PatientBudgetsTab.vue'
import PatientTermsTab from './components/tabs/PatientTermsTab.vue'
import PatientMediaGallery from './components/PatientMediaGallery.vue'

// Shared components
import { SectionCard } from '@/components/shared'

const route = useRoute()
const router = useRouter()
const patientsStore = usePatientsStore()
const anamnesisStore = useAnamnesisStore()
const appointmentsStore = useAppointmentsStore()
const authStore = useAuthStore()
const toast = useToast()

// State
const isEditing = ref(false)
const isAssignModalOpen = ref(false)
const editablePatient = ref(null)
const viewingAnamnesis = ref(null)
const isCreateAppointmentModalOpen = ref(false)
const pdfPreview = ref({ url: null, name: null })
const generatingPdfId = ref(null)
const isAppointmentModalOpen = ref(false)
const selectedAppointment = ref(null)
const reopeningAppointmentId = ref(null)
const isAddProcedureModalOpen = ref(false)

// Tab routing
const activeTab = computed({
  get() {
    const tabMap = {
      'anamnese': 'anamneses',
      'historico': 'history',
      'procedimentos': 'procedures',
      'anotacoes': 'notes',
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
      'termos': 'termos',
      'media': 'galeria',
      'details': undefined
    }
    router.push({ 
      name: 'detalhes-paciente', 
      params: { id: patient.value?._id || route.params.id, tab: reverseMap[newValue] },
      query: route.query
    })
  }
})

const tabs = [
  { value: 'details', label: 'Detalhes', icon: ClipboardList },
  { value: 'anamneses', label: 'Anamneses', icon: FileText },
  { value: 'history', label: 'Histórico', icon: History },
  { value: 'procedures', label: 'Procedimentos', icon: Stethoscope },
  { value: 'notes', label: 'Anotações', icon: MessageSquare },
  { value: 'budgets', label: 'Orçamentos', icon: Receipt },
  { value: 'termos', label: 'Termos', icon: FileSignature },
  { value: 'media', label: 'Galeria', icon: Folder },
]

// Computed
const patient = computed(() => patientsStore.selectedPatient)
const answeredAnamneses = computed(() => anamnesisStore.answeredAnamneses)
const pendingAnamneses = computed(() => anamnesisStore.pendingAnamneses)
const patientHistory = computed(() => 
  (appointmentsStore.patientAppointments || []).filter(app => app.status !== 'Agendado')
)
const lastAppointment = computed(() => {
  if (patientHistory.value?.length > 0) {
    return [...patientHistory.value].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0]
  }
  return null
})

// Data loading
async function loadPatientData(patientId) {
  if (!patientId) return
  patientsStore.selectedPatient = null
  isEditing.value = false
  await patientsStore.fetchPatientById(patientId)
  await anamnesisStore.fetchAnamnesisForPatient(patientId)
  await appointmentsStore.fetchAppointmentsByPatient(patientId)
}

onMounted(() => {
  loadPatientData(route.params.id)
  if (route.query.edit === 'true') {
    isEditing.value = true
  }
})

onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id !== from.params.id) {
    await loadPatientData(to.params.id)
  }
})

// Editable patient sync
watch(patient, (newVal) => {
  if (newVal) {
    editablePatient.value = JSON.parse(JSON.stringify({
      ...newVal,
      address: newVal.address || {},
      birthDate: newVal.birthDate,
    }))
  }
})

// CEP auto-fill
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
            complement: editablePatient.value.address.complement || '',
          }
        }
      }
    }
  },
)

// Handlers
function cancelEditing() {
  isEditing.value = false
  editablePatient.value = JSON.parse(JSON.stringify(patient.value))
}

async function handleSaveChanges() {
  const payload = JSON.parse(JSON.stringify(editablePatient.value))
  const { success } = await patientsStore.updatePatient(patient.value._id, payload)
  if (success) {
    toast.success('Paciente atualizado com sucesso!')
    isEditing.value = false
    await patientsStore.fetchPatientById(patient.value._id)
  } else {
    toast.error('Erro ao atualizar o paciente.')
  }
}

function handleCopyLink(token) {
  if (!token) {
    toast.error('Token inválido ou não encontrado.')
    return
  }
  const link = `${window.location.origin}/anamnese/${token}`
  navigator.clipboard?.writeText(link).then(() => {
    toast.info('Link de resposta copiado!')
  }).catch(() => {
    toast.error('Erro ao copiar link.')
  })
}

async function handleGeneratePdf(anamnesis) {
  if (generatingPdfId.value || !patient.value) return
  generatingPdfId.value = anamnesis._id
  try {
    const templateName = anamnesis.template?.name || 'anamnese'
    const result = await anamnesisStore.downloadPdf(patient.value._id, anamnesis._id, templateName)
    if (!result.success) {
      toast.error(result.error || 'Erro ao baixar PDF.')
    }
  } finally {
    generatingPdfId.value = null
  }
}

function openAppointmentModal(appointment) {
  selectedAppointment.value = {
    originalEvent: { ...appointment, patient: patient.value },
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
  if (!confirm('Deseja reabrir este atendimento?')) return
  reopeningAppointmentId.value = appointment._id

  try {
    const result = await appointmentsStore.updateAppointmentStatus(appointment._id, 'Iniciado')
    if (result.success) {
      toast.success('Atendimento reaberto!')
    } else {
      toast.error('Erro ao reabrir atendimento.')
    }
  } finally {
    reopeningAppointmentId.value = null
  }
}

async function deleteAppointment(appointment) {
  if (!confirm('Tem certeza que deseja excluir este atendimento?')) return

  const result = await appointmentsStore.deleteAppointment(appointment._id)
  if (result.success) {
    toast.success('Atendimento excluído!')
    await appointmentsStore.fetchAppointmentsByPatient(patient.value._id)
  } else {
    toast.error('Erro ao excluir atendimento.')
  }
}

async function handleAddProcedure(payload) {
  const { success } = await patientsStore.addProcedureToPatient(patient.value._id, payload)
  if (success) {
    toast.success('Procedimento adicionado com sucesso!')
    isAddProcedureModalOpen.value = false
  } else {
    toast.error(patientsStore.error || 'Erro ao adicionar procedimento.')
  }
}
</script>

<template>
  <!-- Modals -->
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

  <!-- Main Content -->
  <PatientShell
    :patient="patient"
    :loading="patientsStore.isLoading"
    :active-tab="activeTab"
    :tabs="tabs"
    :is-editing="isEditing"
    @update:active-tab="activeTab = $event"
    @assign-anamnesis="isAssignModalOpen = true"
    @edit="isEditing = true"
  >
    <Transition name="fade" mode="out-in">
      <div :key="activeTab">
        <!-- Details Tab -->
        <PatientDetailsTab
          v-if="activeTab === 'details' && patient"
          :patient="patient"
          :editable-patient="editablePatient"
          :is-editing="isEditing"
          :last-appointment="lastAppointment"
          @save="handleSaveChanges"
          @cancel="cancelEditing"
          @update:editable-patient="editablePatient = $event"
        />

        <!-- Anamneses Tab -->
        <PatientAnamnesesTab
          v-else-if="activeTab === 'anamneses'"
          :answered-anamneses="answeredAnamneses"
          :pending-anamneses="pendingAnamneses"
          :generating-pdf-id="generatingPdfId"
          @view="viewingAnamnesis = $event"
          @copy-link="handleCopyLink"
          @generate-pdf="handleGeneratePdf"
          @assign="isAssignModalOpen = true"
        />

        <!-- History Tab -->
        <PatientHistoryTab
          v-else-if="activeTab === 'history'"
          :appointments="patientHistory"
          :loading="appointmentsStore.isLoading"
          :reopening-id="reopeningAppointmentId"
          @open="openAppointmentModal"
          @reopen="reopenAppointment"
          @delete="deleteAppointment"
          @create="isCreateAppointmentModalOpen = true"
        />

        <!-- Procedures Tab -->
        <PatientProceduresTab
          v-else-if="activeTab === 'procedures' && patient"
          :procedures="patient.procedures || []"
        />

        <!-- Notes Tab -->
        <PatientNotesTab
          v-else-if="activeTab === 'notes' && patient"
          :patient-id="patient._id"
        />

        <!-- Budgets Tab -->
        <PatientBudgetsTab
          v-else-if="activeTab === 'budgets' && patient"
          :patient-id="patient._id"
        />

        <!-- Termos Tab -->
        <PatientTermsTab
          v-else-if="activeTab === 'termos' && patient"
          :patient-id="patient._id"
        />

        <!-- Media Tab -->
        <div v-else-if="activeTab === 'media' && patient" class="p-6">
          <SectionCard>
            <PatientMediaGallery :patient-id="patient._id" />
          </SectionCard>
        </div>
      </div>
    </Transition>
  </PatientShell>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
