<script setup>
import { ref, onMounted, computed } from 'vue'
import { LogOut, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
import DeviceItem from './DeviceItem.vue'

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

const sessions = ref([])
const isLoading = ref(true)

const currentSessionId = computed(() => {
  return sessions.value.find(s => s.is_current)?.id
})

const fetchSessions = async () => {
  isLoading.value = true
  try {
    const result = await authStore.getSessions()
    if (result.success) {
      sessions.value = result.sessions || []
    } else {
      toast.error(result.error || 'Erro ao carregar sessões')
    }
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    toast.error('Erro ao buscar sessões')
  } finally {
    isLoading.value = false
  }
}

const handleRevokeSession = async (sessionId) => {
  try {
    const result = await authStore.revokeSession(sessionId)
    if (result.success) {
      toast.success('Dispositivo desconectado com sucesso')
      await fetchSessions()
    } else {
      toast.error(result.error || 'Erro ao desconectar dispositivo')
    }
  } catch (error) {
    toast.error('Erro ao tentar desconectar')
  }
}

const handleLogoutAll = async () => {
  try {
    const result = await authStore.logoutAll()
    if (result.success) {
      toast.info('Todas as sessões foram encerradas.')
      router.push({ name: 'login' })
    } else {
      toast.error(result.error || 'Erro ao encerrar sessões')
    }
  } catch (error) {
    toast.error('Erro crítico ao tentar sair de todos os dispositivos')
  }
}

onMounted(() => {
  fetchSessions()
})
</script>

<template>
  <Card class="h-full border-border shadow-sm flex flex-col">
    <CardHeader class="pb-4 shrink-0">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <CardTitle class="text-xl">Dispositivos Conectados</CardTitle>
          <CardDescription>Gerencie as sessões ativas na sua conta</CardDescription>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button variant="destructive" size="sm" class="h-9 gap-2">
              <LogOut :size="14" />
              Sair de todos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair de todos os dispositivos?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação encerrará sua sessão em todos os dispositivos conectados, incluindo este. Você precisará fazer login novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction @click="handleLogoutAll" variant="destructive">
                Sair de todos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CardHeader>
    
    <Separator class="shrink-0" />
    
    <CardContent class="p-0 flex-1 min-h-[300px]">
      <ScrollArea class="h-[400px] w-full p-6">
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-4 rounded-xl border border-border">
            <Skeleton class="h-12 w-12 rounded-lg" />
            <div class="space-y-2 flex-1">
              <Skeleton class="h-5 w-1/3" />
              <Skeleton class="h-3 w-1/2" />
            </div>
          </div>
        </div>

        <div v-else-if="sessions.length > 0" class="space-y-4">
          <DeviceItem
            v-for="session in sessions"
            :key="session.id"
            :session="session"
            :is-current="session.is_current"
            @revoke="handleRevokeSession"
          />
        </div>

        <div v-else class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <AlertTriangle class="h-10 w-10 mb-3 opacity-20" />
          <p>Nenhuma sessão ativa encontrada.</p>
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>
