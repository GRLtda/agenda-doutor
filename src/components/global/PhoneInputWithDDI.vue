<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ChevronDown, Globe } from 'lucide-vue-next'
import { formatPhone } from '@/directives/phone-mask.js'
import { countries } from '@/utils/countries'

const props = defineProps({
  modelValue: { type: String, default: '' }, // Agora apenas o número
  countryCode: { type: String, default: '55' }, // Novo prop para DDI
  label: String,
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: String
})

const emit = defineEmits(['update:modelValue', 'update:countryCode'])


const isOpen = ref(false)
const ddiQuery = ref('') 
const selectedCountry = ref(null)
const phoneNumber = ref('') // Apenas o número
const containerRef = ref(null)
const ddiInputRef = ref(null)

const dropdownStyle = ref({})
const dropdownListRef = ref(null)

const filteredCountries = computed(() => {
  const query = ddiQuery.value.trim().toLowerCase()
  return countries.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.ddi.includes(query)
  )
})

function getFlagUrl(code) {
  return new URL(`../../assets/flags/${code}.png`, import.meta.url).href
}

// Watcher para tentar inferir o país quando o usuário digita o DDI
watch(ddiQuery, (newVal) => {
  // Se o país atual já corresponde ao novo DDI, mantém ele (ex: +1 EUA vs +1 Canadá)
  // Mas precisamos garantir que se o usuário digitou algo novo, emitimos o novo DDI
  const cleanDDI = newVal.replace(/\D/g, '')
  emit('update:countryCode', cleanDDI)

  if (selectedCountry.value && selectedCountry.value.ddi === newVal) {
    return
  }
  
  const exactMatch = countries.find(c => c.ddi === newVal)
  selectedCountry.value = exactMatch || null
})

// Sync inicial e quando props mudam
watch(() => props.countryCode, (newCode) => {
  if (newCode) {
    const formattedDDI = `+${newCode}`
    if (ddiQuery.value !== formattedDDI) {
        ddiQuery.value = formattedDDI
    }
  }
}, { immediate: true })

watch(() => props.modelValue, (newPhone) => {
  // Aqui assumimos que modelValue é APENAS o número, pois separamos a lógica
  if (newPhone !== phoneNumber.value) {
     phoneNumber.value = newPhone || ''
  }
}, { immediate: true })

async function updateDropdownPosition() {
  if (!isOpen.value || !containerRef.value) return
  await nextTick()
  // Usamos o containerRef para alinhar o dropdown
  const rect = containerRef.value.querySelector('.styled-wrapper').getBoundingClientRect()
  
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: '300px', // width fixo conforme o CSS original
    zIndex: 9999
  }
}

function openDropdown() {
  if (!props.disabled) {
    isOpen.value = true
  }
}

function selectCountry(country) {
  selectedCountry.value = country
  ddiQuery.value = country.ddi
  isOpen.value = false
  // Não limpar phoneNumber ao trocar país, apenas a formatação pode mudar
  // emit update é chamado pelo watcher do ddiQuery
}

function handleDDIInput(event) {
  // Remove tudo que não for número
  let rawNumbers = event.target.value.replace(/\D/g, '')
  
  // Limita a 3 números
  if (rawNumbers.length > 3) {
    rawNumbers = rawNumbers.slice(0, 3)
  }

  // Garante o + no início
  const formatted = '+' + rawNumbers
  
  ddiQuery.value = formatted
  
  // Força atualização do input se necessário (ex: usuário digitou 4º número ou letra)
  if (event.target.value !== formatted) {
    event.target.value = formatted
  }

  if (!isOpen.value) isOpen.value = true
}

function handlePhoneInput(event) {
  let value = event.target.value
  
  if (selectedCountry.value && selectedCountry.value.code === 'br') {
    value = formatPhone(value)
    if (event.target.value !== value) {
      event.target.value = value
    }
  } else {
    value = value.replace(/[^\d\s-]/g, '') 
  }
  
  phoneNumber.value = value
  emit('update:modelValue', value)
}

function handleClickOutside(event) {
  if (
      containerRef.value && 
      !containerRef.value.contains(event.target) &&
      dropdownListRef.value &&
      !dropdownListRef.value.contains(event.target)
  ) {
    isOpen.value = false
  }
}

watch(isOpen, (newValue) => {
  if (newValue) {
    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    nextTick(() => {
        document.addEventListener('click', handleClickOutside)
    })
  } else {
    window.removeEventListener('scroll', updateDropdownPosition, true)
    window.removeEventListener('resize', updateDropdownPosition)
    document.removeEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="form-group" ref="containerRef">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>

    <div 
      class="styled-wrapper" 
      :class="{ 
        'is-disabled': disabled, 
        'has-error': !!error,
        'is-focused': isOpen 
      }"
    >
      <!-- DDI Input Section -->
      <div class="ddi-input-wrapper">
         <div class="flag-display">
             <img 
               v-if="selectedCountry" 
               :src="getFlagUrl(selectedCountry.code)" 
               :alt="selectedCountry.name" 
               class="flag-icon" 
             />
             <Globe v-else :size="20" class="flag-icon text-gray-400" />
         </div>
         <input 
            ref="ddiInputRef"
            type="text"
            inputmode="numeric"
            class="ddi-input"
            :value="ddiQuery"
            @input="handleDDIInput"
            @focus="openDropdown"
            :disabled="disabled"
            placeholder="+00"
         />
         <ChevronDown :size="14" class="chevron-icon" :class="{ 'is-open': isOpen }" @click="openDropdown" />
      </div>

      <div class="separator"></div>

      <!-- Phone Input -->
      <input
        type="text"
        inputmode="numeric"
        :value="phoneNumber"
        @input="handlePhoneInput"
        placeholder="(00) 00000-0000"
        class="phone-input"
        :disabled="disabled"
        @focus="isOpen = false" 
      /> <!-- Fecha dropdown ao focar no numero -->

      <!-- Dropdown Menu -->
      <!-- Dropdown Menu -->
      <Teleport to="body">
         <Transition name="fade-dropdown">
            <div 
               v-if="isOpen" 
               class="dropdown-menu"
               :style="dropdownStyle"
               ref="dropdownListRef"
            >
               <ul class="country-list">
               <li 
                  v-for="country in filteredCountries" 
                  :key="country.code" 
                  @mousedown.prevent="selectCountry(country)"
                  class="country-item"
                  :class="{ 'is-selected': selectedCountry && country.code === selectedCountry.code }"
               >
                  <img :src="getFlagUrl(country.code)" :alt="country.name" class="flag-icon-small" />
                  <span class="country-name">{{ country.name }}</span>
                  <span class="country-ddi">{{ country.ddi }}</span>
               </li>
               <li v-if="filteredCountries.length === 0" class="no-results">
                  Nenhum país encontrado
               </li>
               </ul>
            </div>
         </Transition>
      </Teleport>
    </div>
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 1.25rem;
  text-align: left;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--cinza-texto-escuro, #374151);
}

.required-asterisk {
  color: #ef4444;
  margin-left: 0.25rem;
}

/* Container Principal */
.styled-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.styled-wrapper:focus-within,
.styled-wrapper.is-focused {
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.styled-wrapper.has-error {
  border-color: #ef4444;
}

.styled-wrapper.is-disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

/* DDI Section */
.ddi-input-wrapper {
  display: flex;
  align-items: center;
  padding-left: 1rem; /* Reduced from 0.75rem */
  height: 100%;
  position: relative;
}

.flag-display {
  display: flex; /* Ensure center alignment */
  align-items: center;
}

.flag-icon {
  width: 20px;
  height: auto;
  border-radius: 2px;
  object-fit: cover;
}

.ddi-input {
  border: none;
  background: transparent;
  width: 2.8rem; /* Reduced from 3.5rem to be more compact */
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  outline: none;
  text-align: center;
}

.chevron-icon {
  color: #6b7281;
  transition: transform 0.2s ease;
  margin-left: -4px; /* Aproximar do input */
  cursor: pointer;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

/* Separator */
.separator {
  width: 1px;
  height: 24px;
  background-color: #e5e7eb;
  margin: 0 0.4rem;
}

/* Input text */
.phone-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0 1rem 0 0;
  height: 100%;
  font-size: 1rem;
  color: #111827;
  outline: none;
  border-top-right-radius: 0.75rem;
  border-bottom-right-radius: 0.75rem;
  width: 100%;
}

.phone-input::placeholder {
  color: #9ca3af;
}

/* Dropdown Menu */
.dropdown-menu {
  /* Position, Top, Left, Width handled by JS + Teleport */
  max-height: 250px;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.country-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.country-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

.country-item:hover {
  background-color: #f3f4f6;
}

.country-item.is-selected {
  background-color: #eff6ff;
  color: var(--azul-principal, #3b82f6);
}

.flag-icon-small {
  width: 20px;
  height: auto;
  border-radius: 2px;
}

.country-name {
  flex: 1;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.country-ddi {
  font-size: 0.8rem;
  color: #6b7280;
}

.no-results {
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.error-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.fade-dropdown-enter-active,
.fade-dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-dropdown-enter-from,
.fade-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
