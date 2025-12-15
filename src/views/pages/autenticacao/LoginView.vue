<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthCard from '@/components/pages/autenticacao/AuthCard.vue'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import {
  LifeBuoy,
  Zap,
  BadgeDollarSign,
  HeartHandshake
} from 'lucide-vue-next'
import ClinicLogo from '@/components/global/ClinicLogo.vue'
import AppButton from '@/components/global/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

// --- ESTADO ---
const step = ref('login')
const isLoading = ref(false)
const errorMessage = ref(null)
const notificationMessage = ref(null)

// --- V-MODELS ---
const email = ref('')
const password = ref('')
const emailOrPhone = ref('')
const token = ref('')
const newPassword = ref('')

const imageUrl = new URL('@/assets/clinic1.webp', import.meta.url).href
const whatsappLink = 'https://wa.me/5511921923978'

function openWhatsapp() {
  window.open(whatsappLink, '_blank')
}


// --- FUNÇÕES ---
function goToStep(stepName) {
  step.value = stepName
  errorMessage.value = null
  notificationMessage.value = null
  isLoading.value = false
}

async function handleLogin() {
  errorMessage.value = null
  isLoading.value = true
  const { success, user } = await authStore.login({
    email: email.value,
    password: password.value,
  })
  isLoading.value = false

  if (success) {
    const redirectPath = router.currentRoute.value.query.redirect || '/app'
    router.push(redirectPath)
  } else {
    errorMessage.value = 'Email ou senha inválidos. Verifique seus dados.'
  }
}

async function handleForgotPassword() {
  errorMessage.value = null
  notificationMessage.value = null
  isLoading.value = true
  const { success, error } = await authStore.requestPasswordReset(emailOrPhone.value)
  isLoading.value = false
  if (success) {
    notificationMessage.value = 'Código enviado! Verifique seu email ou telefone.'
    goToStep('reset')
  } else {
    errorMessage.value = error
  }
}

async function handleResetPassword() {
  errorMessage.value = null
  isLoading.value = true
  const { success, error } = await authStore.performPasswordReset({
    token: token.value,
    newPassword: newPassword.value,
  })
  isLoading.value = false
  if (success) {
    router.push('/app')
  } else {
    errorMessage.value = error
  }
}
</script>

<template>
  <AuthCard :image-url="imageUrl" image-side="right">

    <template #image-content>
      <div class="brand-logo" @click="router.push('/')">
        <ClinicLogo size="120px" />
      </div>
      <div class="testimonial-overlay">
        <p class="quote">“Simplesmente todas as ferramentas que minha equipe e eu precisamos.”</p>
        <div class="author">
          <strong>Karen Yue</strong>
          <span>Diretora de Tecnologia Clínica</span>
        </div>
      </div>
    </template>

    <template #title>
      <Transition name="fade" mode="out-in">
        <div v-if="step === 'login'" key="title-login" class="header-title-wrapper">
          <span class="title-text">Bem-vindo!</span>
          <span class="subtitle-text">Por favor, insira seus dados para entrar.</span>
        </div>

        <span v-else-if="step === 'forgot'" key="title-forgot" class="simple-title">
          Recuperar senha
        </span>

        <span v-else-if="step === 'reset'" key="title-reset" class="simple-title">
          Redefinir senha
        </span>

        <div v-else-if="step === 'contact'" key="title-contact" class="header-title-wrapper">
          <span class="title-text">Fale com um especialista</span>
          <span class="subtitle-text">Para melhor atendimento, cadastro via consultoria.</span>
        </div>
      </Transition>
    </template>

    <Transition name="slide-fade" mode="out-in">

      <div v-if="step === 'login'" key="body-login">
        <form @submit.prevent="handleLogin">
          <FormInput
            v-model="email"
            label="Email"
            type="email"
            name="email"
            placeholder="seuemail@exemplo.com"
            autocomplete="email"
            :required="true"
          />
          <PasswordInput v-model="password" label="Senha" :required="true" :show-validation="false" />

          <div class="forgot-password-link">
            <a @click.prevent="goToStep('forgot')" href="#" class="link-purple">Esqueceu a senha?</a>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <AppButton type="submit" variant="primary" size="lg" :loading="isLoading" style="width: 100%; margin-top: 0.5rem;">
            Entrar
          </AppButton>
        </form>
      </div>

      <div v-else-if="step === 'forgot'" key="body-forgot">
        <p class="step-description">
          Digite seu email ou telefone e enviaremos um código de verificação para redefinir sua senha.
        </p>
        <form @submit.prevent="handleForgotPassword">
          <FormInput
            v-model="emailOrPhone"
            label="Email ou Telefone"
            name="emailOrPhone"
            placeholder="seuemail@exemplo.com"
            :required="true"
          />
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <AppButton type="submit" variant="primary" size="lg" :loading="isLoading" style="width: 100%; margin-top: 0.5rem;">
            Enviar código
          </AppButton>
        </form>
      </div>

      <div v-else-if="step === 'reset'" key="body-reset">
        <p class="step-description">
          Digite o código de 6 dígitos que enviamos e sua nova senha.
        </p>
        <form @submit.prevent="handleResetPassword">
          <div v-if="notificationMessage" class="notification-message">
            {{ notificationMessage }}
          </div>
          <FormInput
            v-model="token"
            label="Código de Verificação"
            name="token"
            placeholder="123456"
            :required="true"
          />
          <PasswordInput v-model="newPassword" label="Nova Senha" :required="true" />
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <AppButton type="submit" variant="primary" size="lg" :loading="isLoading" style="width: 100%; margin-top: 0.5rem;">
            Salvar e Entrar
          </AppButton>
        </form>
      </div>

      <div v-else-if="step === 'contact'" key="body-contact" class="contact-content">
        <hr class="divider" />
        <ul class="features-list">
          <li>
            <Zap :size="20" class="feature-icon" />
            <div class="feature-text">
              <strong>Resposta Rápida</strong>
              <p>Inicie seu projeto hoje mesmo, sem longas esperas.</p>
            </div>
          </li>
          <li>
            <BadgeDollarSign :size="20" class="feature-icon" />
            <div class="feature-text">
              <strong>Valor Acessível</strong>
              <p>Planos justos e transparentes para sua clínica decolar.</p>
            </div>
          </li>
          <li>
            <HeartHandshake :size="20" class="feature-icon" />
            <div class="feature-text">
              <strong>Suporte Humanizado</strong>
              <p>Converse diretamente com nossa equipe, sem robôs.</p>
            </div>
          </li>
        </ul>
        <AppButton variant="primary" size="lg" @click="openWhatsapp" style="width: 100%; margin-top: 0.5rem;">
          Entrar em contato
        </AppButton>
      </div>

    </Transition>

    <template #footer>
      <Transition name="fade" mode="out-in">
        <div v-if="step === 'login'" key="footer-login" class="footer-text">
          Não tem uma conta?
          <a @click.prevent="goToStep('contact')" href="#" class="link-purple">Entre em contato</a>
        </div>

        <div v-else-if="step === 'forgot' || step === 'contact'" key="footer-back" class="footer-text">
          Já tem uma conta?
          <a @click.prevent="goToStep('login')" href="#" class="link-purple">Voltar ao Login</a>
        </div>

        <div v-else-if="step === 'reset'" key="footer-retry" class="footer-text">
          Não recebeu o código?
          <a @click.prevent="goToStep('forgot')" href="#" class="link-purple">Tentar novamente</a>
        </div>
      </Transition>
    </template>

  </AuthCard>
</template>

<style scoped>
/* --- CLASSES DE ANIMAÇÃO --- */

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease-out;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* -------------------------------------- */

/* Overlay da Imagem */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.brand-logo:hover {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.testimonial-overlay {
  margin-bottom: 2rem;
}

.quote {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 1.5rem;
}

.author {
  display: flex;
  flex-direction: column;
}

.author strong {
  font-size: 1rem;
  font-weight: 600;
}

.author span {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Títulos */
.header-title-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  text-align: left;
}

.simple-title {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--preto-principal);
  margin-bottom: 0.5rem;
}

.title-text {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--preto-principal);
  margin-bottom: 0.75rem;
}

.subtitle-text {
  font-size: 0.95rem;
  color: var(--cinza-texto);
  font-weight: 400;
  line-height: 1.5;
}

/* Formulário */
.forgot-password-link {
  text-align: left; /* Alinhado a esquerda como na referência */
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.link-purple {
  color: var(--azul-principal); /* Cor azul */
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.link-purple:hover {
  color: var(--azul-escuro);
}



/* Footer */
.footer-text {
  font-size: 0.9rem;
  color: var(--cinza-texto);
}

/* Outros */
.contact-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.divider {
  width: 100%;
  border: none;
  border-top: 1px solid var(--cinza-borda);
  margin-bottom: 1.25rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  width: 100%;
  color: var(--cinza-texto-escuro);
}

.features-list li {
  display: flex;
  align-items: flex-start;
  text-align: left;
  margin-bottom: 1rem;
}

.feature-icon {
  color: var(--azul-principal);
  margin-right: 0.75rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.feature-text {
  display: flex;
  flex-direction: column;
}

.feature-text strong {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--preto-principal);
  line-height: 1.4;
}

.feature-text p {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  margin: 0;
  line-height: 1.5;
}

.step-description {
  font-size: 0.95rem;
  color: var(--cinza-texto);
  margin-bottom: 1.5rem;
  text-align: left;
  line-height: 1.5;
}

.notification-message {
  color: var(--azul-principal);
  background-color: #eef2ff;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #c7d2fe;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: left;
}

/* Override global input styles for this view to match purple theme */
:deep(.form-input:focus) {
  border-color: var(--azul-principal) !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3) !important;
}
</style>
```http://googleusercontent.com/image_generation_content/0
