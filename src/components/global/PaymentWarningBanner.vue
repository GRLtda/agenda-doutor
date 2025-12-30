<script setup>
import { ref, computed, onMounted } from 'vue';
import { AlertTriangle, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useClinicStore } from '@/stores/clinic';

const authStore = useAuthStore();
const clinicStore = useClinicStore();

const paymentError = ref(null);
const loading = ref(true);
const portalLoading = ref(false);

const isOwner = computed(() => authStore.user?.role === 'owner');

const showBanner = computed(() => {
  return isOwner.value && paymentError.value?.inGracePeriod;
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

onMounted(() => {
  fetchSubscriptionStatus();
});
</script>

<template>
  <div v-if="showBanner" class="payment-warning-banner">
    <div class="banner-content">
      <AlertTriangle :size="18" class="icon pulse-icon" />
      <span class="message">
        Erro no pagamento! Você tem <strong>{{ daysRemaining }}</strong> dia(s) para regularizar.
      </span>
      <button 
        @click="handleManagePayment" 
        class="action-button"
        :disabled="portalLoading"
      >
        <Loader2 v-if="portalLoading" :size="14" class="spinner" />
        <span>{{ portalLoading ? 'Abrindo portal...' : 'Atualizar pagamento' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-warning-banner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.65rem 1rem;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  animation: slideDown 0.4s ease-out, pulseBackground 2s ease-in-out infinite;
  box-shadow: 0 2px 10px rgba(220, 38, 38, 0.3);
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

@keyframes pulseBackground {
  0%, 100% {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  }
  50% {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  flex-shrink: 0;
}

.pulse-icon {
  animation: pulseIcon 1.5s ease-in-out infinite;
}

@keyframes pulseIcon {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
  }
}

.message {
  white-space: nowrap;
}

.message strong {
  font-weight: 700;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 0.5rem;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.action-button:disabled {
  cursor: wait;
  opacity: 0.9;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .banner-content {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .message {
    text-align: center;
  }
}
</style>
