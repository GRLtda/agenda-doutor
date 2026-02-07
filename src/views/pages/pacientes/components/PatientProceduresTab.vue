<script setup lang="ts">
import { SectionCard, EmptyState, ListItemRow, MoneyDisplay } from '@/components/shared'
import { Stethoscope } from 'lucide-vue-next'

interface Procedure {
  _id: string
  name: string
  assignedAt?: string
  originalValue?: number
  finalValue: number
  discountPercentage?: number
}

defineProps<{
  procedures: Procedure[]
}>()

function formatSimpleDate(dateString: string | undefined): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="p-6">
    <SectionCard>
      <template #header>
        <div class="flex items-center gap-2">
          <Stethoscope class="h-5 w-5 text-primary" />
          <span class="font-semibold">Procedimentos Realizados</span>
        </div>
      </template>

      <div v-if="procedures && procedures.length > 0" class="space-y-3">
        <ListItemRow
          v-for="proc in procedures"
          :key="proc._id"
          :title="proc.name"
          :subtitle="formatSimpleDate(proc.assignedAt)"
        >
          <template #value>
            <MoneyDisplay
              :value="proc.finalValue"
              :original-value="proc.originalValue"
              :discount-percentage="proc.discountPercentage"
            />
          </template>
        </ListItemRow>
      </div>

      <EmptyState 
        v-else 
        :icon="Stethoscope" 
        title="Nenhum procedimento registrado"
        description="Adicione procedimentos ao paciente para manter o histórico financeiro e clínico."
      />
    </SectionCard>
  </div>
</template>
