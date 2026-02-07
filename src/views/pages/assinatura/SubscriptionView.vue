<script setup lang="js">
import { ref, onMounted, computed } from 'vue'
import { useClinicStore } from '@/stores/clinic'
import { useAuthStore } from '@/stores/auth'
import { AlertTriangle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

import SubscriptionHeader from './components/SubscriptionHeader.vue'
import SubscriptionStatusCard from './components/SubscriptionStatusCard.vue'
import SubscriptionPlanCard from './components/SubscriptionPlanCard.vue'
import SubscriptionPaymentMethodCard from './components/SubscriptionPaymentMethodCard.vue'
import SubscriptionActions from './components/SubscriptionActions.vue'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const clinicStore = useClinicStore()
const authStore = useAuthStore()

const loading = ref(true)
const subscription = ref(null)
const error = ref(null)
const actionLoading = ref(false)
const showCancelModal = ref(false)

const isTrialActive = computed(() => authStore.user?.planStatus?.trial?.isActive)
const trialDaysRemaining = computed(() => authStore.user?.planStatus?.trial?.daysRemaining)

const fetchSubscription = async () => {
  try {
    loading.value = true
    const response = await clinicStore.getSubscriptionStatus()
    if (response.success) {
      subscription.value = response.data
    } else {
      throw new Error(response.error)
    }
  } catch (err) {
    console.error('Erro ao carregar assinatura:', err)
    error.value = 'Não foi possível carregar os detalhes da assinatura.'
  } finally {
    loading.value = false
  }
}

const handleCancelSubscription = async () => {
  try {
    actionLoading.value = true
    const response = await clinicStore.cancelSubscription()
    
    if (response.success) {
      showCancelModal.value = false
      await fetchSubscription()
      // Idealmente usar toast aqui
      alert('Assinatura cancelada com sucesso! Você terá acesso até o final do período atual.')
    } else {
      alert(response.error || 'Erro ao cancelar assinatura')
    }
  } catch (err) {
    console.error('Erro ao cancelar:', err)
    alert('Erro ao cancelar assinatura. Tente novamente.')
  } finally {
    actionLoading.value = false
  }
}

const handleUpdatePayment = async () => {
  try {
    actionLoading.value = true
    const response = await clinicStore.createPortalSession()
    
    if (response.success && response.data.url) {
      window.location.href = response.data.url
    } else {
      alert(response.error || 'Erro ao acessar portal de pagamento')
    }
  } catch (err) {
    console.error('Erro ao abrir portal:', err)
    alert('Erro ao acessar portal de pagamento. Tente novamente.')
  } finally {
    actionLoading.value = false
  }
}

const handleNeedHelp = () => {
  const message = encodeURIComponent('Olá! Preciso de ajuda com minha assinatura.')
  const whatsappNumber = '5511921923978'
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
}

const handleReactivateSubscription = async () => {
  try {
    actionLoading.value = true
    // Redireciona para o checkout para criar nova assinatura
    const response = await clinicStore.createPortalSession()
    
    if (response.success && response.data.url) {
      window.location.href = response.data.url
    } else {
      alert(response.error || 'Erro ao acessar portal de pagamento')
    }
  } catch (err) {
    console.error('Erro ao reativar:', err)
    alert('Erro ao reativar assinatura. Tente novamente.')
  } finally {
    actionLoading.value = false
  }
}

const handleViewInvoice = async () => {
  try {
    actionLoading.value = true
    const response = await clinicStore.getLatestInvoice()
    
    if (response.success && response.data.invoiceUrl) {
      window.open(response.data.invoiceUrl, '_blank')
    } else {
      alert(response.error || 'Erro ao buscar comprovante')
    }
  } catch (err) {
    console.error('Erro ao buscar comprovante:', err)
    alert('Erro ao buscar comprovante. Tente novamente.')
  } finally {
    actionLoading.value = false
  }
}

const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

onMounted(() => {
  fetchSubscription()
})
</script>

<template>
  <div class="container py-10 mx-auto max-w-7xl animate-fade-in">
    <SubscriptionHeader />

    <div v-if="error" class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6 flex items-start gap-4">
       <AlertTriangle class="h-5 w-5 mt-0.5" />
       <div>
         <h3 class="font-medium">Ops, algo deu errado</h3>
         <p class="text-sm opacity-90 mb-2">{{ error }}</p>
         <Button variant="outline" size="sm" @click="fetchSubscription" class="border-destructive/20 hover:bg-destructive/20">
           Tentar Novamente
         </Button>
       </div>
    </div>

    <div class="grid gap-6 md:grid-cols-3 mb-8">
      <SubscriptionStatusCard 
        :subscription="subscription"
        :loading="loading"
        :is-trial-active="isTrialActive"
        :trial-days-remaining="trialDaysRemaining"
        :action-loading="actionLoading"
        @reactivate="handleReactivateSubscription"
      />
      
      <SubscriptionPlanCard 
        :subscription="subscription" 
        :loading="loading"
      />

      <SubscriptionPaymentMethodCard 
        :subscription="subscription" 
        :loading="loading"
      />
    </div>

    <SubscriptionActions 
      v-if="!loading && !error"
      :subscription="subscription"
      :action-loading="actionLoading"
      :is-trial-active="isTrialActive"
      @update-payment="handleUpdatePayment"
      @need-help="handleNeedHelp"
      @view-invoice="handleViewInvoice"
    />

    <!-- Cancel Confirmation Modal -->
     <Dialog v-model:open="showCancelModal">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancelar Assinatura</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja cancelar sua assinatura?
            <br/><br/>
            <span class="font-medium text-destructive">
               Você terá acesso até o final do período atual ({{ formatDate(subscription?.currentPeriodEnd) }}).
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showCancelModal = false">
            Voltar
          </Button>
           <Button variant="destructive" @click="handleCancelSubscription" :disabled="actionLoading">
            {{ actionLoading ? 'Cancelando...' : 'Confirmar Cancelamento' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>
