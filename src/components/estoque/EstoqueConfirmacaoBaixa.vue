<script setup>
// EstoqueConfirmacaoBaixa.vue — Modal de confirmação FEFO para médico
// Exibe sugestão de lotes antes de confirmar a baixa por atendimento
import { ref, computed } from 'vue'
import { CheckCircle, AlertTriangle, X, Loader } from 'lucide-vue-next'
import EstoqueBadgeStatus from './EstoqueBadgeStatus.vue'

const props = defineProps({
  sugestao: {
    type: Array, // item da sugestao: { produtoId, nomeProduto, quantidadeNecessaria, lotesSugeridos, saldoDisponivel, suficiente }
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const todosInsuficientes = computed(() =>
  props.sugestao.some((item) => !item.suficiente)
)

function confirmar() {
  emit('confirm', props.sugestao)
}

function cancelar() {
  emit('cancel')
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="cancelar">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        <!-- Header -->
        <div class="modal-header">
          <div class="modal-header-text">
            <h2 id="modal-title" class="modal-title">Confirmar consumo de estoque</h2>
            <p class="modal-subtitle">Sugestão FEFO — lotes selecionados por ordem de vencimento</p>
          </div>
          <button class="close-btn" @click="cancelar" aria-label="Fechar">
            <X :size="20" />
          </button>
        </div>

        <!-- Corpo -->
        <div class="modal-body">
          <div v-if="todosInsuficientes" class="alert alert--warning">
            <AlertTriangle :size="18" />
            <p>Um ou mais produtos estão com estoque insuficiente. Revise antes de confirmar.</p>
          </div>

          <div v-for="item in sugestao" :key="item.produtoId" class="produto-item">
            <div class="produto-header">
              <span class="produto-nome">{{ item.nomeProduto }}</span>
              <div class="produto-meta">
                <span class="qtd-label">Necessário:</span>
                <span class="qtd-valor">{{ item.quantidadeNecessaria }}</span>
                <span class="saldo-label">Disponível:</span>
                <span class="saldo-valor" :class="{ 'saldo--insuficiente': !item.suficiente }">
                  {{ item.saldoDisponivel }}
                </span>
              </div>
            </div>

            <!-- Aviso de insuficiência -->
            <div v-if="!item.suficiente" class="insuf-badge">
              <AlertTriangle :size="13" />
              Estoque insuficiente para este item
            </div>

            <!-- Lotes sugeridos -->
            <div class="lotes-lista">
              <div
                v-for="(lote, idx) in item.lotesSugeridos"
                :key="lote.loteId"
                class="lote-row"
              >
                <div class="lote-info">
                  <span class="lote-num">{{ lote.numeroLote }}</span>
                  <span class="lote-data">Validade: {{ formatarData(lote.dataValidade) }}</span>
                </div>
                <div class="lote-debitado">
                  <span class="debitado-label">Débito:</span>
                  <span class="debitado-valor">{{ lote.quantidadeDebitada }}</span>
                </div>
                <div class="lote-custo">
                  <span class="debitado-label">Custo:</span>
                  <span class="debitado-valor">{{ formatarMoeda(lote.custoUnitario) }}</span>
                  <span v-if="lote.custoTotalEstimado" class="txt-gray">· {{ formatarMoeda(lote.custoTotalEstimado) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn--cancel" @click="cancelar" :disabled="isLoading">
            Cancelar
          </button>
          <button
            class="btn btn--confirm"
            @click="confirmar"
            :disabled="isLoading || todosInsuficientes"
          >
            <Loader v-if="isLoading" :size="16" class="spin" />
            <CheckCircle v-else :size="16" />
            {{ isLoading ? 'Registrando...' : 'Confirmar baixa' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  background: #fff;
  border-radius: 1.25rem;
  width: 100%;
  max-width: 540px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem;
}

.modal-subtitle {
  font-size: 0.8rem;
  color: #9ca3af;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #6b7280;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
}

.close-btn:hover { background: #f3f4f6; }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.84rem;
}

.alert--warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.alert p { margin: 0; }

.produto-item {
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
}

.produto-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.produto-nome {
  font-weight: 700;
  font-size: 0.95rem;
  color: #111827;
}

.produto-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.qtd-label, .saldo-label { color: #9ca3af; }
.qtd-valor {
  font-weight: 700;
  color: #111827;
  background: #e5e7eb;
  padding: 0.1rem 0.4rem;
  border-radius: 0.35rem;
}
.saldo-valor {
  font-weight: 700;
  color: #059669;
  background: #d1fae5;
  padding: 0.1rem 0.4rem;
  border-radius: 0.35rem;
}
.saldo--insuficiente {
  color: #dc2626;
  background: #fee2e2;
}

.insuf-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 1rem;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.78rem;
  font-weight: 600;
}

.lotes-lista {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.lote-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 0.6rem;
  font-size: 0.82rem;
}

.lote-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.lote-num { font-weight: 700; color: #374151; }
.lote-data { color: #9ca3af; font-size: 0.75rem; }

.lote-debitado {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.lote-custo {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #6b7280;
}
.debitado-label { color: #9ca3af; }
.debitado-valor { font-weight: 700; color: #7c3aed; }

.modal-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn:disabled { opacity: 0.5; pointer-events: none; }

.btn--cancel {
  background: #f3f4f6;
  color: #374151;
}
.btn--cancel:hover { background: #e5e7eb; }

.btn--confirm {
  background: var(--azul-principal);
  color: #fff;
}
.btn--confirm:hover { filter: brightness(1.1); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
