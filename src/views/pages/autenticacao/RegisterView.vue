<script setup>
import { ref, watch, onMounted, computed } from 'vue' // ✨ 'computed' foi adicionado
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
// Importar as duas APIs de convite
import { getInvitationDetails } from '@/api/employees' // Convite de funcionário
import { verifyInvitationToken } from '@/api/auth' // Convite de registro
import { useToast } from 'vue-toastification'
import AuthCard from '@/components/pages/autenticacao/AuthCard.vue'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import { CheckCircle2, Building2 } from 'lucide-vue-next' // ✨ Importei o Building2
import ClinicLogo from '@/components/global/ClinicLogo.vue'
import AppButton from '@/components/global/AppButton.vue'
import confetti from 'canvas-confetti'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const name = ref('')
const email = ref('')
const plan = ref('')
const phone = ref('')
const password = ref('')
const errorMessage = ref(null)
const registrationSuccess = ref(false)

const isLoading = ref(false)

// Estado para o fluxo de convite
const isStaffInvitation = ref(false)
const invitationToken = ref(null)
const emailIsDisabled = ref(false)
const phoneIsDisabled = ref(false)

const imageUrl = new URL('@/assets/clinic2.webp', import.meta.url).href

const formattedPlanName = computed(() => {
  if (!plan.value) return ''
  return plan.value.charAt(0).toUpperCase() + plan.value.slice(1).toLowerCase()
})

onMounted(async () => {
  const newUserToken = route.query.token // Pega ?token=
  const staffInviteToken = route.query.invitationToken // Pega ?invitationToken=

  if (newUserToken) {
    invitationToken.value = newUserToken
    try {
      const response = await verifyInvitationToken(newUserToken)
      if (response.data) {
        email.value = response.data.email
        phone.value = response.data.phone || '' // Preenche o telefone se ele vier
        plan.value = response.data.plan
        emailIsDisabled.value = true
        phoneIsDisabled.value = !!response.data.phone // Desativa fone se ele veio
        isStaffInvitation.value = false // É um registro normal, não um convite de staff
        toast.info(`Bem-vindo(a)! Complete seu cadastro.`)
      }
    } catch (error) {
      console.error('Erro ao verificar convite de registro:', error)
      toast.error(error.response?.data?.message || 'Convite inválido ou expirado!')
      router.push('/register') // Limpa a URL
    }
  } else if (staffInviteToken) {
    invitationToken.value = staffInviteToken
    try {
      const response = await getInvitationDetails(staffInviteToken)
      if (response.data) {
        email.value = response.data.email
        emailIsDisabled.value = true
        phoneIsDisabled.value = false // Staff pode preencher o próprio fone
        isStaffInvitation.value = true // É um convite de staff
        toast.info(`Bem-vindo(a)! Complete seu cadastro para a clínica.`)
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do convite de staff:', error)
      toast.error('Seu link de convite é inválido ou já expirou!')
      router.push('/register') // Limpa a URL
    }
  }
})

watch(registrationSuccess, (newValue) => {
  if (newValue) {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 9999,
    })
  }
})

async function handleRegister() {
  errorMessage.value = null
  isLoading.value = true

  const payload = {
    name: name.value,
    email: email.value,
    phone: phone.value,
    password: password.value,
  }

  // O token (seja de staff ou registro) é obrigatório e será enviado aqui
  if (invitationToken.value) {
    payload.invitationToken = invitationToken.value
  } else {
    errorMessage.value = 'Registro permitido apenas através de um convite válido.'
    isLoading.value = false
    return
  }

  const { success, error } = await authStore.register(payload)
  isLoading.value = false

  if (success) {
    registrationSuccess.value = true
  } else {
    errorMessage.value =
      error.response?.data?.message || 'Não foi possível criar a conta. Verifique os dados.'
  }
}

function handleRegistrationComplete() {
  if (isStaffInvitation.value) {
    // Se for convite de FUNCIONÁRIO, vai para o app
    router.push('/app')
  } else {
    // Se for registro (com convite de ?token), vai para o onboarding
    router.push('/onboarding/clinic')
  }
}
</script>

<template>
  <div>
    <div v-if="registrationSuccess" class="success-screen">
      <div class="success-content">
        <CheckCircle2 :size="64" class="success-icon" />
        <h2 class="title">Conta criada com sucesso!</h2>
        <p class="message">
          Sua conta foi criada. Agora vamos configurar sua clínica.
        </p>
        <button @click="handleRegistrationComplete" class="confirm-button">
          Continuar
        </button>
      </div>
    </div>

    <AuthCard :image-url="imageUrl" v-if="!registrationSuccess">
      <template #image-content>
        <div class="brand-logo" @click="router.push('/')">
          <ClinicLogo size="120px" />
        </div>
        <div class="testimonial-overlay">
          <p class="quote">“A melhor decisão para o crescimento da nossa rede de clínicas.”</p>
          <div class="author">
            <strong>Dr. Ricardo Mendes</strong>
            <span>Diretor Geral</span>
          </div>
        </div>
      </template>

      <template #title>
        <div class="header-title-wrapper">
          <span class="title-text">Crie sua conta</span>
          <span class="subtitle-text">Comece a transformar sua clínica hoje mesmo.</span>
        </div>
      </template>

      <div v-if="plan" class="plan-info">
        <div class="plan-title-wrapper">
          <Building2 class="plan-icon" :size="20" />
          <h4 class="plan-title">
            Plano: <span class="plan-name">{{ formattedPlanName }}</span>
          </h4>
        </div>
        <p class="plan-description">
          Seu cadastro será concluído com os benefícios do plano selecionado.
        </p>
      </div>
      <form @submit.prevent="handleRegister">
        <FormInput
          v-model="name"
          label="Nome completo"
          name="name"
          placeholder="Seu nome completo"
          autocomplete="name"
          :required="true"
        />
        <FormInput
          v-model="email"
          label="Email"
          type="email"
          name="email"
          placeholder="seuemail@exemplo.com"
          autocomplete="email"
          :required="true"
          :disabled="emailIsDisabled"
        />
        <FormInput
          v-model="phone"
          label="Telefone"
          type="tel"
          name="tel"
          placeholder="(11) 99999-9999"
          autocomplete="tel"
          phone-mask
          :required="true"
          :disabled="phoneIsDisabled"
        />
        <PasswordInput v-model="password" label="Senha" :required="true" />

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        <AppButton type="submit" variant="primary" size="lg" :loading="isLoading" style="width: 100%; margin-top: 1rem;">
          Criar conta
        </AppButton>
      </form>

      <template #footer>
        <div class="footer-text">
          Já tem uma conta? <router-link to="/login" class="link-purple">Entre</router-link>
        </div>
      </template>
    </AuthCard>
  </div>
</template>

<style scoped>
/* Estilos da tela de sucesso (sem alterações) */
.success-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--branco);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fade-in 0.5s ease-out;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.success-content {
  text-align: center;
  padding: 0 1.5rem;
}
.success-icon {
  color: #10b981;
  margin-bottom: 1.5rem;
}
.title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.message {
  color: var(--cinza-texto);
  margin-bottom: 2rem;
  font-size: 1.125rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}
.confirm-button {
  max-width: 300px;
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.confirm-button:hover {
  background-color: var(--azul-escuro);
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: left;
}

.link-purple {
  color: var(--azul-principal);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.link-purple:hover {
  color: var(--azul-escuro);
}

/* --- ESTILOS DO LOGIN (Adaptados) --- */
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

.header-title-wrapper {
  display: flex;
  flex-direction: column;
  align-items: start;
  width: 100%;
  text-align: center;
  margin-bottom: 1rem;
}

.title-text {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--preto-principal);
  margin-bottom: 0.5rem;
}

.subtitle-text {
  font-size: 0.95rem;
  color: var(--cinza-texto);
  font-weight: 400;
  line-height: 1.5;
}

.footer-text {
  font-size: 0.9rem;
  color: var(--cinza-texto);
}

/* Override global input styles */
:deep(.form-input:focus) {
  border-color: var(--azul-principal) !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3) !important;
}

/* ✨ NOVOS ESTILOS (Formais) PARA O PLANO ✨ */
.plan-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f0fdf4; /* Fundo verde-compra sutil */
  border-radius: 0.75rem;
  border: 1px solid #bbf7d0; /* Contorno verde-compra sutil */
  width: 100%;
  text-align: left;
}

.plan-title-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.plan-icon {
  color: #16a34a; /* Ícone verde para combinar com o tema */
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.plan-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--cinza-titulo, #1f2937); /* Cor do texto "Plano:" */
  margin: 0;
}

/* ✨ NOVO ESTILO ADICIONADO PARA O NOME DO PLANO ✨ */
.plan-name {
  color: #16a34a; /* Cor verde-compra, igual ao ícone */
  font-weight: 700; /* Destaque no nome do plano */
}

.plan-description {
  font-size: 0.875rem;
  color: var(--cinza-texto, #4b5563);
  line-height: 1.5;
  margin: 0;
}
</style>
