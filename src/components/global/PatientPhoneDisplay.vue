<script setup>
import { computed } from 'vue'
import { countries } from '@/utils/countries'
import { formatPhone } from '@/directives/phone-mask.js'
import { Globe } from 'lucide-vue-next'

const props = defineProps({
  phone: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    default: '55'
  },
  showDDI: {
    type: Boolean,
    default: true
  },
  showFlag: {
    type: Boolean,
    default: true
  }
})

const country = computed(() => {
  const code = props.countryCode || '55'
  const normalizedCode = code.startsWith('+') ? code : `+${code}`
  return countries.find(c => c.ddi === normalizedCode)
})

const formattedNumber = computed(() => {
    if (!props.phone) return ''
    if (!country.value || country.value.code === 'br') {
        return formatPhone(props.phone)
    }
    return props.phone
})

function getFlagUrl(code) {
  if (!code) return null
  return new URL(`../../assets/flags/${code}.png`, import.meta.url).href
}
</script>

<template>
  <div class="patient-phone-display">
    <div v-if="showFlag" class="flag-wrapper" :title="country?.name || 'Desconhecido'">
        <img 
            v-if="country" 
            :src="getFlagUrl(country.code)" 
            :alt="country.name" 
            class="flag-icon" 
        />
        <Globe v-else :size="16" class="flag-icon text-gray-400" />
    </div>
    
    <span class="phone-text">
       <span v-if="showDDI" class="ddi-text">
         +{{ props.countryCode }}
       </span>
       {{ formattedNumber }}
    </span>
  </div>
</template>

<style scoped>
.patient-phone-display {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.flag-wrapper {
  display: flex;
  align-items: center;
}

.flag-icon {
  width: 20px;
  height: auto;
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
}

.phone-text {
  white-space: nowrap;
}

.ddi-text {
  color: #6b7280;
}
</style>
