<script setup>
import { watch } from 'vue'
import axios from 'axios'
import FormInput from '@/components/global/FormInput.vue'

// Define a interface do v-model para o objeto address
const addressData = defineModel()

const fetchAddress = async (cep) => {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length === 8) {
    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (!data.erro) {
        addressData.value.street = data.logradouro
        addressData.value.district = data.bairro
        addressData.value.city = data.localidade
        addressData.value.state = data.uf
      }
    } catch (e) {
      console.error('Erro ao buscar CEP:', e)
    }
  }
}

watch(() => addressData.value.cep, (newCep) => {
  if (newCep) fetchAddress(newCep)
})
</script>

<template>
  <div class="step-content">
    <div class="address-grid">
      <div class="field-cep">
        <FormInput v-model="addressData.cep" label="CEP" placeholder="00000-000" cep-mask />
      </div>
      <div class="field-street">
        <FormInput
          v-model="addressData.street"
          label="Rua / Logradouro"
          placeholder="Ex: Rua das Flores"
        />
      </div>
      <div class="field-number">
        <FormInput
          v-model="addressData.number"
          label="Número"
          placeholder="Ex: 123"
        />
      </div>
      <div class="field-complement">
        <FormInput
          v-model="addressData.complement"
          label="Complemento"
          placeholder="Ex: Apt 101, Fundos"
        />
      </div>
      <div class="field-district">
        <FormInput
          v-model="addressData.district"
          label="Bairro"
          placeholder="Ex: Centro"
        />
      </div>
      <div class="field-city">
        <FormInput
          v-model="addressData.city"
          label="Cidade"
          placeholder="Ex: São Paulo"
        />
      </div>
      <div class="field-state">
        <FormInput
          v-model="addressData.state"
          label="Estado"
          placeholder="Ex: SP"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-content {
  padding-bottom: 0.5rem;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem 1.5rem;
}

.field-cep { grid-column: span 2; }
.field-street { grid-column: span 4; }
.field-number { grid-column: span 2; }
.field-complement { grid-column: span 4; }
.field-district { grid-column: span 2; }
.field-city { grid-column: span 3; }
.field-state { grid-column: span 1; }

@media (max-width: 768px) {
  .address-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .field-cep, .field-street, .field-number, .field-complement, .field-district, .field-city, .field-state {
    grid-column: span 1;
  }
}
</style>
