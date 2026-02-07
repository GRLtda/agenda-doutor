<script setup lang="js">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, MessageCircle, FileText, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps({
  subscription: Object,
  actionLoading: Boolean,
  isTrialActive: Boolean
})

const emit = defineEmits(['update-payment', 'view-invoice', 'need-help'])
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Ações</h3>
    <div class="grid gap-4 md:grid-cols-3">
      <!-- Manage Subscription -->
      <Card 
        class="cursor-pointer hover:bg-muted/50 transition-colors"
        :class="{ 'opacity-50 pointer-events-none': isTrialActive }"
        @click="!isTrialActive && $emit('update-payment')"
      >
        <CardHeader class="flex flex-row items-center space-y-0 pb-2">
            <div class="p-2 bg-primary/10 rounded-full">
                <Edit3 class="h-4 w-4 text-primary" />
            </div>
        </CardHeader>
        <CardContent>
           <h4 class="font-semibold">Gerenciar Assinatura</h4>
           <p class="text-sm text-muted-foreground mt-1">
             {{ isTrialActive ? 'Disponível após o período de teste' : 'Atualize pagamento e preferências' }}
           </p>
        </CardContent>
      </Card>

      <!-- Need Help -->
      <Card 
        class="cursor-pointer hover:bg-muted/50 transition-colors"
        @click="$emit('need-help')"
      >
        <CardHeader class="flex flex-row items-center space-y-0 pb-2">
            <div class="p-2 bg-emerald-100 rounded-full">
                <MessageCircle class="h-4 w-4 text-emerald-700" />
            </div>
        </CardHeader>
         <CardContent>
           <h4 class="font-semibold">Preciso de Ajuda</h4>
           <p class="text-sm text-muted-foreground mt-1">
             Fale conosco via WhatsApp
           </p>
        </CardContent>
      </Card>

      <!-- View Receipt -->
      <Card 
        v-if="subscription?.status === 'active'"
        class="cursor-pointer hover:bg-muted/50 transition-colors"
        @click="$emit('view-invoice')"
      >
         <CardHeader class="flex flex-row items-center space-y-0 pb-2">
            <div class="p-2 bg-blue-100 rounded-full">
                <FileText class="h-4 w-4 text-blue-700" />
            </div>
        </CardHeader>
         <CardContent>
           <h4 class="font-semibold">Ver Comprovante</h4>
           <p class="text-sm text-muted-foreground mt-1">
             Visualize sua última fatura
           </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
