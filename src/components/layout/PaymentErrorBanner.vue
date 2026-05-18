<script setup>
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['dismiss', 'open-payment'])
</script>

<template>
  <section class="payment-error-banner" role="alert">
    <div class="banner-copy">
      <AlertTriangle :size="18" />
      <span>Houve um erro no pagamento da assinatura. Corrija o problema para evitar interrupções.</span>
    </div>

    <div class="banner-actions">
      <button type="button" class="verify-button" :disabled="loading" @click="emit('open-payment')">
        {{ loading ? 'Abrindo...' : 'Corrigir problema' }}
      </button>
      <button type="button" class="dismiss-button" aria-label="Fechar aviso" @click="emit('dismiss')">
        <X :size="18" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.payment-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1.25rem;
  background: #b91c1c;
  color: #fff;
}

.banner-copy,
.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.banner-copy {
  font-size: 0.9rem;
  font-weight: 500;
}

.verify-button {
  border: none;
  border-radius: 999px;
  background: #fff;
  color: #991b1b;
  font-weight: 700;
  padding: 0.55rem 1rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(127, 29, 29, 0.2);
}

.verify-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.dismiss-button {
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

@media (max-width: 720px) {
  .payment-error-banner {
    align-items: stretch;
    flex-direction: column;
    gap: 0.8rem;
    padding: 0.9rem 1rem;
  }

  .banner-copy {
    align-items: flex-start;
    line-height: 1.35;
    font-size: 0.88rem;
  }

  .banner-copy svg {
    margin-top: 0.12rem;
    flex-shrink: 0;
  }

  .banner-actions {
    justify-content: space-between;
  }

  .verify-button {
    flex: 1;
    min-height: 2.35rem;
  }

  .dismiss-button {
    width: 2.35rem;
    min-width: 2.35rem;
    height: 100%;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
