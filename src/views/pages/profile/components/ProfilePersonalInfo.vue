<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { User, Mail, Calendar, Briefcase, Pencil, Check, X, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  loading: Boolean
})

const emit = defineEmits(['update'])

const authStore = useAuthStore()
const toast = useToast()

const isEditing = ref(false)
const isSaving = ref(false)

const formData = reactive({
  name: '',
  email: ''
})

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  employee: 'Funcionário',
  staff: 'Equipe'
}

const clinic = computed(() => authStore.user?.clinic)

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

// Watch user to update form data when it changes or when editing starts
watch(() => props.user, (newUser) => {
  if (newUser && !isEditing.value) {
    formData.name = newUser.name
    formData.email = newUser.email
  }
}, { immediate: true })

const startEditing = () => {
  formData.name = props.user?.name || ''
  formData.email = props.user?.email || ''
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  formData.name = props.user?.name || ''
  formData.email = props.user?.email || ''
}

const saveProfile = async () => {
  if (!formData.name || !formData.email) {
    toast.error('Nome e email são obrigatórios')
    return
  }

  isSaving.value = true
  const result = await authStore.updateProfile({
    name: formData.name,
    email: formData.email
  })
  isSaving.value = false

  if (result.success) {
    toast.success('Perfil atualizado com sucesso!')
    isEditing.value = false
    emit('update')
  } else {
    toast.error(result.error)
  }
}
</script>

<template>
  <Card class="h-full border-border shadow-sm">
    <CardHeader class="pb-4">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <CardTitle class="text-xl">Dados do Perfil</CardTitle>
          <CardDescription>Gerencie suas informações de acesso e identificação</CardDescription>
        </div>
        <div v-if="!loading">
          <Button 
            v-if="!isEditing" 
            variant="outline" 
            size="sm" 
            @click="startEditing"
            class="h-9 gap-2"
          >
            <Pencil :size="14" />
            Editar
          </Button>
          <div v-else class="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              @click="cancelEditing"
              class="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
              title="Cancelar"
            >
              <X :size="16" />
            </Button>
            <Button 
              size="sm" 
              @click="saveProfile" 
              :disabled="isSaving"
              class="h-9 gap-2 min-w-[90px]"
            >
              <Loader2 v-if="isSaving" class="h-3 w-3 animate-spin" />
              <Check v-else :size="14" />
              {{ isSaving ? 'Salvando' : 'Salvar' }}
            </Button>
          </div>
        </div>
      </div>
    </CardHeader>
    
    <Separator />
    
    <CardContent class="pt-6">
      <div v-if="loading" class="space-y-6">
        <div class="space-y-2">
           <Skeleton class="h-4 w-24" />
           <Skeleton class="h-10 w-full" />
        </div>
        <div class="space-y-2">
           <Skeleton class="h-4 w-24" />
           <Skeleton class="h-10 w-full" />
        </div>
      </div>

      <div v-else class="grid gap-6">
        <!-- Name Field -->
        <div class="grid gap-2">
          <Label>Nome Completo</Label>
          <div v-if="!isEditing" class="relative flex items-center">
            <User class="absolute left-3 text-muted-foreground h-4 w-4" />
            <div class="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 pl-9 text-sm text-foreground">
              {{ user?.name || 'Não informado' }}
            </div>
          </div>
          <Input 
            v-else 
            v-model="formData.name" 
            placeholder="Seu nome completo"
          />
        </div>

        <!-- Email Field -->
        <div class="grid gap-2">
          <Label>Email de Acesso</Label>
          <div v-if="!isEditing" class="relative flex items-center">
            <Mail class="absolute left-3 text-muted-foreground h-4 w-4" />
            <div class="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 pl-9 text-sm text-foreground">
              {{ user?.email || 'Não informado' }}
            </div>
          </div>
          <Input 
            v-else 
            v-model="formData.email" 
            type="email" 
            placeholder="Seu email"
          />
        </div>

        <!-- Read Only Fields Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Função</Label>
            <div class="relative flex items-center">
              <Briefcase class="absolute left-3 text-muted-foreground h-4 w-4" />
              <div class="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 pl-9 text-sm text-muted-foreground cursor-not-allowed">
                {{ roleLabels[user?.role] || 'Não informado' }}
              </div>
            </div>
          </div>

          <div class="grid gap-2">
            <Label>Membro Desde</Label>
             <div class="relative flex items-center">
              <Calendar class="absolute left-3 text-muted-foreground h-4 w-4" />
              <div class="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 pl-9 text-sm text-muted-foreground cursor-not-allowed">
                {{ formatDate(clinic?.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
