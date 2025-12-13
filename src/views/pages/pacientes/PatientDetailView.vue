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
  Stethoscope, // ✨ Importar ícone
  Trash2,
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import { fetchAddressByCEP } from '@/api/external'
import AssignAnamnesisModal from '@/components/pages/pacientes/modals/AssignAnamnesisModal.vue'
import AnamnesisAnswersModal from '@/components/pages/dashboard/AnamnesisAnswersModal.vue'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import PdfPreviewModal from '@/components/pages/pacientes/modals/PdfPreviewModal.vue'
import AddProcedureModal from '@/components/modals/AddProcedureModal.vue' // ✨ Importar Modal Atualizado

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
const activeTab = ref('details')
const viewingAnamnesis = ref(null)
const isCreateAppointmentModalOpen = ref(false)
const pdfPreview = ref({ url: null, name: null })

const patient = computed(() => patientsStore.selectedPatient)
const clinic = computed(() => authStore.user?.clinic)
const answeredAnamneses = computed(() => anamnesisStore.answeredAnamneses)
const pendingAnamneses = computed(() => anamnesisStore.pendingAnamneses)
const patientHistory = computed(() => appointmentsStore.patientAppointments)

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
    activeTab.value = 'details'

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
    let formattedBirthDate = newVal.birthDate;

    if (newVal.birthDate) {
      const date = new Date(newVal.birthDate);

      // Usamos métodos UTC para formatar corretamente no formato ISO (YYYY-MM-DD)
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      formattedBirthDate = `${year}-${month}-${day}`;
    }

    editablePatient.value = JSON.parse(JSON.stringify({
      ...newVal,
      address: newVal.address || {},
      // Aplica a data formatada para o <input type="date">
      birthDate: formattedBirthDate || '',
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
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function handleCopyLink(token) {
  const link = `${window.location.origin}/anamnese/${token}`
  navigator.clipboard.writeText(link).then(() => {
    toast.info('Link de resposta copiado!')
  })
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
              <span>{{ patient.phone }}</span>
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

      <nav class="tabs-nav">
        <button @click="activeTab = 'details'" :class="{ active: activeTab === 'details' }">
          <ClipboardList :size="16" />
          Detalhes
        </button>
        <button @click="activeTab = 'anamneses'" :class="{ active: activeTab === 'anamneses' }">
          <FileText :size="16" />
          Anamneses
        </button>
        <button @click="activeTab = 'history'" :class="{ active: activeTab === 'history' }">
          <History :size="16" />
          Histórico
        </button>
        <button @click="activeTab = 'procedures'" :class="{ active: activeTab === 'procedures' }">
          <Stethoscope :size="16" />
          Procedimentos
        </button>
      </nav>

      <div class="tab-content">
        <Transition name="fade" mode="out-in">
          <div :key="activeTab">
            <div v-if="activeTab === 'details'">
              <div v-if="isEditing && editablePatient" class="unified-card">
                <form @submit.prevent="handleSaveChanges">
                  <section class="card-section">
                    <h3 class="section-title"><ClipboardList :size="18" /> Dados Pessoais</h3>
                    <div class="section-content grid-2-cols">
                      <FormInput
                        v-model="editablePatient.name"
                        label="Nome Completo"
                        placeholder="Nome do paciente"
                        required
                      />
                      <FormInput
                        v-model="editablePatient.birthDate"
                        label="Data de Nascimento"
                        type="date"
                        required
                      />
                      <FormInput
                        v-model="editablePatient.cpf"
                        label="CPF"
                        placeholder="000.000.000-00"
                        cpf-mask
                      />
                      <FormInput
                        v-model="editablePatient.phone"
                        label="Telefone"
                        placeholder="(00) 00000-0000"
                        required
                        phone-mask
                      />
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
                    <h3 class="section-title"><MapPin :size="18" /> Endereço</h3>
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
              <div v-else class="unified-card">
                <section class="card-section">
                  <h3 class="section-title"><ClipboardList :size="18" /> Dados Pessoais</h3>
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
                      <strong class="value">{{ formatPhone(patient.phone) }}</strong>
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
                  <h3 class="section-title"><MapPin :size="18" /> Endereço</h3>
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
                  <h3 class="section-title"><History :size="18" /> Histórico Recente</h3>
                  <div class="section-content">
                    <div v-if="lastAppointment" class="last-appointment-item">
                      <span class="label">Último Atendimento</span>
                      <div class="value-with-badge">
                        <strong>{{ formatSimpleDate(lastAppointment.startTime) }}</strong>
                        <span
                          :class="useStatusBadge(lastAppointment.status).badgeClass.value"
                          :style="useStatusBadge(lastAppointment.status).badgeStyle.value"
                          >{{ useStatusBadge(lastAppointment.status).displayText.value }}</span
                        >
                      </div>
                    </div>
                    <p v-else class="empty-list-message">Nenhum atendimento anterior registrado.</p>
                  </div>
                </section>
              </div>
            </div>

            <div v-if="activeTab === 'anamneses'">
              <div class="anamnesis-section">
                <h3 class="title-respondidas"><CheckSquare :size="20" /> Respondidas</h3>
                <ul v-if="answeredAnamneses.length > 0" class="anamnesis-list">
                  <li v-for="item in answeredAnamneses" :key="item._id">
                    <div class="anamnesis-info clickable" @click="viewingAnamnesis = item">
                      <span class="anamnesis-name">{{
                        item.template?.name || 'Modelo não encontrado'
                      }}</span>
                      <span class="anamnesis-date"
                        >Respondida em {{ formatSimpleDate(item.updatedAt) }}</span
                      >
                    </div>
                    <button
                      @click.stop="handleGeneratePdf(item)"
                      class="btn-icon"
                      title="Visualizar PDF"
                    >
                      <FileDown :size="16" />
                    </button>
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
                <h3 class="title-pendentes"><FileText :size="20" /> Pendentes</h3>
                <ul v-if="pendingAnamneses.length > 0" class="anamnesis-list">
                  <li v-for="item in pendingAnamneses" :key="item._id">
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

            <div v-if="activeTab === 'history'">
              <div class="history-section">
                <h3 class="title-historico"><History :size="20" /> Histórico de Atendimentos</h3>
                <div v-if="appointmentsStore.isLoading" class="loading-state">
                  Carregando histórico...
                </div>
                <ul v-else-if="patientHistory.length > 0" class="history-list">
                  <li v-for="item in patientHistory" :key="item._id">
                    <div class="history-info">
                      <span class="history-date">{{ formatSimpleDate(item.startTime) }}</span>
                      <span
                        :class="useStatusBadge(item.status).badgeClass.value"
                          :style="useStatusBadge(item.status).badgeStyle.value"
                        >{{ useStatusBadge(item.status).displayText.value }}</span
                      >
                    </div>
                    <router-link
                      v-if="item.status === 'Realizado'"
                      :to="`/app/atendimentos/${item._id}/patient/${patient._id}`"
                      class="btn-secondary"
                    >
                      <Eye :size="16" />
                      <span class="btn-text">Ver Relatório</span>
                    </router-link>
                  </li>
                </ul>
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

            <div v-if="activeTab === 'procedures'">
              <div class="procedures-section">
                <div class="section-header-row">
                  <h3 class="title-procedures"><Stethoscope :size="20" /> Procedimentos Realizados</h3>
                  <AppButton @click="isAddProcedureModalOpen = true" variant="primary" class="btn-sm">
                    <CalendarPlus :size="16" />
                    Adicionar
                  </AppButton>
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
                      <button @click="handleDeleteProcedure(proc)" class="btn-icon delete-btn" title="Remover Procedimento">
                          <Trash2 :size="16" />
                      </button>
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
                  <AppButton @click="isAddProcedureModalOpen = true" variant="secondary">
                    <CalendarPlus :size="16" />
                    Adicionar Procedimento
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  transform: translateY(0);
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

/* ... (estilos anteriores) ... */

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
  margin-bottom: 1rem;
}

.title-procedures {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
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

.tabs-nav button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  color: var(--cinza-texto);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.tabs-nav button.active {
  color: var(--azul-principal);
  border-bottom-color: var(--azul-principal);
}
.unified-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
}
.card-section {
  padding: 1.5rem 2rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--azul-principal);
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
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--azul-principal);
}
.anamnesis-list,
.history-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
}
.anamnesis-list li,
.history-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}
.anamnesis-list li:hover,
.history-list li:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
}
.anamnesis-info.clickable {
  cursor: pointer;
}
.anamnesis-info,
.history-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
  min-width: 0;
}
.anamnesis-name,
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
  margin-bottom: 1.5rem;
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
  .tabs-nav {
    justify-content: space-around;
  }
  .tabs-nav button {
    /* Garante que o ícone e o texto permaneçam legíveis em mobile */
    font-size: 0.9rem;
    padding: 0.75rem 0.5rem;
  }
  .section-content.grid-2-cols {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .card-section {
    padding: 1.5rem;
  }
  .history-info {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .history-list .btn-secondary {
    width: 100%;
    justify-content: center;
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
</style>
