<script setup>
/**
 * Entrar. Vive dentro da casca AuthShell (foto e layout fixos). Etapas: login → recuperar senha → redefinir → contato.
 *
 * Cuidados de tela de acesso:
 * - Atributos de preenchimento (username / current-password, name, inputmode, autocapitalize) para gerenciadores de
 *   senha e teclados do celular reconhecerem o formulário; aviso de Caps Lock e olho de mostrar/ocultar a senha.
 * - Mensagem de credenciais genérica (não revela se o e-mail existe), clique duplo bloqueado e contagem regressiva
 *   quando a API limita as tentativas.
 * - Todo erro tem aviso próprio, em português, sem termos técnicos e com uma saída (tentar de novo, redefinir, suporte).
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import AppButton from '@/components/global/AppButton.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import AuthBanner from '@/components/auth/AuthBanner.vue'
import SocialLoginSection from '@/components/auth/SocialLoginSection.vue'
import {
  Mail,
  ArrowRight,
  Clock,
  LifeBuoy,
  RefreshCw,
  KeyRound,
  WifiOff,
  ServerCrash,
  Zap,
  BadgeDollarSign,
  HeartHandshake,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

// --- ESTADO ---
const step = ref('login')
const isLoading = ref(false)
const notice = ref(null) // { tone, title, text, icon, action } — aviso do topo do formulário
const notificationMessage = ref(null)
const fieldErrors = ref({ email: '', password: '' })
const retryCountdown = ref(0)
let countdownTimer = null

const email = ref('')
const password = ref('')
const emailOrPhone = ref('')
const token = ref('')
const newPassword = ref('')
const emailInputRef = ref(null)
const passwordInputRef = ref(null)

const isLoginFormValid = computed(() => email.value.trim() !== '' && password.value.length > 0)
const countdownLabel = computed(() => `${Math.floor(retryCountdown.value / 60)}:${String(retryCountdown.value % 60).padStart(2, '0')}`)
const isBlocked = computed(() => retryCountdown.value > 0)

// Caminho interno para voltar depois do login (?redirect=). Só aceita caminho do próprio app.
const redirectQuery = computed(() => {
  const redirect = router.currentRoute.value.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : ''
})
const oauthReturnTo = redirectQuery
// Quem chega aqui por um link protegido vê por que precisa entrar.
const comingFromProtectedPage = computed(() => Boolean(redirectQuery.value))

const whatsappLink = 'https://wa.me/5511921923978'
function openWhatsapp() {
  window.open(whatsappLink, '_blank', 'noopener,noreferrer')
}

// Atributos que ajudam gerenciadores de senha e o teclado do celular.
const emailAttrs = { inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next' }
const passwordAttrs = { name: 'password', enterkeyhint: 'go', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }

function clearFieldError(field) {
  if (fieldErrors.value[field]) fieldErrors.value[field] = ''
  if (notice.value) notice.value = null
}

function startCountdown(seconds) {
  clearInterval(countdownTimer)
  retryCountdown.value = Math.max(1, Math.min(Number(seconds) || 60, 3600))
  countdownTimer = setInterval(() => {
    retryCountdown.value -= 1
    if (retryCountdown.value <= 0) {
      clearInterval(countdownTimer)
      notice.value = null
    }
  }, 1000)
}
onBeforeUnmount(() => clearInterval(countdownTimer))

function goToStep(stepName) {
  step.value = stepName
  notice.value = null
  notificationMessage.value = null
  isLoading.value = false
}

// Traduz a falha do login em aviso: cada situação tem texto próprio e uma saída.
function noticeForLoginFailure(result) {
  switch (result.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return { tone: 'error', title: 'E-mail ou senha incorretos.', text: 'Confira os dados e tente novamente.' }
    case 'AUTH_RATE_LIMITED':
      startCountdown(result.details?.retry_after)
      return {
        tone: 'warning',
        icon: Clock,
        title: 'Muitas tentativas de acesso.',
        text: 'Por segurança, aguarde um pouco antes de tentar de novo. Você pode redefinir a senha agora.',
        action: 'forgot',
      }
    case 'AUTH_SUBSCRIPTION_REQUIRED':
      return {
        tone: 'warning',
        title: 'O acesso da clínica está pausado.',
        text: 'A assinatura precisa de atenção. Peça ao responsável pela clínica para regularizar ou fale com o suporte.',
        action: 'support',
      }
    case 'AUTH_SESSION_REVOKED':
      return { tone: 'info', title: 'Sua sessão terminou por segurança.', text: 'Entre novamente para continuar de onde parou.' }
    default:
      break
  }
  if (!result.status) {
    return {
      tone: 'error',
      icon: WifiOff,
      title: 'Não foi possível entrar.',
      text: 'Não conseguimos falar com o sistema. Confira sua conexão e tente novamente.',
      action: 'retry',
    }
  }
  if (result.status === 429) {
    startCountdown(result.details?.retry_after)
    return { tone: 'warning', icon: Clock, title: 'Muitas tentativas de acesso.', text: 'Aguarde um pouco antes de tentar de novo.', action: 'forgot' }
  }
  if (result.status >= 500) {
    return {
      tone: 'error',
      icon: ServerCrash,
      title: 'Não foi possível entrar agora.',
      text: 'O sistema não concluiu o acesso. Seus dados continuam aqui; tente novamente em instantes.',
      action: 'retry',
    }
  }
  return { tone: 'error', title: '', text: result.error || 'E-mail ou senha incorretos. Confira os dados e tente novamente.' }
}

async function handleLogin() {
  if (isLoading.value || isBlocked.value) return
  notice.value = null
  fieldErrors.value = { email: '', password: '' }
  isLoading.value = true

  // Sincronização forçada para o preenchimento automático do iOS (que nem sempre dispara "input").
  const emailValue = emailInputRef.value?.inputRef?.value || email.value
  const passwordValue = passwordInputRef.value?.inputRef?.value || password.value
  if (email.value !== emailValue) email.value = emailValue
  if (password.value !== passwordValue) password.value = passwordValue

  const result = await authStore.login({ email: emailValue.trim(), password: passwordValue })
  isLoading.value = false

  if (result.success) {
    // Só caminhos internos (redirectQuery já descarta endereços externos e //host).
    if (redirectQuery.value) router.push(redirectQuery.value)
    else router.push({ name: 'resumo-dashboard' })
    return
  }

  // Erros por campo vão no campo; se existirem, não repete o aviso geral.
  const fieldList = result.details?.fields
  if (Array.isArray(fieldList) && fieldList.length > 0) {
    fieldList.forEach((err) => {
      if (Object.prototype.hasOwnProperty.call(fieldErrors.value, err.field)) fieldErrors.value[err.field] = err.message
    })
    return
  }
  notice.value = noticeForLoginFailure(result)
}

async function handleForgotPassword() {
  notice.value = null
  notificationMessage.value = null
  isLoading.value = true
  const { success, error } = await authStore.requestPasswordReset(emailOrPhone.value)
  isLoading.value = false
  if (success) {
    goToStep('reset')
    notificationMessage.value = 'Código enviado! Verifique seu email ou telefone.'
  } else {
    notice.value = { tone: 'error', title: 'Não foi possível enviar o código.', text: error || 'Confira o e-mail ou telefone e tente novamente.' }
  }
}

async function handleResetPassword() {
  notice.value = null
  isLoading.value = true
  const { success, error } = await authStore.performPasswordReset({ token: token.value, newPassword: newPassword.value })
  isLoading.value = false
  if (success) {
    goToStep('login')
    notificationMessage.value = 'Senha redefinida com sucesso. Faça login para continuar.'
  } else {
    notice.value = { tone: 'error', title: 'Não foi possível redefinir a senha.', text: error || 'O código está incorreto ou expirou. Confira o código ou peça um novo.' }
  }
}
</script>

<template>
  <div class="login-view">
    <Transition name="step" mode="out-in">
      <!-- ENTRAR -->
      <div v-if="step === 'login'" key="login" class="step-body">
        <AuthHeader
          before="Bem-vindo"
          accent="de volta"
          subtitle="Entre para acompanhar os atendimentos de hoje e o que precisa da sua atenção."
        />

        <Transition name="notice">
          <AuthBanner v-if="notificationMessage" key="ok" tone="success">{{ notificationMessage }}</AuthBanner>
          <AuthBanner
            v-else-if="notice"
            :key="notice.title + notice.text"
            :tone="notice.tone"
            :title="notice.title"
            :icon="notice.icon"
          >
            {{ notice.text }}
            <template v-if="notice.action" #action>
              <button v-if="notice.action === 'retry'" type="button" class="banner-btn" @click="handleLogin">
                <RefreshCw :size="14" aria-hidden="true" /> Tentar novamente
              </button>
              <button v-else-if="notice.action === 'forgot'" type="button" class="banner-btn" @click="goToStep('forgot')">
                <KeyRound :size="14" aria-hidden="true" /> Esqueci minha senha
              </button>
              <button v-else-if="notice.action === 'support'" type="button" class="banner-btn" @click="openWhatsapp">
                <LifeBuoy :size="14" aria-hidden="true" /> Falar com o suporte
              </button>
            </template>
          </AuthBanner>
          <AuthBanner v-else-if="comingFromProtectedPage" key="redirect" tone="info">
            Entre para continuar de onde parou.
          </AuthBanner>
        </Transition>

        <form class="auth-form" method="post" action="#" aria-label="Entrar na sua conta" novalidate @submit.prevent="handleLogin">
          <FormInput
            ref="emailInputRef"
            v-model="email"
            label="E-mail"
            type="email"
            name="email"
            placeholder="seuemail@exemplo.com"
            autocomplete="username"
            :icon="Mail"
            :input-attrs="emailAttrs"
            :required="true"
            :hide-required-asterisk="true"
            :error="fieldErrors.email"
            @input="clearFieldError('email')"
          />
          <PasswordInput
            ref="passwordInputRef"
            v-model="password"
            label="Senha"
            placeholder="Sua senha"
            autocomplete="current-password"
            :icon="true"
            :input-attrs="passwordAttrs"
            :required="true"
            :show-validation="false"
            :hide-required-asterisk="true"
            :error="fieldErrors.password"
            @input="clearFieldError('password')"
          >
            <template #label-action>
              <a href="#" class="link-accent" @click.prevent="goToStep('forgot')">Esqueceu a senha?</a>
            </template>
          </PasswordInput>

          <AppButton
            type="submit"
            variant="primary"
            size="lg"
            class="auth-cta"
            :loading="isLoading"
            :disabled="!isLoginFormValid || isBlocked"
          >
            <template v-if="isBlocked"><Clock :size="18" aria-hidden="true" /> Aguarde {{ countdownLabel }}</template>
            <template v-else>Entrar <ArrowRight :size="18" aria-hidden="true" /></template>
          </AppButton>
        </form>

        <SocialLoginSection intent="login" :return-to="oauthReturnTo" :disabled="isLoading" />

        <footer class="auth-footer">
          <p>
            Ainda não tem conta?
            <router-link to="/register" class="link-accent">Crie sua conta</router-link>
          </p>
          <p class="help-line">
            <LifeBuoy :size="15" aria-hidden="true" />
            Precisa de ajuda? <a href="#" class="link-help" @click.prevent="openWhatsapp">Falar com o suporte</a>
          </p>
        </footer>
      </div>

      <!-- RECUPERAR SENHA -->
      <div v-else-if="step === 'forgot'" key="forgot" class="step-body">
        <AuthHeader accent="Recuperar" after="senha" subtitle="Digite seu email ou telefone e enviaremos um código de verificação para redefinir sua senha." />
        <Transition name="notice">
          <AuthBanner v-if="notice" :tone="notice.tone" :title="notice.title">{{ notice.text }}</AuthBanner>
        </Transition>
        <form class="auth-form" novalidate @submit.prevent="handleForgotPassword">
          <FormInput
            v-model="emailOrPhone"
            label="Email ou Telefone"
            name="emailOrPhone"
            placeholder="seuemail@exemplo.com"
            autocomplete="username"
            :icon="Mail"
            :input-attrs="emailAttrs"
            :required="true"
          />
          <AppButton type="submit" variant="primary" size="lg" class="auth-cta" :loading="isLoading">Enviar código</AppButton>
        </form>
        <footer class="auth-footer">
          <p>Lembrou a senha? <a href="#" class="link-accent" @click.prevent="goToStep('login')">Voltar ao login</a></p>
        </footer>
      </div>

      <!-- REDEFINIR SENHA -->
      <div v-else-if="step === 'reset'" key="reset" class="step-body">
        <AuthHeader accent="Redefinir" after="senha" subtitle="Digite o código de 6 dígitos que enviamos e sua nova senha." />
        <Transition name="notice">
          <AuthBanner v-if="notice" :tone="notice.tone" :title="notice.title">{{ notice.text }}</AuthBanner>
          <AuthBanner v-else-if="notificationMessage" tone="success">{{ notificationMessage }}</AuthBanner>
        </Transition>
        <form class="auth-form" novalidate @submit.prevent="handleResetPassword">
          <FormInput
            v-model="token"
            label="Código de Verificação"
            name="token"
            placeholder="123456"
            autocomplete="one-time-code"
            :input-attrs="{ inputmode: 'numeric', enterkeyhint: 'next' }"
            :required="true"
          />
          <PasswordInput v-model="newPassword" label="Nova Senha" :required="true" :icon="true" />
          <AppButton type="submit" variant="primary" size="lg" class="auth-cta" :loading="isLoading">Salvar e Entrar</AppButton>
        </form>
        <footer class="auth-footer">
          <p>Não recebeu o código? <a href="#" class="link-accent" @click.prevent="goToStep('forgot')">Tentar novamente</a></p>
        </footer>
      </div>

      <!-- CONTATO -->
      <div v-else-if="step === 'contact'" key="contact" class="step-body">
        <AuthHeader accent="Fale" after="com um especialista" subtitle="Para melhor atendimento, cadastro via consultoria." />
        <ul class="features-list">
          <li>
            <Zap :size="20" class="feature-icon" />
            <div><strong>Resposta Rápida</strong><p>Inicie seu projeto hoje mesmo, sem longas esperas.</p></div>
          </li>
          <li>
            <BadgeDollarSign :size="20" class="feature-icon" />
            <div><strong>Valor Acessível</strong><p>Planos justos e transparentes para sua clínica decolar.</p></div>
          </li>
          <li>
            <HeartHandshake :size="20" class="feature-icon" />
            <div><strong>Suporte Humanizado</strong><p>Converse diretamente com nossa equipe, sem robôs.</p></div>
          </li>
        </ul>
        <AppButton variant="primary" size="lg" class="auth-cta" @click="openWhatsapp">Entrar em contato</AppButton>
        <footer class="auth-footer">
          <p>Já tem uma conta? <a href="#" class="link-accent" @click.prevent="goToStep('login')">Voltar ao Login</a></p>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.login-view {
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
  margin-top: 0.25rem;
  gap: 0.5rem;
}
.auth-cta :deep(.button-content) {
  gap: 0.625rem;
}

.link-accent {
  color: var(--azul-principal);
  font-size: 0.84375rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}
.auth-footer .link-accent {
  font-size: inherit;
}
.link-accent:hover {
  color: var(--azul-escuro);
}
.link-accent:focus-visible,
.link-help:focus-visible,
.banner-btn:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
  border-radius: 4px;
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

.features-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.features-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  text-align: left;
}
.feature-icon {
  flex: none;
  margin-top: 0.125rem;
  color: var(--azul-principal);
}
.features-list strong {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ds-text, #0f172a);
}
.features-list p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ds-text-muted, #64748b);
}

/* Troca de etapa e aviso */
.step-enter-active,
.step-leave-active {
  transition: opacity 0.2s ease;
}
.step-enter-from,
.step-leave-to {
  opacity: 0;
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

/* Celular: alvos de toque de 44px+ e botão de 52px */
@media (max-width: 900px) {
  .step-body {
    gap: 1.25rem;
  }
  .auth-cta {
    height: 52px;
  }
  .auth-form :deep(.form-input) {
    min-height: 52px;
  }
  .link-accent {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  .banner-btn {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .step-enter-active,
  .step-leave-active,
  .notice-enter-active,
  .notice-leave-active {
    transition: none;
  }
}
</style>
