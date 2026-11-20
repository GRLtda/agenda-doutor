<script setup>
/**
 * Bloco "ou continue com..." para as telas de login e cadastro.
 * - Só aparece se existir algum provedor configurado no ambiente (sem credenciais = nada na tela).
 * - Provedor instável (`degraded`): botão desabilitado + aviso, e o login por e-mail/senha segue normal.
 * - Qualquer erro vira mensagem amigável inline (nunca toast, nunca texto técnico).
 */
import { onMounted, ref, computed } from 'vue'
import { AlertTriangle, AlertCircle } from 'lucide-vue-next'
import SocialLoginButton from './SocialLoginButton.vue'
import { beginOAuthLogin, useOAuthProviders, getOAuthErrorMessage } from '@/composables/useOAuth'
import { getProviderConfig } from './providers.config'

const props = defineProps({
  // 'login' | 'signup'
  intent: { type: String, default: 'login' },
  // Caminho interno para onde voltar depois do login (ex.: ?redirect= do login)
  returnTo: { type: String, default: '' },
  // Token de convite (cadastro por convite de funcionário/admin)
  invitationToken: { type: String, default: '' },
  // Texto do divisor
  dividerText: { type: String, default: 'ou' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['error', 'start'])

const { providers, load } = useOAuthProviders()
const loadingProvider = ref(null)
const errorState = ref(null) // { code, message, action }

const visibleProviders = computed(() => providers.value)
const degradedProviders = computed(() => providers.value.filter((p) => p.status === 'degraded'))

onMounted(() => {
  load()
})

async function handleClick(providerId) {
  errorState.value = null
  loadingProvider.value = providerId
  emit('start', providerId)

  const result = await beginOAuthLogin(providerId, {
    intent: props.intent,
    returnTo: props.returnTo || undefined,
    invitationToken: props.invitationToken || undefined,
  })

  // Em caso de sucesso a página é trocada pela do provedor: o loading só termina se der erro.
  if (!result.ok) {
    loadingProvider.value = null
    errorState.value = result.error
    emit('error', result.error)
    if (result.error?.code === 'provider_unavailable') load({ force: true })
  }
}
</script>

<template>
  <section v-if="visibleProviders.length" class="social-login-section" aria-label="Entrar com outro serviço">
    <div class="social-divider" role="separator">
      <span>{{ dividerText }}</span>
    </div>

    <div class="social-buttons">
      <SocialLoginButton
        v-for="provider in visibleProviders"
        :key="provider.id"
        :provider="provider.id"
        :mode="intent"
        :status="provider.status"
        :loading="loadingProvider === provider.id"
        :disabled="disabled || (loadingProvider !== null && loadingProvider !== provider.id)"
        @click="handleClick"
      />
    </div>

    <p v-if="degradedProviders.length && !errorState" class="social-notice" role="status">
      <AlertTriangle :size="16" aria-hidden="true" />
      <span>
        O {{ getProviderConfig(degradedProviders[0].id).name }} está instável agora. Você pode entrar com seu e-mail e senha
        ou tentar de novo em alguns minutos.
      </span>
    </p>

    <p v-if="errorState" class="social-error" role="alert" aria-live="assertive">
      <AlertCircle :size="16" aria-hidden="true" />
      <span>{{ errorState.message || getOAuthErrorMessage(errorState.code) }}</span>
    </p>
  </section>
</template>

<style scoped>
.social-login-section {
  margin-top: var(--ds-space-5);
}
/* Divisor "ou": linhas que esmaecem nas pontas, rótulo discreto no centro. */
.social-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-5);
  color: var(--ds-text-muted);
  font-size: var(--ds-font-base);
}
.social-divider::before,
.social-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ds-border-control);
}
.social-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}
.social-notice,
.social-error {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  margin: var(--ds-space-3) 0 0;
  padding: var(--ds-space-3);
  border: 1px solid;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-sm);
  line-height: 1.45;
  text-align: left;
}
.social-notice {
  background: var(--ds-warning-bg);
  border-color: var(--ds-warning-border);
  color: var(--ds-warning-text);
}
.social-error {
  background: var(--ds-danger-bg);
  border-color: var(--ds-danger-border);
  color: var(--ds-danger-text);
}
.social-notice svg,
.social-error svg {
  flex: none;
  margin-top: 1px;
}
</style>
