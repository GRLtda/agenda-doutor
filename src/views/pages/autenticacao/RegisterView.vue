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
    // Se não tiver token NENHUM, o backend vai rejeitar (conforme novas regras)
    errorMessage.value = 'Registro permitido apenas através de um convite válido.'
    return
  }

  const { success, error } = await authStore.register(payload)

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
      <template #title>Crie sua conta</template>

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
        <button type="submit" class="auth-button">Criar conta</button>
      </form>

      <template #footer>
        Já tem uma conta? <router-link to="/login" class="link">Entre</router-link>
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
.auth-button {
  width: 100%;
  padding: 0.875rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 1rem;
}
.auth-button:hover {
  background-color: var(--azul-escuro);
}
.link {
  color: var(--azul-principal);
  font-weight: 600;
  text-decoration: none;
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
