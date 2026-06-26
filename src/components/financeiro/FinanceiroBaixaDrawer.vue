<script setup>
import { computed, reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const props = defineProps({
  conta: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  amount: '',
  method: 'PIX',
  settledAt: new Date().toISOString().slice(0, 10),
  notes: '',
})

const paymentOptions = [
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'PIX', value: 'PIX' },
  { label: 'Cartao de credito', value: 'CARTAO_CREDITO' },
  { label: 'Cartao de debito', value: 'CARTAO_DEBITO' },
  { label: 'Boleto', value: 'BOLETO' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Outro', value: 'OUTRO' },
]

const actionLabel = computed(() =>
  props.conta.type === 'RECEIVABLE' ? 'Registrar recebimento' : 'Registrar pagamento'
)

const amountLabel = computed(() =>
  props.conta.type === 'RECEIVABLE' ? 'Valor recebido' : 'Valor pago'
)

const remainingCents = computed(() => Number(props.conta.remainingAmountCents || 0))

function centsToReais(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

function reaisToCents(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}

function resetForm() {
  form.amount = centsToReais(remainingCents.value)
  form.method = props.conta.expectedPaymentMethod || 'PIX'
  form.settledAt = new Date().toISOString().slice(0, 10)
  form.notes = ''
}

function submit() {
  const amountCents = reaisToCents(form.amount)
  if (amountCents <= 0 || amountCents > remainingCents.value || !form.method || !form.settledAt) return
  emit('save', {
    amountCents,
    method: form.method,
    settledAt: form.settledAt,
    notes: form.notes?.trim() || undefined,
  })
}

watch(() => props.conta, resetForm, { immediate: true })
</script>

<template>
  <SideDrawer size="sm" @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <div>
          <h2>{{ actionLabel }}</h2>
          <p>{{ conta.title }}</p>
        </div>
        <button type="button" class="mobile-close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>
    </template>

    <form class="finance-form" @submit.prevent="submit">
      <div class="info-box">
        <span>Saldo em aberto</span>
        <strong>{{ centsToReais(remainingCents) }}</strong>
      </div>

      <div class="form-group">
        <label>{{ amountLabel }}</label>
        <input v-model="form.amount" type="number" min="0" step="0.01" required />
      </div>

      <StyledSelect
        v-model="form.method"
        label="Forma"
        :options="paymentOptions"
        placeholder="Selecione"
      />

      <div class="form-group">
        <label>Data</label>
        <input v-model="form.settledAt" type="date" required />
      </div>

      <div class="form-group">
        <label>Observacoes</label>
        <textarea v-model="form.notes" rows="4" placeholder="Informacoes internas"></textarea>
      </div>
    </form>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">Fechar</AppButton>
        <AppButton variant="primary" :loading="loading" @click="submit">{{ actionLabel }}</AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--preto);
}

.drawer-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.finance-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.info-box span {
  color: #64748b;
  font-size: 0.9rem;
}

.info-box strong {
  color: #111827;
  font-size: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-size: 0.95rem;
  min-height: 44px;
  padding: 0 0.85rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group textarea {
  padding: 0.75rem 0.85rem;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
</style>
