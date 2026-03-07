<script setup>
/**
 * EstoqueConsumoPreview.vue
 *
 * Componente que exibe o preview do consumo de estoque para um item de procedimento.
 * Mostra os lotes sugeridos por FEFO, alerta de vencimento próximo,
 * divisão multi-lote e permite troca manual de lote com motivo obrigatório.
 */
import { ref, computed, watch } from 'vue'
import { AlertTriangle, RefreshCw, CheckCircle, X, ChevronDown } from 'lucide-vue-next'
import { useEstoqueStore } from '@/stores/estoque'

const props = defineProps({
  item: {
    type: Object,
    required: true,
    // Item da sugestão FEFO com estrutura:
    // { produtoId, nomeProduto, unidadeMedida, quantidadeSugerida, lotesSugeridos, saldoSuficiente }
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['lote-atualizado'])

const estoqueStore = useEstoqueStore()

// ─── Estado de troca manual ───────────────────────────────────────────────────
const trocandoLote    = ref(false)  // índice de lote sendo trocado (ou null quando o índice é 0)
const indiceTroca     = ref(null)   // qual lote do array estamos trocando
const novosLotes      = ref([...props.item.lotesSugeridos]) // cópia editável dos lotes
const motivoTroca     = ref('')
const lotesAlternativos = ref([])
const loadingAlternativos = ref(false)
const erroMotivo      = ref('')

// ─── Flag de aviso global ─────────────────────────────────────────────────────
const temVencimentoProximo = computed(() =>
  novosLotes.value.some((l) => l.vencimentoProximo)
)

// ─── Formatar data ────────────────────────────────────────────────────────────
function formatarData(dataIso) {
  if (!dataIso) return '—'
  return new Date(dataIso).toLocaleDateString('pt-BR')
}

// ─── Dias até vencimento ──────────────────────────────────────────────────────
function diasAteVencimento(dataValidade) {
  const hoje = new Date()
  const validade = new Date(dataValidade)
  return Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24))
}

// ─── Abrir painel de troca ────────────────────────────────────────────────────
async function abrirTrocaLote(indice) {
  indiceTroca.value = indice
  trocandoLote.value = true
  motivoTroca.value = ''
  erroMotivo.value = ''
  lotesAlternativos.value = []

  // Busca lotes disponíveis para o produto
  loadingAlternativos.value = true
  const resultado = await estoqueStore.fetchLotesDisponiveis(props.item.produtoId)
  if (resultado.success) {
    // Exclui lotes já usados em outros índices para evitar duplicidade
    // Compatibilidade: FEFO usa 'id', disponíveis usa 'loteId'
    const lotesJaUsados = novosLotes.value
      .filter((_, i) => i !== indice)
      .map((l) => l.loteId || l.id)
    lotesAlternativos.value = (resultado.data || []).filter(
      (l) => !lotesJaUsados.includes(l.loteId || l.id)
    )
  }
  loadingAlternativos.value = false
}

// ─── Confirmar troca de lote ──────────────────────────────────────────────────
function confirmarTroca(novoLote) {
  if (!motivoTroca.value.trim() || motivoTroca.value.trim().length < 5) {
    erroMotivo.value = 'O motivo deve ter ao menos 5 caracteres.'
    return
  }

  const loteAtual = novosLotes.value[indiceTroca.value]
  // Compatibilidade: FEFO retorna 'id', endpoint disponíveis retorna 'loteId'
  const loteAtualId = loteAtual.loteId || loteAtual.id
  const quantidadeAtual = loteAtual.quantidadeAConsumir ?? loteAtual.quantidadeSugeridaNesteLote

  // Novo lote com quantidade preservada e auditoria de troca registrada
  const loteComTroca = {
    ...novoLote,
    // Normaliza para 'loteId' depois da troca (endpoint de disponíveis já usa esse campo)
    loteId: novoLote.loteId || novoLote.id,
    quantidadeAConsumir: quantidadeAtual,
    _trocaLote: {
      loteOriginalId: loteAtualId,
      loteOriginalNumero: loteAtual.numeroLote,
      motivoTroca: motivoTroca.value.trim(),
    },
  }

  novosLotes.value = novosLotes.value.map((l, i) =>
    i === indiceTroca.value ? loteComTroca : l
  )

  fecharTroca()
  emitirAtualizacao()
}

function fecharTroca() {
  trocandoLote.value = false
  indiceTroca.value = null
  motivoTroca.value = ''
  erroMotivo.value = ''
  lotesAlternativos.value = []
}

// ─── Emitir atualização para o pai ───────────────────────────────────────────
function emitirAtualizacao() {
  emit('lote-atualizado', {
    produtoId: props.item.produtoId,
    lotes: novosLotes.value,
  })
}

// Emitir na montagem com o estado inicial
watch(
  () => props.item,
  () => {
    novosLotes.value = [...props.item.lotesSugeridos]
    emitirAtualizacao()
  },
  { immediate: true }
)
</script>

<template>
  <div class="consumo-item" :class="{ 'tem-aviso': temVencimentoProximo, 'sem-saldo': !item.saldoSuficiente }">
    <!-- Cabeçalho do Item -->
    <div class="consumo-header">
      <div class="produto-info">
        <span class="produto-nome">{{ item.nomeProduto }}</span>
        <span class="produto-qtd">{{ item.quantidadeSugerida }} {{ item.unidadeMedida }}</span>
      </div>

      <!-- Badge de aviso de vencimento próximo -->
      <div v-if="temVencimentoProximo" class="badge-aviso">
        <AlertTriangle :size="13" />
        Venc. próximo
      </div>

      <!-- Badge sem saldo -->
      <div v-if="!item.saldoSuficiente" class="badge-sem-saldo">
        <AlertTriangle :size="13" />
        Saldo insuficiente
      </div>
    </div>

    <!-- Lista de Lotes -->
    <div class="lotes-lista">
      <div
        v-for="(lote, idx) in novosLotes"
        :key="lote.loteId"
        class="lote-card"
        :class="{ 'lote-vencimento-proximo': lote.vencimentoProximo, 'lote-trocado': lote._trocaLote }"
      >
        <div class="lote-info">
          <div class="lote-row">
            <span class="lote-label">Lote</span>
            <span class="lote-valor lote-numero">{{ lote.numeroLote }}</span>
          </div>
          <div class="lote-row">
            <span class="lote-label">Validade</span>
            <span class="lote-valor" :class="{ 'texto-aviso': lote.vencimentoProximo }">
              {{ formatarData(lote.dataValidade) }}
              <span v-if="lote.vencimentoProximo" class="dias-aviso">
                ({{ diasAteVencimento(lote.dataValidade) }} dias)
              </span>
            </span>
          </div>
          <div class="lote-row">
            <span class="lote-label">Saldo disponível</span>
            <span class="lote-valor">{{ lote.saldoAtual }} {{ item.unidadeMedida }}</span>
          </div>
          <div class="lote-row destaque">
            <span class="lote-label">A consumir</span>
            <span class="lote-valor consumir">{{ lote.quantidadeAConsumir ?? lote.quantidadeSugeridaNesteLote }} {{ item.unidadeMedida }}</span>
          </div>

          <!-- Indicador de troca manual -->
          <div v-if="lote._trocaLote" class="troca-badge">
            <CheckCircle :size="12" />
            Lote trocado manualmente
          </div>
        </div>

        <!-- Botão de trocar lote -->
        <button
          v-if="!disabled"
          class="btn-trocar"
          @click="abrirTrocaLote(idx)"
          title="Trocar lote"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <!-- Painel de troca de lote -->
    <Transition name="slide">
      <div v-if="trocandoLote" class="painel-troca">
        <div class="painel-troca-header">
          <span>Selecionar outro lote</span>
          <button class="btn-fechar-painel" @click="fecharTroca">
            <X :size="16" />
          </button>
        </div>

        <!-- Motivo obrigatório -->
        <div class="motivo-group">
          <label class="motivo-label">Motivo da troca *</label>
          <input
            v-model="motivoTroca"
            type="text"
            class="motivo-input"
            :class="{ 'erro': erroMotivo }"
            placeholder="Ex: Lote mais próximo do vencimento, lote com saldo parcial..."
            maxlength="500"
          />
          <span v-if="erroMotivo" class="erro-msg">{{ erroMotivo }}</span>
        </div>

        <!-- Lista de lotes alternativos -->
        <div v-if="loadingAlternativos" class="loading-alternativo">
          Buscando lotes disponíveis...
        </div>

        <div v-else-if="lotesAlternativos.length === 0" class="sem-alternativo">
          Nenhum outro lote disponível para este produto.
        </div>

        <div v-else class="lotes-alternativo-lista">
          <button
            v-for="alt in lotesAlternativos"
            :key="alt.loteId"
            class="lote-alternativo-btn"
            :class="{ 'venc-proximo': alt.vencimentoProximo }"
            @click="confirmarTroca(alt)"
          >
            <div class="alt-lote-cabecalho">
              <span class="alt-numero">{{ alt.numeroLote }}</span>
              <span v-if="alt.vencimentoProximo" class="alt-venc-badge">
                <AlertTriangle :size="11" /> Venc. próximo
              </span>
            </div>
            <div class="alt-lote-detalhes">
              <span>Vence em: {{ formatarData(alt.dataValidade) }}</span>
              <span>Saldo: {{ alt.saldoAtual }} {{ item.unidadeMedida }}</span>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.consumo-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s;
}

.consumo-item.tem-aviso {
  border-color: #f59e0b;
  background: #fffbeb;
}

.consumo-item.sem-saldo {
  border-color: #ef4444;
  background: #fef2f2;
}

.consumo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.produto-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.produto-nome {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.produto-qtd {
  font-size: 0.75rem;
  color: #6b7280;
}

.badge-aviso,
.badge-sem-saldo {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.badge-aviso {
  background: #fef3c7;
  color: #b45309;
}

.badge-sem-saldo {
  background: #fee2e2;
  color: #dc2626;
}

/* Lotes */
.lotes-lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lote-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.625rem;
}

.lote-card.lote-vencimento-proximo {
  background: #fffbeb;
  border-color: #fcd34d;
}

.lote-card.lote-trocado {
  background: #f0fdf4;
  border-color: #86efac;
}

.lote-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.lote-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.lote-label {
  color: #9ca3af;
  min-width: 6rem;
  font-size: 0.75rem;
}

.lote-valor {
  color: #374151;
  font-weight: 500;
}

.lote-numero {
  font-family: monospace;
  font-size: 0.8rem;
  background: #e5e7eb;
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  color: #1f2937;
}

.texto-aviso {
  color: #b45309;
}

.dias-aviso {
  font-size: 0.7rem;
  color: #92400e;
  margin-left: 0.25rem;
}

.lote-row.destaque {
  border-top: 1px solid #e5e7eb;
  margin-top: 0.25rem;
  padding-top: 0.25rem;
}

.lote-valor.consumir {
  color: #2563eb;
  font-weight: 700;
}

.troca-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: #16a34a;
  margin-top: 0.25rem;
}

.btn-trocar {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.3rem;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  align-self: flex-start;
}

.btn-trocar:hover {
  color: #2563eb;
  border-color: #2563eb;
  background: #eff6ff;
}

/* Painel de troca */
.painel-troca {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.painel-troca-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.btn-fechar-painel {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0.125rem;
  display: flex;
  align-items: center;
}

.btn-fechar-painel:hover {
  color: #111827;
}

.motivo-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.motivo-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.motivo-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-family: inherit;
  width: 100%;
  color: #111827;
  transition: border-color 0.2s;
}

.motivo-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.motivo-input.erro {
  border-color: #ef4444;
}

.erro-msg {
  font-size: 0.7rem;
  color: #ef4444;
}

.loading-alternativo,
.sem-alternativo {
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem;
}

.lotes-alternativo-lista {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 200px;
  overflow-y: auto;
}

.lote-alternativo-btn {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #f9fafb;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.lote-alternativo-btn:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.lote-alternativo-btn.venc-proximo {
  border-color: #fcd34d;
  background: #fffbeb;
}

.alt-lote-cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.alt-numero {
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
  color: #111827;
}

.alt-venc-badge {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  color: #b45309;
  background: #fef3c7;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
}

.alt-lote-detalhes {
  display: flex;
  gap: 1rem;
  font-size: 0.72rem;
  color: #6b7280;
}

/* Animação do painel de troca */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
