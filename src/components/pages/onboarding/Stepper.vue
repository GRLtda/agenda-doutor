<script setup>
import { defineProps, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Check } from 'lucide-vue-next'

const props = defineProps({
  steps: Array,
  currentStep: Number,
})

const stepperContainer = ref(null)
const stepItems = ref([])

// Função para centralizar o passo ativo
const scrollToActiveStep = async () => {
  await nextTick()
  if (props.currentStep > 0 && stepItems.value.length >= props.currentStep) {
    const activeStepElement = stepItems.value[props.currentStep - 1]
    if (activeStepElement && window.innerWidth <= 768) {
      activeStepElement.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }
}

watch(() => props.currentStep, scrollToActiveStep)

onMounted(() => {
  setTimeout(scrollToActiveStep, 100)
  window.addEventListener('resize', scrollToActiveStep)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scrollToActiveStep)
})
</script>

<template>
  <div class="stepper" ref="stepperContainer">
    <template v-for="(step, index) in steps" :key="index">
      <div
        class="step-item"
        :class="{ active: index + 1 === currentStep, completed: index + 1 < currentStep }"
        :ref="
          (el) => {
            if (el) stepItems[index] = el
          }
        "
      >
        <div class="step-circle">
          <Check v-if="index + 1 < currentStep" :size="16" stroke-width="3" />
          <component v-else :is="step.icon" :size="16" />
        </div>
        <div class="step-details">
          <div class="step-name">{{ step.name }}</div>
          <div v-if="step.subtitle" class="step-subtitle">{{ step.subtitle }}</div>
        </div>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="step-line"
        :class="{ completed: index + 1 < currentStep }"
      ></div>
    </template>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  width: 100%;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.step-circle {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid #e5e7eb;
  background-color: var(--branco);
  color: var(--cinza-texto);
  transition: all 0.3s ease;
}

.step-details {
  display: flex;
  flex-direction: column;
}

.step-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--cinza-texto);
  white-space: nowrap;
}

.step-subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  white-space: nowrap;
}

.step-line {
  flex-grow: 1;
  height: 2px;
  background-color: #e5e7eb;
  margin: 0 1rem;
  transition: background-color 0.3s ease;
}

/* Estilos de Ativo e Concluído */
.step-item.active .step-circle {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
  color: var(--branco);
}

.step-item.active .step-name {
  color: var(--preto);
}

.step-item.completed .step-circle {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
  color: var(--branco);
}

.step-item.completed .step-name {
  color: var(--preto);
}

.step-line.completed {
  background-color: var(--azul-principal);
}

/* ✨ INÍCIO DAS MUDANÇAS PARA RESPONSIVO ✨ */
@media (max-width: 768px) {
  .stepper {
    flex-direction: row; /* Horizontal layout */
    align-items: center;
    overflow: -moz-hidden-unscrollable;
    gap: 0; /* Remove gap, use line for spacing */
    width: 100%;
    overflow-x: auto; /* Enable horizontal scrolling */
    scroll-snap-type: x mandatory; /* Snap to elements */
    padding: 0.5rem 15%; /* (100% - 70%) / 2 = 15% padding to center items */
    -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
    scrollbar-width: none; /* Hide scrollbar Firefox */
  }

  .stepper::-webkit-scrollbar {
    display: none; /* Hide scrollbar Chrome/Safari */
  }

  /* Restore line but style for carousel */
  .step-line {
    display: block;
    min-width: 2rem;
    flex-grow: 0;
    margin: 0 0.5rem;
    height: 2px;
    background-color: #e5e7eb;
  }

  .step-item {
    min-width: 70%; /* Shows part of the next item */
    scroll-snap-align: center; /* Snap to center */
    /* Removed box styling (border, padding, bg) to match PC aesthetic */
    display: flex;
    justify-content: center; /* Center content within the item width */
    transition: all 0.3s ease;
    opacity: 0.5; /* Dim inactive items */
    transform: scale(0.9); /* Slightly smaller inactive items */
  }

  .step-item.active {
    opacity: 1;
    transform: scale(1);
    /* Removed box-shadow and border-color */
  }

  .step-item.completed {
   opacity: 1; 
  }

  .step-item.completed .step-name {
    color: var(--preto);
  }
}
</style>
