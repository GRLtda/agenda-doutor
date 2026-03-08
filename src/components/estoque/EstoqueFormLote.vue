<script setup>
// EstoqueFormLote.vue — Formulário de entrada de mercadoria (criação de lote)
import { ref, watch, computed } from 'vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

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
const errors = ref({})

watch(() => props.modelValue, (val) => {
  // Evitar overwrite se estamos no meio de uma edição local
  if (JSON.stringify(form.value) !== JSON.stringify(val)) {
    form.value = { ...val }
  }
}, { deep: true })

function validate() {
  const newErrors = {}
  
  if (!form.value.produtoId) newErrors.produtoId = 'Selecione um produto'
  
  if (!form.value.numeroLote || form.value.numeroLote.trim().length === 0) {
    newErrors.numeroLote = 'Número do lote é obrigatório'
  } else if (form.value.numeroLote.length > 100) {
    newErrors.numeroLote = 'Máximo de 100 caracteres'
  }

  if (!form.value.dataValidade) {
    newErrors.dataValidade = 'Data de validade é obrigatória'
  } else {
    const dataVal = new Date(form.value.dataValidade)
    const hojeData = new Date()
    hojeData.setHours(0, 0, 0, 0)
    if (dataVal <= hojeData) {
      newErrors.dataValidade = 'A validade deve ser uma data futura'
    }
  }

  if (!form.value.saldoInicial && form.value.saldoInicial !== 0) {
    newErrors.saldoInicial = 'Quantidade é obrigatória'
  } else if (parseFloat(form.value.saldoInicial) <= 0) {
    newErrors.saldoInicial = 'Quantidade deve ser maior que zero'
  }

  if (form.value.fornecedor && form.value.fornecedor.length > 200) {
    newErrors.fornecedor = 'Máximo de 200 caracteres'
  }
  if (form.value.notaFiscal && form.value.notaFiscal.length > 100) {
    newErrors.notaFiscal = 'Máximo de 100 caracteres'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function update(field, value) {
  form.value[field] = value
  
  // Se a data mudar, garantir que seja enviada no formato que o Zod espera (ISO datetime)
  // Mas no form interno mantemos YYYY-MM-DD para o input Date
  let valueToEmit = value
  if (field === 'dataValidade' && value) {
    // Adiciona T00:00:00Z para satisfazer z.datetime() do backend
    valueToEmit = `${value}T12:00:00.000Z`
  }

  const updatedForm = { ...form.value }
  if (field === 'dataValidade') updatedForm.dataValidade = valueToEmit

  emit('update:modelValue', updatedForm)
  
  // Limpa erro do campo ao digitar
  if (errors.value[field]) {
    delete errors.value[field]
  }
}

defineExpose({ validate })

// Data mínima para validade = amanhã (pois o backend pede data futura)
const amanha = new Date()
amanha.setDate(amanha.getDate() + 1)
const amanhaISO = amanha.toISOString().split('T')[0]

const opcoesProdutos = computed(() => 
  props.produtos.map(p => ({
    label: `${p.nome} — ${p.unidadeMedida}`,
    value: p._id
  }))
)
</script>

<template>
  <div class="form-lote">
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

    <!-- Número do Lote -->
    <div class="field">
      <label class="label">Número do lote <span class="required">*</span></label>
      <input
        class="input"
        :class="{ 'input--error': errors.numeroLote }"
        type="text"
        placeholder="Ex: LT-2025-001"
        :value="form.numeroLote"
        @input="update('numeroLote', $event.target.value)"
      />
      <span v-if="errors.numeroLote" class="error-msg">{{ errors.numeroLote }}</span>
    </div>

    <!-- Data de Validade -->
    <div class="field">
      <label class="label">Data de validade <span class="required">*</span></label>
      <input
        class="input"
        :class="{ 'input--error': errors.dataValidade }"
        type="date"
        :min="amanhaISO"
        :value="form.dataValidade?.split('T')[0]"
        @change="update('dataValidade', $event.target.value)"
      />
      <span v-if="errors.dataValidade" class="error-msg">{{ errors.dataValidade }}</span>
    </div>

    <!-- Saldo Inicial -->
    <div class="field">
      <label class="label">Quantidade recebida <span class="required">*</span></label>
      <input
        class="input"
        :class="{ 'input--error': errors.saldoInicial }"
        type="number"
        min="0.001"
        step="0.5"
        placeholder="Ex: 10"
        :value="form.saldoInicial"
        @input="update('saldoInicial', parseFloat($event.target.value))"
      />
      <span v-if="errors.saldoInicial" class="error-msg">{{ errors.saldoInicial }}</span>
    </div>

    <!-- Fornecedor -->
    <div class="field">
      <label class="label">Fornecedor</label>
      <input
        class="input"
        :class="{ 'input--error': errors.fornecedor }"
        type="text"
        placeholder="Ex: Distribuidora Medica X"
        :value="form.fornecedor"
        @input="update('fornecedor', $event.target.value)"
      />
      <span v-if="errors.fornecedor" class="error-msg">{{ errors.fornecedor }}</span>
    </div>

    <!-- Nota Fiscal -->
    <div class="field">
      <label class="label">Nota fiscal</label>
      <input
        class="input"
        :class="{ 'input--error': errors.notaFiscal }"
        type="text"
        placeholder="Ex: NF-0042"
        :value="form.notaFiscal"
        @input="update('notaFiscal', $event.target.value)"
      />
      <span v-if="errors.notaFiscal" class="error-msg">{{ errors.notaFiscal }}</span>
    </div>

    <div class="info-box">
      <span>📋</span>
      <span>Uma movimentação de <strong>ENTRADA</strong> será registrada automaticamente no Livro-Razão.</span>
    </div>
  </div>
</template>

<style scoped>
.form-lote {
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
