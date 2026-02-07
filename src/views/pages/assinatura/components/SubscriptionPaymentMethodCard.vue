<script setup lang="js">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, AlertTriangle, AlertCircle } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps({
  subscription: Object,
  loading: Boolean
})

const getCardIconUrl = (brand) => {
  if (!brand) return null
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '-')
  return `https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/c2df917e4879ecba8e84a85c947ee7ee9dc5747d/flat-rounded/${normalizedBrand}.svg`
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium">Forma de Pagamento</CardTitle>
      <CreditCard class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-4">
        <Skeleton class="h-12 w-full rounded-md" />
        <Skeleton class="h-4 w-2/3" />
      </div>

      <div v-else>
        <div v-if="subscription?.card" class="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
          <div class="shrink-0 w-12 h-8 flex items-center justify-center bg-white rounded border">
             <img 
               v-if="getCardIconUrl(subscription.card.brand)" 
               :src="getCardIconUrl(subscription.card.brand)" 
               :alt="subscription.card.brand"
               class="h-full w-full object-contain"
             />
             <CreditCard v-else class="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p class="text-sm font-medium">•••• •••• •••• {{ subscription.card.last4 }}</p>
            <p class="text-xs text-muted-foreground">Expira em {{ subscription.card.expMonth }}/{{ subscription.card.expYear }}</p>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
          <CreditCard class="h-8 w-8 mb-2 opacity-50" />
          <p class="text-sm">Nenhum cartão vinculado</p>
        </div>

        <div v-if="subscription?.lastPaymentFailure?.reason" class="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-800">
           <div class="flex items-center gap-2 font-medium mb-1">
             <AlertCircle class="h-4 w-4" />
             Falha no Pagamento
           </div>
           <p>{{ subscription.lastPaymentFailure.reason }}</p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
