<script setup lang="ts">
import { ref, onMounted, watchEffect, computed } from 'vue'
import { useBudgetsStore } from '@/stores/budgets'
import { useToast } from 'vue-toastification'
import { SectionCard, EmptyState } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, Plus, Eye, Send, Trash2, FileDown, Package } from 'lucide-vue-next'
import BudgetModal from '@/components/modals/BudgetModal.vue'

const STATUS_MAP: Record<string, { text: string; variant: string }> = {
  DRAFT: { text: 'Rascunho', variant: 'secondary' },
  SENT: { text: 'Enviado', variant: 'default' },
  APPROVED: { text: 'Aprovado', variant: 'success' },
  REJECTED: { text: 'Rejeitado', variant: 'destructive' },
  IMPORTED: { text: 'Importado', variant: 'outline' },
}

const props = defineProps<{
  patientId: string
}>()

const budgetsStore = useBudgetsStore()
const toast = useToast()

const showBudgetModal = ref(false)
const editingBudget = ref<any>(null)

onMounted(() => {
  budgetsStore.fetchBudgetsByPatient(props.patientId)
})

watchEffect(() => {
  if (props.patientId) {
    budgetsStore.fetchBudgetsByPatient(props.patientId)
  }
})

const budgets = computed(() => budgetsStore.budgets)
const isLoading = computed(() => budgetsStore.isLoading)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function handleCreateBudget() {
  editingBudget.value = null
  showBudgetModal.value = true
}

function handleEditBudget(budget: any) {
  editingBudget.value = budget
  showBudgetModal.value = true
}

function handleBudgetSaved() {
  showBudgetModal.value = false
  budgetsStore.fetchBudgetsByPatient(props.patientId)
}

async function handleSendWhatsApp(budget: any) {
  const result = await budgetsStore.sendBudgetWhatsApp(budget._id)
  if (result.success && result.url) {
    window.open(result.url, '_blank')
  } else {
    toast.error(result.error || 'Erro ao enviar por WhatsApp')
  }
}

async function handleDeleteBudget(budget: any) {
  if (!confirm('Tem certeza que deseja excluir este orçamento?')) return
  
  const result = await budgetsStore.deleteBudget(budget._id)
  if (result.success) {
    toast.success('Orçamento excluído com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao excluir orçamento')
  }
}

async function handleDownloadPdf(budget: any) {
  const result = await budgetsStore.downloadPdf(budget._id)
  if (!result.success) {
    toast.error(result.error || 'Erro ao baixar PDF')
  }
}

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || { text: status, variant: 'secondary' }
}
</script>

<template>
  <div class="p-6">
    <!-- Modal -->
    <BudgetModal
      v-if="showBudgetModal"
      :patient-id="patientId"
      :budget="editingBudget"
      @close="showBudgetModal = false"
      @saved="handleBudgetSaved"
    />

    <SectionCard accent>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <Receipt class="h-5 w-5 text-brand" />
            <span class="font-semibold">Orçamentos</span>
            <Badge variant="secondary">{{ budgets.length }}</Badge>
          </div>
          <Button @click="handleCreateBudget" class="bg-brand-gradient hover:opacity-90">
            <Plus class="h-4 w-4 mr-2" />
            Criar Orçamento
          </Button>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-center justify-between p-4 border rounded-lg">
          <div class="space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-24" />
          </div>
          <Skeleton class="h-6 w-20" />
        </div>
      </div>

      <!-- Budgets List -->
      <div v-else-if="budgets.length > 0" class="space-y-3">
        <Card v-for="budget in budgets" :key="budget._id" class="hover:shadow-md transition-shadow">
          <CardContent class="p-4">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <!-- Budget Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 flex-wrap">
                  <h4 class="font-semibold text-foreground">
                    {{ budget.name || 'Orçamento sem nome' }}
                  </h4>
                  <Badge 
                    :class="{
                      'badge-success': budget.status === 'APPROVED',
                      'badge-warning': budget.status === 'SENT',
                      'badge-error': budget.status === 'REJECTED',
                    }"
                    variant="secondary"
                  >
                    {{ getStatusInfo(budget.status).text }}
                  </Badge>
                </div>
                <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Package class="h-3.5 w-3.5" />
                    {{ budget.items?.length || 0 }} itens
                  </span>
                  <span>{{ formatDate(budget.createdAt) }}</span>
                </div>
              </div>

              <!-- Price -->
              <div class="text-right">
                <p class="text-lg font-bold text-brand">
                  {{ formatCurrency(budget.totalFinal) }}
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="handleEditBudget(budget)"
                  :disabled="budget.status === 'IMPORTED'"
                  title="Visualizar/Editar"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="handleDownloadPdf(budget)"
                  title="Baixar PDF"
                >
                  <FileDown class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  @click="handleSendWhatsApp(budget)"
                  title="Enviar WhatsApp"
                >
                  <Send class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-destructive hover:bg-destructive/10"
                  @click="handleDeleteBudget(budget)"
                  :disabled="budget.status === 'IMPORTED'"
                  title="Excluir"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else
        :icon="Receipt"
        title="Nenhum orçamento cadastrado"
        description="Crie orçamentos para o paciente e envie diretamente via WhatsApp."
        action-text="Criar Orçamento"
        @action="handleCreateBudget"
      />
    </SectionCard>
  </div>
</template>
