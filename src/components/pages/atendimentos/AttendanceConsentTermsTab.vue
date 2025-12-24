<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import { FileSignature, Plus, Copy, Eye, Clock, CheckCircle2 } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import AssignConsentTermModal from '@/components/pages/pacientes/modals/AssignConsentTermModal.vue'
import ViewConsentTermModal from '@/components/pages/pacientes/modals/ViewConsentTermModal.vue'

const props = defineProps({
  patientId: { type: String, required: true },
  appointmentId: { type: String, required: true },
})

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const isAssignModalOpen = ref(false)
const viewingTermId = ref(null)

const appointmentTerms = computed(() => consentTermsStore.appointmentTerms)
const isLoading = computed(() => consentTermsStore.isLoading)

onMounted(() => {
  consentTermsStore.fetchTermsForAppointment(props.appointmentId)
})

watch(() => props.appointmentId, (newId) => {
  if (newId) {
    consentTermsStore.fetchTermsForAppointment(newId)
  }
})

function openAssignModal() {
  isAssignModalOpen.value = true
}

function closeAssignModal() {
  isAssignModalOpen.value = false
  // Recarregar lista após adicionar
  consentTermsStore.fetchTermsForAppointment(props.appointmentId)
}

function openViewModal(termId) {
  viewingTermId.value = termId
}

function closeViewModal() {
  viewingTermId.value = null
}

function copyLink(token) {
  const link = `${window.location.origin}/termo/${token}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      toast.info('Link copiado!')
    })
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="consent-terms-tab">
    <AssignConsentTermModal
      v-if="isAssignModalOpen"
      :patient-id="patientId"
      :appointment-id="appointmentId"
      @close="closeAssignModal"
    />

    <ViewConsentTermModal
      v-if="viewingTermId"
      :patient-id="patientId"
      :term-id="viewingTermId"
      @close="closeViewModal"
    />

    <!-- Header -->
    <div class="tab-header">
      <div class="header-info">
        <FileSignature :size="20" class="header-icon" />
        <h3>Termos de Consentimento</h3>
      </div>
      <AppButton @click="openAssignModal" variant="primary" size="sm">
        <Plus :size="16" />
        Adicionar Termo
      </AppButton>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
    </div>

    <!-- Lista de Termos -->
    <div v-else-if="appointmentTerms.length > 0" class="terms-list">
      <div
        v-for="term in appointmentTerms"
        :key="term._id"
        class="term-card"
        :class="{ signed: term.status === 'Assinado' }"
      >
        <div class="term-info">
          <span class="term-name">{{ term.template?.name || 'Termo' }}</span>
          <div class="term-meta">
            <span class="term-date">Enviado em {{ formatDate(term.createdAt) }}</span>
            <span
              class="term-status"
              :class="{ pending: term.status === 'Pendente', signed: term.status === 'Assinado' }"
            >
              <Clock v-if="term.status === 'Pendente'" :size="12" />
              <CheckCircle2 v-else :size="12" />
              {{ term.status }}
            </span>
          </div>
        </div>

        <div class="term-actions">
          <AppButton
            v-if="term.status === 'Pendente' && term.patientAccessToken"
            @click="copyLink(term.patientAccessToken)"
            variant="default"
            size="sm"
            title="Copiar Link"
          >
            <Copy :size="14" />
            Copiar Link
          </AppButton>
          <AppButton
            @click="openViewModal(term._id)"
            variant="default"
            size="sm"
            title="Visualizar"
          >
            <Eye :size="14" />
            Ver
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <FileSignature :size="40" class="empty-icon" />
      <p>Nenhum termo de consentimento neste atendimento</p>
      <AppButton @click="openAssignModal" variant="primary" size="sm">
        <Plus :size="14" />
        Adicionar Termo
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.consent-terms-tab {
  padding: 1rem 0;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  color: var(--azul-principal);
}

h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--azul-principal);
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.terms-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.term-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: border-color 0.2s;
}

.term-card:hover {
  border-color: var(--azul-principal-leve);
}

.term-card.signed {
  border-left: 3px solid #10b981;
}

.term-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.term-name {
  font-weight: 500;
  color: var(--preto);
}

.term-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
}

.term-date {
  color: var(--cinza-texto);
}

.term-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
}

.term-status.pending {
  color: #d97706;
  background: #fef3c7;
}

.term-status.signed {
  color: #059669;
  background: #d1fae5;
}

.term-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--cinza-texto);
}

.empty-icon {
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}
</style>
