<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import { SectionCard, EmptyState } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileSignature, Plus, Copy, Eye, Clock, CheckCircle2 } from 'lucide-vue-next'
import AssignConsentTermModal from '@/components/pages/pacientes/modals/AssignConsentTermModal.vue'
import ViewConsentTermModal from '@/components/pages/pacientes/modals/ViewConsentTermModal.vue'

interface ConsentTerm {
  _id: string
  status: string
  template?: { name: string }
  createdAt: string
  patientAccessToken?: string
}

const props = defineProps<{
  patientId: string
}>()

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const isAssignModalOpen = ref(false)
const viewingTermId = ref<string | null>(null)

const patientTerms = computed(() => consentTermsStore.patientTerms as ConsentTerm[])
const isLoading = computed(() => consentTermsStore.isLoading)

onMounted(() => {
  consentTermsStore.fetchTermsForPatient(props.patientId)
})

watch(() => props.patientId, (newId) => {
  if (newId) {
    consentTermsStore.fetchTermsForPatient(newId)
  }
})

function openAssignModal() {
  isAssignModalOpen.value = true
}

function closeAssignModal() {
  isAssignModalOpen.value = false
}

function openViewModal(termId: string) {
  viewingTermId.value = termId
}

function closeViewModal() {
  viewingTermId.value = null
}

async function copyLink(token: string) {
  if (!token) return
  const link = `${window.location.origin}/termo/${token}`

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = link
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
    toast.info('Link copiado com sucesso!')
  } catch (err) {
    toast.error('Não foi possível copiar o link')
  }
}

function formatDate(date: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="p-6">
    <!-- Modals -->
    <AssignConsentTermModal
      v-if="isAssignModalOpen"
      :patient-id="patientId"
      @close="closeAssignModal"
    />

    <ViewConsentTermModal
      v-if="viewingTermId"
      :patient-id="patientId"
      :term-id="viewingTermId"
      @close="closeViewModal"
    />

    <SectionCard accent>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <FileSignature class="h-5 w-5 text-brand" />
            <span class="font-semibold">Termos de Consentimento</span>
            <Badge variant="secondary">{{ patientTerms.length }}</Badge>
          </div>
          <Button @click="openAssignModal" class="bg-brand-gradient hover:opacity-90">
            <Plus class="h-4 w-4 mr-2" />
            Enviar Termo
          </Button>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-center justify-between p-4 border rounded-lg">
          <div class="space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-32" />
          </div>
          <Skeleton class="h-8 w-20" />
        </div>
      </div>

      <!-- Terms List -->
      <div v-else-if="patientTerms.length > 0" class="space-y-3">
        <Card 
          v-for="term in patientTerms" 
          :key="term._id" 
          :class="[
            'hover:shadow-md transition-shadow',
            term.status === 'Assinado' ? 'border-l-4 border-l-green-500' : ''
          ]"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <!-- Term Info -->
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-foreground">
                  {{ term.template?.name || 'Termo' }}
                </h4>
                <div class="flex items-center gap-4 mt-2 text-sm">
                  <span class="text-muted-foreground">
                    Enviado em {{ formatDate(term.createdAt) }}
                  </span>
                  <Badge 
                    :class="{
                      'badge-warning': term.status === 'Pendente',
                      'badge-success': term.status === 'Assinado',
                    }"
                    class="flex items-center gap-1"
                  >
                    <Clock v-if="term.status === 'Pendente'" class="h-3 w-3" />
                    <CheckCircle2 v-else class="h-3 w-3" />
                    {{ term.status }}
                  </Badge>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <Button
                  v-if="term.status === 'Pendente' && term.patientAccessToken"
                  variant="outline"
                  size="sm"
                  @click="copyLink(term.patientAccessToken)"
                >
                  <Copy class="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openViewModal(term._id)"
                >
                  <Eye class="h-4 w-4 mr-2" />
                  Ver
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else
        :icon="FileSignature"
        title="Nenhum termo de consentimento atribuído"
        description="Envie termos de consentimento para o paciente assinar digitalmente."
        action-text="Enviar Termo"
        @action="openAssignModal"
      />
    </SectionCard>
  </div>
</template>
