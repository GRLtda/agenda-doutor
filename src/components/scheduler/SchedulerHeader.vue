<script setup lang="ts">
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-vue-next'
import { PropType } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  viewMode: {
    type: String as PropType<'day' | 'week'>,
    required: true
  }
})

const emit = defineEmits(['navigate', 'today', 'update:viewMode'])

const modes = [
  { label: 'Dia', value: 'day' },
  { label: 'Semana', value: 'week' }
]
</script>

<template>
  <header class="scheduler-header">
    <div class="header-left">
      <h2 class="current-date">{{ title }}</h2>
    </div>

    <div class="header-center">
      <button 
        class="nav-btn" 
        @click="emit('navigate', 'prev')"
        title="Anterior"
      >
        <ChevronLeft :size="20" />
      </button>
      
      <button 
        class="today-btn"
        @click="emit('today')"
      >
        Hoje
      </button>

      <button 
        class="nav-btn" 
        @click="emit('navigate', 'next')"
        title="Próximo"
      >
        <ChevronRight :size="20" />
      </button>
    </div>

    <div class="header-right">
       <div class="view-selector">
        <button
          v-for="mode in modes"
          :key="mode.value"
          class="view-btn"
          :class="{ active: viewMode === mode.value }"
          @click="emit('update:viewMode', mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.scheduler-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: var(--scheduler-surface);
  border-bottom: 1px solid var(--scheduler-border);
  color: var(--scheduler-text-primary);
}

.header-left .current-date {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--scheduler-text-primary);
  margin: 0;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--scheduler-border);
  background-color: transparent;
  color: var(--scheduler-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background-color: var(--scheduler-accent-hover);
  color: var(--scheduler-text-primary);
}

.today-btn {
  padding: 0 1rem;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--scheduler-border);
  background-color: transparent;
  color: var(--scheduler-text-primary);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.today-btn:hover {
  background-color: var(--scheduler-accent-hover);
}

.view-selector {
  display: flex;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 2px;
}

.view-btn {
  padding: 0.25rem 1rem;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  color: var(--scheduler-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn.active {
  background-color: var(--scheduler-bg);
  color: var(--scheduler-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .scheduler-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .header-left, .header-center, .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .header-center {
    justify-content: center;
    order: 3; /* Move navigation to bottom on mobile if needed, or keep top */
  }

  .view-selector {
    width: 100%;
  }
  
  .view-btn {
    flex: 1;
  }

  /* Specific mobile adjustments */
  .scheduler-header {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.5rem;
  }

  .header-left {
    grid-column: 1 / -1;
    text-align: center;
    justify-content: center;
    display: flex;
  }

  .header-center {
    grid-column: 1 / -1;
    grid-row: 2;
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .header-right {
    display: none; /* Hide view selector on mobile for simplicity or move it */
  }
}
</style>
