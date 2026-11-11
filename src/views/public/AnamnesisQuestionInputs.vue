<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: [String, Number, Boolean, Array, null], default: null },
  qId: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// Helper para v-model local, especialmente para radio/checkbox
const localValue = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

// Texto longo cresce sozinho com o conteúdo (a pessoa nunca redimensiona o campo).
const textareaRef = ref(null)
function autoGrowTextarea() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
onMounted(autoGrowTextarea)
watch(() => props.modelValue, () => nextTick(autoGrowTextarea))

// Handler específico para checkboxes (multiple_choice)
function handleCheckboxChange(e, option) {
  const checked = e.target.checked
  const currentAnswers = Array.isArray(props.modelValue)
    ? [...props.modelValue]
    : []
  if (checked) {
    currentAnswers.push(option)
  } else {
    currentAnswers.splice(currentAnswers.indexOf(option), 1)
  }
  emit('update:modelValue', currentAnswers)
}
</script>

<template>
  <div v-if="question.questionType === 'text'">
    <input
      type="text"
      v-model="localValue"
      class="form-input"
      :id="'q-' + qId"
      :disabled="disabled"
    />
  </div>

  <textarea
    v-if="question.questionType === 'long_text'"
    ref="textareaRef"
    v-model="localValue"
    class="form-textarea"
    :id="'q-' + qId"
    :disabled="disabled"
  ></textarea>

  <div v-if="question.questionType === 'yes_no'" class="choice-group">
    <div class="choice-item">
      <input
        type="radio"
        :id="'q-' + qId + '-sim'"
        :value="true"
        v-model="localValue"
        :disabled="disabled"
      />
      <label :for="'q-' + qId + '-sim'">Sim</label>
    </div>
    <div class="choice-item">
      <input
        type="radio"
        :id="'q-' + qId + '-nao'"
        :value="false"
        v-model="localValue"
        :disabled="disabled"
      />
      <label :for="'q-' + qId + '-nao'">Não</label>
    </div>
  </div>

  <div v-if="question.questionType === 'single_choice'" class="choice-group">
    <div v-for="option in question.options" :key="option" class="choice-item">
      <input
        type="radio"
        :id="'q-' + qId + '-' + option"
        :value="option"
        v-model="localValue"
        :disabled="disabled"
      />
      <label :for="'q-' + qId + '-' + option">{{ option }}</label>
    </div>
  </div>

  <div v-if="question.questionType === 'multiple_choice'" class="choice-group">
    <div v-for="option in question.options" :key="option" class="choice-item">
      <input
        type="checkbox"
        :id="'q-' + qId + '-' + option"
        :value="option"
        :checked="Array.isArray(modelValue) && modelValue.includes(option)"
        @change="(e) => handleCheckboxChange(e, option)"
        :disabled="disabled"
      />
      <label :for="'q-' + qId + '-' + option">{{ option }}</label>
    </div>
  </div>
</template>

<style scoped>
.form-input,
.form-textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.form-textarea {
  min-height: 120px;
  resize: none;
  overflow: hidden;
}
.form-input:disabled,
.form-textarea:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: default;
}
.choice-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.choice-item input[type='radio'],
.choice-item input[type='checkbox'] {
  display: none;
}
.choice-item label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.choice-item label:hover:not(:has(input:disabled)) {
  border-color: #9ca3af;
  background-color: #f9fafb;
}
.choice-item input:disabled + label {
  cursor: default;
  background-color: #f9fafb;
  color: #6b7280;
  border-color: #e5e7eb;
}
.choice-item input:disabled + label:hover {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}
.choice-item label::before {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  background-color: var(--branco);
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.choice-item input[type='radio'] + label::before {
  border-radius: 50%;
}
.choice-item input[type='checkbox'] + label::before {
  border-radius: 0.25rem;
}
.choice-item input:checked + label {
  border-color: var(--azul-principal);
  background-color: #eef2ff;
  font-weight: 500;
}
.choice-item input:checked + label::before {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
  box-shadow: inset 0 0 0 3px var(--branco);
}
</style>
