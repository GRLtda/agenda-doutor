<script setup>
// EstoqueFormProduto.vue — Formulário de produto (criar/editar)
import { ref, watch } from 'vue'
import { AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const form = ref({ ...props.modelValue })
const errors = ref({})

watch(() => props.modelValue, (val) => {
  if (JSON.stringify(form.value) !== JSON.stringify(val)) {
    form.value = { ...val }
  }
}, { deep: true })

function validate() {
  const newErrors = {}

  if (!form.value.nome || form.value.nome.trim().length < 2) {
    newErrors.nome = 'O nome deve ter pelo menos 2 caracteres'
  } else if (form.value.nome.length > 200) {
    newErrors.nome = 'Máximo de 200 caracteres'
  }

  if (!form.value.unidadeMedida) {
    newErrors.unidadeMedida = 'Selecione uma unidade de medida'
  } else if (!unidades.includes(form.value.unidadeMedida)) {
    newErrors.unidadeMedida = 'Unidade de medida inválida'
  }

  if (form.value.categoria && form.value.categoria.length > 100) {
    newErrors.categoria = 'Máximo de 100 caracteres'
  }

  if (form.value.fabricante && form.value.fabricante.length > 200) {
    newErrors.fabricante = 'Máximo de 200 caracteres'
  }

  if (form.value.quantidadeMinima < 0) {
    newErrors.quantidadeMinima = 'Não pode ser negativa'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function update(field, value) {
  form.value[field] = value
  emit('update:modelValue', { ...form.value })
  
  if (errors.value[field]) {
    delete errors.value[field]
  }
}

defineExpose({ validate })

const unidades = ['UNIDADE', 'ML', 'SERINGA']
const categorias = ['Preenchimento', 'Toxina Botulínica', 'Skinbooster', 'Fio', 'Anestésico', 'Material cirúrgico', 'Descartáveis', 'Outros']
</script>

<template>
  <div class="form-produto">
    <!-- Nome -->
    <div class="field">
      <label class="label">Nome do produto <span class="required">*</span></label>
      <input
        class="input"
        :class="{ 'input--error': errors.nome }"
        type="text"
        placeholder="Ex: Ácido Hialurônico 1ml"
        :value="form.nome"
        @input="update('nome', $event.target.value)"
      />
      <span v-if="errors.nome" class="error-msg">{{ errors.nome }}</span>
    </div>

    <!-- Unidade de Medida -->
    <div class="field">
      <label class="label">Unidade de medida <span class="required">*</span></label>
      <select 
        class="input" 
        :class="{ 'input--error': errors.unidadeMedida }"
        :value="form.unidadeMedida" 
        @change="update('unidadeMedida', $event.target.value)"
      >
        <option value="" disabled>Selecione...</option>
        <option v-for="u in unidades" :key="u" :value="u">{{ u }}</option>
      </select>
      <span v-if="errors.unidadeMedida" class="error-msg">{{ errors.unidadeMedida }}</span>
    </div>

    <!-- Categoria -->
    <div class="field">
      <label class="label">Categoria</label>
      <select 
        class="input" 
        :class="{ 'input--error': errors.categoria }"
        :value="form.categoria" 
        @change="update('categoria', $event.target.value)"
      >
        <option value="">Sem categoria</option>
        <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
      </select>
      <span v-if="errors.categoria" class="error-msg">{{ errors.categoria }}</span>
    </div>

    <!-- Fabricante -->
    <div class="field">
      <label class="label">Fabricante</label>
      <input
        class="input"
        :class="{ 'input--error': errors.fabricante }"
        type="text"
        placeholder="Ex: Galderma"
        :value="form.fabricante"
        @input="update('fabricante', $event.target.value)"
      />
      <span v-if="errors.fabricante" class="error-msg">{{ errors.fabricante }}</span>
    </div>

    <!-- Estoque mínimo -->
    <div class="field">
      <label class="label">Estoque mínimo</label>
      <input
        class="input"
        :class="{ 'input--error': errors.quantidadeMinima }"
        type="number"
        min="0"
        step="0.5"
        placeholder="0"
        :value="form.quantidadeMinima"
        @input="update('quantidadeMinima', parseFloat($event.target.value))"
      />
      <span v-if="errors.quantidadeMinima" class="error-msg">{{ errors.quantidadeMinima }}</span>
      <p class="hint">O sistema vai alertar quando o saldo total cair abaixo desse valor.</p>
    </div>

    <!-- Aceita Fração -->
    <div class="field field--row">
      <div class="toggle-group">
        <label class="label" for="acfrac">Aceita fração</label>
        <p class="hint">Permite quantidades decimais (ex: 0,5 ml)</p>
      </div>
      <button
        type="button"
        class="toggle"
        :class="{ 'toggle--on': form.aceitaFracao }"
        @click="update('aceitaFracao', !form.aceitaFracao)"
        id="acfrac"
        :aria-checked="form.aceitaFracao"
        role="switch"
      >
        <span class="toggle-knob" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-produto {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #ef4444;
}

.input {
  padding: 0.625rem 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  color: #111827;
  background-color: #fff;
  transition: border-color 0.2s;
  outline: none;
  width: 100%;
}

.input:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(var(--azul-principal-rgb, 82, 130, 255), 0.15);
}

.hint {
  font-size: 0.78rem;
  color: #9ca3af;
  margin: 0;
}

/* Toggle switch */
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background-color: #d1d5db;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.toggle--on {
  background-color: var(--azul-principal);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}

.toggle--on .toggle-knob {
  transform: translateX(20px);
}

.input--error {
  border-color: #ef4444 !important;
}

.input--error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
}

.error-msg {
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: -0.2rem;
}
</style>
