<script setup>
/**
 * "Experiências conectadas": mostra, por provedor, se a conta está conectada e permite conectar/desconectar.
 *
 * - Lista os provedores configurados no ambiente (+ qualquer um já conectado).
 * - Conectar/desconectar exige confirmação de identidade recente:
 *     • usuário com senha → pede a senha (POST /oauth/reauth/password);
 *     • usuário sem senha → confirma passando de novo pelo provedor já conectado (intent 'reauth').
 * - Nunca permite desconectar o último método de acesso (o botão vira "Defina uma senha").
 * - Erros inline, em português, sem termos técnicos.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, KeyRound, ShieldCheck, Link2, Link2Off } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { reauthWithPassword, unlinkOAuthProvider } from '@/api/oauth'
import { beginOAuthLink, parseOAuthApiError, useOAuthProviders } from '@/composables/useOAuth'
import { getProviderConfig } from '@/components/auth/providers.config'
import SocialLoginButton from '@/components/auth/SocialLoginButton.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'

const emit = defineEmits(['go-security'])

const PENDING_KEY = 'oauth_pending_action'
const RESULT_KEY = 'oauth_result'

const route = useRoute()
const authStore = useAuthStore()
const { providers, load } = useOAuthProviders()

const isLoading = ref(true)
const busyProvider = ref(null)
const message = ref(null) // { type: 'success' | 'error', text }
const pending = ref(null) // { type: 'link' | 'unlink', provider }
const password = ref('')
const passwordError = ref('')
const isConfirming = ref(false)

const hasPassword = computed(() => authStore.hasPassword)
const identities = computed(() => authStore.connectedIdentities)

// Provedores configurados + conectados que não estão mais configurados (para poder desconectar).
const items = computed(() => {
  const map = new Map()
  for (const provider of providers.value) map.set(provider.id, { id: provider.id, status: provider.status })
  for (const identity of identities.value) if (!map.has(identity.provider)) map.set(identity.provider, { id: identity.provider, status: 'available' })
  return Array.from(map.values()).map((item) => {
    const identity = identities.value.find((candidate) => candidate.provider === item.id) || null
    const config = getProviderConfig(item.id)
    return {
      ...item,
      name: config.name,
      description: config.description,
      identity,
      connected: Boolean(identity),
      // Última forma de entrar: sem senha e só esta identidade.
      isLastMethod: Boolean(identity) && !hasPassword.value && identities.value.length === 1,
    }
  })
})

const currentPath = () => route.fullPath || '/'

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}

function setError(error) {
  const parsed = typeof error?.message === 'string' && error.code ? error : parseOAuthApiError(error)
  message.value = { type: 'error', text: parsed.message, code: parsed.code }
}

// ---------------------------------------------------------------- ações
function startAction(type, providerId) {
  message.value = null
  password.value = ''
  passwordError.value = ''
  pending.value = { type, provider: providerId }

  if (!hasPassword.value) {
    // Sem senha: confirma pelo provedor já conectado e retoma a ação ao voltar.
    confirmWithProvider()
  }
}

function cancelPending() {
  pending.value = null
  password.value = ''
  passwordError.value = ''
}

async function confirmWithProvider() {
  const existing = identities.value[0]
  if (!existing || !pending.value) {
    cancelPending()
    setError({ code: 'reauth_required', message: 'Por segurança, defina uma senha antes de continuar.' })
    return
  }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending.value))
  } catch {
    // sem sessionStorage: o usuário repete a ação ao voltar
  }
  busyProvider.value = pending.value.provider
  const result = await beginOAuthLink(existing.provider, { intent: 'reauth', returnTo: currentPath() })
  if (!result.ok) {
    busyProvider.value = null
    cancelPending()
    setError(result.error)
  }
}

async function confirmWithPassword() {
  passwordError.value = ''
  if (!password.value) {
    passwordError.value = 'Informe sua senha.'
    return
  }
  isConfirming.value = true
  try {
    await reauthWithPassword(password.value)
    const action = pending.value
    password.value = ''
    await proceed(action)
  } catch (error) {
    const parsed = parseOAuthApiError(error)
    if (parsed.code === 'reauth_invalid_password') passwordError.value = parsed.fields.password || parsed.message
    else {
      cancelPending()
      setError(parsed)
    }
  } finally {
    isConfirming.value = false
  }
}

async function proceed(action) {
  if (!action) return
  busyProvider.value = action.provider
  if (action.type === 'link') {
    const result = await beginOAuthLink(action.provider, { intent: 'link', returnTo: currentPath() })
    if (!result.ok) {
      busyProvider.value = null
      cancelPending()
      setError(result.error)
    }
    return // sucesso: o navegador vai para o provedor
  }

  try {
    await unlinkOAuthProvider(action.provider)
    await authStore.fetchUser()
    message.value = { type: 'success', text: `${getProviderConfig(action.provider).name} desconectado da sua conta.` }
  } catch (error) {
    setError(error)
  } finally {
    busyProvider.value = null
    cancelPending()
  }
}

// ---------------------------------------------------------------- retorno do provedor
async function resumeAfterRedirect() {
  let result = null
  let saved = null
  try {
    result = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null')
    saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null')
    sessionStorage.removeItem(RESULT_KEY)
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    return
  }
  if (!result || Date.now() - (result.at || 0) > 5 * 60 * 1000) return

  if (result.kind === 'linked') {
    message.value = { type: 'success', text: 'Conta conectada com sucesso. Você já pode entrar com ela na próxima vez.' }
  } else if (result.kind === 'reauth' && saved) {
    pending.value = saved
    await proceed(saved)
  }
}

onMounted(async () => {
  await load()
  isLoading.value = false
  await resumeAfterRedirect()
})
</script>

<template>
  <section class="connected-experiences">
    <header class="ce-header">
      <h2>Experiências conectadas</h2>
      <p>Conecte serviços para entrar na sua conta com um clique. Você continua podendo entrar com e-mail e senha.</p>
    </header>

    <p v-if="message" class="ce-message" :class="`is-${message.type}`" :role="message.type === 'error' ? 'alert' : 'status'" aria-live="polite">
      <CheckCircle2 v-if="message.type === 'success'" :size="16" aria-hidden="true" />
      <AlertCircle v-else :size="16" aria-hidden="true" />
      <span>{{ message.text }}</span>
    </p>

    <!-- Carregando: skeleton no formato dos cartões -->
    <div v-if="isLoading" class="ce-list ce-skeleton" role="status" aria-busy="true">
      <span class="ce-sr-only">Carregando suas conexões...</span>
      <div v-for="n in 2" :key="n" class="ce-card" aria-hidden="true">
        <div class="ce-card-main">
          <AppSkeleton width="40px" height="40px" border-radius="12px" bg="var(--ds-surface-muted)" shimmer="var(--ds-surface-subtle)" />
          <div class="ce-skeleton-lines">
            <AppSkeleton width="40%" height="14px" bg="var(--ds-surface-muted)" shimmer="var(--ds-surface-subtle)" />
            <AppSkeleton width="70%" height="12px" bg="var(--ds-surface-muted)" shimmer="var(--ds-surface-subtle)" />
          </div>
          <AppSkeleton width="96px" height="32px" border-radius="8px" bg="var(--ds-surface-muted)" shimmer="var(--ds-surface-subtle)" />
        </div>
      </div>
    </div>

    <AppEmptyState
      v-else-if="!items.length"
      class="ce-empty"
      :icon="Link2"
      title="Nenhum serviço para conectar"
      text="Nenhuma experiência conectável está disponível no momento."
    />

    <ul v-else class="ce-list">
      <li v-for="item in items" :key="item.id" class="ce-card" :data-provider="item.id" :data-connected="item.connected">
        <div class="ce-card-main">
          <span class="ce-icon" aria-hidden="true" v-html="getProviderConfig(item.id).icon" />
          <div class="ce-info">
            <div class="ce-title-row">
              <strong>{{ item.name }}</strong>
              <span v-if="item.connected" class="ce-badge is-connected">
                <CheckCircle2 :size="12" aria-hidden="true" /> Conectado
              </span>
              <span v-else class="ce-badge">Não conectado</span>
            </div>
            <p v-if="item.connected" class="ce-meta">
              Conectado como <span class="ce-email">{{ item.identity.email }}</span>
              <template v-if="formatDate(item.identity.linkedAt)"> · desde {{ formatDate(item.identity.linkedAt) }}</template>
            </p>
            <p v-else class="ce-meta">{{ item.description }}</p>
            <p v-if="item.status === 'degraded'" class="ce-warning" role="status">
              <AlertTriangle :size="14" aria-hidden="true" />
              <span>O {{ item.name }} está instável agora. Tente conectar novamente em alguns minutos.</span>
            </p>
          </div>

          <div class="ce-actions">
            <template v-if="item.connected">
              <AppButton
                v-if="!item.isLastMethod"
                variant="outline"
                size="sm"
                :loading="busyProvider === item.id"
                :disabled="Boolean(pending) && pending.provider !== item.id"
                @click="startAction('unlink', item.id)"
              >
                <Link2Off :size="14" aria-hidden="true" /> Desconectar
              </AppButton>
              <AppButton v-else variant="primary" size="sm" @click="emit('go-security')">
                <KeyRound :size="14" aria-hidden="true" /> Definir senha
              </AppButton>
            </template>
            <SocialLoginButton
              v-else
              :provider="item.id"
              mode="link"
              :block="false"
              :status="item.status"
              :loading="busyProvider === item.id"
              :disabled="Boolean(pending) && pending.provider !== item.id"
              @click="startAction('link', item.id)"
            />
          </div>
        </div>

        <p v-if="item.isLastMethod" class="ce-hint">
          <Info :size="14" aria-hidden="true" />
          <span>Esta é sua única forma de entrar. Defina uma senha antes de desconectar, para não perder o acesso.</span>
        </p>

        <!-- Confirmação de identidade (usuário com senha) -->
        <form
          v-if="pending && pending.provider === item.id && hasPassword"
          class="ce-confirm"
          novalidate
          @submit.prevent="confirmWithPassword"
        >
          <p class="ce-confirm-title">
            <ShieldCheck :size="16" aria-hidden="true" />
            <span>
              Por segurança, confirme sua senha para
              {{ pending.type === 'link' ? 'conectar' : 'desconectar' }} o {{ item.name }}.
            </span>
          </p>
          <FormInput
            v-model="password"
            type="password"
            label="Senha atual"
            autocomplete="current-password"
            :error="passwordError"
            @input="passwordError = ''"
          />
          <div class="ce-confirm-actions">
            <AppButton type="submit" variant="primary" size="sm" :loading="isConfirming">Confirmar</AppButton>
            <AppButton type="button" variant="ghost" size="sm" :disabled="isConfirming" @click="cancelPending">Cancelar</AppButton>
          </div>
        </form>
      </li>
    </ul>

    <p class="ce-footnote">
      <ShieldCheck :size="14" aria-hidden="true" />
      <span>Enviamos um aviso sempre que uma conta é conectada ou desconectada.</span>
    </p>
  </section>
</template>

<style scoped>
.connected-experiences {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}
.ce-header h2 {
  margin: 0 0 var(--ds-space-1);
  color: var(--ds-text);
  font-size: var(--ds-font-lg);
  font-weight: 600;
}
.ce-header p,
.ce-footnote {
  margin: 0;
  color: var(--ds-text-muted);
  font-size: var(--ds-font-base);
  line-height: var(--ds-leading-normal);
}
.ce-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.ce-list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.ce-card {
  padding: var(--ds-space-4);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-xs);
}
.ce-card-main {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
}
.ce-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-subtle);
}
.ce-icon :deep(svg) {
  width: 20px;
  height: 20px;
}
.ce-info {
  flex: 1;
  min-width: 0;
}
.ce-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
}
.ce-title-row strong {
  color: var(--ds-text);
  font-size: var(--ds-font-md);
  font-weight: 600;
}
.ce-meta {
  margin: 2px 0 0;
  color: var(--ds-text-muted);
  font-size: var(--ds-font-sm);
  line-height: 1.4;
}
.ce-email {
  color: var(--ds-text-secondary);
  font-weight: 500;
  overflow-wrap: anywhere;
}
.ce-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface-muted);
  color: var(--ds-text-muted);
  font-size: var(--ds-font-xs);
  font-weight: 600;
  line-height: 1.4;
}
.ce-badge.is-connected {
  background: var(--ds-success-bg);
  color: var(--ds-success-text);
  box-shadow: inset 0 0 0 1px var(--ds-success-border);
}
.ce-actions {
  display: flex;
  flex: none;
}
.ce-warning,
.ce-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  margin: var(--ds-space-2) 0 0;
  color: var(--ds-warning-text);
  font-size: var(--ds-font-sm);
  line-height: 1.4;
}
.ce-warning svg,
.ce-hint svg {
  flex: none;
  margin-top: 2px;
}
/* Último método de acesso: tom de atenção (não de erro). */
.ce-hint {
  margin-top: var(--ds-space-3);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-warning-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-warning-bg);
}
.ce-confirm {
  margin-top: var(--ds-space-3);
  padding: var(--ds-space-4);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-subtle);
}
.ce-confirm-title {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  margin: 0 0 var(--ds-space-3);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-base);
  line-height: 1.45;
}
.ce-confirm-title svg {
  flex: none;
  margin-top: 2px;
  color: var(--ds-border-focus);
}
.ce-confirm-actions {
  display: flex;
  gap: var(--ds-space-2);
}
.ce-message {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  margin: 0;
  padding: var(--ds-space-3);
  border: 1px solid;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-base);
  line-height: 1.45;
}
.ce-message svg {
  flex: none;
  margin-top: 2px;
}
.ce-message.is-success {
  background: var(--ds-success-bg);
  border-color: var(--ds-success-border);
  color: var(--ds-success-text);
}
.ce-message.is-error {
  background: var(--ds-danger-bg);
  border-color: var(--ds-danger-border);
  color: var(--ds-danger-text);
}
.ce-footnote {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-3);
  border-top: 1px solid var(--ds-border-subtle);
  font-size: var(--ds-font-sm);
}
.ce-footnote svg {
  flex: none;
  margin-top: 2px;
}
.ce-skeleton-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ds-space-2);
}
.ce-empty {
  padding: var(--ds-space-6) 0;
}

@media (max-width: 600px) {
  .ce-card-main {
    flex-wrap: wrap;
  }
  .ce-info {
    flex-basis: calc(100% - 40px - var(--ds-space-3));
  }
  .ce-actions {
    width: 100%;
  }
  .ce-actions :deep(.app-button),
  .ce-actions :deep(.social-login-button) {
    width: 100%;
    min-height: 44px;
  }
  .ce-confirm-actions :deep(.app-button) {
    flex: 1;
    min-height: 44px;
  }
}
</style>
