<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { X, Save, Stethoscope, Check, Package, AlertTriangle, LoaderCircle } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import EstoqueConsumoPreview from '@/components/pages/atendimentos/EstoqueConsumoPreview.vue'
import { useProceduresStore } from '@/stores/procedures'
import { useEstoqueStore } from '@/stores/estoque'

const props = defineProps({
  appointmentId: {
    type: String,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const proceduresStore = useProceduresStore()
const estoqueStore = useEstoqueStore()

const selectedProcedureId = ref('')
const discountPercentage = ref(0)
const discountValue = ref(0)
const discountMode = ref('percentage') // 'percentage' | 'fixed'

// ─── Estado FEFO ──────────────────────────────────────────────────────────────
const sugestaoFEFO = ref(null)
const loadingFEFO = ref(false)
const erroFEFO = ref('')
const lotesConsumo = ref({}) // key: produtoId, value: { lotes: [] }

// Carrega os procedimentos ao montar o modal
onMounted(async () => {
  if (proceduresStore.procedures.length === 0) {
    await proceduresStore.fetchProcedures()
  }
})

const procedures = computed(() => proceduresStore.procedures)

const procedureOptions = computed(() => {
  return procedures.value.map((proc) => ({
    label: proc.name,
    value: proc._id,
  }))
})

const selectedProcedure = computed(() => {
  return procedures.value.find((p) => p._id === selectedProcedureId.value)
})

const quantity = ref(1)

// ─── Ao selecionar procedimento, busca sugestão FEFO ─────────────────────────
watch(selectedProcedureId, async (newId) => {
  quantity.value = 1
  sugestaoFEFO.value = null
  lotesConsumo.value = {}
  erroFEFO.value = ''

  if (!newId) return

  loadingFEFO.value = true
  try {
    const resultado = await estoqueStore.fetchSugestaoFEFO(newId)
    if (resultado.success && resultado.data?.sugestao) {
      sugestaoFEFO.value = resultado.data.sugestao

      // Inicializa mapa de lotes com a sugestão FEFO
      const mapa = {}
      for (const item of resultado.data.sugestao.itens ?? []) {
        mapa[item.produtoId] = { lotes: item.lotesSugeridos }
      }
      lotesConsumo.value = mapa
    } else {
      // Sem kit vinculado ao procedimento — ok, apenas não exibe seção de estoque
      sugestaoFEFO.value = { itens: [], itensSemLote: [] }
    }
  } catch (e) {
    erroFEFO.value = 'Não foi possível carregar a sugestão de consumo. Tente novamente.'
    console.error('[AddProcedureModal] Erro ao buscar FEFO:', e)
  } finally {
    loadingFEFO.value = false
  }
})

// ─── Atualição manual de lotes pelo EstoqueConsumoPreview ─────────────────────
function handleLoteAtualizado({ produtoId, lotes }) {
  lotesConsumo.value = { ...lotesConsumo.value, [produtoId]: { lotes } }
}

// ─── Validação ────────────────────────────────────────────────────────────────
const itensSemLote = computed(() => sugestaoFEFO.value?.itensSemLote ?? [])

const temItensSemLote = computed(() => itensSemLote.value.length > 0)

const temVencimentoProximo = computed(() => {
  return Object.values(lotesConsumo.value).some((itemLotes) =>
    itemLotes.lotes?.some((l) => l.vencimentoProximo)
  )
})

const podeConfirmar = computed(() => {
  if (!selectedProcedureId.value) return false
  // Bloqueia se houver itens sem lote válido
  if (temItensSemLote.value) return false
  return true
})

// ─── Desconto ─────────────────────────────────────────────────────────────────
watch(discountPercentage, (newValue) => {
  if (newValue > 100) discountPercentage.value = 100
  else if (newValue < 0) discountPercentage.value = 0
})

watch(discountMode, () => {
  discountPercentage.value = 0
  discountValue.value = 0
})

const originalValue = computed(() => {
  if (!selectedProcedure.value) return 0
  const price = selectedProcedure.value.baseValue || selectedProcedure.value.pricePerUnit || 0
  if (selectedProcedure.value.pricingType === 'UNIT' || selectedProcedure.value.pricingType === 'ML') {
    return price * quantity.value
  }
  return price
})

const finalValue = computed(() => {
  const value = originalValue.value
  if (discountMode.value === 'fixed') return Math.max(0, value - discountValue.value)
  if (discountPercentage.value > 0) return value * (1 - discountPercentage.value / 100)
  return value
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// ─── Submit ───────────────────────────────────────────────────────────────────
function handleSubmit() {
  if (!selectedProcedureId.value || !podeConfirmar.value) return

  // Monta a lista flat de itens de consumo (com suporte a multi-lote e auditoria)
  const itensConsumo = []
  for (const item of sugestaoFEFO.value?.itens ?? []) {
    const itemLotes = lotesConsumo.value[item.produtoId]?.lotes ?? item.lotesSugeridos
    for (const lote of itemLotes) {
      // Compatibilidade: FEFO retorna 'id', trocas retornam 'loteId'
      const loteIdFinal = lote.loteId || lote.id
      // Compatibilidade: FEFO retorna 'quantidadeSugeridaNesteLote', trocas retornam 'quantidadeAConsumir'
      const quantidadeFinal = lote.quantidadeAConsumir ?? lote.quantidadeSugeridaNesteLote

      if (!loteIdFinal || !quantidadeFinal || quantidadeFinal <= 0) continue

      itensConsumo.push({
        loteId: loteIdFinal,
        produtoId: item.produtoId,
        quantidade: quantidadeFinal,
        snapshotLote: {
          numeroLote: lote.numeroLote,
          dataValidade: new Date(lote.dataValidade).toISOString(),
          quantidadeConsumida: quantidadeFinal,
          nomeProduto: item.nomeProduto,
        },
        // Inclui auditoria de troca apenas quando houve troca manual
        ...(lote._trocaLote
          ? {
              trocaLote: {
                loteOriginalId: lote._trocaLote.loteOriginalId,
                loteOriginalNumero: lote._trocaLote.loteOriginalNumero,
                motivoTroca: lote._trocaLote.motivoTroca,
              },
            }
          : {}),
      })
    }
  }

  const payload = {
    appointmentId: props.appointmentId,
    procedureId: selectedProcedureId.value,
    discountPercentage: discountMode.value === 'percentage' ? discountPercentage.value : 0,
    discountValue: discountMode.value === 'fixed' ? discountValue.value : 0,
    quantity: quantity.value,
    // Consumo de estoque — vazio se procedimento não tem kit vinculado
    lotesConsumo: itensConsumo,
    procedimentoId: selectedProcedureId.value,
  }

  emit('save', payload)
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <h2 class="drawer-title">
          <Stethoscope :size="20" />
          Adicionar Procedimento
        </h2>
        <button @click="$emit('close')" class="close-btn-header">
          <X :size="24" />
        </button>
      </div>
    </template>

    <div class="drawer-body-content">
      <!-- Seleção de procedimento -->
      <div class="form-group">
        <label class="form-label">Procedimento</label>
        <StyledSelect
          v-model="selectedProcedureId"
          :options="procedureOptions"
        />
      </div>

      <!-- Quantidade e Desconto -->
      <div class="form-row">
        <div class="form-group" v-if="selectedProcedure?.pricingType === 'UNIT' || selectedProcedure?.pricingType === 'ML'">
          <label class="form-label">
            Quantidade ({{ selectedProcedure.pricingType === 'UNIT' ? 'Uni' : 'mL' }})
          </label>
          <input
            v-model.number="quantity"
            type="number"
            min="0.1"
            step="0.1"
            class="form-input"
            placeholder="0"
          />
        </div>

        <div class="form-group">
          <div class="label-row">
            <label class="form-label">Desconto</label>
            <button class="toggle-mode-btn" @click="discountMode = discountMode === 'percentage' ? 'fixed' : 'percentage'">
              {{ discountMode === 'percentage' ? 'Mudar para R$' : 'Mudar para %' }}
            </button>
          </div>

          <div class="input-wrapper" v-if="discountMode === 'percentage'">
            <input
              v-model.number="discountPercentage"
              type="number"
              min="0"
              max="100"
              class="form-input"
              placeholder="0"
            />
            <span class="suffix">%</span>
          </div>

          <div class="input-wrapper" v-else>
            <span class="prefix">R$</span>
            <input
              v-model.number="discountValue"
              type="number"
              min="0"
              step="0.01"
              class="form-input pl-10"
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <!-- Resumo de valores -->
      <div class="values-summary" v-if="selectedProcedure">
        <div class="summary-row">
          <span>Valor Original:</span>
          <strong>{{ formatCurrency(originalValue) }}</strong>
        </div>
        <div class="summary-row discount" v-if="originalValue > finalValue">
          <span v-if="discountMode === 'percentage'">Desconto ({{ discountPercentage }}%):</span>
          <span v-else>Desconto:</span>
          <strong>- {{ formatCurrency(originalValue - finalValue) }}</strong>
        </div>
        <div class="summary-row total">
          <span>Valor Final:</span>
          <strong>{{ formatCurrency(finalValue) }}</strong>
        </div>
      </div>

      <!-- ─── Seção de Consumo de Estoque ─────────────────────────────────── -->
      <div v-if="selectedProcedureId" class="estoque-section">
        <div class="estoque-section-header">
          <div class="estoque-title">
            <Package :size="16" />
            <span>Consumo de Estoque</span>
          </div>
          <div v-if="loadingFEFO" class="estoque-loading">
            <LoaderCircle :size="14" class="spin" />
            Verificando estoque...
          </div>
        </div>

        <!-- Erro ao buscar sugestão -->
        <div v-if="erroFEFO && !loadingFEFO" class="estoque-erro">
          <AlertTriangle :size="14" />
          {{ erroFEFO }}
        </div>

        <!-- Sem kit vinculado -->
        <div
          v-else-if="!loadingFEFO && sugestaoFEFO && sugestaoFEFO.itens.length === 0 && itensSemLote.length === 0"
          class="estoque-sem-kit"
        >
          Nenhum consumo de estoque vinculado a este procedimento.
        </div>

        <!-- Itens sem lote disponível (bloqueantes) -->
        <div v-if="!loadingFEFO && itensSemLote.length > 0" class="estoque-sem-lote">
          <div class="sem-lote-header">
            <AlertTriangle :size="14" />
            <strong>Sem lote disponível — Procedimento bloqueado</strong>
          </div>
          <ul class="sem-lote-lista">
            <li v-for="item in itensSemLote" :key="item.produtoId">
              {{ item.nomeProduto }} — {{ item.quantidadeSugerida }} un necessárias
            </li>
          </ul>
          <p class="sem-lote-dica">Registre a entrada de estoque para estes produtos antes de continuar.</p>
        </div>

        <!-- Alerta de vencimento próximo (não bloqueante) -->
        <div v-if="!loadingFEFO && temVencimentoProximo && sugestaoFEFO?.itens.length > 0" class="aviso-vencimento">
          <AlertTriangle :size="14" />
          Um ou mais lotes estão próximos do vencimento. Verifique os detalhes abaixo.
        </div>

        <!-- Preview de lotes por item -->
        <div v-if="!loadingFEFO && sugestaoFEFO?.itens.length > 0" class="itens-consumo">
          <EstoqueConsumoPreview
            v-for="item in sugestaoFEFO.itens"
            :key="item.produtoId"
            :item="item"
            :disabled="isLoading"
            @lote-atualizado="handleLoteAtualizado"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')" class="btn-cancel">
          <X :size="18" />
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
          :disabled="!podeConfirmar || isLoading"
          :loading="isLoading"
          class="btn-save"
          :title="temItensSemLote ? 'Sem estoque disponível para um ou mais produtos do procedimento' : ''"
        >
          <Check :size="18" />
          Salvar
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn-header {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn-header:hover {
  color: #111827;
}

.drawer-body-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  color: #111827;
  background-color: #fff;
  height: 48px;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.suffix {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.prefix {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.pl-10 {
  padding-left: 2.5rem;
}

.values-summary {
  background-color: #f9fafb;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid #f3f4f6;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #4b5563;
}

.summary-row.discount {
  color: #ef4444;
}

.summary-row.total {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  font-size: 1.125rem;
  color: #111827;
  font-weight: 600;
}

/* ─── Seção de Estoque ────────────────────────────────────────────────────── */
.estoque-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.estoque-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.estoque-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
}

.estoque-loading {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.estoque-sem-kit {
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px dashed #e5e7eb;
}

.estoque-erro {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  padding: 0.625rem;
}

/* Sem lote — bloqueia confirmação */
.estoque-sem-lote {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 0.625rem;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sem-lote-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: #dc2626;
}

.sem-lote-lista {
  font-size: 0.78rem;
  color: #b91c1c;
  padding-left: 1.25rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sem-lote-dica {
  font-size: 0.72rem;
  color: #9ca3af;
  margin: 0;
}

/* Aviso de vencimento (não bloqueia) */
.aviso-vencimento {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.78rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.itens-consumo {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Footer */
.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-mode-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--azul-principal, #3b82f6);
  cursor: pointer;
  font-weight: 500;
  padding: 0;
}

.toggle-mode-btn:hover {
  text-decoration: underline;
}
</style>
