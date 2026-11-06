<script setup>
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
defineProps({ visible: Boolean, loading: Boolean, canRetry: Boolean })
const emit = defineEmits(['retry'])
</script>

<template>
  <Teleport to="body">
    <Transition name="api-banner">
      <section v-if="visible" class="api-availability-banner" role="alert" aria-live="polite">
        <div class="api-banner-copy">
          <AlertTriangle :size="20" aria-hidden="true" />
          <div><strong>Estamos com uma instabilidade no sistema. Já estamos verificando.</strong><p>{{ canRetry ? 'Sua sessão foi mantida. Algumas informações podem não estar atualizadas.' : 'Algumas informações podem não estar disponíveis. Tente novamente em instantes.' }}</p></div>
        </div>
        <button v-if="canRetry" type="button" :disabled="loading" @click="emit('retry')">
          <RefreshCw :size="16" :class="{ spinning: loading }" aria-hidden="true" />
          {{ loading ? 'Verificando…' : 'Tentar novamente' }}
        </button>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.api-availability-banner { position: fixed; z-index: 2147483646; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 20px; background: #b91c1c; color: #fff; box-shadow: 0 4px 18px rgb(15 23 42 / 16%); font-family: var(--fonte-principal); }
.api-banner-copy { display: flex; align-items: center; gap: 12px; min-width: 0; }
.api-banner-copy > svg { flex-shrink: 0; }
.api-banner-copy strong { font-size: 13px; font-weight: 500; line-height: 1.4; }
.api-banner-copy p { margin: 3px 0 0; font-size: 12px; font-weight: 400; line-height: 1.4; color: #fee2e2; }
.api-availability-banner button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: #fff; color: #991b1b; font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
.api-availability-banner button:disabled { opacity: .7; cursor: wait; }
.api-availability-banner button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.spinning { animation: api-spin 1s linear infinite; }
.api-banner-enter-active, .api-banner-leave-active { transition: opacity .2s ease, transform .2s ease; }
.api-banner-enter-from, .api-banner-leave-to { opacity: 0; transform: translateY(-100%); }
@keyframes api-spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) { .api-availability-banner { align-items: stretch; flex-direction: column; gap: 10px; padding: 12px 16px; } .api-banner-copy { align-items: flex-start; } .api-banner-copy > svg { margin-top: 2px; } }
@media (prefers-reduced-motion: reduce) { .api-banner-enter-active, .api-banner-leave-active { transition: none; } .spinning { animation: none; } }
</style>
