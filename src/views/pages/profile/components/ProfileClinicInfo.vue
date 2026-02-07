<script setup>
import { computed } from 'vue'
import { Building2, ShieldCheck, User, MapPin } from 'lucide-vue-next'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const props = defineProps({
  clinic: {
    type: Object,
    default: null
  },
  loading: Boolean
})

const planLabels = {
  basic: 'Básico',
  premium: 'Premium',
  enterprise: 'Enterprise',
  enterprise_plus: 'Enterprise Plus',
  lifetime: 'Vitalício'
}

const planVariant = computed(() => {
  switch (props.clinic?.plan) {
    case 'basic': return 'secondary'
    case 'premium': return 'default' 
    case 'enterprise': return 'default' 
    default: return 'outline'
  }
})
</script>

<template>
  <Card class="h-full border-border">
    <CardHeader class="pb-4">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <CardTitle class="text-xl">{{ clinic?.name || 'Minha Clínica' }}</CardTitle>
          <CardDescription>Informações institucionais e plano contratado</CardDescription>
        </div>
        <Badge :variant="planVariant" class="uppercase tracking-wider font-bold">
          {{ planLabels[clinic?.plan] || clinic?.plan || 'Gratuito' }}
        </Badge>
      </div>
    </CardHeader>
    
    <Separator />
    
    <CardContent class="pt-6">
      <div v-if="clinic" class="space-y-6">
        <!-- Branding Identity -->
        <div class="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-dashed border-border">
          <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-background flex items-center justify-center">
            <img 
              v-if="clinic.logoUrl" 
              :src="clinic.logoUrl" 
              :alt="clinic.name"
              class="h-full w-full object-cover"
            />
            <Building2 v-else class="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">Identidade Visual</h3>
            <p class="text-sm text-muted-foreground">Logo utilizada em documentos e área do paciente</p>
          </div>
        </div>

        <div class="grid gap-6">
          <!-- CNPJ -->
          <div class="grid gap-2">
            <div class="text-xs font-semibold uppercase text-muted-foreground tracking-wide">CNPJ</div>
            <div class="flex items-center gap-3 p-3 rounded-md border bg-card">
              <ShieldCheck class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">{{ clinic.cnpj || 'Não informado' }}</span>
            </div>
          </div>

          <!-- Responsável -->
          <div class="grid gap-2">
            <div class="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Responsável Técnico</div>
            <div class="flex items-center gap-3 p-3 rounded-md border bg-card">
              <User class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">{{ clinic.responsibleName || 'Não informado' }}</span>
            </div>
          </div>

          <!-- Localização -->
          <div class="grid gap-2">
             <div class="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Localização</div>
             <div class="flex items-center gap-3 p-3 rounded-md border bg-card">
              <MapPin class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">
                {{ clinic.address?.city || 'Cidade não informada' }}
                {{ clinic.address?.state ? ` - ${clinic.address.state}` : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Building2 class="h-10 w-10 mb-3 opacity-20" />
        <p>Nenhuma informação de clínica vinculada.</p>
      </div>
    </CardContent>
  </Card>
</template>
