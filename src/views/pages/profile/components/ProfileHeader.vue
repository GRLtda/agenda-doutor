<script setup>
import { ref, computed } from 'vue'
import { Camera, Trash2, Loader2, User, Mail, Briefcase } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import {
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  loading: Boolean
})

const authStore = useAuthStore()
const toast = useToast()
const photoInput = ref(null)
const isUploadingPhoto = ref(false)
const showPhotoMenu = ref(false)

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  employee: 'Funcionário',
  staff: 'Equipe'
}

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name[0].toUpperCase()
}

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Formato inválido. Use JPEG, PNG ou WebP.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('Imagem muito grande. Máximo 5MB.')
    return
  }

  isUploadingPhoto.value = true
  showPhotoMenu.value = false

  const result = await authStore.uploadProfilePhoto(file)
  
  isUploadingPhoto.value = false
  
  if (result.success) {
    toast.success('Foto atualizada com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao fazer upload')
  }

  if (photoInput.value) photoInput.value.value = ''
}

async function handlePhotoDelete() {
  if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return

  isUploadingPhoto.value = true
  showPhotoMenu.value = false

  const result = await authStore.deleteProfilePhoto()
  
  isUploadingPhoto.value = false
  
  if (result.success) {
    toast.success('Foto removida com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao remover foto')
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-6 p-8 bg-white border border-border rounded-xl">
    <div v-if="loading" class="flex flex-col items-center gap-4 w-full">
      <Skeleton class="h-24 w-24 rounded-full" />
      <div class="space-y-2 text-center w-full max-w-[200px]">
        <Skeleton class="h-8 w-full" />
        <Skeleton class="h-4 w-2/3 mx-auto" />
      </div>
    </div>

    <template v-else>
      <div 
        class="relative group"
        @mouseenter="showPhotoMenu = true" 
        @mouseleave="showPhotoMenu = false"
      >
        <Avatar class="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-muted">
          <AvatarImage 
            v-if="user?.profilePhotoUrl" 
            :src="user.profilePhotoUrl" 
            :alt="user?.name" 
            class="object-cover" 
          />
          <AvatarFallback class="bg-primary/10 text-primary text-2xl font-bold">
            {{ getInitials(user?.name) }}
          </AvatarFallback>
        </Avatar>

        <!-- Loading Overlay -->
        <div 
          v-if="isUploadingPhoto" 
          class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full z-20"
        >
          <Loader2 class="h-8 w-8 text-white animate-spin" />
        </div>

        <!-- Hover Actions -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div 
            v-if="showPhotoMenu && !isUploadingPhoto" 
            class="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 rounded-full backdrop-blur-[2px] z-10"
          >
            <button 
              type="button" 
              class="p-2 bg-white rounded-full text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
              @click="triggerPhotoUpload" 
              title="Alterar foto"
            >
              <Camera :size="18" />
            </button>
            <button 
              v-if="user?.profilePhotoUrl" 
              type="button" 
              class="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm"
              @click="handlePhotoDelete" 
              title="Remover foto"
            >
              <Trash2 :size="18" />
            </button>
          </div>
        </Transition>

        <!-- Online Status Indicator -->
        <span class="absolute bottom-1 right-1 h-5 w-5 bg-green-500 border-4 border-white rounded-full"></span>
        
        <!-- Hidden File Input -->
        <input
          ref="photoInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handlePhotoUpload"
        />
      </div>

      <div class="text-center space-y-1">
        <h1 class="text-2xl font-bold text-foreground">
          {{ user?.name || 'Usuário' }}
        </h1>
        <p class="text-muted-foreground font-medium">
          {{ user?.email || 'email@exemplo.com' }}
        </p>
        <div class="pt-2">
          <Badge variant="secondary" class="font-semibold uppercase tracking-wider text-[11px] px-3 py-1">
            {{ roleLabels[user?.role] || 'Membro' }}
          </Badge>
        </div>
      </div>
    </template>
  </div>
</template>
