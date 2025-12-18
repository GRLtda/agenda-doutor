<script setup>
import { ref, onMounted, computed } from 'vue'
import { ShieldCheck, AlertTriangle, Loader2, X, ExternalLink, RefreshCw } from 'lucide-vue-next'
import webpkiService from '@/services/webpki.service'
import AppButton from '@/components/global/AppButton.vue'

const emit = defineEmits(['close', 'select'])

const certificates = ref([])
const isLoading = ref(true)
const error = ref(null)
const selectedCert = ref(null)

const hasCertificates = computed(() => certificates.value.length > 0)

onMounted(async () => {
  await loadCertificates()
})

async function loadCertificates() {
  isLoading.value = true
  error.value = null
  
  try {
    await webpkiService.init()
    certificates.value = await webpkiService.listCertificates({
      pkiBrazil: true,
      validOnly: true
    })
  } catch (err) {
    if (err.type === 'NOT_INSTALLED') {
      error.value = {
        type: 'NOT_INSTALLED',
        message: 'A extensão Web PKI não está instalada no seu navegador.',
        installUrl: err.installUrl
      }
    } else {
      error.value = {
        type: 'ERROR',
        message: err.message || 'Erro ao carregar certificados'
      }
    }
  } finally {
    isLoading.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function getDaysUntilExpiry(dateString) {
  if (!dateString) return 0
  const expiry = new Date(dateString)
  const now = new Date()
  const diff = expiry - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function selectCertificate(cert) {
  selectedCert.value = cert
}

function confirmSelection() {
  if (selectedCert.value) {
    emit('select', selectedCert.value)
  }
}

function handleInstall() {
  if (error.value?.installUrl) {
    window.open(error.value.installUrl, '_blank')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <header class="modal-header">
        <div class="header-title">
          <ShieldCheck :size="24" />
          <h2>Selecione seu Certificado Digital</h2>
        </div>
        <button @click="emit('close')" class="close-btn">
          <X :size="20" />
        </button>
      </header>

      <div class="modal-content">
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
          <Loader2 :size="32" class="spinner" />
          <p>Carregando certificados...</p>
        </div>

        <!-- Error State: Not Installed -->
        <div v-else-if="error?.type === 'NOT_INSTALLED'" class="error-state">
          <AlertTriangle :size="48" class="error-icon" />
          <h3>Extensão não instalada</h3>
          <p>{{ error.message }}</p>
          <p class="hint">Clique no botão abaixo para instalar a extensão Web PKI.</p>
          <AppButton @click="handleInstall" variant="primary">
            <ExternalLink :size="16" />
            Instalar Web PKI
          </AppButton>
          <AppButton @click="loadCertificates" variant="secondary" class="mt-2">
            <RefreshCw :size="16" />
            Tentar Novamente
          </AppButton>
        </div>

        <!-- Error State: General -->
        <div v-else-if="error?.type === 'ERROR'" class="error-state">
          <AlertTriangle :size="48" class="error-icon" />
          <h3>Erro ao carregar certificados</h3>
          <p>{{ error.message }}</p>
          <AppButton @click="loadCertificates" variant="secondary">
            <RefreshCw :size="16" />
            Tentar Novamente
          </AppButton>
        </div>

        <!-- No Certificates -->
        <div v-else-if="!hasCertificates" class="empty-state">
          <ShieldCheck :size="48" class="empty-icon" />
          <h3>Nenhum certificado encontrado</h3>
          <p>Não foram encontrados certificados digitais ICP-Brasil válidos.</p>
          <p class="hint">Verifique se o seu certificado está instalado corretamente e não expirou.</p>
          <AppButton @click="loadCertificates" variant="secondary">
            <RefreshCw :size="16" />
            Atualizar Lista
          </AppButton>
        </div>

        <!-- Certificate List -->
        <div v-else class="certificates-list">
          <div
            v-for="cert in certificates"
            :key="cert.thumbprint"
            class="certificate-item"
            :class="{ selected: selectedCert?.thumbprint === cert.thumbprint }"
            @click="selectCertificate(cert)"
          >
            <div class="cert-icon">
              <ShieldCheck :size="24" />
            </div>
            <div class="cert-info">
              <span class="cert-name">{{ cert.name || cert.subjectName }}</span>
              <span v-if="cert.cpfFormatted" class="cert-cpf">CPF: {{ cert.cpfFormatted }}</span>
              <span class="cert-issuer">{{ cert.issuerName }}</span>
            </div>
            <div class="cert-validity">
              <span 
                class="validity-badge"
                :class="{ warning: getDaysUntilExpiry(cert.validityEnd) < 30 }"
              >
                Válido até {{ formatDate(cert.validityEnd) }}
              </span>
              <span v-if="getDaysUntilExpiry(cert.validityEnd) < 30" class="expiry-warning">
                Expira em {{ getDaysUntilExpiry(cert.validityEnd) }} dias
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer v-if="hasCertificates && !error" class="modal-footer">
        <AppButton @click="emit('close')" variant="secondary">
          Cancelar
        </AppButton>
        <AppButton 
          @click="confirmSelection" 
          variant="primary"
          :disabled="!selectedCert"
        >
          <ShieldCheck :size="16" />
          Assinar com este Certificado
        </AppButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: var(--branco, #fff);
  border-radius: 1rem;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #1f2937;
}

.header-title h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.header-title svg {
  color: #059669;
}

.close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
}

.loading-state p,
.error-state p,
.empty-state p {
  color: #6b7280;
  margin: 0;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6366f1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  color: #ef4444;
}

.empty-icon {
  color: #9ca3af;
}

.error-state h3,
.empty-state h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #1f2937;
}

.hint {
  font-size: 0.875rem;
  color: #9ca3af;
}

.mt-2 {
  margin-top: 0.5rem;
}

.certificates-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.certificate-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.certificate-item:hover {
  border-color: #6366f1;
  background: #f5f5ff;
}

.certificate-item.selected {
  border-color: #6366f1;
  background: #eef2ff;
}

.cert-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: #dcfce7;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
}

.cert-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cert-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
}

.cert-cpf {
  font-size: 0.875rem;
  color: #4b5563;
}

.cert-issuer {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.cert-validity {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.validity-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #dcfce7;
  color: #059669;
  border-radius: 0.375rem;
}

.validity-badge.warning {
  background: #fef3c7;
  color: #d97706;
}

.expiry-warning {
  font-size: 0.75rem;
  color: #d97706;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}
</style>
