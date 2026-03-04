<script setup>
// EstoqueFormMovAdm.vue — Formulário de baixa administrativa
import { ref, watch, computed } from 'vue'

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

watch(() => props.modelValue, (val) => {
  form.value = { ...val }
}, { deep: true })

function update(field, value) {
  form.value[field] = value
  emit('update:modelValue', { ...form.value })
}

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
</script>

<template>
  <div class="form-mov-adm">
    <!-- Produto -->
    <div class="field">
      <label class="label">Produto <span class="required">*</span></label>
      <select class="input" :value="form.produtoId" @change="update('produtoId', $event.target.value)">
        <option value="" disabled>Selecione o produto...</option>
        <option v-for="p in produtos" :key="p._id" :value="p._id">
          {{ p.nome }} — {{ p.unidadeMedida }}
        </option>
      </select>
    </div>

    <!-- Lote -->
    <div class="field">
      <label class="label">Lote <span class="required">*</span></label>
      <select class="input" :value="form.loteId" @change="update('loteId', $event.target.value)">
        <option value="" disabled>Selecione o lote...</option>
        <option v-for="l in lotes" :key="l._id" :value="l._id">
          {{ l.numeroLote }} — Saldo: {{ l.saldoAtual }} — Validade: {{ l.dataValidade ? new Date(l.dataValidade).toLocaleDateString('pt-BR') : '—' }}
        </option>
      </select>
      <p v-if="loteSelecionado" class="hint">
        Saldo disponível: <strong>{{ loteSelecionado.saldoAtual }}</strong>
      </p>
    </div>

    <!-- Motivo -->
    <div class="field">
      <label class="label">Motivo <span class="required">*</span></label>
      <div class="motivos-grid">
        <button
          v-for="m in motivos"
          :key="m.value"
          type="button"
          class="motivo-btn"
          :class="{ 'motivo-btn--active': form.motivo === m.value }"
          @click="update('motivo', m.value)"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Quantidade -->
    <div class="field">
      <label class="label">Quantidade a baixar <span class="required">*</span></label>
      <input
        class="input"
        type="number"
        min="0.001"
        :max="saldoMaximo"
        step="0.5"
        placeholder="Ex: 3"
        :value="form.quantidade"
        @input="update('quantidade', parseFloat($event.target.value))"
      />
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
