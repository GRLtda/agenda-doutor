<script setup>
// ProdutoDetailView.vue — Detalhes do produto com seus lotes
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import {
  ChevronLeft, Plus, Package, Layers, AlertTriangle,
  X, Check, LoaderCircle, Trash2,
  FlaskConical, Tag, Building2, PieChart
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import EstoqueFormProduto from '@/components/estoque/EstoqueFormProduto.vue'
import EstoqueFormLote from '@/components/estoque/EstoqueFormLote.vue'
import EstoqueFormMovAdm from '@/components/estoque/EstoqueFormMovAdm.vue'
import EstoqueBadgeStatus from '@/components/estoque/EstoqueBadgeStatus.vue'

const route = useRoute()
const router = useRouter()
const store = useEstoqueStore()
const toast = useToast()

const produtoId = route.params.id

// Drawer state
const drawerAtivo = ref(null) // 'editar' | 'lote' | 'baixa'
const isSaving = ref(false)
const formProduto = ref({})
const formLote = ref(novoLote())
const formMovAdm = ref(novaMovAdm())

// Component template refs for validation
const formProdutoRef = ref(null)
const formLoteRef = ref(null)
const formMovAdmRef = ref(null)

function novoLote() {
  return { produtoId, numeroLote: '', dataValidade: '', saldoInicial: null, custoUnitario: null, fornecedor: '', notaFiscal: '' }
}
function novaMovAdm() {
  return { produtoId, loteId: '', motivo: '', quantidade: null, observacao: '' }
}

onMounted(async () => {
  const [resProduto, resLotes] = await Promise.all([
    store.fetchProduto(produtoId),
    store.fetchLotes({ produtoId }),
  ])
  if (!resProduto.success) {
    toast.error('Produto não encontrado.')
    router.push({ name: 'estoque-produtos' })
    return
  }
  formProduto.value = { ...store.produtoAtual }
})

const produto = computed(() => store.produtoAtual)
const lotesAtivos = computed(() => store.lotes.filter((l) => l.status === 'ATIVO'))
const saldoTotal  = computed(() => store.lotes.reduce((sum, l) => sum + (l.saldoAtual || 0), 0))

function abrirEditar() {
  formProduto.value = { ...produto.value }
  drawerAtivo.value = 'editar'
}

function abrirNovoLote() {
  formLote.value = novoLote()
  drawerAtivo.value = 'lote'
}

function abrirBaixaAdm() {
  formMovAdm.value = novaMovAdm()
  drawerAtivo.value = 'baixa'
}

function fecharDrawer() {
  drawerAtivo.value = null
}

async function salvarProduto() {
  if (isSaving.value) return
  if (formProdutoRef.value && !formProdutoRef.value.validate()) {
    toast.error('Corrija os erros no formulário.')
    return
  }
  isSaving.value = true
  try {
    const res = await store.updateProduto(produto.value._id, formProduto.value)
    if (res.success) { toast.success('Produto atualizado!'); fecharDrawer() }
    else toast.error(res.error)
  } finally {
    isSaving.value = false
  }
}

async function salvarLote() {
  if (isSaving.value) return
  if (formLoteRef.value && !formLoteRef.value.validate()) {
    toast.error('Corrija os erros no formulário.')
    return
  }
  isSaving.value = true
  try {
    const res = await store.createLote(formLote.value)
    if (res.success) {
      toast.success('Entrada de lote registrada!')
      await store.fetchLotes({ produtoId })
      fecharDrawer()
    } else {
      toast.error(res.error)
    }
  } finally {
    isSaving.value = false
  }
}

async function salvarBaixaAdm() {
  if (isSaving.value) return
  if (formMovAdmRef.value && !formMovAdmRef.value.validate()) {
    toast.error('Corrija os erros no formulário.')
    return
  }
  isSaving.value = true
  try {
    const res = await store.registrarBaixaAdministrativa(formMovAdm.value)
    if (res.success) {
      toast.success('Baixa administrativa registrada!')
      await store.fetchLotes({ produtoId })
      fecharDrawer()
    } else {
      toast.error(res.error)
    }
  } finally {
    isSaving.value = false
  }
}

async function descartar(loteId) {
  if (!confirm('Descartar este lote? O saldo restante será baixado.')) return
  const res = await store.descartarLote(loteId)
  if (res.success) toast.success('Lote descartado.')
  else toast.error(res.error)
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <div class="produto-detail">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <button class="btn-back" @click="router.push({ name: 'estoque-produtos' })">
        <ChevronLeft :size="18" /> Produtos
      </button>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ produto?.nome || '...' }}</span>
    </div>

    <!-- Skeleton inicial -->
    <template v-if="store.loadingProdutos && !produto">
      <div class="produto-header-skeleton">
        <div class="skeleton" style="width:40%;height:2rem;margin-bottom:.5rem"></div>
        <div class="skeleton" style="width:25%;height:1rem"></div>
      </div>
    </template>

    <template v-else-if="produto">
      <!-- Header do produto -->
      <div class="produto-header">
        <div class="produto-header-left">
          <div class="produto-icon-wrap">
            <Package :size="26" />
          </div>
          <div>
            <h1 class="produto-nome">{{ produto.nome }}</h1>
            <div class="produto-tags">
              <span class="tag-unidade"><FlaskConical :size="12" /> {{ produto.unidadeMedida }}</span>
              <span v-if="produto.categoria" class="tag-categoria"><Tag :size="12" /> {{ produto.categoria }}</span>
              <span v-if="produto.fabricante" class="tag-fabricante"><Building2 :size="12" /> {{ produto.fabricante }}</span>
              <span v-if="produto.aceitaFracao" class="tag-fracao"><PieChart :size="12" /> Aceita fração</span>
            </div>
          </div>
        </div>
        <div class="produto-header-actions">
          <button class="btn-secondary" @click="abrirEditar"><Package :size="15" /> Editar</button>
          <AppButton variant="primary" @click="abrirNovoLote"><Plus :size="15" /> Nova Entrada</AppButton>
        </div>
      </div>

      <!-- Cards de saldo -->
      <div class="saldo-cards">
        <div class="saldo-card">
          <span class="saldo-label">Saldo total</span>
          <span class="saldo-valor" :class="{ 'saldo--alerta': produto.quantidadeMinima && saldoTotal < produto.quantidadeMinima }">
            {{ saldoTotal }} {{ produto.unidadeMedida }}
          </span>
        </div>
        <div class="saldo-card">
          <span class="saldo-label">Estoque mínimo</span>
          <span class="saldo-valor">{{ produto.quantidadeMinima ?? '—' }} {{ produto.unidadeMedida }}</span>
        </div>
        <div class="saldo-card">
          <span class="saldo-label">Lotes ativos</span>
          <span class="saldo-valor">{{ lotesAtivos.length }}</span>
        </div>
        
        <!-- Alerta estoque mínimo formatado como saldo-card -->
        <div class="saldo-card saldo-card--danger" v-if="produto.quantidadeMinima && saldoTotal < produto.quantidadeMinima">
          <div class="saldo-card-danger-content">
            <AlertTriangle :size="24" class="icon-danger" />
            <div class="danger-texts">
              <span class="danger-title">Estoque Baixo</span>
              <span class="danger-desc">Recomenda-se nova entrada de mercadoria</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de Lotes -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title"><Layers :size="18" /> Lotes</h2>
          <div class="section-actions">
            <button class="btn-outline-sm" @click="abrirBaixaAdm">Baixa Administrativa</button>
            <button class="btn-primary-sm" @click="abrirNovoLote"><Plus :size="14" /> Nova Entrada</button>
          </div>
        </div>

        <div class="table-wrapper">
          <div v-if="store.loadingLotes" class="skeleton-list">
            <div v-for="n in 3" :key="n" class="skeleton-row"></div>
          </div>

          <div v-else-if="store.lotes.length === 0" class="empty-section">
            Nenhum lote registrado para este produto.
            <button class="btn-link" @click="abrirNovoLote"><Plus :size="13" /> Registrar entrada</button>
          </div>

          <table v-else>
            <thead>
              <tr>
                <th>Nº Lote</th>
                <th>Validade</th>
                <th>Saldo atual</th>
                <th>Custo unit.</th>
                <th>Custo total</th>
                <th>Fornecedor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lote in store.lotes" :key="lote._id" class="lote-row">
                <td class="lote-num">{{ lote.numeroLote }}</td>
                <td :class="{ 'vencendo': lote.status === 'VENCIDO' }">{{ formatarData(lote.dataValidade) }}</td>
                <td class="saldo-cel">{{ lote.saldoAtual }} {{ produto.unidadeMedida }}</td>
                <td class="txt-gray">{{ formatarMoeda(lote.custoUnitario) }}</td>
                <td class="txt-gray">{{ formatarMoeda(lote.custoTotalEntrada) }}</td>
                <td class="txt-gray">{{ lote.fornecedor || '—' }}</td>
                <td><EstoqueBadgeStatus :status="lote.status" /></td>
                <td class="actions-cel">
                  <button
                    v-if="lote.status === 'ATIVO'"
                    class="btn-discard"
                    @click="descartar(lote._id)"
                    title="Descartar lote"
                  >
                    <Trash2 :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ─── Drawers ─── -->

    <!-- Editar produto -->
    <SideDrawer v-if="drawerAtivo === 'editar'" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-header-text">
            <h2 class="drawer-title">Editar Produto</h2>
            <p class="drawer-subtitle">Ajuste detalhes e níveis de alerta deste item</p>
          </div>
          <button @click="fecharDrawer" class="close-btn-header"><X :size="22" /></button>
        </div>
      </template>
      <EstoqueFormProduto ref="formProdutoRef" v-model="formProduto" />
      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="fecharDrawer"><X :size="15" /> Cancelar</AppButton>
          <AppButton variant="secondary" @click="salvarProduto" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" :size="15" class="spin" /><Check v-else :size="15" />
            Salvar
          </AppButton>
        </div>
      </template>
    </SideDrawer>

    <!-- Nova entrada de lote -->
    <SideDrawer v-if="drawerAtivo === 'lote'" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-header-text">
            <h2 class="drawer-title">Registrar Entrada</h2>
            <p class="drawer-subtitle">Adicione as informações de um novo lote recebido</p>
          </div>
          <button @click="fecharDrawer" class="close-btn-header"><X :size="22" /></button>
        </div>
      </template>
      <EstoqueFormLote ref="formLoteRef" v-model="formLote" :produtos="produto ? [produto] : []" />
      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="fecharDrawer"><X :size="15" /> Cancelar</AppButton>
          <AppButton variant="secondary" @click="salvarLote" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" :size="15" class="spin" /><Check v-else :size="15" />
            Registrar
          </AppButton>
        </div>
      </template>
    </SideDrawer>

    <!-- Baixa administrativa -->
    <SideDrawer v-if="drawerAtivo === 'baixa'" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-header-text">
            <h2 class="drawer-title">Baixa Administrativa</h2>
            <p class="drawer-subtitle">Registre retiradas por quebra, validade ou perdas</p>
          </div>
          <button @click="fecharDrawer" class="close-btn-header"><X :size="22" /></button>
        </div>
      </template>
      <EstoqueFormMovAdm ref="formMovAdmRef" v-model="formMovAdm" :lotes="store.lotes.filter(l => l.status === 'ATIVO')" :produtos="produto ? [produto] : []" />
      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="fecharDrawer"><X :size="15" /> Cancelar</AppButton>
          <AppButton variant="secondary" @click="salvarBaixaAdm" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" :size="15" class="spin" /><Check v-else :size="15" />
            Confirmar Baixa
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style scoped>
.produto-detail { padding: 0; }

.breadcrumb { display:flex; align-items:center; gap:.5rem; margin-bottom:1.5rem; }
.btn-back { display:inline-flex; align-items:center; gap:.25rem; background:none; border:none; cursor:pointer; color:var(--azul-principal); font-weight:600; font-size:.875rem; padding:.25rem; border-radius:.5rem; }
.btn-back:hover { background:#eff6ff; }
.breadcrumb-sep { color:#d1d5db; }
.breadcrumb-current { font-weight:600; color:#111827; font-size:.875rem; }

.produto-header {
  display:flex; justify-content:space-between; align-items:center;
  flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;
  padding:1.5rem; background:#fff; border:1.5px solid #e5e7eb; border-radius:1rem;
}
.produto-header-left { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
.produto-icon-wrap {
  width:56px; height:56px; background:#eff6ff; color:var(--azul-principal);
  border-radius:.875rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.produto-nome { font-size:1.5rem; font-weight:700; color:#111827; margin:0 0 .5rem; }
.produto-tags { display:flex; flex-wrap:wrap; gap:.4rem; }
.tag-unidade { display:inline-flex; align-items:center; gap:.25rem; background:#e0f2fe; color:#0369a1; padding:.15rem .55rem; border-radius:.4rem; font-size:.72rem; font-weight:700; }
.tag-categoria { display:inline-flex; align-items:center; gap:.25rem; background:#f0fdf4; color:#16a34a; padding:.15rem .55rem; border-radius:.4rem; font-size:.72rem; font-weight:700; }
.tag-fabricante { display:inline-flex; align-items:center; gap:.25rem; background:#f5f3ff; color:#7c3aed; padding:.15rem .55rem; border-radius:.4rem; font-size:.72rem; font-weight:700; }
.tag-fracao { display:inline-flex; align-items:center; gap:.25rem; background:#fef9c3; color:#92400e; padding:.15rem .55rem; border-radius:.4rem; font-size:.72rem; font-weight:700; }
.produto-header-actions { display:flex; gap:.75rem; flex-wrap:wrap; }

.btn-secondary {
  display:inline-flex; align-items:center; gap:.4rem;
  padding:.5rem 1rem; border:1.5px solid #e5e7eb; border-radius:.75rem;
  font-size:.875rem; font-weight:600; cursor:pointer; background:#fff; color:#374151;
}
.btn-secondary:hover { background:#f9fafb; }

.saldo-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; margin-bottom:1.25rem; }
.saldo-card {
  display:flex; flex-direction:column; gap:.35rem;
  padding:1.25rem; background:#fff; border:1.5px solid #e5e7eb; border-radius:1rem;
}
.saldo-label { font-size:.78rem; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
.saldo-valor { font-size:1.5rem; font-weight:800; color:#111827; }
.saldo--alerta { color:#dc2626; }

.saldo-card--danger {
  background: #fff7ed;
  border-color: #fed7aa;
  flex-direction: row;
  align-items: center;
  padding: 1rem 1.25rem;
}
.saldo-card-danger-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.icon-danger {
  color: #ea580c;
  flex-shrink: 0;
}
.danger-texts {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.danger-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: #9a3412;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.danger-desc {
  font-size: 0.75rem;
  color: #c2410c;
  font-weight: 500;
  line-height: 1.2;
}

.section-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.75rem; margin-bottom:1rem; }
.section-title { display:flex; align-items:center; gap:.5rem; font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.section-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
.btn-outline-sm {
  padding:.4rem .875rem; border:1.5px solid #e5e7eb; border-radius:.65rem;
  font-size:.82rem; font-weight:600; cursor:pointer; background:#fff; color:#374151;
}
.btn-outline-sm:hover { background:#f9fafb; }
.btn-primary-sm {
  display:inline-flex; align-items:center; gap:.35rem;
  padding:.4rem .875rem; border:none; border-radius:.65rem;
  font-size:.82rem; font-weight:600; cursor:pointer;
  background:var(--azul-principal); color:#fff;
}

.table-wrapper { background:#fff; border:1px solid #e5e7eb; border-radius:1rem; overflow:hidden; }
table { width:100%; border-collapse:collapse; }
th, td { padding:.875rem 1.25rem; text-align:left; border-bottom:1px solid #f3f4f6; vertical-align:middle; font-size:.875rem; }
tbody tr:last-child td { border-bottom:none; }
th { background:#f9fafb; font-size:.72rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; }
.lote-row:hover td { background:#fafbfc; }
.lote-num { font-weight:700; color:#111827; }
.saldo-cel { font-weight:700; color:#059669; }
.txt-gray { color:#9ca3af; }
.vencendo { color:#dc2626; font-weight:600; }
.actions-cel { text-align:right; }
.btn-discard {
  background:none; border:1.5px solid #fca5a5; border-radius:.5rem; cursor:pointer;
  padding:.35rem .5rem; color:#dc2626; display:inline-flex; align-items:center;
}
.btn-discard:hover { background:#fee2e2; }

.skeleton-list { padding:1rem; display:flex; flex-direction:column; gap:.6rem; }
.skeleton-row { height:52px; background:#f3f4f6; border-radius:.75rem; animation:pulse 1.5s ease infinite; }
.skeleton { background:#e5e7eb; border-radius:.4rem; animation:pulse 1.5s ease infinite; }
.produto-header-skeleton { padding: 1rem 0; }

.empty-section {
  display:flex; align-items:center; gap:.5rem;
  padding:2.5rem 1.5rem; color:#9ca3af; font-size:.875rem;
  flex-wrap:wrap;
}
.btn-link {
  display:inline-flex; align-items:center; gap:.2rem;
  color:var(--azul-principal); background:none; border:none; cursor:pointer;
  font-size:.85rem; font-weight:600;
}

.drawer-header { padding:1.5rem; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:flex-start; }
.drawer-header-text { display: flex; flex-direction: column; gap: 0.15rem; }
.drawer-title { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.drawer-subtitle { font-size: 0.8rem; color: #9ca3af; margin: 0; }
.drawer-footer { padding:1.25rem 1.5rem; display:flex; gap:.75rem; justify-content:flex-end; border-top:1px solid #f3f4f6; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes spin { to{transform:rotate(360deg)} }
.spin { animation:spin .8s linear infinite; }
</style>
