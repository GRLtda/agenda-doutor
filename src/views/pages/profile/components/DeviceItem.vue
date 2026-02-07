<script setup>
import { ref } from 'vue'
import { Monitor, Smartphone, Globe, Clock, XCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  isCurrent: Boolean
})

const emit = defineEmits(['revoke'])

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getDeviceIcon = (userAgent) => {
  if (!userAgent) return Monitor
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone
  }
  return Monitor
}

const getBrowserName = (userAgent) => {
  if (!userAgent) return 'Dispositivo Desconhecido'
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome')) return 'Google Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edge')) return 'Microsoft Edge'
  return 'Navegador'
}

const getOSName = (userAgent) => {
  if (!userAgent) return ''
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return ''
}
</script>

<template>
  <div 
    class="flex items-center gap-4 p-4 rounded-xl border transition-all"
    :class="[
      isCurrent ? 'bg-green-50/50 border-green-200 shadow-sm' : 'bg-card border-border hover:bg-accent/50 hover:shadow-sm'
    ]"
  >
    <!-- Icon -->
    <div 
      class="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 border"
      :class="isCurrent ? 'bg-white text-green-600 border-green-100' : 'bg-muted/50 text-muted-foreground border-border'"
    >
      <component :is="getDeviceIcon(session.device?.user_agent)" :size="24" />
    </div>
    
    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <span class="font-semibold text-foreground truncate">
          {{ getBrowserName(session.device?.user_agent) }}
          <span v-if="getOSName(session.device?.user_agent)" class="font-normal opacity-75">
             no {{ getOSName(session.device?.user_agent) }}
          </span>
        </span>
        <Badge 
          v-if="isCurrent" 
          variant="secondary" 
          class="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] font-bold uppercase tracking-wider"
        >
          Atual
        </Badge>
      </div>
      
      <div class="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
        <div class="flex items-center gap-1.5">
          <Globe :size="12" />
          <span>{{ session.device?.ip || 'IP não disponível' }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Clock :size="12" />
          <span>{{ formatDate(session.last_used_at || session.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <AlertDialog v-if="!isCurrent">
      <AlertDialogTrigger as-child>
        <Button variant="ghost" size="icon" class="text-muted-foreground hover:text-red-500 hover:bg-red-50 h-9 w-9">
          <XCircle :size="18" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar dispositivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso encerrará a sessão ativa neste dispositivo. O usuário precisará fazer login novamente para acessar a conta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            @click="$emit('revoke', session.id)" 
            variant="destructive"
          >
            Desconectar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
