<script setup>
/**
 * Retorno do provedor externo (rota pública /auth/callback).
 *
 * O backend sempre redireciona para cá, nunca mostra página em branco:
 *   ?oauth=login|complete|linked|reauth&code=<uso único>&intent=&return=
 *   ?oauth_error=<código>&intent=&return=
 *
 * Estados da tela: `loading` → (`error` | `complete` | redireciona).
 * Todo erro termina em uma mensagem amigável com uma saída (tentar de novo / entrar com e-mail e senha).
 * Ver docs/auth/OAUTH_PROVEDORES.md (frontend) para o contrato.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, AlertCircle, Check, LifeBuoy, ArrowLeft, Mail, RotateCw, KeyRound, X, Smartphone, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { exchangeOAuthCode, completeOAuthSignup, finalizeOAuthLink } from '@/api/oauth'
import {
  clearOAuthBinding,
  getOAuthBinding,
  getOAuthErrorMessage,
  parseOAuthApiError,
  OAUTH_ERROR_ACTIONS,
} from '@/composables/useOAuth'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import AppButton from '@/components/global/AppButton.vue'
import { getProviderConfig } from '@/components/auth/providers.config'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Termos e política ficam no site institucional (abrem em nova aba).
const LANDING_URL = (import.meta.env.VITE_LANDING_URL || 'https://www.agendadoutor.com').replace(/\/$/, '')
const termsUrl = `${LANDING_URL}/termos`
const privacyUrl = `${LANDING_URL}/privacidade`

// 'loading' | 'error' | 'complete'
const view = ref('loading')
const errorState = ref({ code: 'unknown', message: '', action: 'retry' })
const intent = ref('login')
const returnTo = ref('')

// Etapa "Complete seu cadastro"
const oauthCode = ref('')
const profile = reactive({ name: '', email: '', picture: '' })
const pictureFailed = ref(false)
const phone = ref('')
const termsAccepted = ref(false)
// Senha opcional: começa recolhida; ao abrir, valida como no cadastro por e-mail (requisitos ao digitar + confirmação).
const wantsPassword = ref(false)
const password = ref('')
const passwordConfirmation = ref('')
const fieldErrors = reactive({ phone: '', terms: '', password: '', passwordConfirmation: '' })
const isSubmitting = ref(false)
const submitError = ref('')

const isLinkFlow = computed(() => intent.value === 'link' || intent.value === 'reauth')
const googleIcon = getProviderConfig('google').icon
const profileInitial = computed(() => (profile.name || profile.email || '?').trim().charAt(0).toUpperCase())
// Hierarquia: "Tentar novamente" é o primário; "Entrar com e-mail e senha" só vira primário quando é a única saída.
const loginIsPrimary = computed(() => errorState.value.action === 'use_password')
const canUsePassword = computed(() => ['retry_or_use_password', 'use_password'].includes(errorState.value.action))

// Caminho de retorno seguro (só caminhos internos; o backend já sanitiza, aqui é a segunda barreira).
function safeReturn(path) {
  if (typeof path !== 'string') return ''
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return ''
  return path
}

function showError(code, message, action) {
  errorState.value = {
    code,
    message: message || getOAuthErrorMessage(code),
    action: action || OAUTH_ERROR_ACTIONS[code] || 'retry',
  }
  view.value = 'error'
}

async function finishLogin(tokens) {
  const result = await authStore.loginWithTokens(tokens)
  clearOAuthBinding()
  if (!result.success) {
    showError('unknown')
    return
  }
  router.replace(returnTo.value || { name: 'resumo-dashboard' })
}

// Vínculo e confirmação de identidade só valem com o usuário logado no navegador que iniciou o fluxo.
async function runFinalize(code) {
  const binding = getOAuthBinding()
  if (!binding) {
    showError('state_invalid_or_expired')
    return
  }
  try {
    const { data } = (await finalizeOAuthLink(code, binding)).data
    clearOAuthBinding()
    try {
      sessionStorage.setItem('oauth_result', JSON.stringify({ kind: data.kind, at: Date.now() }))
    } catch {
      // sem sessionStorage: a tela de origem apenas recarrega o estado
    }
    await authStore.fetchUser()
    router.replace(returnTo.value || { name: 'resumo-dashboard' })
  } catch (error) {
    const parsed = parseOAuthApiError(error)
    showError(parsed.code, parsed.message, parsed.action)
  }
}

async function runExchange(code) {
  const binding = getOAuthBinding()
  if (!binding) {
    showError('state_invalid_or_expired')
    return
  }

  try {
    const { data } = (await exchangeOAuthCode(code, binding)).data
    returnTo.value = safeReturn(data.return_to) || returnTo.value

    switch (data.kind) {
      case 'login':
        await finishLogin(data)
        break
      case 'complete':
        oauthCode.value = code
        profile.name = data.profile?.name || ''
        profile.email = data.profile?.email || ''
        profile.picture = data.profile?.picture || ''
        view.value = 'complete'
        break
      default:
        showError('unknown')
    }
  } catch (error) {
    const parsed = parseOAuthApiError(error)
    showError(parsed.code, parsed.message, parsed.action)
  }
}

function openPassword() {
  wantsPassword.value = true
}

function skipPassword() {
  wantsPassword.value = false
  password.value = ''
  passwordConfirmation.value = ''
  fieldErrors.password = ''
  fieldErrors.passwordConfirmation = ''
}

async function submitComplete() {
  fieldErrors.phone = ''
  fieldErrors.terms = ''
  fieldErrors.password = ''
  fieldErrors.passwordConfirmation = ''
  submitError.value = ''

  // Validação local (o backend valida de novo).
  const digits = phone.value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) fieldErrors.phone = 'Informe um telefone com DDD.'
  if (!termsAccepted.value) fieldErrors.terms = 'Aceite os termos de uso e a política de privacidade para continuar.'

  // Senha é opcional: só valida se a pessoa começou a preencher.
  const sendPassword = wantsPassword.value && (password.value !== '' || passwordConfirmation.value !== '')
  if (sendPassword) {
    if (password.value.length < 6) fieldErrors.password = 'A senha precisa ter pelo menos 6 caracteres.'
    else if (password.value.length > 128) fieldErrors.password = 'Use no máximo 128 caracteres.'
    else if (password.value !== passwordConfirmation.value) fieldErrors.passwordConfirmation = 'As senhas não conferem.'
  }
  if (fieldErrors.phone || fieldErrors.terms || fieldErrors.password || fieldErrors.passwordConfirmation) return

  isSubmitting.value = true
  try {
    const { data } = (
      await completeOAuthSignup({
        code: oauthCode.value,
        binding: getOAuthBinding(),
        phone: phone.value,
        terms_accepted: true,
        privacy_accepted: true,
        ...(sendPassword ? { password: password.value, password_confirmation: passwordConfirmation.value } : {}),
      })
    ).data
    await finishLogin(data)
  } catch (error) {
    const parsed = parseOAuthApiError(error)
    // Erros de campo aparecem no próprio campo, sem toast.
    if (parsed.fields.phone) fieldErrors.phone = parsed.fields.phone
    if (parsed.fields.termsAccepted) fieldErrors.terms = parsed.fields.termsAccepted
    if (parsed.fields.password) fieldErrors.password = parsed.fields.password
    if (parsed.fields.passwordConfirmation) fieldErrors.passwordConfirmation = parsed.fields.passwordConfirmation
    if (parsed.fields.password || parsed.fields.passwordConfirmation) wantsPassword.value = true
    if (parsed.fields.phone || parsed.fields.termsAccepted || parsed.fields.password || parsed.fields.passwordConfirmation) return
    if (parsed.code === 'phone_invalid') fieldErrors.phone = parsed.message
    else if (parsed.code === 'terms_required') fieldErrors.terms = parsed.message
    else if (['state_invalid_or_expired', 'invite_email_mismatch', 'invite_invalid', 'account_disabled', 'security_blocked'].includes(parsed.code)) {
      showError(parsed.code, parsed.message, parsed.action)
    } else submitError.value = parsed.message
  } finally {
    isSubmitting.value = false
  }
}

function goToLogin() {
  router.replace({ name: 'login' })
}

function retry() {
  // Link/reauth voltam para o perfil; login/cadastro voltam para a tela de entrada.
  if (isLinkFlow.value && returnTo.value) router.replace(returnTo.value)
  else router.replace({ name: intent.value === 'signup' ? 'register' : 'login' })
}

function openSupport() {
  window.open('https://wa.me/5511921923978', '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  const { oauth, code, oauth_error: oauthError, intent: intentParam, return: returnParam } = route.query
  intent.value = typeof intentParam === 'string' ? intentParam : 'login'
  returnTo.value = safeReturn(returnParam)

  // Tira código e parâmetros da barra de endereço (não ficam no histórico nem em compartilhamentos).
  router.replace({ query: {} }).catch(() => {})

  if (typeof oauthError === 'string' && oauthError) {
    clearOAuthBinding()
    showError(oauthError)
    return
  }

  if (typeof oauth === 'string' && typeof code === 'string' && code) {
    if (oauth === 'link' || oauth === 'reauth') await runFinalize(code)
    else await runExchange(code)
    return
  }

  showError('state_invalid_or_expired')
})
</script>

<template>
  <div class="callback-view">
    <!-- Carregando -->
    <div v-if="view === 'loading'" class="step-body" role="status" aria-live="polite">
      <span class="oauth-badge is-brand" aria-hidden="true">
        <Loader2 class="oauth-spinner" :size="28" />
      </span>
      <AuthHeader accent="Conectando" subtitle="Estamos concluindo seu acesso. Isso leva só um instante." />
    </div>

    <!-- Erro: sempre com uma saída -->
    <div v-else-if="view === 'error'" class="step-body" role="alert" aria-live="assertive">
      <span class="oauth-badge is-danger" aria-hidden="true">
        <AlertCircle :size="28" />
      </span>
      <AuthHeader before="Não foi possível" accent="continuar" :subtitle="errorState.message" />
      <div class="oauth-actions">
        <AppButton
          v-if="['retry', 'retry_or_use_password', 'use_other_account', 'wait'].includes(errorState.action)"
          variant="primary"
          size="lg"
          class="oauth-action"
          @click="retry"
        >
          <RotateCw v-if="errorState.action !== 'wait'" :size="16" aria-hidden="true" />
          {{ errorState.action === 'wait' ? 'Voltar' : 'Tentar novamente' }}
        </AppButton>
        <AppButton
          v-if="canUsePassword || !isLinkFlow"
          :variant="loginIsPrimary ? 'primary' : 'outline'"
          size="lg"
          class="oauth-action"
          @click="goToLogin"
        >
          <Mail :size="16" aria-hidden="true" />
          Entrar com e-mail e senha
        </AppButton>
        <AppButton v-if="errorState.action === 'contact_support'" variant="outline" size="lg" class="oauth-action" @click="openSupport">
          <LifeBuoy :size="16" aria-hidden="true" />
          Falar com o suporte
        </AppButton>
        <AppButton v-if="isLinkFlow && returnTo" variant="outline" size="lg" class="oauth-action" @click="retry">
          <ArrowLeft :size="16" aria-hidden="true" />
          Voltar ao perfil
        </AppButton>
      </div>
    </div>

    <!-- Conta nova: telefone + termos -->
    <form v-else-if="view === 'complete'" novalidate class="step-body oauth-complete" aria-label="Complete seu cadastro" @submit.prevent="submitComplete">
      <AuthHeader before="Complete seu" accent="cadastro" subtitle="Confirme seu telefone para criar sua conta." />

      <!-- Dados do provedor: somente leitura -->
      <div class="oauth-identity" aria-label="Conta do Google">
        <span class="oauth-avatar" aria-hidden="true">
          <img
            v-if="profile.picture && !pictureFailed"
            :src="profile.picture"
            alt=""
            class="oauth-avatar-img"
            referrerpolicy="no-referrer"
            @error="pictureFailed = true"
          />
          <template v-else>{{ profileInitial }}</template>
          <!-- eslint-disable-next-line vue/no-v-html : SVG estático definido em providers.config.js -->
          <span class="oauth-avatar-provider" v-html="googleIcon" />
        </span>
        <span class="oauth-identity-text">
          <span class="oauth-identity-name">{{ profile.name }}</span>
          <span class="oauth-identity-email">{{ profile.email }}</span>
        </span>
      </div>

      <div class="oauth-fields">
        <FormInput
          v-model="phone"
          label="Telefone com DDD"
          type="tel"
          name="phone"
          autocomplete="tel"
          placeholder="(11) 99999-9999"
          :icon="Smartphone"
          :input-attrs="{ inputmode: 'tel', enterkeyhint: 'next' }"
          :phone-mask="true"
          :required="true"
          :error="fieldErrors.phone"
          @input="fieldErrors.phone = ''"
        />

        <!-- Senha opcional: botão discreto; ao abrir vira um painel com requisitos ao digitar + confirmação -->
        <div class="oauth-optional">
          <Transition name="oauth-swap">
            <button v-if="!wantsPassword" key="toggle" type="button" class="oauth-optional-toggle" @click="openPassword">
              <KeyRound :size="16" aria-hidden="true" />
              <span class="oauth-optional-label">Definir uma senha agora</span>
              <span class="oauth-optional-tag">opcional</span>
            </button>
            <div v-else key="panel" class="oauth-optional-body">
              <div class="oauth-optional-head">
                <span class="oauth-optional-icon" aria-hidden="true"><KeyRound :size="16" /></span>
                <span class="oauth-optional-title">Senha</span>
                <span class="oauth-optional-tag">opcional</span>
                <button type="button" class="oauth-optional-skip" @click="skipPassword">
                  <X :size="14" aria-hidden="true" />
                  Não definir agora
                </button>
              </div>
              <p class="oauth-optional-hint">
                Com uma senha você também entra com e-mail e senha. Se preferir, defina depois no seu perfil.
              </p>
              <PasswordInput
                v-model="password"
                label="Senha"
                autocomplete="new-password"
                :icon="true"
                :error="fieldErrors.password"
                @update:model-value="fieldErrors.password = ''"
              />
              <PasswordInput
                v-model="passwordConfirmation"
                label="Confirmar senha"
                placeholder="Repita a senha"
                autocomplete="new-password"
                :icon="true"
                :show-validation="false"
                :error="fieldErrors.passwordConfirmation"
                @update:model-value="fieldErrors.passwordConfirmation = ''"
              />
            </div>
          </Transition>
        </div>
      </div>

      <div class="oauth-terms">
        <label class="checkbox-container">
          <input
            v-model="termsAccepted"
            type="checkbox"
            :aria-invalid="fieldErrors.terms ? 'true' : 'false'"
            :aria-describedby="fieldErrors.terms ? 'oauth-terms-error' : undefined"
            @change="fieldErrors.terms = ''"
          />
          <span class="custom-checkbox" :class="{ checked: termsAccepted, 'has-error': fieldErrors.terms }" aria-hidden="true">
            <Check v-if="termsAccepted" :size="14" stroke-width="3" />
          </span>
          <span class="checkbox-label">
            Li e concordo com os
            <a :href="termsUrl" target="_blank" rel="noopener noreferrer" class="terms-link" @click.stop>Termos de Uso</a>
            e a
            <a :href="privacyUrl" target="_blank" rel="noopener noreferrer" class="terms-link" @click.stop>Política de Privacidade</a>.
          </span>
        </label>
      </div>
      <div v-if="fieldErrors.terms" id="oauth-terms-error" class="field-error" role="alert">{{ fieldErrors.terms }}</div>
      <div v-if="submitError" class="field-error" role="alert">{{ submitError }}</div>

      <AppButton type="submit" variant="primary" size="lg" :loading="isSubmitting" class="oauth-action oauth-submit">
        Continuar <ArrowRight :size="18" aria-hidden="true" />
      </AppButton>
      <button type="button" class="oauth-link" @click="goToLogin">Usar outra conta</button>
    </form>
  </div>
</template>

<style scoped>
.callback-view {
  position: relative;
}
.step-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
  text-align: left;
  animation: oauth-in var(--ds-duration-slow) var(--ds-ease-out) both;
}
.oauth-fields {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
  width: 100%;
}
.oauth-fields :deep(.form-group),
.oauth-fields :deep(.password-input-group) {
  margin-bottom: 0.875rem;
}
.terms-link {
  color: var(--azul-principal);
  font-weight: 500;
  text-decoration: none;
}
.terms-link:hover {
  text-decoration: underline;
}
.terms-link:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
  border-radius: 3px;
}
.oauth-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--ds-radius-full);
}
.oauth-badge.is-brand {
  background: var(--ds-surface-brand);
  color: var(--ds-border-focus);
}
.oauth-badge.is-danger {
  background: var(--ds-danger-bg);
  color: var(--ds-danger-text);
  box-shadow: inset 0 0 0 1px var(--ds-danger-border);
}
.oauth-spinner {
  animation: oauth-spin 0.9s linear infinite;
}
.oauth-title {
  margin: 0;
  color: var(--ds-text);
  font-size: var(--ds-font-xl);
  font-weight: 600;
  line-height: var(--ds-leading-tight);
  letter-spacing: -0.01em;
  text-align: center;
}
.oauth-title.is-form {
  margin-bottom: var(--ds-space-1);
}
.oauth-actions {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  width: 100%;
  margin-top: var(--ds-space-2);
}
.oauth-action {
  width: 100%;
}
.oauth-submit {
  margin-top: var(--ds-space-4);
}

/* Complete seu cadastro */
.oauth-complete {
  align-items: stretch;
  gap: var(--ds-space-4);
}
/* O gap do formulário já separa os blocos; sem margem extra no botão. */
.oauth-complete .oauth-submit {
  margin-top: 0;
}
.oauth-complete :deep(.form-group) {
  margin-bottom: 0;
}
.oauth-identity {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-subtle);
}
.oauth-avatar {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface-brand);
  color: var(--ds-border-focus);
  font-size: var(--ds-font-md);
  font-weight: 600;
}
.oauth-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: var(--ds-radius-full);
  object-fit: cover;
}
.oauth-avatar-provider {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  padding: 2px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface);
  box-shadow: 0 0 0 1px var(--ds-border);
}
.oauth-avatar-provider :deep(svg) {
  width: 100%;
  height: 100%;
}
.oauth-identity-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.oauth-identity-name {
  color: var(--ds-text);
  font-size: var(--ds-font-md);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oauth-identity-email {
  color: var(--ds-text-muted);
  font-size: var(--ds-font-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Checkbox dos termos: mesmo estilo do cadastro (RegisterView) */
.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  cursor: pointer;
}
.checkbox-container input {
  position: absolute;
  opacity: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  cursor: pointer;
}
.custom-checkbox {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--ds-border-control-hover);
  border-radius: var(--ds-radius-xs);
  background: var(--ds-surface);
  color: #fff;
  transition: all var(--ds-duration-base) var(--ds-ease);
}
.checkbox-container:hover .custom-checkbox {
  border-color: var(--azul-principal);
}
.custom-checkbox.checked {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
}
.custom-checkbox.has-error {
  border-color: var(--ds-border-danger);
}
.checkbox-container input:focus-visible + .custom-checkbox {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}
.checkbox-label {
  color: var(--ds-text-muted);
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: left;
  user-select: none;
}
.field-error {
  color: var(--ds-text-danger);
  font-size: var(--ds-font-xs);
  font-weight: 500;
  text-align: left;
}
/* Senha opcional: botão de largura total (sem tracejado) que abre um painel */
.oauth-optional {
  text-align: left;
}
.oauth-optional-toggle {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--ds-space-3);
  border: 1px solid var(--ds-border-control);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-xs);
  color: var(--ds-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: var(--ds-font-base);
  font-weight: 500;
  transition:
    background-color var(--ds-duration-base) var(--ds-ease),
    border-color var(--ds-duration-base) var(--ds-ease),
    transform var(--ds-duration-fast) var(--ds-ease);
}
.oauth-optional-toggle:hover {
  background: var(--ds-surface-subtle);
  border-color: var(--ds-border-control-hover);
}
.oauth-optional-toggle:active {
  transform: scale(0.99);
}
.oauth-optional-label {
  flex: 1;
  text-align: left;
}
.oauth-optional-body {
  padding: var(--ds-space-4);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-subtle);
}
.oauth-optional-body :deep(.form-group) {
  margin-bottom: var(--ds-space-3);
}
.oauth-optional-body :deep(.form-group:last-child) {
  margin-bottom: 0;
}
.oauth-optional-head {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  margin-bottom: var(--ds-space-2);
}
.oauth-optional-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-brand);
  color: var(--ds-border-focus);
}
.oauth-optional-title {
  color: var(--ds-text);
  font-size: var(--ds-font-base);
  font-weight: 600;
}
.oauth-optional-tag {
  padding: 1px 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-surface-muted);
  color: var(--ds-text-muted);
  font-size: var(--ds-font-xs);
  font-weight: 600;
}
.oauth-optional-skip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  margin-left: auto;
  padding: 0 var(--ds-space-2);
  border: none;
  border-radius: var(--ds-radius-sm);
  background: none;
  color: var(--ds-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--ds-font-sm);
  transition: background-color var(--ds-duration-base) var(--ds-ease), color var(--ds-duration-base) var(--ds-ease);
}
.oauth-optional-skip:hover {
  background: var(--ds-surface-muted);
  color: var(--ds-text);
}
.oauth-optional-hint {
  margin: 0 0 var(--ds-space-4);
  color: var(--ds-text-muted);
  font-size: var(--ds-font-sm);
  line-height: 1.45;
}
/* Foco só por teclado, em anel contínuo (nada de contorno tracejado ao clicar). */
.oauth-optional-toggle:focus,
.oauth-optional-skip:focus,
.oauth-link:focus {
  outline: none;
}
.oauth-optional-toggle:focus-visible,
.oauth-optional-skip:focus-visible,
.oauth-link:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}
/* Troca botão ↔ painel: fade cruzado sem movimento; a altura é animada pelo SmoothHeight. */
.oauth-optional {
  position: relative;
}
.oauth-swap-enter-active {
  transition: opacity var(--ds-duration-slow) var(--ds-ease) 60ms;
}
.oauth-swap-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition: opacity var(--ds-duration-fast) var(--ds-ease);
}
.oauth-swap-enter-from,
.oauth-swap-leave-to {
  opacity: 0;
}
@media (max-width: 767px) {
  .oauth-optional-skip {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .oauth-optional-toggle,
  .oauth-optional-skip,
  .oauth-swap-enter-active,
  .oauth-swap-leave-active {
    transition: none;
  }
}
.oauth-link {
  align-self: center;
  min-height: 44px;
  padding: 0 var(--ds-space-3);
  border: none;
  border-radius: var(--ds-radius-sm);
  background: none;
  color: var(--azul-principal);
  cursor: pointer;
  font: inherit;
  font-size: var(--ds-font-base);
  font-weight: 500;
}
.oauth-link:hover {
  text-decoration: underline;
}
.oauth-link:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}

@keyframes oauth-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes oauth-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .oauth-spinner,
  .step-body {
    animation: none;
  }
  .custom-checkbox {
    transition: none;
  }
}
</style>
