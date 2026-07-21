<script setup>
import { formatPhone } from '@/directives/phone-mask.js'
import { formatCPF } from '@/directives/cpf-mask.js'
import { formatCNPJ } from '@/directives/cnpj-mask.js'
import { formatCEP } from '@/directives/cep-mask.js'
import { Check } from 'lucide-vue-next' // ✨ Importa o ícone
import { ref } from 'vue'

const props = defineProps({
  modelValue: [String, Boolean, Number],
  label: String,
  name: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  autocomplete: String,
  phoneMask: { type: Boolean, default: false },
  cpfMask: { type: Boolean, default: false },
  cnpjMask: { type: Boolean, default: false },
  cepMask: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledHelp: { type: String, default: '' },
  hideRequiredAsterisk: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)

// Expose the input element to parent components
defineExpose({ inputRef })

function handleInput(event) {
  if (props.type === 'checkbox') {
    emit('update:modelValue', event.target.checked)
    return
  }

  let value = event.target.value
  if (props.phoneMask) {
    value = formatPhone(value)
    if (event.target.value !== value) {
       event.target.value = value
    }
  } else if (props.cpfMask) {
     value = formatCPF(value)
     if (event.target.value !== value) {
       event.target.value = value
    }
  } else if (props.cnpjMask) {
     value = formatCNPJ(value)
     if (event.target.value !== value) {
        event.target.value = value
     }
  } else if (props.cepMask) {
    value = formatCEP(value)
    if (event.target.value !== value) {
      event.target.value = value
    }
  }
  emit('update:modelValue', value)
}

function handleBlur(event) {
  if (props.type !== 'checkbox') {
    emit('update:modelValue', event.target.value)
  }
}
</script>

<template>
  <div class="form-group" :class="{ 'checkbox-group': type === 'checkbox' }">
    <label v-if="label && type !== 'checkbox'" class="form-label">
      {{ label }}
      <span v-if="required && !hideRequiredAsterisk" class="required-asterisk">*</span>
    </label>

    <div v-if="type === 'checkbox'" class="checkbox-wrapper">
       <label class="custom-checkbox-label" :class="{ 'is-disabled': disabled }">
         <input
          type="checkbox"
          :name="name"
          :checked="modelValue"
          @change="handleInput"
          class="hidden-native-checkbox"
          :disabled="disabled"
          :id="name || label"
        />
        <div class="custom-checkbox-box">
          <Check :size="14" stroke-width="3" v-if="modelValue" class="check-icon" />
          <span v-else-if="disabledHelp" class="checkbox-disabled-mark">!</span>
        </div>
        <span v-if="label" class="checkbox-text">
          {{ label }}
          <span v-if="required && !hideRequiredAsterisk" class="required-asterisk">*</span>
          <span
            v-if="disabledHelp"
            class="checkbox-help"
            role="tooltip"
            tabindex="0"
            @click.stop
          >
            ?
            <span class="checkbox-help-tooltip">{{ disabledHelp }}</span>
          </span>
        </span>
      </label>
    </div>

    <input
      v-else
      ref="inputRef"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :value="modelValue"
      :autocomplete="autocomplete"
      @input="handleInput"
      @blur="handleBlur"
      v-phone-mask="phoneMask"
      v-cpf-mask="cpfMask"
      v-cnpj-mask="cnpjMask"
      v-cep-mask="cepMask"
      class="form-input"
      :class="{ 'has-error': !!error }"
      :disabled="disabled"
    />
    <Transition name="fade-error">
      <span v-if="error" class="error-message">{{ error }}</span>
    </Transition>
  </div>
</template>

<style scoped>
/* Estilos permanecem os mesmos */
.form-group {
  text-align: left;
  margin-bottom: 1.25rem;
}
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
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
.form-input:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
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
.required-asterisk {
  color: #ef4444;
  margin-left: 0.25rem;
}

/* --- Styled Custom Checkbox --- */
.checkbox-group {
  margin-bottom: 1rem;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
}

.custom-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox-label.is-disabled {
  cursor: not-allowed;
}

/* Oculta o checkbox nativo mas mantém acessibilidade */
.hidden-native-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

.custom-checkbox-box {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background-color: var(--branco);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: white; /* Cor do ícone */
  flex-shrink: 0;
}

/* Estado Checked */
.hidden-native-checkbox:checked + .custom-checkbox-box {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
}

/* Estado Disabled */
.hidden-native-checkbox:disabled + .custom-checkbox-box {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  cursor: not-allowed;
}

/* Hover Effect */
.custom-checkbox-label:not(.is-disabled):hover .custom-checkbox-box {
  border-color: var(--azul-principal);
}

.custom-checkbox-label:not(.is-disabled) .hidden-native-checkbox:checked + .custom-checkbox-box:hover {
  background-color: var(--azul-escuro); /* Leve escurecimento ao hover no checked */
  border-color: var(--azul-escuro);
}

.checkbox-disabled-mark {
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}

/* Icon Animation */
.check-icon {
  animation: scale-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151; /* --cinza-texto levemente mais escuro para contraste */
  font-weight: 500;
  transition: color 0.2s;
}

.custom-checkbox-label:not(.is-disabled):hover .checkbox-text {
  color: #111827; /* Preto ao hover */
}

.custom-checkbox-label.is-disabled .checkbox-text {
  color: #9ca3af;
}

.checkbox-help {
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  color: #9ca3af;
  cursor: help;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 800;
  height: 1rem;
  justify-content: center;
  line-height: 1;
  margin-left: 0.35rem;
  position: relative;
  vertical-align: text-top;
  width: 1rem;
}

.checkbox-help-tooltip {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  bottom: calc(100% + 0.5rem);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
  color: #374151;
  font-size: 0.75rem;
  font-weight: 600;
  left: 50%;
  line-height: 1.35;
  opacity: 0;
  padding: 0.45rem 0.6rem;
  pointer-events: none;
  position: absolute;
  text-align: center;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
  visibility: hidden;
  white-space: nowrap;
  z-index: 9999;
}

.checkbox-help-tooltip::after {
  border: 5px solid transparent;
  border-top-color: #ffffff;
  content: '';
  left: 50%;
  position: absolute;
  top: 100%;
  transform: translateX(-50%);
}

.checkbox-help:hover .checkbox-help-tooltip,
.checkbox-help:focus-visible .checkbox-help-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  visibility: visible;
}

/* Animations */
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
