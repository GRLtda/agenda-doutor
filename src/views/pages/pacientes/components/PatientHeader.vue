<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import { AlertTriangle, Clipboard, Edit } from 'lucide-vue-next'

interface Patient {
  _id: string
  name: string
  phone?: string
  countryCode?: string
  cpf?: string
  email?: string
  address?: {
    street?: string
    complement?: string
  }
}

const props = defineProps<{
  patient: Patient
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'assign-anamnesis'): void
  (e: 'edit'): void
}>()

const patientInitial = computed(() => props.patient.name.charAt(0).toUpperCase())
const shortId = computed(() => props.patient._id.slice(-6).toUpperCase())

// Check for missing info
const missingInfo = computed(() => {
  const missing: string[] = []
  const p = props.patient
  
  if (!p.cpf || p.cpf.replace(/\D/g, '').length < 11) {
    missing.push('CPF')
  }
  if (!p.email || p.email.trim() === '') {
    missing.push('E-mail')
  }
  if (!p.address?.street || p.address.street.trim() === '') {
    missing.push('Endereço')
  }
  
  return missing
})
</script>

<template>
  <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div class="flex items-center gap-4">
      <Avatar class="h-16 w-16 text-2xl">
        <AvatarFallback class="bg-primary/10 text-primary font-semibold">
          {{ patientInitial }}
        </AvatarFallback>
      </Avatar>
      
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-foreground truncate">{{ patient.name }}</h1>
          
          <TooltipProvider v-if="missingInfo.length > 0">
            <Tooltip>
              <TooltipTrigger as-child>
                <Badge variant="outline" class="bg-amber-50 text-amber-600 border-amber-200 cursor-help">
                  <AlertTriangle class="h-3.5 w-3.5" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" class="max-w-xs">
                <p class="font-medium mb-1">Informações faltando:</p>
                <ul class="list-disc list-inside text-sm">
                  <li v-for="item in missingInfo" :key="item">{{ item }}</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div class="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span>ID: #{{ shortId }}</span>
          <PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" />
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-2 sm:shrink-0">
      <Button variant="outline" @click="emit('assign-anamnesis')">
        <Clipboard class="h-4 w-4 mr-2" />
        Aplicar Anamnese
      </Button>
      <Button v-if="!isEditing" class="bg-brand-gradient hover:opacity-90" @click="emit('edit')">
        <Edit class="h-4 w-4 mr-2" />
        Editar
      </Button>
    </div>
  </header>
</template>
