<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check } from 'lucide-vue-next'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'

const props = defineProps({
  steps: {
    type: Array,
    default: () => [],
  },
  currentStep: {
    type: Number,
    default: 1,
  },
})

const stepItems = ref([])

async function scrollToActiveStep() {
  await nextTick()

  const activeStepElement = stepItems.value[props.currentStep - 1]

  if (activeStepElement && window.innerWidth <= 768) {
    activeStepElement.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }
}

watch(() => props.currentStep, scrollToActiveStep)

onMounted(() => {
  window.setTimeout(scrollToActiveStep, 100)
  window.addEventListener('resize', scrollToActiveStep)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scrollToActiveStep)
})
</script>

<template>
  <Stepper class="app-stepper" :model-value="currentStep" :linear="false">
    <StepperItem
      v-for="(step, index) in steps"
      :key="index"
      :step="index + 1"
      class="app-stepper-item"
      :class="{
        'is-active': index + 1 === currentStep,
        'is-completed': index + 1 < currentStep,
        'is-last': index === steps.length - 1,
      }"
      :ref="
        (el) => {
          if (el) stepItems[index] = el.$el || el
        }
      "
    >
      <StepperTrigger class="app-stepper-trigger" disabled>
        <StepperIndicator class="app-stepper-indicator">
          <Check v-if="index + 1 < currentStep" :size="16" stroke-width="3" />
          <component v-else-if="step.icon" :is="step.icon" :size="16" />
          <span v-else>{{ index + 1 }}</span>
        </StepperIndicator>

        <div class="app-stepper-details">
          <StepperTitle class="app-stepper-title">
            {{ step.name }}
          </StepperTitle>
          <span v-if="step.subtitle" class="app-stepper-subtitle">{{ step.subtitle }}</span>
        </div>
      </StepperTrigger>

      <StepperSeparator
        v-if="index < steps.length - 1"
        class="app-stepper-separator"
        :class="{ 'is-completed': index + 1 < currentStep }"
      />
    </StepperItem>
  </Stepper>
</template>

<style scoped>
.app-stepper {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 0;
  min-width: 0;
}

.app-stepper-item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
}

.app-stepper-trigger {
  flex: 0 1 auto;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  width: auto;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: default;
  opacity: 1;
}

.app-stepper-trigger:disabled {
  cursor: default;
}

.app-stepper-indicator {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 2px solid #e5e7eb;
  background: var(--branco);
  color: var(--cinza-texto);
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.is-active .app-stepper-indicator,
.is-completed .app-stepper-indicator {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
  color: var(--branco);
}

.app-stepper-details {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.app-stepper-title {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-active .app-stepper-title,
.is-completed .app-stepper-title {
  color: var(--preto);
}

.app-stepper-subtitle {
  color: #9ca3af;
  font-size: 0.75rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-stepper-separator {
  flex: 1 1 1.5rem;
  height: 2px;
  min-width: 1rem;
  margin: 0 0.75rem;
  background: #e5e7eb;
  transition: background 0.3s ease;
}

.app-stepper-separator.is-completed {
  background: var(--azul-principal);
}

@media (max-width: 640px) {
  .app-stepper {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding: 0.5rem 12%;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .app-stepper::-webkit-scrollbar {
    display: none;
  }

  .app-stepper-item {
    min-width: min(72%, 16rem);
    flex-basis: min(72%, 16rem);
    scroll-snap-align: center;
    justify-content: center;
    opacity: 0.5;
    transform: scale(0.9);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .app-stepper-item.is-active,
  .app-stepper-item.is-completed {
    opacity: 1;
  }

  .app-stepper-item.is-active {
    transform: scale(1);
  }

  .app-stepper-trigger {
    flex-basis: 100%;
    justify-content: center;
    width: 100%;
  }

  .app-stepper-separator {
    flex: 0 0 2rem;
    min-width: 2rem;
    margin: 0 0.5rem;
  }
}
</style>
