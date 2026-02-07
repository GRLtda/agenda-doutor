<script setup lang="js">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Package } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps({
  subscription: Object,
  loading: Boolean
})

const formatCurrency = (amount, currency) => {
  if (!amount && amount !== 0) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

const planName = computed(() => {
  if (!props.subscription) return 'Carregando...'
  const type = props.subscription.planType
  if (type === 'basic') return 'Básico'
  if (type === 'premium') return 'Premium'
  if (type === 'enterprise') return 'Enterprise'
  if (type === 'enterprise_plus') return 'Enterprise Plus'
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Básico'
})
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium">Seu Plano</CardTitle>
      <Package class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-4">
         <Skeleton class="h-8 w-32" />
         <Skeleton class="h-4 w-full" />
         <Skeleton class="h-4 w-2/3" />
      </div>

      <div v-else>
        <div class="text-2xl font-bold">
             <template v-if="subscription?.status === 'lifetime'">
               R$ 297,00 <span class="text-sm font-normal text-muted-foreground">/ único</span>
            </template>
            <template v-else-if="subscription?.planType === 'enterprise'">
               R$ 199,00 <span class="text-sm font-normal text-muted-foreground">/ mês</span>
            </template>
             <template v-else-if="subscription?.planType === 'enterprise_plus'">
               R$ 359,00 <span class="text-sm font-normal text-muted-foreground">/ mês</span>
            </template>
            <template v-else-if="subscription?.planType === 'premium'">
               R$ 159,00 <span class="text-sm font-normal text-muted-foreground">/ mês</span>
            </template>
            <template v-else-if="subscription?.planType === 'basic' && subscription?.status !== 'free'">
               R$ 99,90 <span class="text-sm font-normal text-muted-foreground">/ mês</span>
            </template>
            <template v-else-if="subscription?.plan && typeof subscription.plan === 'object'">
              {{ subscription.plan.currency.toUpperCase() }} {{ formatCurrency(subscription.plan.amount, subscription.plan.currency).replace('R$', '').trim() }}
              <span class="text-sm font-normal text-muted-foreground">/ {{ subscription.plan.interval === 'month' ? 'mês' : 'ano' }}</span>
            </template>
            <template v-else>
               Grátis
            </template>
        </div>
        <p class="text-xs text-muted-foreground mt-1">{{ planName }}</p>

        <div class="mt-4 space-y-2">
            <div class="flex items-center text-sm text-muted-foreground">
                <CheckCircle class="mr-2 h-4 w-4 text-emerald-500" /> Acesso total ao sistema
            </div>
             <div class="flex items-center text-sm text-muted-foreground">
                <CheckCircle class="mr-2 h-4 w-4 text-emerald-500" /> Suporte prioritário via WhatsApp
            </div>
             <div class="flex items-center text-sm text-muted-foreground">
                <CheckCircle class="mr-2 h-4 w-4 text-emerald-500" /> Backup automático
            </div>
        </div>

        <!-- Installation Fee Notice -->
        <div v-if="(subscription?.status === 'free' || !subscription?.installationFeeCharged) && subscription?.planType !== 'enterprise' && subscription?.status !== 'lifetime' && subscription?.planType !== 'basic'" class="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
            <div class="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1">
                <AlertTriangle class="h-4 w-4" /> Taxa de Instalação
            </div>
            <p class="text-xs text-amber-700">
               Primeira mensalidade: <strong>{{ subscription?.plan ? formatCurrency(subscription.plan.amount + 10000, subscription.plan.currency) : 'R$ 149,00' }}</strong>
            </p>
             <p class="text-xs text-amber-700 opacity-80 mt-1">
               Próximas: {{ subscription?.plan ? formatCurrency(subscription.plan.amount, subscription.plan.currency) : 'R$ 49,00' }}
            </p>
        </div>

        <div v-else-if="subscription?.installationFeeCharged" class="mt-4 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-md text-sm text-emerald-700">
            <CheckCircle class="h-4 w-4" /> Taxa de instalação já paga
        </div>

      </div>
    </CardContent>
  </Card>
</template>
