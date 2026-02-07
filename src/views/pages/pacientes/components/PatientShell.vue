<script setup lang="ts">
import PatientHeader from './PatientHeader.vue'
import PatientTabs from './PatientTabs.vue'
import { Skeleton } from '@/components/ui/skeleton'

interface Patient {
  _id: string
  name: string
  phone?: string
  countryCode?: string
  cpf?: string
  email?: string
  address?: {
    street?: string
    complement?: string
  }
}

interface TabItem {
  value: string
  label: string
  icon?: any
}

defineProps<{
  patient: Patient | null
  loading?: boolean
  activeTab: string
  tabs: TabItem[]
  isEditing?: boolean
}>()

defineEmits<{
  (e: 'update:activeTab', value: string): void
  (e: 'assign-anamnesis'): void
  (e: 'edit'): void
}>()
</script>

<template>
  <div class="container py-6 mx-auto max-w-7xl px-4 md:px-6 animate-fade-in">
    <!-- Loading State -->
    <div v-if="loading && !patient" class="space-y-6">
      <div class="flex items-center gap-4">
        <Skeleton class="h-16 w-16 rounded-full" />
        <div class="space-y-2">
          <Skeleton class="h-8 w-48" />
          <Skeleton class="h-4 w-32" />
        </div>
      </div>
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-[400px] w-full rounded-xl" />
    </div>

    <!-- Patient Content -->
    <div v-else-if="patient">
      <PatientHeader 
        :patient="patient"
        :is-editing="isEditing"
        @assign-anamnesis="$emit('assign-anamnesis')"
        @edit="$emit('edit')"
      />

      <PatientTabs
        :model-value="activeTab"
        :items="tabs"
        @update:model-value="$emit('update:activeTab', $event)"
        class="mb-6"
      />

      <div class="bg-background border border-border/60 rounded-xl min-h-[400px] overflow-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>
