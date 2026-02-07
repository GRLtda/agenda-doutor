<script setup lang="js">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Package, Shield, Clock, Info } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import choroEmoji from '@/assets/imgs/choro_emoji.png'

const props = defineProps({
  subscription: Object,
  loading: Boolean,
  isTrialActive: Boolean,
  trialDaysRemaining: Number,
  actionLoading: Boolean
})

const emit = defineEmits(['reactivate'])

const statusMap = {
  active: { label: 'Ativa', variant: 'success', icon: CheckCircle, class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  past_due: { label: 'Pagamento Pendente', variant: 'warning', icon: AlertTriangle, class: 'bg-amber-100 text-amber-800 border-amber-200' },
  canceled: { label: 'Cancelada', variant: 'secondary', icon: AlertTriangle, class: 'bg-slate-100 text-slate-800 border-slate-200' },
  trialing: { label: 'Período de Teste', variant: 'default', icon: Clock, class: 'bg-blue-100 text-blue-800 border-blue-200' },
  free: { label: 'Gratuito', variant: 'outline', icon: Package, class: 'bg-slate-50 text-slate-600 border-slate-200' },
  enterprise: { label: 'Enterprise', variant: 'default', icon: Shield, class: 'bg-purple-100 text-purple-800 border-purple-200' },
  enterprise_plus: { label: 'Enterprise Plus', variant: 'default', icon: Shield, class: 'bg-purple-100 text-purple-800 border-purple-200' },
  lifetime: { label: 'Vitalício', variant: 'success', icon: CheckCircle, class: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
}

const currentStatus = computed(() => {
  if (!props.subscription) return statusMap.free
  if (props.subscription.planType === 'enterprise') return statusMap.enterprise
  if (props.subscription.planType === 'enterprise_plus') return statusMap.enterprise_plus
  const status = props.subscription.status || 'free'
  return statusMap[status] || statusMap.free
})

const isCanceled = computed(() => {
  if (props.subscription?.planType === 'enterprise') return false
  if (props.subscription?.planType === 'enterprise_plus') return false
  return props.subscription?.status === 'canceled' || !!props.subscription?.cancelAt
})

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium">Status Atual</CardTitle>
      <component :is="currentStatus.icon" class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-8 w-24" />
        <Skeleton class="h-4 w-full" />
      </div>
      
      <div v-else>
        <div class="flex items-center gap-2 mb-2">
          <Badge :class="currentStatus.class" variant="outline" class="text-sm px-2 py-0.5 font-semibold">
            {{ currentStatus.label }}
          </Badge>
        </div>
        
        <p v-if="isCanceled && subscription?.cancelAt" class="text-xs text-muted-foreground">
          Termina em {{ formatDate(subscription.cancelAt) }}
        </p>

        <div v-if="isTrialActive" class="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-900">
          <div class="flex items-center gap-2 font-medium mb-1 text-blue-700">
            <Info class="h-4 w-4" />
            Período de Teste Ativo
          </div>
          <p>Faltam <strong>{{ trialDaysRemaining }} dias</strong>. A cobrança iniciará automaticamente ao fim do período.</p>
        </div>

        <div v-if="isCanceled" class="mt-4 flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-md">
           <img :src="choroEmoji" alt="Triste" class="h-8 w-8 grayscale opacity-80" />
           <div>
             <p class="text-sm text-muted-foreground mb-2">Sua assinatura foi cancelada.</p>
             <button 
                @click="$emit('reactivate')" 
                :disabled="actionLoading"
                class="text-sm font-medium text-primary hover:underline disabled:opacity-50"
             >
               {{ actionLoading ? 'Carregando...' : 'Reativar Assinatura' }}
             </button>
           </div>
        </div>

        <div v-else-if="subscription?.startDate" class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Shield class="h-3 w-3" />
          Membro desde {{ formatDate(subscription.startDate) }}
        </div>
      </div>
    </CardContent>
  </Card>
</template>
