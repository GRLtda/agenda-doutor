<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import ProfileHeader from './profile/components/ProfileHeader.vue'
import ProfilePersonalInfo from './profile/components/ProfilePersonalInfo.vue'
import ProfileClinicInfo from './profile/components/ProfileClinicInfo.vue'
import ConnectedDevices from './profile/components/ConnectedDevices.vue'

const authStore = useAuthStore()
const isLoading = ref(false)
const activeTab = ref('personal')

const user = computed(() => authStore.user)
const clinic = computed(() => authStore.user?.clinic)

const refreshUserData = async () => {
  isLoading.value = true
  try {
    await authStore.fetchUser()
  } catch (error) {
    console.error('Erro ao atualizar dados do usuário:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshUserData()
})
</script>

<template>
  <div class="container max-w-6xl mx-auto py-8 space-y-8">
    <!-- Header -->
    <ProfileHeader 
      :user="user" 
      :loading="isLoading" 
    />

    <!-- Tabs -->
    <Tabs v-model="activeTab" default-value="personal" class="w-full space-y-6">
      <div class="flex justify-center">
        <TabsList class="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="personal">
            Informações Pessoais
          </TabsTrigger>
          <TabsTrigger value="clinic">
            Dados da Clínica
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="personal" class="space-y-6 animate-in fade-in-50 duration-500">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfilePersonalInfo 
            :user="user" 
            :loading="isLoading"
            @update="refreshUserData"
          />
          <ConnectedDevices />
        </div>
      </TabsContent>

      <TabsContent value="clinic" class="animate-in fade-in-50 duration-500">
        <ProfileClinicInfo 
          :clinic="clinic"
          :loading="isLoading"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>

