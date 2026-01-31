<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, PropType } from 'vue'
import { format, isSameDay, setHours, setMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import SchedulerCard from './SchedulerCard.vue'

const props = defineProps({
  days: {
    type: Array as PropType<Date[]>,
    required: true
  },
  appointments: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  workingHours: {
    type: Object, // { from: minutes, to: minutes }
    default: () => ({ from: 8 * 60, to: 19 * 60 }) 
  }
})

const emit = defineEmits(['cell-click', 'event-click'])

// Settings
const HOUR_HEIGHT = 80 // px per hour
const SLOT_DURATION = 30 // minutes (visual grid lines)

// State
const currentTime = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date()
  }, 60000)
  
  // Scroll to current time on mount if applicable?
  // Maybe later.
})

onUnmounted(() => {
  clearInterval(timer)
})

// Computeds

const gridStartHour = computed(() => Math.floor(props.workingHours.from / 60))
const gridEndHour = computed(() => Math.ceil(props.workingHours.to / 60))
const totalHours = computed(() => gridEndHour.value - gridStartHour.value)

const timeLabels = computed(() => {
  const labels = []
  for (let i = gridStartHour.value; i <= gridEndHour.value; i++) {
    labels.push(`${i.toString().padStart(2, '0')}:00`)
  }
  return labels
})

const gridStyle = computed(() => {
  return {
    height: `${totalHours.value * HOUR_HEIGHT}px`,
    '--hour-height': `${HOUR_HEIGHT}px`
  }
})

const getDayEvents = (day: Date) => {
  return props.appointments.filter(appt => {
    // Assuming appt.startTime is ISO string
    return isSameDay(new Date(appt.startTime || appt.start), day)
  })
}

const getEventStyle = (event: any) => {
  const start = new Date(event.startTime || event.start)
  const end = new Date(event.endTime || event.end)
  
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  
  // Offset relative to grid start
  const offsetStart = startMinutes - (gridStartHour.value * 60)
  const duration = endMinutes - startMinutes
  
  const top = (offsetStart / 60) * HOUR_HEIGHT
  const height = (duration / 60) * HOUR_HEIGHT
  
  return {
    top: `${top}px`,
    height: `${Math.max(height, 30)}px` // Min height constraint
  }
}

const currentTimeStyle = computed(() => {
  const now = currentTime.value
  const minutes = now.getHours() * 60 + now.getMinutes()
  const offsetStart = minutes - (gridStartHour.value * 60)
  
  if (offsetStart < 0 || offsetStart > (totalHours.value * 60)) return { display: 'none' }
  
  const top = (offsetStart / 60) * HOUR_HEIGHT
  
  // Check if today is in view
  const isTodayVisible = props.days.some(d => isSameDay(d, now))
  if (!isTodayVisible) return { display: 'none' }
  
  // Need to position horizontally based on the day column... 
  // Actually, easiest is to render the line INSIDE the day column of "Today".
  return { top: `${top}px` }
})

const handleSlotClick = (day: Date, hour: number, minute: number) => {
  const clickedDate = setMinutes(setHours(day, hour), minute)
  emit('cell-click', clickedDate)
}

</script>

<template>
  <div class="scheduler-grid-container">
    <!-- Time Column (Sticky Left) -->
    <div class="time-column">
      <div 
        v-for="time in timeLabels" 
        :key="time" 
        class="time-label"
        :style="{ height: `${HOUR_HEIGHT}px` }"
      >
        <span>{{ time }}</span>
      </div>
    </div>

    <!-- Days Grid -->
    <div class="days-track" :style="gridStyle">
      <!-- Background Grid Lines (Horizontal) -->
       <div 
        v-for="i in totalHours" 
        :key="`line-${i}`" 
        class="grid-horizontal-line"
        :style="{ top: `${(i-1) * HOUR_HEIGHT}px` }"
      ></div>

      <!-- Day Columns -->
      <div 
        v-for="day in days" 
        :key="day.toISOString()" 
        class="day-column"
        :class="{ 'is-today': isSameDay(day, new Date()) }"
      >
        
        <!-- Header for Mobile (Sticky Top inside column? No, header is separate component) -->
        <div class="mobile-day-indicator" v-if="days.length === 1"> <!-- Only show if in Day View -->
           <!-- Header already handles this globally. -->
        </div>

        <!-- Render Current Time Line if strictly inside this column -->
        <div 
          v-if="isSameDay(day, currentTime)" 
          class="current-time-line"
          :style="currentTimeStyle"
        >
          <div class="time-dot"></div>
        </div>

        <!-- Events -->
        <div 
          v-for="event in getDayEvents(day)" 
          :key="event._id || event.id"
          class="event-container"
          :style="getEventStyle(event)"
          @click.stop="emit('event-click', event)"
        >
          <SchedulerCard :appointment="event" />
        </div>

        <!-- Clickable Slots (Invisible Overlay) -->
        <!-- Just basic 30min slots for clicking -->
        <div class="click-grid">
           <div 
            v-for="h in totalHours" 
            :key="`slot-group-${h}`"
            class="hour-slot-group"
            :style="{ height: `${HOUR_HEIGHT}px` }"
           >
             <div class="half-hour-slot" @click="handleSlotClick(day, gridStartHour + h - 1, 0)"></div>
             <div class="half-hour-slot" @click="handleSlotClick(day, gridStartHour + h - 1, 30)"></div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduler-grid-container {
  display: flex;
  overflow-y: auto;
  flex: 1;
  position: relative;
  background-color: var(--scheduler-bg);
  /* Custom Scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--scheduler-border) transparent;
}

.scheduler-grid-container::-webkit-scrollbar {
  width: 6px;
}
.scheduler-grid-container::-webkit-scrollbar-thumb {
  background-color: var(--scheduler-border);
  border-radius: 4px;
}

.time-column {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid var(--scheduler-border);
  background-color: var(--scheduler-bg);
  position: sticky;
  left: 0;
  z-index: 20;
}

.time-label {
  display: flex;
  align-items: start; /* Align correctly with the line */
  justify-content: center;
  color: var(--scheduler-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  transform: translateY(-8px); /* Center vertical with line */
}

.days-track {
  display: flex;
  flex: 1;
  position: relative;
  min-width: 0; /* Fix flex overflow */
}

.grid-horizontal-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--scheduler-border);
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.day-column {
  flex: 1;
  position: relative;
  border-right: 1px solid var(--scheduler-border);
  min-width: 120px; /* Minimum width for readability */
}

.day-column:last-child {
  border-right: none;
}

.day-column.is-today {
  background-color: rgba(59, 130, 246, 0.02); /* Very subtle tint */
}

/* Current Time Indicator */
.current-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #EF4444; /* Red or Accent Color */
  z-index: 15;
  pointer-events: none;
}

.time-dot {
  position: absolute;
  left: -4px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #EF4444;
}

/* Events */
.event-container {
  position: absolute;
  left: 4px; /* Small gap */
  right: 4px;
  z-index: 10;
  transition: z-index 0s;
}
.event-container:hover {
  z-index: 20;
}

/* Interaction Layer */
.click-grid {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  z-index: 5; /* Below events */
}

.hour-slot-group {
  display: flex;
  flex-direction: column;
}

.half-hour-slot {
  flex: 1;
  border-bottom: 1px dotted var(--scheduler-border); /* Use variable */
  cursor: pointer;
}
.half-hour-slot:hover {
  background-color: var(--scheduler-accent-hover); /* Use accent hover */
}

@media (max-width: 768px) {
  .day-column {
    min-width: 100%; /* Full screen width on mobile */
  }
}
</style>
