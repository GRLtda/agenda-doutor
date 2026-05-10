<script setup>
import { ref, watch } from 'vue'
import { useClinicStore } from '@/stores/clinic'
import FormInput from '@/components/global/FormInput.vue'
import { fetchAddressByCEP } from '@/api/external'
import { validateCNPJ } from '@/helpers/cnpj-validator'

const emit = defineEmits(['success'])
const clinicStore = useClinicStore()

const clinicData = ref({
  name: '',
  responsibleName: '',
  cnpj: '',
  address: {
    cep: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
  },
})
const errorMessage = ref(null)

watch(
  () => clinicData.value.address.cep,
  async (newCep) => {
    const numericCep = newCep.replace(/\D/g, '')
    if (numericCep.length === 8) {
      const address = await fetchAddressByCEP(numericCep)
      if (address) {
        clinicData.value.address.street = address.street
        clinicData.value.address.district = address.neighborhood
        clinicData.value.address.city = address.city
        clinicData.value.address.state = address.state
      }
    }
  },
)

// ✨ FUNÇÃO DE CRIAÇÃO MODIFICADA ✨
async function handleCreateClinic() {
  if (!clinicData.value.name || !clinicData.value.responsibleName) {
    errorMessage.value = 'Por favor, preencha os campos obrigatórios.'
    return
  }

  const cleanedCnpj = clinicData.value.cnpj.replace(/\D/g, '')

  if (cleanedCnpj && !validateCNPJ(clinicData.value.cnpj)) {
    errorMessage.value = 'O CNPJ inserido não é válido. Por favor, verifique.'
    return
  }

  errorMessage.value = null

  // Cria o payload base sem o CNPJ
  const payload = {
    name: clinicData.value.name,
    responsibleName: clinicData.value.responsibleName,
    address: clinicData.value.address,
  }

  // Adiciona o CNPJ ao payload SOMENTE se ele não estiver vazio
  if (cleanedCnpj) {
    payload.cnpj = cleanedCnpj
  }

  const { success } = await clinicStore.createClinic(payload)

  if (success) {
    emit('success')
  } else {
    errorMessage.value = 'Ocorreu um erro ao criar a clínica. Verifique os dados.'
  }
}
</script>

<template>
  <form @submit.prevent="handleCreateClinic" class="clinic-form">
    <div class="form-header">
      <h2>Dados da Clínica</h2>
      <p>Preencha as informações principais da sua clínica para começar.</p>
    </div>

    <div class="form-grid">
      <FormInput
        v-model="clinicData.name"
        label="Nome da Clínica"
        placeholder="Ex: Clínica Bem-Estar"
        autocomplete="organization"
        required
      />
      <FormInput
        v-model="clinicData.responsibleName"
        label="Nome do Responsável"
        placeholder="Quem é o responsável legal"
        autocomplete="name"
        required
      />
      <FormInput v-model="clinicData.cnpj" label="CNPJ" placeholder="00.000.000/0000-00" cnpj-mask />
      <FormInput
        v-model="clinicData.address.cep"
        label="CEP"
        placeholder="00000-000"
        autocomplete="postal-code"
      />
      <FormInput
        v-model="clinicData.address.street"
        label="Rua / Logradouro"
        placeholder="Ex: Av. Brasil"
        autocomplete="address-line1"
      />
      <FormInput
        v-model="clinicData.address.number"
        label="Número"
        placeholder="Ex: 123"
        autocomplete="address-line2"
      />
      <FormInput
        v-model="clinicData.address.district"
        label="Bairro"
        placeholder="Ex: Centro"
        autocomplete="address-level2"
      />
      <FormInput
        v-model="clinicData.address.city"
        label="Cidade"
        placeholder="Sua cidade"
        autocomplete="address-level2"
      />
      <FormInput
        v-model="clinicData.address.state"
        label="Estado"
        placeholder="Seu estado"
        autocomplete="address-level1"
      />
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <button type="submit" class="auth-button">Salvar e Continuar</button>
  </form>
</template>

<style scoped>
/* Estilos permanecem os mesmos */
.form-header {
  text-align: left;
  margin-bottom: 0.9rem;
}
h2 {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}
p {
  color: var(--cinza-texto);
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.7rem 1rem;
}
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 1rem;
  text-align: center;
}
.auth-button {
  width: 100%;
  padding: 0.875rem;
  margin-top: 0.9rem;
  border-radius: 8px;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.auth-button:hover {
  background-color: var(--azul-escuro);
}
</style>
