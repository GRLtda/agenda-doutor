<script setup>
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import PhoneInputWithDDI from '@/components/global/PhoneInputWithDDI.vue'
import { ref, onMounted } from 'vue'

// Define a interface do v-model para o objeto patientData completo
const patientData = defineModel()

const showDDINotification = ref(false)

onMounted(() => {
  const expirationDate = new Date('2026-01-30')
  const now = new Date()
  
  if (now > expirationDate) return

  const hasSeen = localStorage.getItem('hasSeenDDIFeature')
  if (!hasSeen) {
    showDDINotification.value = true
  }
})

const closeNotification = () => {
  showDDINotification.value = false
  localStorage.setItem('hasSeenDDIFeature', 'true')
}

const genderOptions = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
]
</script>

<template>
  <div class="step-content grid-2-cols">
    <FormInput
      v-model="patientData.name"
      label="Nome Completo"
      placeholder="Nome do paciente"
      required
    />
    <FormInput
      v-model="patientData.email"
      label="E-mail"
      placeholder="email@exemplo.com"
      type="email"
    />
    <FormInput v-model="patientData.cpf" label="CPF" placeholder="000.000.000-00" cpf-mask />
    <div class="phone-input-wrapper">
      <PhoneInputWithDDI
        v-model="patientData.phone"
        v-model:countryCode="patientData.countryCode"
        label="Telefone"
        required
      />
      
      <transition name="fade-slide">
        <div v-if="showDDINotification" class="ddi-notification-card">
          <button class="close-btn" @click="closeNotification">
            &times;
          </button>
          
          <div class="card-badge">
            Novo na v1.9
          </div>
          
          <h3 class="card-title">Conecte-se com o mundo</h3>
          
          <p class="card-description">
            Agora você pode cadastrar pacientes internacionais. Selecione o país clicando na bandeira ao lado.
          </p>
          
          <div class="card-footer">
            Detectamos automaticamente o país pelo DDI.
          </div>
          
          <div class="arrow-down"></div>
        </div>
      </transition>
    </div>
    <FormInput v-model="patientData.birthDate" label="Data de Nascimento" type="date" />
    <StyledSelect v-model="patientData.gender" label="Gênero" :options="genderOptions" required />
  </div>
</template>

<style scoped>
.step-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem 2rem;
  padding-bottom: 1.25rem;
}
@media (max-width: 768px) {
  .step-content {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

.phone-input-wrapper {
  position: relative;
}

.ddi-notification-card {
  position: absolute;
  bottom: calc(100% + 12px); /* Position above the input */
  left: 50%;
  transform: translateX(-50%);
  
  width: 280px;
  background: #ffffff; /* White */
  color: #18181b; /* Zinc-950 text */
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  border: 1px solid #e4e4e7; /* Zinc-200 border */
}

.card-badge {
  display: inline-block;
  background: #0ea5e9; /* Sky-500 */
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 12px;
}

.card-title {
  color: #18181b; /* Dark text */
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.card-description {
  color: #52525b; /* Zinc-600 */
  font-size: 0.8rem;
  line-height: 1.4;
  margin: 0 0 12px 0;
}

.card-footer {
  color: #71717a; /* Zinc-500 */
  font-size: 0.7rem;
  border-top: 1px solid #f4f4f5; /* Zinc-100 */
  padding-top: 8px;
  margin-top: 4px;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #a1a1aa; /* Zinc-400 */
  font-size: 1.5rem; /* Increased size */
  cursor: pointer;
  padding: 4px;
  line-height: 0.5;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #52525b; /* Zinc-600 */
}

.arrow-down {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #ffffff; /* Match white bg */
  filter: drop-shadow(0 1px 0 #e4e4e7); /* Simulate border on arrow */
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px) scale(0.95);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
</style>
