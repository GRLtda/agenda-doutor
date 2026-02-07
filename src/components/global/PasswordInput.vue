<script setup>
import { ref, computed } from 'vue'
import { Eye, EyeOff, Check, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, required: true },
  label: String,
  required: { type: Boolean, default: false },
  showValidation: { type: Boolean, default: true },
  autocomplete: { type: String, default: 'new-password' },
  hideRequiredAsterisk: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const isPasswordVisible = ref(false)
const inputType = computed(() => (isPasswordVisible.value ? 'text' : 'password'))

const inputRef = ref(null)
defineExpose({ inputRef })

function toggleVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value
}

const requirements = computed(() => [
  {
    id: 'length',
    text: 'Pelo menos 6 caracteres',
    satisfied: props.modelValue.length >= 6,
  },
  {
    id: 'special',
    text: 'Pelo menos 1 caracter especial (ex: @, #, $)',
    satisfied: /[!@#$%^&*(),.?":{}|<>]/.test(props.modelValue),
  },
])

const passwordStrength = computed(() => {
  const satisfiedCount = requirements.value.filter((req) => req.satisfied).length
  if (props.modelValue.length === 0) return { score: 0, text: '', color: '#e5e7eb' }
  if (satisfiedCount === 0) return { score: 1, text: 'Muito fraca', color: '#ef4444' }
  if (satisfiedCount === 1) return { score: 2, text: 'Pode ser mais forte', color: '#f59e0b' }
  return { score: 3, text: 'Senha forte', color: '#10b981' }
})

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}

function handleBlur(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="password-input-group" v-auto-animate>
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required && !hideRequiredAsterisk" class="required-asterisk">*</span>
    </label>

    <div class="input-wrapper">
      <input
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur"
        :placeholder="props.showValidation ? 'Crie uma senha forte' : 'Digite sua senha'"
        class="form-input"
        :class="{ 'has-error': !!error }"
        :autocomplete="autocomplete"
      />
      <button type="button" @click="toggleVisibility" class="visibility-toggle">
        <Eye v-if="!isPasswordVisible" :size="20" />
        <EyeOff v-else :size="20" />
      </button>
    </div>
    
    <Transition name="fade-error">
      <span v-if="error" class="error-message">{{ error }}</span>
    </Transition>

    <div
      v-if="props.showValidation"
      class="feedback-wrapper"
      :class="{ visible: modelValue.length > 0 }"
    >
      <Transition name="fade-content">
        <div v-if="modelValue.length > 0">
          <div class="strength-meter">
            <div class="strength-bar">
              <div
                class="bar-segment"
                :style="{
                  backgroundColor: passwordStrength.score >= 1 ? passwordStrength.color : '#e5e7eb',
                }"
              ></div>
              <div
                class="bar-segment"
                :style="{
                  backgroundColor: passwordStrength.score >= 2 ? passwordStrength.color : '#e5e7eb',
                }"
              ></div>
              <div
                class="bar-segment"
                :style="{
                  backgroundColor: passwordStrength.score >= 3 ? passwordStrength.color : '#e5e7eb',
                }"
              ></div>
            </div>
            <span class="strength-text" :style="{ color: passwordStrength.color }">{{
              passwordStrength.text
            }}</span>
          </div>
          <ul class="requirements-list">
            <li v-for="req in requirements" :key="req.id" :class="{ satisfied: req.satisfied }">
              <Check v-if="req.satisfied" :size="16" />
              <X v-else :size="16" />
              <span>{{ req.text }}</span>
            </li>
          </ul>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.required-asterisk {
  color: #ef4444;
  margin-left: 0.25rem;
}
.password-input-group {
  text-align: left;
  margin-bottom: 1.25rem;
}
.form-label {
  display: flex;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}
.input-wrapper {
  position: relative;
}
.form-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: var(--branco);
  font-size: 1rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.form-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
.form-input.has-error {
  border-color: #ef4444;
}
.form-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
.error-message {
  display: block;
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.375rem;
  font-weight: 500;
}
.visibility-toggle {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
}

/* 2. Lógica da animação de altura (max-height) */
.feedback-wrapper {
  max-height: 0;
  overflow: hidden;
}
.feedback-wrapper.visible {
  max-height: 10rem; /* Um valor alto o suficiente para caber todo o conteúdo */
  margin-top: 0.5rem;
}

.strength-meter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.strength-bar {
  display: flex;
  flex-grow: 1;
  gap: 0.25rem;
  height: 4px;
}
.bar-segment {
  flex: 1;
  border-radius: 2px;
  transition: background-color 0.3s ease;
}
.strength-text {
  font-size: 0.75rem;
  font-weight: 500;
}
.requirements-list {
  list-style: none;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  padding: 0;
}
.requirements-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  color: #ef4444;
  transition: color 0.3s ease;
}
.requirements-list li.satisfied {
  color: #10b981;
}

/* Animação para o conteúdo dentro do wrapper */
.fade-content-enter-active {
  transition: opacity 0.3s ease-out;
  transition-delay: 0.1s;
}
.fade-content-leave-active {
  transition: opacity 0.1s ease-in;
}
.fade-content-enter-from,
.fade-content-leave-to {
  opacity: 0;
}

/* Error Transition */
.fade-error-enter-active,
.fade-error-leave-active {
  transition: all 0.2s ease;
}

.fade-error-enter-from,
.fade-error-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
