<script setup>
// EstoqueFormMovAdm.vue — Formulário de baixa administrativa
import { ref, watch, computed } from 'vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  lotes: {
    type: Array,
    default: () => [],
  },
  produtos: {
    type: Array,
    default: () => [],
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

  if (!form.value.produtoId) newErrors.produtoId = 'Selecione um produto'
  if (!form.value.loteId) newErrors.loteId = 'Selecione um lote'
  if (!form.value.motivo) newErrors.motivo = 'Selecione o motivo'
  
  if (!form.value.quantidade && form.value.quantidade !== 0) {
    newErrors.quantidade = 'Quantidade é obrigatória'
  } else if (parseFloat(form.value.quantidade) <= 0) {
    newErrors.quantidade = 'Deve ser maior que zero'
  } else if (parseFloat(form.value.quantidade) > saldoMaximo.value) {
    newErrors.quantidade = `Máximo disponível: ${saldoMaximo.value}`
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

const motivos = [
  { value: 'VENCIMENTO', label: 'Vencimento' },
  { value: 'AVARIA',     label: 'Avaria' },
  { value: 'AJUSTE',     label: 'Ajuste de estoque' },
  { value: 'PERDA',      label: 'Perda / Extravio' },
]

const loteSelecionado = computed(() =>
  props.lotes.find((l) => l._id === form.value.loteId)
)

const saldoMaximo = computed(() => loteSelecionado.value?.saldoAtual ?? Infinity)

const opcoesProdutos = computed(() => 
  props.produtos.map(p => ({
    label: `${p.nome} — ${p.unidadeMedida}`,
    value: p._id
  }))
)

const opcoesLotes = computed(() => 
  props.lotes.map(l => ({
    label: `${l.numeroLote} — Saldo: ${l.saldoAtual} — Validade: ${l.dataValidade ? new Date(l.dataValidade).toLocaleDateString('pt-BR') : '—'}`,
    value: l._id
  }))
)
</script>

<template>
  <div class="form-mov-adm">
    <!-- Produto -->
    <div class="field">
      <StyledSelect
        label="Produto"
        :required="true"
        :options="opcoesProdutos"
        :modelValue="form.produtoId"
        :error="!!errors.produtoId"
        @update:modelValue="update('produtoId', $event)"
      />
      <span v-if="errors.produtoId" class="error-msg">{{ errors.produtoId }}</span>
    </div>

    <!-- Lote -->
    <div class="field">
      <StyledSelect
        label="Lote"
        :required="true"
        :options="opcoesLotes"
        :modelValue="form.loteId"
        :error="!!errors.loteId"
        @update:modelValue="update('loteId', $event)"
      />
      <p v-if="loteSelecionado" class="hint">
        Saldo disponível: <strong>{{ loteSelecionado.saldoAtual }}</strong>
      </p>
      <span v-if="errors.loteId" class="error-msg">{{ errors.loteId }}</span>
    </div>

    <!-- Motivo -->
    <div class="field">
      <label class="label">Motivo <span class="required">*</span></label>
      <div class="motivos-grid" :class="{ 'grid--error': errors.motivo }">
        <button
          v-for="m in motivos"
          :key="m.value"
          type="button"
          class="motivo-btn"
          :class="{ 'motivo-btn--active': form.motivo === m.value, 'motivo-btn--error': errors.motivo }"
          @click="update('motivo', m.value)"
        >
          {{ m.label }}
        </button>
      </div>
      <span v-if="errors.motivo" class="error-msg">{{ errors.motivo }}</span>
    </div>

    <!-- Quantidade -->
    <div class="field">
      <label class="label">Quantidade a baixar <span class="required">*</span></label>
      <input
        class="input"
        :class="{ 'input--error': errors.quantidade }"
        type="number"
        min="0.001"
        :max="saldoMaximo"
        step="0.5"
        placeholder="Ex: 3"
        :value="form.quantidade"
        @input="update('quantidade', parseFloat($event.target.value))"
      />
      <span v-if="errors.quantidade" class="error-msg">{{ errors.quantidade }}</span>
    </div>

    <!-- Observação -->
    <div class="field">
      <label class="label">Observação</label>
      <textarea
        class="input textarea"
        rows="3"
        placeholder="Ex: Lote vencido em 01/03/2026"
        :value="form.observacao"
        @input="update('observacao', $event.target.value)"
      />
    </div>

    <div class="warning-box">
      <span>⚠️</span>
      <span>Esta ação registrará uma saída no Livro-Razão e <strong>não poderá ser desfeita</strong>.</span>
    </div>
  </div>
</template>

<style scoped>
.form-mov-adm {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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
  box-shadow: 0 0 0 3px rgba(82, 130, 255, 0.15);
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

.textarea {
  resize: none;
  font-family: inherit;
}

.hint {
  font-size: 0.78rem;
  color: #9ca3af;
  margin: 0;
}

.motivos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.motivo-btn {
  padding: 0.6rem 0.5rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  color: #374151;
  transition: all 0.15s ease;
  text-align: center;
}

.motivo-btn:hover {
  border-color: var(--azul-principal);
  background: #eff6ff;
  color: #1d4ed8;
}

.motivo-btn--active {
  border-color: var(--azul-principal);
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.motivo-btn--error {
  border-color: #fca5a5;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 0.75rem;
  font-size: 0.82rem;
  color: #c2410c;
  line-height: 1.5;
}
</style>
