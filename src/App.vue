<script setup>
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppToaster from '@/components/global/AppToaster.vue'
import { useAuthStore } from '@/stores/auth'
import { useSeoStore } from '@/stores/seo'
import ApiAvailabilityBanner from '@/components/layout/ApiAvailabilityBanner.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppButton from '@/components/global/AppButton.vue'
import { isApiUnavailable } from '@/services/apiAvailability'

const authStore = useAuthStore()
const seoStore = useSeoStore()
const route = useRoute()
const isRetryingConnection = ref(false)
const isRecoveringIdentity = ref(false)
const needsIdentityRecovery = computed(() => authStore.isAuthenticated && !route.meta.public && (isRecoveringIdentity.value || (!authStore.user && authStore.sessionValidationUnavailable)))

async function retryConnection() {
  if (isRetryingConnection.value) return
  isRecoveringIdentity.value = needsIdentityRecovery.value
  isRetryingConnection.value = true
  try {
    const recovered = await authStore.checkAuth()
    // Reaplica as guardas de clínica/plano após recuperar um perfil ausente.
    if (recovered) await import('@/router').then(({ default: router }) => router.replace({ path: route.path, query: route.query, hash: route.hash, force: true }))
  } finally {
    isRetryingConnection.value = false
    isRecoveringIdentity.value = false
  }
}

watch(
  () => authStore.user?.clinic,
  (newClinic) => {
    if (newClinic && newClinic.themeColor) {
      seoStore.setThemeColor(newClinic.themeColor)
    } else {
      seoStore.setThemeColor('#FFFFFF')
    }
  },
  { immediate: true }
)
</script>

<template>
  <ApiAvailabilityBanner :visible="isApiUnavailable" :loading="isRetryingConnection" :can-retry="authStore.isAuthenticated" @retry="retryConnection" />
  <main v-if="needsIdentityRecovery" class="session-recovery" :aria-busy="isRetryingConnection">
    <h1>Não foi possível carregar sua conta</h1>
    <p>Sua sessão foi preservada. Tente novamente para carregar suas informações.</p>
    <div class="session-skeleton"><AppSkeleton width="55%" height="24px" /><AppSkeleton height="90px" /><AppSkeleton width="75%" height="18px" /></div>
    <AppButton variant="outline" :loading="isRetryingConnection" @click="retryConnection">Tentar novamente</AppButton>
  </main>
  <RouterView v-else />
  <AppToaster />
</template>

<style scoped>
.session-recovery { max-width: 620px; margin: 130px auto 32px; padding: 24px; font-family: var(--fonte-principal); }
.session-recovery h1 { color: #1e293b; font-size: 22px; font-weight: 600; }
.session-recovery p { color: #64748b; font-size: 14px; line-height: 1.5; }
.session-skeleton { display: flex; flex-direction: column; gap: 16px; margin: 24px 0; }
</style>
