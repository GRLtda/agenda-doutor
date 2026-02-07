<script setup lang="ts">
import { SectionCard, EmptyState, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  History, Calendar, Hash, Activity, Briefcase, Syringe,
  Play, RotateCcw, Eye, Trash2, CalendarPlus 
} from 'lucide-vue-next'

interface Procedure {
  _id: string
  name: string
  finalValue: number
}

interface Appointment {
  _id: string
  startTime: string
  status: string
  type?: string
  procedures?: Procedure[]
}

defineProps<{
  appointments: Appointment[]
  loading?: boolean
  reopeningId: string | null
}>()

const emit = defineEmits<{
  (e: 'open', item: Appointment): void
  (e: 'reopen', item: Appointment): void
  (e: 'delete', item: Appointment): void
  (e: 'create'): void
}>()

function formatSimpleDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getTotalValue(procedures?: Procedure[]): number {
  if (!procedures || procedures.length === 0) return 0
  return procedures.reduce((sum, p) => sum + (p.finalValue || 0), 0)
}
</script>

<template>
  <div class="p-6">
    <SectionCard>
      <template #header>
        <div class="flex items-center gap-2">
          <History class="h-5 w-5 text-primary" />
          <span class="font-semibold">Histórico de Atendimentos</span>
        </div>
      </template>

      <!-- Loading -->
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" class="h-48 rounded-lg" />
      </div>

      <!-- Appointments Grid -->
      <div v-else-if="appointments.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          v-for="item in appointments" 
          :key="item._id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="emit('open', item)"
        >
          <CardContent class="p-4 space-y-4">
            <!-- Header: Date + Value -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-1.5 text-muted-foreground">
                <Calendar class="h-3.5 w-3.5" />
                <span>{{ formatSimpleDate(item.startTime) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span :class="['font-medium', getTotalValue(item.procedures) === 0 ? 'text-muted-foreground' : 'text-emerald-600']">
                  {{ formatCurrency(getTotalValue(item.procedures)) }}
                </span>
                <span class="text-muted-foreground">•</span>
                <span class="text-xs text-muted-foreground flex items-center gap-1">
                  <Syringe class="h-3 w-3" />
                  {{ item.procedures?.length || 0 }} proc.
                </span>
              </div>
            </div>

            <!-- Info Rows -->
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground flex items-center gap-1.5">
                  <Hash class="h-3.5 w-3.5" /> ID
                </span>
                <span class="font-mono text-xs">#{{ item._id.slice(-6).toUpperCase() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground flex items-center gap-1.5">
                  <Activity class="h-3.5 w-3.5" /> Status
                </span>
                <StatusBadge :status="item.status" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground flex items-center gap-1.5">
                  <Briefcase class="h-3.5 w-3.5" /> Tipo
                </span>
                <span>{{ item.type || 'Consulta' }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-2 border-t">
              <div class="flex items-center gap-2">
                <!-- Continue for Iniciado -->
                <router-link
                  v-if="item.status === 'Iniciado'"
                  :to="`/atendimentos/${item._id}/patient/${$route.params.id}`"
                  @click.stop
                >
                  <Button size="sm" class="gap-1.5">
                    <Play class="h-3.5 w-3.5" />
                    Continuar
                  </Button>
                </router-link>

                <!-- Reopen for Realizado -->
                <Button
                  v-if="item.status === 'Realizado'"
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  :disabled="reopeningId === item._id"
                  @click.stop="emit('reopen', item)"
                >
                  <RotateCcw :class="['h-3.5 w-3.5', { 'animate-spin': reopeningId === item._id }]" />
                  {{ reopeningId === item._id ? 'Reabrindo...' : 'Reabrir' }}
                </Button>

                <!-- View Report for Realizado -->
                <router-link
                  v-if="item.status === 'Realizado'"
                  :to="`/atendimentos/${item._id}/patient/${$route.params.id}`"
                  @click.stop
                >
                  <Button size="sm" class="gap-1.5">
                    <Eye class="h-3.5 w-3.5" />
                    Ver Relatório
                  </Button>
                </router-link>
              </div>

              <Button
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10"
                :disabled="reopeningId === item._id"
                @click.stop="emit('delete', item)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Empty State -->
      <EmptyState 
        v-else 
        :icon="History" 
        title="Nenhum histórico encontrado"
        description="Este paciente ainda não possui atendimentos registrados."
      >
        <template #action>
          <Button variant="outline" @click="emit('create')">
            <CalendarPlus class="h-4 w-4 mr-2" />
            Agendar Atendimento
          </Button>
        </template>
      </EmptyState>
    </SectionCard>
  </div>
</template>
