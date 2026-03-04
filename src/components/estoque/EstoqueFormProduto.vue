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

watch(() => props.modelValue, (val) => {
  form.value = { ...val }
}, { deep: true })

function update(field, value) {
  form.value[field] = value
  emit('update:modelValue', { ...form.value })
}

const unidades = ['ML', 'UN', 'AMP', 'CX', 'FR', 'G', 'MG', 'L', 'KIT']
const categorias = ['Preenchimento', 'Toxina Botulínica', 'Skinbooster', 'Fio', 'Anestésico', 'Material cirúrgico', 'Descartáveis', 'Outros']
</script>

<template>
  <div class="form-produto">
    <!-- Nome -->
    <div class="field">
      <label class="label">Nome do produto <span class="required">*</span></label>
      <input
        class="input"
        type="text"
        placeholder="Ex: Ácido Hialurônico 1ml"
        :value="form.nome"
        @input="update('nome', $event.target.value)"
      />
    </div>

    <!-- Unidade de Medida -->
    <div class="field">
      <label class="label">Unidade de medida <span class="required">*</span></label>
      <select class="input" :value="form.unidadeMedida" @change="update('unidadeMedida', $event.target.value)">
        <option value="" disabled>Selecione...</option>
        <option v-for="u in unidades" :key="u" :value="u">{{ u }}</option>
      </select>
    </div>

    <!-- Categoria -->
    <div class="field">
      <label class="label">Categoria</label>
      <select class="input" :value="form.categoria" @change="update('categoria', $event.target.value)">
        <option value="">Sem categoria</option>
        <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Fabricante -->
    <div class="field">
      <label class="label">Fabricante</label>
      <input
        class="input"
        type="text"
        placeholder="Ex: Galderma"
        :value="form.fabricante"
        @input="update('fabricante', $event.target.value)"
      />
    </div>

    <!-- Estoque mínimo -->
    <div class="field">
      <label class="label">Estoque mínimo</label>
      <input
        class="input"
        type="number"
        min="0"
        step="0.5"
        placeholder="0"
        :value="form.quantidadeMinima"
        @input="update('quantidadeMinima', parseFloat($event.target.value))"
      />
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

    <div v-if="!form.nome || !form.unidadeMedida" class="validation-hint">
      <AlertCircle :size="14" />
      Nome e unidade de medida são obrigatórios.
    </div>
  </div>
</template>

<style scoped>
.form-produto {
  padding: 1.5rem;
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

.validation-hint {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #f59e0b;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.6rem;
}
</style>
