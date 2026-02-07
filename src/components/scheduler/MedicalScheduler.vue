<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSchedulerDates, ViewMode } from '@/composables/useSchedulerDates'
import SchedulerHeader from './SchedulerHeader.vue'
import SchedulerGrid from './SchedulerGrid.vue'

const props = defineProps({
  appointments: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  workingHours: {
    type: Object,
    default: () => ({ from: 8 * 60, to: 19 * 60 })
  }
})

const emit = defineEmits(['date-change', 'update:viewMode', 'cell-click', 'event-click'])

// Composable Logic
const { 
  selectedDate, 
  viewMode, 
  visibleDays, 
  formattedHeader,
  navigate,
  goToToday,
  setViewMode
} = useSchedulerDates()

// Sync logic: Emit date change to parent to fetch data
watch(selectedDate, (newDate) => {
  emit('date-change', newDate)
})

watch(viewMode, (newMode) => {
  emit('update:viewMode', newMode)
})

// Responsive Logic
const checkIfMobile = () => {
  if (window.innerWidth <= 768) {
    if (viewMode.value !== 'day') setViewMode('day')
  }
}

onMounted(() => {
  checkIfMobile()
  window.addEventListener('resize', checkIfMobile)
  emit('date-change', selectedDate.value) // Initial fetch
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile)
})

</script>

<template>
  <div class="medical-scheduler-root">
    <SchedulerHeader 
      :title="formattedHeader"
      :view-mode="viewMode"
      @navigate="navigate"
      @today="goToToday"
      @update:view-mode="setViewMode"
    />

    <div class="scheduler-body" :class="{ 'is-loading': loading }">
      <SchedulerGrid 
        :days="visibleDays"
        :appointments="appointments"
        :working-hours="workingHours"
        @cell-click="(d) => emit('cell-click', d)"
        @event-click="(e) => emit('event-click', e)"
      />
      
      <!-- Loading Overlay -->
      <div v-if="loading" class="scheduler-loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<style>
/* CSS Variables Definition (Theme) */
:root {
  --scheduler-bg: #FFFFFF;
  --scheduler-surface: #F9FAFB;
  --scheduler-border: #E5E7EB;
  --scheduler-text-primary: #111827;
  --scheduler-text-secondary: #6B7280;
  --scheduler-accent: #3B82F6;
  --scheduler-accent-hover: rgba(59, 130, 246, 0.1);
}
</style>

<style scoped>
.medical-scheduler-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--scheduler-bg);
  /* Ensure parent allows full height */
  overflow: hidden; 
}

.scheduler-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Grid handles internal scroll */
  position: relative;
}

.scheduler-loading-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent background */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(2px);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  border-top-color: var(--scheduler-accent);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
