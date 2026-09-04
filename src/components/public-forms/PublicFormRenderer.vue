<script setup>
import { computed, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

const props = defineProps({ form: { type: Object, required: true }, modelValue: { type: Object, default: () => ({}) }, errors: { type: Object, default: () => ({}) }, readonly: Boolean })
const emit = defineEmits(['update:modelValue'])
const openSelect = ref(null)
const fields = computed(() => [...(props.form.fields || [])].filter((field) => field.enabled !== false).sort((a, b) => a.order - b.order))
function update(key, value) { emit('update:modelValue', { ...props.modelValue, [key]: value }) }
function inputType(field) { return field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type }
function formatPhone(value) { const digits = String(value || '').replace(/\D/g, '').slice(0, 11); if (digits.length <= 2) return digits ? `(${digits}` : ''; if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`; if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`; return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` }
function handleInput(field, event) { update(field.key, field.type === 'phone' ? formatPhone(event.target.value) : event.target.value) }
function optionLabel(field) { return field.options?.find((option) => option.value === props.modelValue[field.key])?.label || 'Selecione uma opção' }
function chooseOption(field, value) { update(field.key, value); openSelect.value = null }
</script>

<template>
  <div class="public-fields">
    <div v-for="field in fields" :key="field.key" class="field-group" :class="{ 'has-error': errors[field.key] }">
      <label :for="`field-${field.key}`" class="field-label">{{ field.label }} <span v-if="field.required" aria-hidden="true">*</span></label>

      <textarea v-if="field.type === 'textarea'" :id="`field-${field.key}`" :value="modelValue[field.key] || ''" :placeholder="field.placeholder || 'Digite aqui'" :required="field.required" :readonly="readonly" :aria-invalid="Boolean(errors[field.key])" @input="handleInput(field, $event)" />

      <div v-else-if="field.type === 'select'" class="select-wrap" :class="{ open: openSelect === field.key }">
        <button :id="`field-${field.key}`" type="button" class="select-trigger" :disabled="readonly" :aria-expanded="openSelect === field.key" :aria-invalid="Boolean(errors[field.key])" @click="openSelect = openSelect === field.key ? null : field.key"><span :class="{ placeholder: !modelValue[field.key] }">{{ optionLabel(field) }}</span><ChevronDown :size="19" aria-hidden="true" /></button>
        <div v-if="openSelect === field.key" class="select-menu" role="listbox"><button v-for="option in field.options || []" :key="option.value" type="button" role="option" :aria-selected="modelValue[field.key] === option.value" :class="{ selected: modelValue[field.key] === option.value }" @click="chooseOption(field, option.value)">{{ option.label }}<Check v-if="modelValue[field.key] === option.value" :size="16" /></button></div>
      </div>

      <div v-else-if="field.type === 'radio'" class="options">
        <label v-for="option in field.options || []" :key="option.value" class="choice"><input type="radio" :name="field.key" :value="option.value" :checked="modelValue[field.key] === option.value" :disabled="readonly" @change="update(field.key, option.value)" /><span class="choice-control"></span><span>{{ option.label }}</span></label>
      </div>

      <label v-else-if="field.type === 'checkbox'" class="choice checkbox-choice"><input type="checkbox" :checked="Boolean(modelValue[field.key])" :disabled="readonly" @change="update(field.key, $event.target.checked)" /><span class="choice-control"><Check :size="14" /></span><span>{{ field.placeholder || field.label }}</span></label>

      <input v-else :id="`field-${field.key}`" :type="inputType(field)" :value="modelValue[field.key] || ''" :placeholder="field.placeholder || (field.type === 'phone' ? '(00) 00000-0000' : '')" :required="field.required" :readonly="readonly" :inputmode="field.type === 'phone' ? 'numeric' : undefined" :pattern="field.type === 'phone' ? '[0-9() -]{14,15}' : undefined" :maxlength="field.type === 'phone' ? 15 : undefined" :aria-invalid="Boolean(errors[field.key])" @input="handleInput(field, $event)" />
      <p v-if="errors[field.key]" class="field-error" role="alert">{{ errors[field.key] }}</p>
    </div>
  </div>
</template>

<style scoped>
.public-fields{display:grid;gap:20px}.field-group{display:grid;gap:8px}.field-label{color:#374151;font-size:14px;font-weight:600}.field-label span{color:#dc2626}.public-fields input:not([type="radio"]):not([type="checkbox"]),textarea{box-sizing:border-box;width:100%;min-height:48px;border:1px solid #d1d5db;border-radius:9px;padding:12px 14px;background:#fff;color:#1f2937;font:inherit;line-height:1.35;transition:border-color .18s,box-shadow .18s}textarea{min-height:112px;resize:vertical}input::placeholder,textarea::placeholder{color:#9ca3af}.select-wrap{position:relative}.select-trigger{display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;width:100%;min-height:48px;border:1px solid #d1d5db;border-radius:9px;padding:12px 14px;background:#fff;color:#1f2937;font:inherit;text-align:left;cursor:pointer;transition:border-color .18s,box-shadow .18s}.select-trigger .placeholder{color:#9ca3af}.select-trigger svg{flex:none;color:#64748b;transition:transform .18s}.select-wrap.open .select-trigger{border-color:var(--form-primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--form-primary,#2563eb) 16%,transparent)}.select-wrap.open .select-trigger svg{transform:rotate(180deg)}.select-menu{position:absolute;z-index:20;top:calc(100% + 6px);right:0;left:0;display:grid;max-height:240px;overflow:auto;padding:6px;border:1px solid #dbe3ed;border-radius:10px;background:#fff;box-shadow:0 12px 28px rgb(15 23 42 / 15%)}.select-menu button{display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:7px;padding:10px 11px;background:#fff;color:#374151;font:inherit;font-size:14px;text-align:left;cursor:pointer}.select-menu button:hover,.select-menu button.selected{background:#eef6ff;color:var(--form-primary,#2563eb)}.public-fields input:not([type="radio"]):not([type="checkbox"]):focus,textarea:focus{outline:0;border-color:var(--form-primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--form-primary,#2563eb) 16%,transparent)}.has-error input:not([type="radio"]):not([type="checkbox"]),.has-error textarea,.has-error .select-trigger{border-color:#dc2626}.field-error{margin:0;color:#b91c1c;font-size:12px}.options{display:grid;gap:9px}.choice{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;font-size:14px;font-weight:500;line-height:1.4;cursor:pointer;transition:border-color .18s,background .18s}.choice:hover{border-color:var(--form-primary,#2563eb);background:#f8fbff}.choice input{position:absolute;opacity:0;pointer-events:none}.choice-control{display:grid;place-items:center;flex:0 0 19px;width:19px;height:19px;box-sizing:border-box;margin-top:1px;border:2px solid #cbd5e1;border-radius:50%;color:transparent}.choice input:checked+.choice-control{border:6px solid var(--form-primary,#2563eb)}.checkbox-choice .choice-control{border-radius:5px}.checkbox-choice .choice-control svg{display:none}.checkbox-choice input:checked+.choice-control{border:0;background:var(--form-primary,#2563eb);color:#fff}.checkbox-choice input:checked+.choice-control svg{display:block}.choice:has(input:checked){border-color:color-mix(in srgb,var(--form-primary,#2563eb) 45%,#fff);background:#f8fbff}.choice:has(input:focus-visible),.select-trigger:focus-visible{outline:3px solid color-mix(in srgb,var(--form-primary,#2563eb) 18%,transparent)}.choice input:disabled~span{opacity:.55}.checkbox-choice{padding-top:10px}
</style>
