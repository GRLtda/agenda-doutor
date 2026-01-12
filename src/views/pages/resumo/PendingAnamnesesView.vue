<script setup>
import { onMounted, computed } from 'vue'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft,
  ClipboardList,
  Calendar,
  Phone,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertCircle
} from 'lucide-vue-next'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'

const router = useRouter()
const anamnesisStore = useAnamnesisStore()
const {
  pendingAnamnesesList,
  pendingTotal,
  pendingPage,
  pendingPages,
  pendingLimit,
  isLoading
} = storeToRefs(anamnesisStore)

onMounted(() => {
  anamnesisStore.fetchPendingAnamneses(1, 20)
})

const toast = useToast()

function goBack() {
  router.back()
}

function formatDate(dateString) {
  if (!dateString) return '--'
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch (e) {
    return dateString
  }
}

function formatPhone(phone) {
  if (!phone) return '--'
  // Format: (11) 98765-4321
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function copyLink(link) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link)
      .then(() => {
        // You could add a toast notification here
        toast.success(`Link copiado!`)
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err)
      })
  }
}

function goToPatient(patientId) {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= pendingPages.value) {
    anamnesisStore.fetchPendingAnamneses(newPage, pendingLimit.value)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const hasData = computed(() => pendingAnamnesesList.value.length > 0)
const showPagination = computed(() => pendingPages.value > 1)
</script>

<template>
  <div class="pending-anamneses-container">
    <!-- Header -->
    <header class="page-header">
      <button class="btn-back" @click="goBack" title="Voltar">
        <ArrowLeft :size="20" />
        <span>Voltar</span>
      </button>

      <div class="header-content">
        <div class="header-icon">
          <ClipboardList :size="28" />
        </div>
        <div class="header-text">
          <h1 class="page-title">Anamneses Pendentes</h1>
          <p class="page-subtitle">
            {{ pendingTotal }} {{ pendingTotal === 1 ? 'anamnese pendente' : 'anamneses pendentes' }}
          </p>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading && !hasData" class="loading-state">
      <LoaderCircle :size="40" class="animate-spin" />
      <p>Carregando anamneses...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && !hasData" class="empty-state">
      <div class="empty-icon">
        <AlertCircle :size="48" />
      </div>
      <h3>Nenhuma anamnese pendente</h3>
      <p>Todas as anamneses foram preenchidas ou não há anamneses atribuídas.</p>
    </div>

    <!-- List -->
    <div v-else class="anamneses-list">
      <div
        v-for="anamnesis in pendingAnamnesesList"
        :key="anamnesis._id"
        class="anamnesis-card"
      >
        <!-- Patient Info -->
        <div class="card-header">
          <div class="patient-info clickable" @click="goToPatient(anamnesis.patientId)" title="Ver perfil do paciente">
            <div class="patient-avatar">
              {{ anamnesis.patientName?.charAt(0)?.toUpperCase() || 'P' }}
            </div>
            <div class="patient-details">
              <h3 class="patient-name">{{ anamnesis.patientName || 'Nome não disponível' }}</h3>
              <div class="patient-phone">
                <Phone :size="14" />
                <PatientPhoneDisplay :phone="anamnesis.patientPhone" :country-code="anamnesis.patientCountryCode" />
              </div>
            </div>
          </div>

          <!-- <div class="status-badge">
            <Clock :size="14" />
            <span>{{ anamnesis.status }}</span>
          </div> -->
        </div>

        <!-- Template Info -->
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Modelo:</span>
            <span class="info-value">{{ anamnesis.templateName || '--' }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Atribuída em:</span>
            <span class="info-value">{{ formatDate(anamnesis.assignedDate) }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Expira em:</span>
            <span class="info-value expiration">{{ formatDate(anamnesis.expirationDate) }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">WhatsApp notificado:</span>
            <div class="notification-status">
              <CheckCircle v-if="anamnesis.whatsappNotified" :size="16" class="icon-success" />
              <XCircle v-else :size="16" class="icon-error" />
              <span>{{ anamnesis.whatsappNotified ? 'Sim' : 'Não' }}</span>
            </div>
          </div>
        </div>

        <!-- Link -->
        <div class="card-footer">
          <button class="btn-copy-link" @click="copyLink(anamnesis.anamnesisLink)" title="Copiar link">
            <LinkIcon :size="16" />
            <span class="link-text">{{ anamnesis.anamnesisLink }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination && !isLoading" class="pagination">
      <button
        class="pagination-btn"
        :disabled="pendingPage === 1"
        @click="changePage(pendingPage - 1)"
      >
        <ChevronLeft :size="18" />
        <span>Anterior</span>
      </button>

      <div class="pagination-info">
        <span class="page-number">Página {{ pendingPage }} de {{ pendingPages }}</span>
      </div>

      <button
        class="pagination-btn"
        :disabled="pendingPage === pendingPages"
        @click="changePage(pendingPage + 1)"
      >
        <span>Próxima</span>
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pending-anamneses-container {
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
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f97316;
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
.anamneses-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.anamnesis-card {
  background: var(--branco);
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s;
}

.anamnesis-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
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
  border-radius: 1rem;
}

.patient-info.clickable:hover {
  background: rgba(59, 131, 246, 0.085);
}

.patient-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--azul-principal) 0%, #2563eb 100%);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.patient-phone {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff7ed;
  color: #d97706;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid #fed7aa;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.info-label {
  font-weight: 600;
  color: #64748b;
  min-width: 140px;
}

.info-value {
  color: #1e293b;
  font-weight: 500;
}

.info-value.expiration {
  color: #dc2626;
  font-weight: 600;
}

.notification-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e293b;
  font-weight: 500;
}

.icon-success {
  color: #22c55e;
}

.icon-error {
  color: #ef4444;
}

.card-footer {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.btn-copy-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: var(--branco);
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-link:hover {
  background: #f8fafc;
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.link-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.pagination-btn {
  display: flex;
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
}

.pagination-btn:hover:not(:disabled) {
  background: var(--azul-principal);
  color: white;
  border-color: var(--azul-principal);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

/* Responsive */
@media (max-width: 768px) {
  .pending-anamneses-container {
    padding: 1rem;
  }

  .card-header {
    align-items: flex-start;
    gap: 1rem;
  }

  .status-badge {
    align-self: flex-start;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-label {
    min-width: auto;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
