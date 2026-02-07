<script setup lang="ts">
import { computed } from 'vue'
import { SectionCard, KeyValueGrid, StatusBadge, EmptyState } from '@/components/shared'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import PhoneInputWithDDI from '@/components/global/PhoneInputWithDDI.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import { ClipboardList, MapPin, History, Calendar, AlertTriangle } from 'lucide-vue-next'
import { formatCPF } from '@/directives/cpf-mask.js'
// useStatusBadge removed - unused

interface Patient {
  _id: string
  name: string
  birthDate?: string
  gender?: string
  cpf?: string
  phone?: string
  countryCode?: string
  email?: string
  isInvalidWhatsapp?: boolean
  address?: {
    cep?: string
    street?: string
    number?: string
    complement?: string
    district?: string
    city?: string
    state?: string
  }
}

interface LastAppointment {
  startTime: string
  status: string
}

const props = defineProps<{
  patient: Patient
  editablePatient: Patient | null
  isEditing: boolean
  lastAppointment: LastAppointment | null
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'cancel'): void
  (e: 'update:editablePatient', value: Patient): void
}>()

const genderOptions = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
]

// displayValue function removed - unused

function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatSimpleDate(dateString: string | undefined): string {
  if (!dateString) return ''
  if (dateString.length === 10 && dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const personalDataItems = computed(() => [
  { label: 'Data de Nasc.', value: formatDate(props.patient.birthDate) },
  { label: 'Gênero', value: props.patient.gender },
  { label: 'CPF', value: formatCPF(props.patient.cpf) },
  { label: 'E-mail', value: props.patient.email },
])

const addressItems = computed(() => {
  const addr = props.patient.address
  if (!addr?.street) return []
  return [
    { label: 'Logradouro', value: `${addr.street || 'Não informado'}, ${addr.number || 'S/N'}` },
    { label: 'Complemento', value: addr.complement },
    { label: 'Bairro', value: addr.district },
    { label: 'Cidade / Estado', value: `${addr.city || 'Não informado'} - ${addr.state || 'UF'}` },
    { label: 'CEP', value: addr.cep },
  ]
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Edit Mode -->
    <form v-if="isEditing && editablePatient" @submit.prevent="emit('save')" class="space-y-6">
      <SectionCard title="Dados Pessoais">
        <template #header>
          <div class="flex items-center gap-2">
            <ClipboardList class="h-5 w-5 text-primary" />
            <span class="font-semibold">Dados Pessoais</span>
          </div>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            :model-value="editablePatient.name"
            @update:model-value="emit('update:editablePatient', { ...editablePatient, name: $event })"
            label="Nome Completo"
            placeholder="Nome do paciente"
            required
          />
          <div class="space-y-2">
            <label class="text-sm font-medium">Data de Nascimento</label>
            <VueDatePicker
              :model-value="editablePatient.birthDate"
              @update:model-value="emit('update:editablePatient', { ...editablePatient, birthDate: $event })"
              locale="pt-BR"
              format="dd/MM/yyyy"
              auto-apply
              :enable-time-picker="false"
              :teleport="true"
              placeholder="dd/mm/aaaa"
              model-type="yyyy-MM-dd"
              :clearable="false"
            >
              <template #trigger>
                <div class="flex items-center justify-between px-3 py-2 border rounded-md bg-background cursor-pointer hover:bg-muted/50">
                  <span v-if="editablePatient.birthDate">{{ formatSimpleDate(editablePatient.birthDate) }}</span>
                  <span v-else class="text-muted-foreground">dd/mm/aaaa</span>
                  <Calendar class="h-4 w-4 text-muted-foreground" />
                </div>
              </template>
            </VueDatePicker>
          </div>
          <FormInput
            :model-value="editablePatient.cpf"
            @update:model-value="emit('update:editablePatient', { ...editablePatient, cpf: $event })"
            label="CPF"
            placeholder="000.000.000-00"
            cpf-mask
          />
          <PhoneInputWithDDI
            :model-value="editablePatient.phone"
            @update:model-value="emit('update:editablePatient', { ...editablePatient, phone: $event })"
            :country-code="editablePatient.countryCode"
            @update:country-code="emit('update:editablePatient', { ...editablePatient, countryCode: $event })"
            label="Telefone"
            required
          />
          <FormInput
            :model-value="editablePatient.email"
            @update:model-value="emit('update:editablePatient', { ...editablePatient, email: $event })"
            label="E-mail"
            placeholder="email@exemplo.com"
            type="email"
          />
          <StyledSelect
            :model-value="editablePatient.gender"
            @update:model-value="emit('update:editablePatient', { ...editablePatient, gender: $event })"
            label="Gênero"
            :options="genderOptions"
          />
        </div>
      </SectionCard>

      <SectionCard title="Endereço">
        <template #header>
          <div class="flex items-center gap-2">
            <MapPin class="h-5 w-5 text-primary" />
            <span class="font-semibold">Endereço</span>
          </div>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput :model-value="editablePatient.address?.cep" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, cep: $event } })" label="CEP" />
          <FormInput :model-value="editablePatient.address?.street" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, street: $event } })" label="Rua / Logradouro" />
          <FormInput :model-value="editablePatient.address?.number" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, number: $event } })" label="Número" />
          <FormInput :model-value="editablePatient.address?.complement" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, complement: $event } })" label="Complemento" />
          <FormInput :model-value="editablePatient.address?.district" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, district: $event } })" label="Bairro" />
          <FormInput :model-value="editablePatient.address?.city" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, city: $event } })" label="Cidade" />
          <FormInput :model-value="editablePatient.address?.state" @update:model-value="emit('update:editablePatient', { ...editablePatient, address: { ...editablePatient.address, state: $event } })" label="Estado" />
        </div>
      </SectionCard>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" @click="emit('cancel')">Cancelar</Button>
        <Button type="submit">Salvar Alterações</Button>
      </div>
    </form>

    <!-- View Mode -->
    <div v-else class="space-y-6">
      <SectionCard>
        <template #header>
          <div class="flex items-center gap-2">
            <ClipboardList class="h-5 w-5 text-primary" />
            <span class="font-semibold">Dados Pessoais</span>
          </div>
        </template>
        <KeyValueGrid :items="personalDataItems">
          <template #Telefone>
            <div class="flex items-center gap-2">
              <PatientPhoneDisplay :phone="patient.phone || ''" :country-code="patient.countryCode" />
              <span v-if="patient.isInvalidWhatsapp" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                <AlertTriangle class="h-3 w-3" />
                Inválido
              </span>
            </div>
          </template>
        </KeyValueGrid>
      </SectionCard>

      <Separator />

      <SectionCard>
        <template #header>
          <div class="flex items-center gap-2">
            <MapPin class="h-5 w-5 text-primary" />
            <span class="font-semibold">Endereço</span>
          </div>
        </template>
        <KeyValueGrid v-if="addressItems.length > 0" :items="addressItems" />
        <EmptyState 
          v-else 
          :icon="MapPin" 
          title="Endereço não cadastrado" 
          description="Clique em Editar para adicionar o endereço do paciente."
        />
      </SectionCard>

      <Separator />

      <SectionCard>
        <template #header>
          <div class="flex items-center gap-2">
            <History class="h-5 w-5 text-primary" />
            <span class="font-semibold">Histórico Recente</span>
          </div>
        </template>
        <div v-if="lastAppointment" class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase text-muted-foreground">Último Atendimento</p>
            <p class="font-medium">{{ formatSimpleDate(lastAppointment.startTime) }}</p>
          </div>
          <StatusBadge :status="lastAppointment.status" />
        </div>
        <EmptyState 
          v-else 
          :icon="History" 
          title="Nenhum atendimento anterior" 
          description="Este paciente ainda não possui atendimentos registrados."
        />
      </SectionCard>
    </div>
  </div>
</template>
