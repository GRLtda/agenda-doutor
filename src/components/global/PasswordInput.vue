<script setup>
import { ref, computed, useSlots } from 'vue'
import { Eye, EyeOff, Check, X, Lock, TriangleAlert } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, required: true },
  label: String,
  required: { type: Boolean, default: false },
  showValidation: { type: Boolean, default: true },
  autocomplete: { type: String, default: 'new-password' },
  hideRequiredAsterisk: { type: Boolean, default: false },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  // Mostra o cadeado à esquerda (visual da tela de acesso)
  icon: { type: Boolean, default: false },
  // Atributos extras do <input> (name, enterkeyhint...)
  inputAttrs: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const isPasswordVisible = ref(false)
const inputType = computed(() => (isPasswordVisible.value ? 'text' : 'password'))

const inputId = `pw-${Math.random().toString(36).slice(2, 9)}`
const inputRef = ref(null)
defineExpose({ inputRef })

// Aviso de Caps Lock: evita erro de senha por digitação com a tecla ativada.
const capsLockOn = ref(false)
function checkCapsLock(event) {
  if (typeof event.getModifierState === 'function') capsLockOn.value = event.getModifierState('CapsLock')
}
const slots = useSlots()

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
    <div v-if="label" class="label-row">
      <label class="form-label" :for="inputId">
        {{ label }}
        <span v-if="required && !hideRequiredAsterisk" class="required-asterisk">*</span>
      </label>
      <slot v-if="slots['label-action']" name="label-action" />
    </div>

    <div class="input-wrapper" :class="{ 'has-icon': icon }">
      <Lock v-if="icon" :size="18" class="pi-icon" aria-hidden="true" />
      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur(); capsLockOn = false"
        @keydown="checkCapsLock"
        @keyup="checkCapsLock"
        :placeholder="props.placeholder || (props.showValidation ? 'Crie uma senha forte' : 'Digite sua senha')"
        class="form-input"
        :class="{ 'has-error': !!error }"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        v-bind="inputAttrs"
      />
      <button
        type="button"
        class="visibility-toggle"
        :aria-label="isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="isPasswordVisible ? 'true' : 'false'"
        @click="toggleVisibility"
      >
        <Eye v-if="!isPasswordVisible" :size="20" />
        <EyeOff v-else :size="20" />
      </button>
    </div>
    
    <Transition name="fade-error">
      <span v-if="capsLockOn" class="caps-warning" role="status">
        <TriangleAlert :size="14" aria-hidden="true" /> Caps Lock ativado
      </span>
    </Transition>
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
/* Linha do rótulo (com ação opcional à direita, ex.: "Esqueceu a senha?") */
.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}
.pi-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  transition: color 0.2s ease;
}
.input-wrapper.has-icon .form-input {
  padding-left: 2.75rem;
}
.input-wrapper.has-icon:focus-within .pi-icon {
  color: var(--azul-principal);
}
.caps-warning {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 500;
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
  right: 0.25rem;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  border-radius: 0.625rem;
  cursor: pointer;
  color: #64748b;
}
.visibility-toggle:hover {
  color: #334155;
}
.visibility-toggle:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: -2px;
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
