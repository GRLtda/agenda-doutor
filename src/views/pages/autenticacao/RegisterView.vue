<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
// Importar as duas APIs de convite
import { getInvitationDetails } from '@/api/employees' // Convite de funcionário
import { verifyInvitationToken, getSignupCampaign } from '@/api/auth' // Convite de registro e campanha
import { useToast } from 'vue-toastification'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import AuthBanner from '@/components/auth/AuthBanner.vue'
import AuthPromo from '@/components/auth/AuthPromo.vue'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import { Check, CheckCircle2, User, Mail, Smartphone, ArrowRight, Clock, LifeBuoy, RefreshCw, AlertCircle, WifiOff, ServerCrash } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SocialLoginSection from '@/components/auth/SocialLoginSection.vue'
import LottieAnimation from '@/components/global/LottieAnimation.vue'

const router = useRouter()

// Termos de Uso e Política de Privacidade ficam no site institucional (abrem em nova aba).
const LANDING_URL = (import.meta.env.VITE_LANDING_URL || 'https://www.agendadoutor.com').replace(/\/$/, '')
const termsUrl = `${LANDING_URL}/termos`
const privacyUrl = `${LANDING_URL}/privacidade`
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const name = ref('')
const email = ref('')
const plan = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const passwordConfirmError = ref('')
const passwordsMatch = computed(() => passwordConfirmation.value !== '' && passwordConfirmation.value === password.value)
// Aviso geral do topo do formulário: { tone, title, text, icon, action }
const notice = ref(null)
const retryCountdown = ref(0)
let countdownTimer = null
const isBlocked = computed(() => retryCountdown.value > 0)
const countdownLabel = computed(() => `${Math.floor(retryCountdown.value / 60)}:${String(retryCountdown.value % 60).padStart(2, '0')}`)
function startCountdown(seconds) {
  clearInterval(countdownTimer)
  retryCountdown.value = Math.max(1, Math.min(Number(seconds) || 30, 3600))
  countdownTimer = setInterval(() => {
    retryCountdown.value -= 1
    if (retryCountdown.value <= 0) {
      clearInterval(countdownTimer)
      notice.value = null
    }
  }, 1000)
}
onBeforeUnmount(() => clearInterval(countdownTimer))
const campaignExpired = ref(false)
function openWhatsapp() {
  window.open('https://wa.me/5511921923978', '_blank', 'noopener,noreferrer')
}
function goToLogin() {
  router.push({ name: 'login' })
}
const emailError = ref('')
// Erros por campo devolvidos pela API (details.fields)
const nameError = ref('')
const phoneError = ref('')
const passwordError = ref('')
const termsError = ref('')
const invitationError = ref('')
const registrationSuccess = ref(false)
const termsAccepted = ref(false)

const isLoading = ref(false)

// Estado para o fluxo de convite
const isStaffInvitation = ref(false)
const invitationToken = ref(null)
const emailIsDisabled = ref(false)
const phoneIsDisabled = ref(false)
const nameIsDisabled = ref(false)

// Campanha de autocadastro (?campanha=<código>). Ver docs/onboarding-assinatura-e-trial.md.
const CAMPAIGN_STORAGE_KEY = 'signupCampaignCode'
const campaignCode = ref(null)
const campaign = ref(null)

async function loadSignupCampaign() {
  const fromQuery = typeof route.query.campanha === 'string' ? route.query.campanha.trim() : ''
  let code = fromQuery
  try {
    if (fromQuery) sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, fromQuery)
    else code = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY) || ''
  } catch {
    // sessionStorage indisponível: usa apenas a URL
  }
  if (!code) return

  try {
    const response = await getSignupCampaign(code)
    const data = response.data?.data || response.data
    if (data?.valid) {
      campaignCode.value = code
      campaign.value = { label: data.label, trialDays: data.trialDays }
      return
    }
  } catch (error) {
    console.error('Erro ao consultar campanha de cadastro:', error)
  }
  // Campanha inválida ou expirada: cadastro segue normalmente, sem benefício.
  campaignExpired.value = true
  try { sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY) } catch { /* noop */ }
}

const imageUrl = new URL('@/assets/clinic2.webp', import.meta.url).href

const formattedPlanName = computed(() => {
  if (!plan.value) return ''
  return plan.value.charAt(0).toUpperCase() + plan.value.slice(1).toLowerCase()
})

const successMessage = computed(() => {
  if (isStaffInvitation.value) {
    return 'Sua conta foi criada. Você já pode acessar a clínica.'
  }

  return 'Agora vamos configurar sua clínica. Falta só preencher os dados dela.'
})

onMounted(async () => {
  const routeParamToken = Array.isArray(route.params.token)
    ? route.params.token[0]
    : route.params.token
  const shortRouteToken = typeof routeParamToken === 'string' ? routeParamToken : null

  const currentPath = String(route.path || '')
  const isShortAdminRoute =
    currentPath.startsWith('/r/') || route.name === 'register-admin-short'
  const isShortEmployeeRoute =
    currentPath.startsWith('/e/') || route.name === 'register-employee-short'

  const newUserToken = isShortAdminRoute
    ? shortRouteToken
    : route.query.token // legado: ?token=
  const staffInviteToken = isShortEmployeeRoute
    ? shortRouteToken
    : route.query.invitationToken // legado: ?invitationToken=

  if (newUserToken) {
    invitationToken.value = newUserToken
    try {
      const response = await verifyInvitationToken(newUserToken)
      const inviteData = response.data.data || response.data

      if (inviteData) {
        name.value = inviteData.name || '' // Preenche o nome se ele vier
        email.value = inviteData.email
        phone.value = inviteData.phone || '' // Preenche o telefone se ele vier
        plan.value = inviteData.plan
        emailIsDisabled.value = true
        phoneIsDisabled.value = !!inviteData.phone // Desativa fone se ele veio
        nameIsDisabled.value = !!inviteData.name // Desativa nome se ele veio
        isStaffInvitation.value = false // É um registro normal, não um convite de staff
        toast.info(`Bem-vindo(a)! Complete seu cadastro.`)
      }
    } catch (error) {
      console.error('Erro ao verificar convite de registro:', error)
      toast.error(error.response?.data?.message || 'Convite inválido ou expirado!')
      invitationToken.value = null
      router.push('/register') // Limpa a URL
    }
  } else if (staffInviteToken) {
    invitationToken.value = staffInviteToken
    try {
      const response = await getInvitationDetails(staffInviteToken)
      const inviteData = response.data.data || response.data

      if (inviteData) {
        email.value = inviteData.email
        emailIsDisabled.value = true
        phoneIsDisabled.value = false // Staff pode preencher o próprio fone
        isStaffInvitation.value = true // É um convite de staff
        toast.info(`Bem-vindo(a)! Complete seu cadastro para a clínica.`)
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do convite de staff:', error)
      toast.error('Seu link de convite é inválido ou já expirou!')
      invitationToken.value = null
      router.push('/register') // Limpa a URL
    }
  } else {
    await loadSignupCampaign()
  }
})

// O erro dos termos some assim que a pessoa marca a caixa.
watch(termsAccepted, () => {
  termsError.value = ''
})

// Conta criada: a animação acontece na própria tela (o topo da casca fica verde) e segue sozinha para o próximo passo.
const shell = inject('authShell', null)
const REDIRECT_AFTER_MS = 2900
let redirectTimer = null
watch(registrationSuccess, (value) => {
  if (!value) return
  if (shell) shell.celebrate.value = true
  redirectTimer = setTimeout(handleRegistrationComplete, REDIRECT_AFTER_MS)
})
onBeforeUnmount(() => {
  clearTimeout(redirectTimer)
  if (shell) shell.celebrate.value = false
})

async function handleRegister() {
  notice.value = null
  emailError.value = ''
  nameError.value = ''
  phoneError.value = ''
  passwordError.value = ''
  termsError.value = ''
  invitationError.value = ''
  passwordConfirmError.value = ''

  // Confirmação da senha: evita criar a conta com a senha digitada errada.
  if (password.value !== passwordConfirmation.value) {
    passwordConfirmError.value =
      passwordConfirmation.value === ''
        ? 'Repita a senha para confirmar.'
        : 'As senhas não conferem. Digite a mesma senha nos dois campos.'
    return
  }
  isLoading.value = true

  const payload = {
    name: name.value,
    email: email.value,
    phone: phone.value,
    password: password.value,
    termsAccepted: true,
    termsVersion: 'v1.0-2025-12-19'
  }

  if (!termsAccepted.value) {
    termsError.value = 'Você deve aceitar os termos e condições para criar a conta.'
    isLoading.value = false
    return
  }

  // Envia o token apenas quando o cadastro veio de convite.
  if (invitationToken.value) {
    payload.invitationToken = invitationToken.value
  } else if (campaignCode.value) {
    payload.campaignCode = campaignCode.value
  }

  const { success, error } = await authStore.register(payload)
  isLoading.value = false

  if (success) {
    try { sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY) } catch { /* noop */ }
    registrationSuccess.value = true
  } else {
    const registrationError =
      typeof error === 'string'
        ? { message: error }
        : error || { message: 'Não foi possível concluir o cadastro.' }
    const message = registrationError.message || 'Não foi possível concluir o cadastro.'

    switch (registrationError.code) {
      case 'AUTH_TERMS_REQUIRED':
        termsError.value = message
        break
      case 'AUTH_USER_EXISTS':
        emailError.value = message
        break
      case 'AUTH_INVALID_INVITATION':
        invitationError.value = message
        break
      case 'AUTH_RATE_LIMITED': {
        const retryAfter = registrationError.details?.retry_after
        startCountdown(retryAfter)
        notice.value = {
          tone: 'warning',
          icon: Clock,
          title: 'Muitas tentativas de cadastro.',
          text: retryAfter ? `Tente novamente em ${retryAfter} segundos.` : message,
        }
        break
      }
      case 'AUTH_VALIDATION_ERROR': {
        const fields = registrationError.details?.fields || {}
        if (fields.name) nameError.value = fields.name
        if (fields.email) emailError.value = fields.email
        if (fields.phone) phoneError.value = fields.phone
        if (fields.password) passwordError.value = fields.password
        if (!fields.name && !fields.email && !fields.phone && !fields.password) notice.value = { tone: 'error', title: '', text: message }
        break
      }
      default:
        if (!registrationError.code && !registrationError.status) {
          notice.value = { tone: 'error', icon: WifiOff, title: 'Não foi possível concluir o cadastro.', text: 'Não conseguimos falar com o sistema. Seus dados continuam aqui; confira sua conexão e tente novamente.', action: 'retry' }
        } else if (registrationError.status >= 500) {
          notice.value = { tone: 'error', icon: ServerCrash, title: 'Não foi possível concluir o cadastro.', text: 'Seus dados continuam aqui. Tente novamente; se persistir, fale com o suporte.', action: 'retry' }
        } else {
          notice.value = { tone: 'error', title: '', text: message }
        }
        console.error('[Cadastro] Erro não mapeado retornado pela API:', {
          errorId: registrationError.details?.error_id,
          requestId: registrationError.requestId,
        })
    }
  }
}

function handleRegistrationComplete() {
  clearTimeout(redirectTimer)
  if (isStaffInvitation.value) {
    // Se for convite de FUNCIONÁRIO, vai para o app
    router.push('/')
  } else {
    // Se for registro (com convite de ?token), vai para o onboarding
    router.push('/onboarding/clinic')
  }
}
</script>

<template>
  <div class="register-view">
    <div v-if="!registrationSuccess" class="step-body">
      <AuthHeader
        before="Crie sua"
        accent="conta"
        subtitle="Organize agenda, pacientes e financeiro da sua clínica em um só lugar."
      />

      <!-- Promoção / contexto do cadastro: plano, campanha, convite ou oferta expirada -->
      <Transition name="notice">
        <AuthPromo
          v-if="plan"
          key="plan"
          kind="plan"
          :title="`Plano ${formattedPlanName}`"
          tag="Selecionado"
          description="Seu cadastro será concluído com os benefícios do plano selecionado."
        />
        <AuthPromo
          v-else-if="campaign"
          key="campaign"
          kind="campaign"
          :title="`${campaign.trialDays} dias grátis`"
          tag="Campanha"
          :subtitle="campaign.label"
          :description="`Ao assinar no fim do cadastro, você informa o cartão e só é cobrado depois de ${campaign.trialDays} dias. Cancele quando quiser antes disso.`"
        />
        <AuthPromo
          v-else-if="invitationToken"
          key="invite"
          kind="invite"
          title="Você foi convidado(a)"
          tag="Convite"
          description="Seu e-mail já está preenchido. Complete o cadastro para acessar a clínica."
        />
        <AuthBanner v-else-if="campaignExpired" key="expired" tone="info">
          <strong>Esta oferta não está mais disponível.</strong> Você pode criar sua conta normalmente.
        </AuthBanner>
      </Transition>

      <!-- Avisos gerais (erros com campo ficam no próprio campo) -->
      <Transition name="notice">
        <AuthBanner v-if="invitationError" key="invite-error" tone="error" title="Convite inválido, expirado ou já utilizado.">
          {{ invitationError }} Solicite um novo convite para continuar.
          <template #action>
            <button type="button" class="banner-btn" @click="openWhatsapp"><LifeBuoy :size="14" aria-hidden="true" /> Falar com o suporte</button>
          </template>
        </AuthBanner>
        <AuthBanner v-else-if="notice" :key="notice.title" :tone="notice.tone" :title="notice.title" :icon="notice.icon">
          {{ notice.text }}
          <template v-if="notice.action === 'retry'" #action>
            <button type="button" class="banner-btn" @click="handleRegister"><RefreshCw :size="14" aria-hidden="true" /> Tentar novamente</button>
          </template>
        </AuthBanner>
      </Transition>

      <form class="auth-form" method="post" action="#" aria-label="Criar sua conta" novalidate @submit.prevent="handleRegister">
        <FormInput
          v-model="name"
          label="Nome completo"
          name="name"
          placeholder="Seu nome completo"
          autocomplete="name"
          :icon="User"
          :input-attrs="{ autocapitalize: 'words', enterkeyhint: 'next' }"
          :required="true"
          :disabled="nameIsDisabled"
          :error="nameError"
          @update:model-value="nameError = ''"
        />
        <FormInput
          v-model="email"
          label="E-mail"
          type="email"
          name="email"
          placeholder="seuemail@exemplo.com"
          autocomplete="email"
          :icon="Mail"
          :input-attrs="{ inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next' }"
          :required="true"
          :disabled="emailIsDisabled"
          :error="emailError"
          @update:model-value="emailError = ''"
        />
        <a v-if="emailError && !emailIsDisabled" class="exists-link" href="#" @click.prevent="goToLogin">
          Entrar com este e-mail <ArrowRight :size="15" aria-hidden="true" />
        </a>
        <FormInput
          v-model="phone"
          label="Telefone"
          type="tel"
          name="tel"
          placeholder="(11) 99999-9999"
          autocomplete="tel"
          phone-mask
          :icon="Smartphone"
          :input-attrs="{ inputmode: 'tel', enterkeyhint: 'next' }"
          :required="true"
          :disabled="phoneIsDisabled"
          :error="phoneError"
          @update:model-value="phoneError = ''"
        />
        <PasswordInput
          v-model="password"
          label="Senha"
          autocomplete="new-password"
          :icon="true"
          :input-attrs="{ name: 'new-password', enterkeyhint: 'go', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }"
          :required="true"
          :error="passwordError"
          @update:model-value="passwordError = ''"
        />
        <PasswordInput
          v-model="passwordConfirmation"
          label="Confirmar senha"
          placeholder="Repita a senha"
          autocomplete="new-password"
          :icon="true"
          :show-validation="false"
          :input-attrs="{ name: 'confirm-password', enterkeyhint: 'go', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }"
          :required="true"
          :error="passwordConfirmError"
          @update:model-value="passwordConfirmError = ''"
        />
        <Transition name="notice">
          <p v-if="passwordsMatch" class="match-ok" role="status"><CheckCircle2 :size="14" aria-hidden="true" />As senhas conferem.</p>
        </Transition>

        <div class="terms-checkbox">
          <label class="checkbox-container">
            <input type="checkbox" v-model="termsAccepted" :aria-invalid="termsError ? 'true' : 'false'" />
            <span class="custom-checkbox" :class="{ checked: termsAccepted, 'has-error': termsError }">
              <Check v-if="termsAccepted" :size="14" stroke-width="3" />
            </span>
          </label>
          <span class="checkbox-label" @click="termsAccepted = !termsAccepted">
            Li e concordo com os
            <a :href="termsUrl" target="_blank" rel="noopener noreferrer" class="terms-link" @click.stop>Termos de Uso</a>
            e a
            <a :href="privacyUrl" target="_blank" rel="noopener noreferrer" class="terms-link" @click.stop>Política de Privacidade</a>.
          </span>
        </div>
        <Transition name="notice">
          <div v-if="termsError" class="field-error" role="alert"><AlertCircle :size="14" aria-hidden="true" />{{ termsError }}</div>
        </Transition>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          class="auth-cta"
          :loading="isLoading"
          :disabled="isBlocked"
        >
          <template v-if="isBlocked"><Clock :size="18" aria-hidden="true" /> Aguarde {{ countdownLabel }}</template>
          <template v-else>Criar conta <ArrowRight :size="18" aria-hidden="true" /></template>
        </AppButton>
      </form>

      <!-- Cadastro com provedor externo: convite/campanha acompanham o fluxo -->
      <SocialLoginSection intent="signup" :invitation-token="invitationToken || ''" :disabled="isLoading" />

      <footer class="auth-footer">
        <p>
          Já tem uma conta?
          <router-link to="/login" class="link-accent">Entrar</router-link>
        </p>
        <p class="help-line">
          <LifeBuoy :size="15" aria-hidden="true" />
          Precisa de ajuda? <a href="#" class="link-help" @click.prevent="openWhatsapp">Falar com o suporte</a>
        </p>
      </footer>
    </div>

    <!-- Conta criada: animação na própria tela, depois segue para os dados da clínica -->
    <div v-else class="success-body" role="status" aria-live="polite">
      <div class="success-visual" aria-hidden="true">
        <LottieAnimation class="success-lottie" name="check.json" aria-label="Conta criada com sucesso" />
      </div>
      <div class="success-copy">
        <h1>
          Conta
          <span class="success-accent">
            criada!
            <svg class="success-squiggle" viewBox="0 0 120 9" preserveAspectRatio="none" aria-hidden="true"><path d="M2 5.5C20 1 35 8.5 55 4.5S95 1.5 118 5" /></svg>
          </span>
        </h1>
        <p>{{ successMessage }}</p>
      </div>
      <div class="success-progress">
        <div class="success-bar"><span /></div>
        <div class="success-foot">
          <span>{{ isStaffInvitation ? 'Abrindo a clínica…' : 'Abrindo os dados da clínica…' }}</span>
          <button type="button" class="go-now" @click="handleRegistrationComplete">Ir agora <ArrowRight :size="15" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  position: relative;
}
.step-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.auth-form {
  display: flex;
  flex-direction: column;
}
.auth-form :deep(.form-group),
.auth-form :deep(.password-input-group) {
  margin-bottom: 1.125rem;
}
.auth-cta {
  width: 100%;
  margin-top: 0.5rem;
}
.auth-cta :deep(.button-content) {
  gap: 0.625rem;
}

/* Conta criada: entra com fade; a altura é animada pela casca (SmoothHeight). */
.success-body {
  animation: success-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
  text-align: left;
}
@keyframes success-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
.success-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  margin: -0.5rem 0 -0.25rem -0.75rem;
}
.success-lottie {
  width: 140px;
  height: 140px;
}
.success-copy {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.success-copy h1 {
  margin: 0;
  font-size: 2.375rem;
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ds-text, #0f172a);
}
.success-accent {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}
.success-squiggle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  width: 100%;
  height: 9px;
}
.success-squiggle path {
  fill: none;
  stroke: #059669;
  stroke-width: 3;
  stroke-linecap: round;
}
.success-copy p {
  margin: 0;
  max-width: 38ch;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ds-text-muted, #64748b);
}
.success-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.success-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 9999px;
  background: #d1fae5;
}
.success-bar span {
  display: block;
  height: 100%;
  width: 0;
  border-radius: 9999px;
  background: linear-gradient(90deg, #34d399, #059669);
  animation: success-fill 2.2s linear 0.7s forwards;
}
@keyframes success-fill {
  to {
    width: 100%;
  }
}
.success-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--ds-text-muted, #64748b);
}
.go-now {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 32px;
  padding: 0;
  border: none;
  background: none;
  color: #059669;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}
.go-now:focus-visible {
  outline: 2px solid #059669;
  outline-offset: 2px;
  border-radius: 4px;
}
.match-ok {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: -0.5rem 0 1rem;
  color: var(--ds-success-text, #047857);
  font-size: 0.78125rem;
  font-weight: 500;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.25rem 0 0.75rem;
  color: var(--ds-text-danger, #dc2626);
  font-size: 0.78125rem;
  font-weight: 500;
  text-align: left;
}
.exists-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  margin: -0.5rem 0 1rem;
  color: var(--azul-principal);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}
.exists-link:hover {
  color: var(--azul-escuro);
}

/* Checkbox dos termos */
.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 0.25rem 0 0.75rem;
}
.checkbox-container {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 1.375rem;
  height: 1.375rem;
  margin-top: 0.1rem;
  cursor: pointer;
}
.checkbox-container input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}
.custom-checkbox {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 2px solid #d1d5db;
  border-radius: 7px;
  background-color: #fff;
  color: #fff;
  transition: all 0.2s ease-in-out;
}
.checkbox-container:hover .custom-checkbox {
  border-color: var(--azul-principal);
}
.checkbox-container input:focus-visible + .custom-checkbox {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
}
.custom-checkbox.checked {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
}
.custom-checkbox.has-error {
  border-color: #ef4444;
}
.checkbox-label {
  color: var(--ds-text-muted, #64748b);
  font-size: 0.875rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  user-select: none;
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
.link-accent {
  color: var(--azul-principal);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}
.link-accent:hover {
  color: var(--azul-escuro);
}
.auth-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ds-text-muted, #64748b);
  line-height: 1.5;
}
.auth-footer p {
  margin: 0;
}
.help-line {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.link-help {
  color: #334155;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.link-accent:focus-visible,
.link-help:focus-visible,
.banner-btn:focus-visible,
.exists-link:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
  border-radius: 4px;
}
.banner-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 32px;
  padding: 0 0.625rem;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
}
.banner-btn:hover {
  background: rgba(255, 255, 255, 0.55);
}

.notice-enter-active,
.notice-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Telas de desktop mais baixas: espaçamento compacto, para o formulário só rolar quando realmente não couber. */
@media (min-width: 901px) and (max-height: 1080px) {
  .step-body {
    gap: 1.125rem;
  }
  .auth-form :deep(.form-group),
  .auth-form :deep(.password-input-group) {
    margin-bottom: 0.75rem;
  }
  .auth-cta {
    margin-top: 0;
  }
}

/* Celular: alvos de toque de 44px+ e botão de 52px */
@media (max-width: 900px) {
  .success-copy h1 {
    font-size: 1.875rem;
  }
  .success-visual,
  .success-lottie {
    width: 120px;
    height: 120px;
  }
  .go-now {
    min-height: 44px;
  }
  .step-body {
    gap: 1.25rem;
  }
  .auth-cta {
    height: 52px;
  }
  .auth-form :deep(.form-input) {
    min-height: 52px;
  }
  .banner-btn {
    min-height: 44px;
  }
  .exists-link {
    min-height: 44px;
  }
  .terms-checkbox {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .success-bar span {
    animation-duration: 0.01s;
    animation-delay: 0s;
  }
  .success-body {
    animation: none;
  }
  .notice-enter-active,
  .notice-leave-active,
  .custom-checkbox {
    transition: none;
  }
}
</style>
