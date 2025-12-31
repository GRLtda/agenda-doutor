<script setup>
import { ref, computed, onMounted } from 'vue';
import { AlertTriangle, Loader2, X } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useClinicStore } from '@/stores/clinic';

const authStore = useAuthStore();
const clinicStore = useClinicStore();

const paymentError = ref(null);
const loading = ref(true);
const portalLoading = ref(false);
const isDismissed = ref(false);

const isOwner = computed(() => authStore.user?.role === 'owner');

const showBanner = computed(() => {
  return isOwner.value && paymentError.value?.inGracePeriod && !isDismissed.value;
});

const daysRemaining = computed(() => {
  return paymentError.value?.daysRemaining ?? 0;
});

const fetchSubscriptionStatus = async () => {
  if (!isOwner.value) {
    loading.value = false;
    return;
  }
  
  try {
    const response = await clinicStore.getSubscriptionStatus();
    if (response.success && response.data.paymentError) {
      paymentError.value = response.data.paymentError;
    }
  } catch (error) {
    console.error('Erro ao verificar status de pagamento:', error);
  } finally {
    loading.value = false;
  }
};

const handleManagePayment = async () => {
  if (portalLoading.value) return;
  
  portalLoading.value = true;
  try {
    const response = await clinicStore.createPortalSession();
    if (response.success && response.data.url) {
      window.location.href = response.data.url;
    }
  } catch (error) {
    console.error('Erro ao abrir portal de pagamento:', error);
    portalLoading.value = false;
  }
};

const dismissBanner = () => {
  isDismissed.value = true;
};

onMounted(() => {
  fetchSubscriptionStatus();
});
</script>

<template>
  <div v-if="showBanner" class="payment-warning-banner">
    <div class="banner-content">
      <div class="banner-left">
        <div class="icon-container">
          <AlertTriangle :size="20" class="icon" />
        </div>
        <div class="text-content">
          <span class="title">Problema com o pagamento</span>
          <span class="message">
            Regularize em <strong>{{ daysRemaining }}</strong> dia(s) para evitar interrupção do serviço
          </span>
        </div>
      </div>
      <div class="banner-actions">
        <button 
          @click="handleManagePayment" 
          class="action-button"
          :disabled="portalLoading"
        >
          <Loader2 v-if="portalLoading" :size="16" class="spinner" />
          <span>{{ portalLoading ? 'Abrindo...' : 'Atualizar pagamento' }}</span>
        </button>
        <button @click="dismissBanner" class="close-button" title="Fechar aviso">
          <X :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-warning-banner {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  padding: 0.875rem 0.5rem;
  animation: slideDown 0.4s ease-out;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  gap: 1rem;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  flex-shrink: 0;
}

.icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.text-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.title {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.message {
  font-size: 0.8rem;
  opacity: 0.95;
}

.message strong {
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin: 0 0.125rem;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: white;
  border: none;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-button:hover:not(:disabled) {
  background: #fef2f2;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-button:disabled {
  cursor: wait;
  opacity: 0.85;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Mobile */
@media (max-width: 768px) {
  .payment-warning-banner {
    padding: 0.5rem 0.75rem;
  }

  .banner-content {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .banner-left {
    flex-direction: row;
    text-align: left;
    gap: 0.5rem;
    align-items: center;
  }

  .icon-container {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .text-content {
    flex-direction: column;
    gap: 0.125rem;
  }

  .title {
    font-size: 0.8rem;
  }

  .message {
    font-size: 0.7rem;
  }

  .banner-actions {
    width: 100%;
  }

  .action-button {
    flex: 1;
    justify-content: center;
    padding: 0.5rem;
    font-size: 0.75rem;
  }

  .close-button {
    width: 28px;
    height: 28px;
  }
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>

