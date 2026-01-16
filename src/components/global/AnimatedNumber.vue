<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: Number,
    default: 1500 
  },
  type: {
    type: String,
    default: 'number', 
    validator: (val) => ['number', 'currency'].includes(val)
  }
})

const displayValue = ref(0)
let animationFrame = null
let startTime = null
let startValue = 0

const animate = (timestamp) => {
  if (!startTime) startTime = timestamp
  const progress = timestamp - startTime
  const percentage = Math.min(progress / props.duration, 1) 

  const easeOutExpo = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
  
  const currentProgress = easeOutExpo(percentage)
  
  displayValue.value = startValue + (props.value - startValue) * currentProgress

  if (progress < props.duration) {
    animationFrame = requestAnimationFrame(animate)
  } else {
    displayValue.value = props.value // Ensure exact final value
  }
}

const startAnimation = () => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  startTime = null
  startValue = 0 
  startValue = displayValue.value
  animationFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  startAnimation()
})

watch(() => props.value, () => {
  startAnimation()
})

const formattedValue = computed(() => {
  if (props.type === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(displayValue.value)
  }
  return Math.round(displayValue.value).toLocaleString('pt-BR')
})
</script>

<template>
  <span>{{ formattedValue }}</span>
</template>
