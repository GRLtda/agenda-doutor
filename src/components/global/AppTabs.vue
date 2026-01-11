<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  items: {
    type: Array, // [{ label: string, value: string, icon?: Component }]
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])
const tabRefs = ref([])
const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)', opacity: 0 })

const selectTab = (value) => {
  emit('update:modelValue', value)
}

const updateIndicator = () => {
  const activeBtn = tabRefs.value.find(el => el && el.getAttribute('data-value') === props.modelValue)
  if (activeBtn) {
    indicatorStyle.value = {
      width: `${activeBtn.offsetWidth}px`,
      transform: `translateX(${activeBtn.offsetLeft}px)`,
      opacity: 1
    }
  }
}

watch(() => props.modelValue, async () => {
  await nextTick()
  updateIndicator()
})

onMounted(async () => {
  // Wait for fonts/layout
  await nextTick()
  // Small delay to ensure layout is stable
  setTimeout(updateIndicator, 100)
})
</script>

<template>
  <div class="tabs-container">
    <div class="tabs-scroll-area">
      <div class="sliding-indicator" :style="indicatorStyle"></div>
      <button 
        v-for="tab in items" 
        :key="tab.value"
        ref="tabRefs"
        :data-value="tab.value"
        @click="selectTab(tab.value)"
        :class="['tab-button', { active: modelValue === tab.value }]"
        type="button"
      >
        <component :is="tab.icon" :size="18" v-if="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  display: flex;
  padding: 0.25rem;
  background: var(--branco); /* User defined */
  border-radius: 12px;
  width: 100%;
  max-width: 100%;
  border: 1px solid #e2e8f0;
}

.tabs-scroll-area {
  position: relative; /* For absolute positioning of indicator */
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  z-index: 1;
}

.tabs-scroll-area::-webkit-scrollbar {
  display: none;
}

.sliding-indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #f1f5f9; /* Slate 100/200 mix */
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 1;
}

.tab-button {
  position: relative;
  z-index: 2; /* Above indicator */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.tab-button:hover {
  color: #0f172a;
  /* background: rgba(0,0,0,0.03); */
}

.tab-button.active {
  background: transparent; /* Disable static bg */
  color: var(--azul-principal, #3b82f6);
  /* box-shadow handled by indicator if needed, or text clear */
}

@media (max-width: 768px) {
  .sliding-indicator {
    display: none; /* Hide slider on mobile chips */
  }

  .tabs-container {
    background: transparent;
    border: none;
    padding: 0;
    width: 100%;
    border-radius: 0;
  }


  .tabs-scroll-area {
    padding: 0.25rem 0.5rem; /* Add scroll padding */
    gap: 0.75rem;
  }

  .tab-button {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 9999px; /* Pill shape */
    padding: 0.5rem 1rem;
    color: #64748b;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    font-size: 0.85rem;
  }

  .tab-button.active {
    background: var(--azul-principal, #3b82f6);
    color: white;
    border-color: var(--azul-principal, #3b82f6);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25);
  }
}
</style>
