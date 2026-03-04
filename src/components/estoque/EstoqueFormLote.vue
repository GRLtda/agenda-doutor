<script setup>
// EstoqueFormLote.vue — Formulário de entrada de mercadoria (criação de lote)
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
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

// Data mínima para validade = hoje
const hoje = new Date().toISOString().split('T')[0]
</script>

<template>
  <div class="form-lote">
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

    <!-- Número do Lote -->
    <div class="field">
      <label class="label">Número do lote <span class="required">*</span></label>
      <input
        class="input"
        type="text"
        placeholder="Ex: LT-2025-001"
        :value="form.numeroLote"
        @input="update('numeroLote', $event.target.value)"
      />
    </div>

    <!-- Data de Validade -->
    <div class="field">
      <label class="label">Data de validade <span class="required">*</span></label>
      <input
        class="input"
        type="date"
        :min="hoje"
        :value="form.dataValidade"
        @change="update('dataValidade', $event.target.value)"
      />
    </div>

    <!-- Saldo Inicial -->
    <div class="field">
      <label class="label">Quantidade recebida <span class="required">*</span></label>
      <input
        class="input"
        type="number"
        min="0.001"
        step="0.5"
        placeholder="Ex: 10"
        :value="form.saldoInicial"
        @input="update('saldoInicial', parseFloat($event.target.value))"
      />
    </div>

    <!-- Fornecedor -->
    <div class="field">
      <label class="label">Fornecedor</label>
      <input
        class="input"
        type="text"
        placeholder="Ex: Distribuidora Medica X"
        :value="form.fornecedor"
        @input="update('fornecedor', $event.target.value)"
      />
    </div>

    <!-- Nota Fiscal -->
    <div class="field">
      <label class="label">Nota fiscal</label>
      <input
        class="input"
        type="text"
        placeholder="Ex: NF-0042"
        :value="form.notaFiscal"
        @input="update('notaFiscal', $event.target.value)"
      />
    </div>

    <div class="info-box">
      <span>📋</span>
      <span>Uma movimentação de <strong>ENTRADA</strong> será registrada automaticamente no Livro-Razão.</span>
    </div>
  </div>
</template>

<style scoped>
.form-lote {
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
  box-shadow: 0 0 0 3px rgba(82, 130, 255, 0.15);
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  font-size: 0.82rem;
  color: #1d4ed8;
  line-height: 1.5;
}
</style>
