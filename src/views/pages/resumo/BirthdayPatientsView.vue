<script setup>
import { onMounted, computed } from 'vue'
import { usePatientsStore } from '@/stores/patients'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Cake,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  LoaderCircle,
  AlertCircle
} from 'lucide-vue-next'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'

const router = useRouter()
const patientsStore = usePatientsStore()
const { birthdayPatients, isLoading } = storeToRefs(patientsStore)

onMounted(() => {
  patientsStore.fetchBirthdayPatients()
})

function goBack() {
  router.back()
}

function formatDate(dateString) {
  if (!dateString) return '--'
  try {
    const dateStr = dateString.toString().split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return format(date, "dd 'de' MMMM", { locale: ptBR })
  } catch (e) {
    return dateString
  }
}

function formatPhone(phone) {
  if (!phone) return '--'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function getAge(birthDate) {
  if (!birthDate) return null
  try {
    const dateStr = birthDate.toString().split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    
    const today = new Date()
    let age = today.getFullYear() - year
    const monthDiff = (today.getMonth() + 1) - month
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--
    }
    return age
  } catch (e) {
    return null
  }
}

function goToPatient(patientId) {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

function formatAddress(address) {
  if (!address) return '--'
  if (typeof address === 'string') return address
  
  const parts = []
  if (address.street) parts.push(address.street)
  if (address.number) parts.push(address.number)
  if (address.district) parts.push(address.district)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.cep) parts.push(`CEP: ${address.cep}`)
  
  return parts.length > 0 ? parts.join(', ') : '--'
}

const hasData = computed(() => birthdayPatients.value.length > 0)
const totalBirthdays = computed(() => birthdayPatients.value.length)
</script>

<template>
  <div class="birthday-patients-container">
    <!-- Header -->
    <header class="page-header">
      <button class="btn-back" @click="goBack" title="Voltar">
        <ArrowLeft :size="20" />
        <span>Voltar</span>
      </button>

      <div class="header-content">
        <div class="header-icon">
          <Cake :size="28" />
        </div>
        <div class="header-text">
          <h1 class="page-title">Aniversariantes do Mês</h1>
          <p class="page-subtitle">
            {{ totalBirthdays }} {{ totalBirthdays === 1 ? 'paciente faz' : 'pacientes fazem' }} aniversário este mês
          </p>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading && !hasData" class="loading-state">
      <LoaderCircle :size="40" class="animate-spin" />
      <p>Carregando aniversariantes...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && !hasData" class="empty-state">
      <div class="empty-icon">
        <AlertCircle :size="48" />
      </div>
      <h3>Nenhum aniversariante este mês</h3>
      <p>Não há pacientes com aniversário no mês atual.</p>
    </div>

    <!-- List -->
    <div v-else class="birthdays-list">
      <div
        v-for="patient in birthdayPatients"
        :key="patient.patientId"
        class="birthday-card"
      >
        <!-- Patient Info -->
        <div class="card-header">
          <div class="patient-info clickable" @click="goToPatient(patient.patientId)" title="Ver perfil do paciente">
            <div class="patient-avatar">
              {{ patient.name?.charAt(0)?.toUpperCase() || 'P' }}
            </div>
            <div class="patient-details">
              <h3 class="patient-name">{{ patient.name || 'Nome não disponível' }}</h3>
              <div class="patient-meta">
                <Calendar :size="14" />
                <span>{{ formatDate(patient.birthDate) }}</span>
                <span v-if="getAge(patient.birthDate)" class="age-badge">
                  {{ getAge(patient.birthDate) }} anos
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="card-body">
          <div class="info-row" v-if="patient.phone">
            <div class="info-icon">
              <Phone :size="16" />
            </div>
            <div class="info-content">
              <span class="info-label">Telefone:</span>
              <PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" :show-flag="false" class="info-value" />
            </div>
          </div>

          <div class="info-row" v-if="patient.email">
            <div class="info-icon">
              <Mail :size="16" />
            </div>
            <div class="info-content">
              <span class="info-label">E-mail:</span>
              <span class="info-value">{{ patient.email }}</span>
            </div>
          </div>

          <div class="info-row" v-if="patient.gender">
            <div class="info-icon">
              <User :size="16" />
            </div>
            <div class="info-content">
              <span class="info-label">Gênero:</span>
              <span class="info-value">{{ patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro' }}</span>
            </div>
          </div>

          <div class="info-row" v-if="patient.address && formatAddress(patient.address) !== '--'">
            <div class="info-icon">
              <MapPin :size="16" />
            </div>
            <div class="info-content">
              <span class="info-label">Endereço:</span>
              <span class="info-value">{{ formatAddress(patient.address) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.birthday-patients-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: calc(100vh - 80px);
}

/* Header */
.page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--branco);
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
}

.btn-back:hover {
  background: #f8fafc;
  color: var(--azul-principal);
  border-color: var(--azul-principal);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--branco);
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.header-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ec4899;
  flex-shrink: 0;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #f1f5f9;
  gap: 1rem;
}

.loading-state {
  color: #94a3b8;
}

.animate-spin {
  animation: spin 1s linear infinite;
  color: var(--azul-principal);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  color: #64748b;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f8fafc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.empty-state p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* List */
.birthdays-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.birthday-card {
  background: var(--branco);
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s;
}

.birthday-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #ffffff 100%);
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.patient-info.clickable {
  cursor: pointer;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: 0.75rem;
}

.patient-info.clickable:hover {
  background: rgba(236, 72, 153, 0.08);
  transform: translateX(4px);
}

.patient-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.patient-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.patient-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.patient-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.age-badge {
  background: #fdf2f8;
  color: #ec4899;
  padding: 0.125rem 0.5rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #fbcfe8;
}

.birthday-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fdf2f8;
  color: #ec4899;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid #fbcfe8;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.info-icon {
  width: 32px;
  height: 32px;
  background: #f8fafc;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .birthday-patients-container {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .birthday-badge {
    align-self: flex-start;
  }
}
</style>
