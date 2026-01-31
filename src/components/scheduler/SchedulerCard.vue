
<script setup lang="ts">
import { computed } from 'vue'
import { Clock, User } from 'lucide-vue-next'

const props = defineProps({
  appointment: {
    type: Object,
    required: true
  }
})

const statusClass = computed(() => {
  const status = props.appointment.status?.toLowerCase().replace(/ /g, '-') || 'pendente'
  return `status--${status}`
})

const formattedTime = computed(() => {
  if (!props.appointment.start) return ''
  const start = props.appointment.start.split(' ')[1] // '2023-10-10 09:00' -> '09:00'
  const end = props.appointment.end.split(' ')[1]
  return `${start} - ${end}`
})

const professionalName = computed(() => {
  // Access the doctor/professional from the original event
  const doc = props.appointment.originalEvent?.doctor
  if (!doc) return null
  // If doctor is expanded object, use name. If string (id), ignore or handle?
  // Controller populates it, so it should be an object with name.
  return doc.name || doc.email || null
})
</script>

<template>
  <div class="scheduler-card" :class="statusClass">
    <div class="card-status-indicator"></div>
    <div class="card-content">
      <span class="patient-name">{{ appointment.title }}</span>
      
      <!-- Professional Name -->
      <div v-if="professionalName" class="professional-info">
        <User :size="10" class="icon-tiny" />
        <span>{{ professionalName }}</span>
      </div>

      <div class="time-badge">
        <Clock :size="12" />
        <span>{{ formattedTime }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduler-card {
  width: 100%;
  height: 100%;
  background-color: var(--scheduler-surface); /* Fallback */
  background: rgba(32, 32, 36, 0.6); /* Glassy dark */
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 4px 8px;
  box-sizing: border-box;
  font-size: 0.75rem;
  color: var(--scheduler-text-primary);
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
}

.scheduler-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.card-status-indicator {
  width: 3px;
  background-color: var(--scheduler-text-secondary);
  border-radius: 2px;
  margin-right: 6px;
  flex-shrink: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  gap: 2px; /* Add slight gap */
}

.patient-name {
  font-weight: 600; /* Increased weight for differentiation */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0px;
}

.professional-info {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  color: var(--scheduler-text-secondary); /* Maybe a bit lighter */
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-tiny {
  opacity: 0.7;
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: var(--scheduler-text-secondary);
  opacity: 0.8;
  margin-top: 2px;
}

/* Status Colors - Matching Implementation Plan */
.status--confirmado .card-status-indicator { background-color: #FBBF24; /* Yellow/Amber */ }
.status--confirmado { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }

.status--realizado .card-status-indicator { background-color: #10B981; /* Green */ }
.status--realizado { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }

.status--cancelado .card-status-indicator { background-color: #EF4444; /* Red */ }
.status--cancelado { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); opacity: 0.6; text-decoration: line-through; }

.status--em-atendimento .card-status-indicator { background-color: #3B82F6; /* Blue */ }
.status--em-atendimento { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.3); }

/* Custom Scrollbar for overflow handling if needed */
</style>
