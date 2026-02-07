<script setup lang="ts">
import { SectionCard, EmptyState, ListItemRow } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckSquare, FileText, Copy, FileDown, Loader2, Clipboard, ClipboardCheck, ClipboardPlus } from 'lucide-vue-next'

interface Anamnesis {
  _id: string
  template?: { name?: string }
  updatedAt?: string
  patientAccessToken?: string
  patientAccessTokenExpires?: string
}

defineProps<{
  answeredAnamneses: Anamnesis[]
  pendingAnamneses: Anamnesis[]
  generatingPdfId: string | null
}>()

const emit = defineEmits<{
  (e: 'view', item: Anamnesis): void
  (e: 'copy-link', token: string): void
  (e: 'generate-pdf', item: Anamnesis): void
  (e: 'assign'): void
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
  <div class="p-6 space-y-8">
    <!-- Answered Anamneses -->
    <SectionCard>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <CheckSquare class="h-5 w-5 text-primary" />
            <span class="font-semibold">Respondidas</span>
            <Badge v-if="answeredAnamneses.length > 0" variant="secondary">
              {{ answeredAnamneses.length }}
            </Badge>
          </div>
        </div>
      </template>

      <div v-if="answeredAnamneses.length > 0" class="space-y-3">
        <ListItemRow
          v-for="item in answeredAnamneses"
          :key="item._id"
          :title="item.template?.name || 'Modelo não encontrado'"
          :subtitle="`Respondida em ${formatSimpleDate(item.updatedAt)}`"
          clickable
          @click="emit('view', item)"
        >
          <template #actions>
            <Button
              variant="ghost"
              size="icon"
              :disabled="generatingPdfId !== null"
              @click.stop="emit('generate-pdf', item)"
              :title="generatingPdfId === item._id ? 'Gerando PDF...' : 'Baixar PDF'"
            >
              <Loader2 v-if="generatingPdfId === item._id" class="h-4 w-4 animate-spin" />
              <FileDown v-else class="h-4 w-4" />
            </Button>
          </template>
        </ListItemRow>
      </div>

      <EmptyState 
        v-else 
        :icon="ClipboardCheck" 
        title="Nenhuma anamnese respondida" 
        description="As anamneses preenchidas pelo paciente aparecerão aqui."
      />
    </SectionCard>

    <!-- Pending Anamneses -->
    <SectionCard>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <FileText class="h-5 w-5 text-primary" />
            <span class="font-semibold">Pendentes</span>
            <Badge v-if="pendingAnamneses.length > 0" variant="outline">
              {{ pendingAnamneses.length }}
            </Badge>
          </div>
        </div>
      </template>

      <div v-if="pendingAnamneses.length > 0" class="space-y-3">
        <ListItemRow
          v-for="item in pendingAnamneses"
          :key="item._id"
          :title="item.template?.name || 'Modelo não encontrado'"
          :subtitle="`Vence em ${formatSimpleDate(item.patientAccessTokenExpires)}`"
        >
          <template #actions>
            <Button
              variant="ghost"
              size="icon"
              @click.stop="emit('copy-link', item.patientAccessToken || '')"
              title="Copiar link de resposta"
            >
              <Copy class="h-4 w-4" />
            </Button>
          </template>
        </ListItemRow>
      </div>

      <EmptyState 
        v-else 
        :icon="ClipboardPlus" 
        title="Nenhuma anamnese pendente"
        description="Aplique um modelo de anamnese para gerar um link de resposta."
      >
        <template #action>
          <Button variant="outline" @click="emit('assign')">
            <Clipboard class="h-4 w-4 mr-2" />
            Aplicar Anamnese
          </Button>
        </template>
      </EmptyState>
    </SectionCard>
  </div>
</template>
