<script setup>
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import AppToaster from '@/components/global/AppToaster.vue'
import { useAuthStore } from '@/stores/auth'
import { useSeoStore } from '@/stores/seo'

const authStore = useAuthStore()
const seoStore = useSeoStore()

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
  <RouterView />
  <AppToaster />
</template>

<style></style>
