<script setup>
// KitsListView.vue — Listagem e gestão de kits de procedimento
import { ref, computed, onMounted } from 'vue'
import { useEstoqueStore } from '@/stores/estoque'
import { useProceduresStore } from '@/stores/procedures'
import { useToast } from 'vue-toastification'
import {
  Plus, Package, ChevronDown, ChevronUp, MoreHorizontal,
  Pencil, Trash2, X, Check, LoaderCircle, CircleHelp,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const store = useEstoqueStore()
const procStore = useProceduresStore()
const toast = useToast()

const expandido = ref(null)
const showDrawer = ref(false)
const isSaving = ref(false)
const kitForm = ref(novoKit())
const page = ref(1)

function novoKit() {
  return { nome: '', procedimentoId: '', ativo: true, itens: [{ produtoId: '', quantidadePadrao: 1 }] }
}

const procedimentoOptions = computed(() => [
  { label: 'Selecione...', value: '' },
  ...procStore.procedures.map(p => ({ label: p.name, value: p._id }))
])

const produtoOptions = computed(() => [
  { label: 'Produto...', value: '' },
  ...store.produtos.map(p => ({ label: `${p.nome} (${p.unidadeMedida})`, value: p._id }))
])

onMounted(async () => {
  await Promise.all([store.fetchKits(), procStore.fetchProcedures(), store.fetchProdutos({ limit: 100 })])
})

function toggleExpandir(id) {
  expandido.value = expandido.value === id ? null : id
}

function abrirNovo() {
  kitForm.value = novoKit()
  showDrawer.value = true
}

function abrirEditar(kit) {
  kitForm.value = {
    ...kit,
    itens: kit.itens?.map((i) => ({ 
      produtoId: i.produtoId?._id || i.produtoId, 
      quantidadePadrao: i.quantidadePadrao || i.quantidade 
    })) || [],
  }
  showDrawer.value = true
}

function fecharDrawer() { showDrawer.value = false }

function adicionarItem() {
  kitForm.value.itens.push({ produtoId: '', quantidadePadrao: 1 })
}

function removerItem(idx) {
  kitForm.value.itens.splice(idx, 1)
}

async function salvar() {
  if (isSaving.value) return
  if (!kitForm.value.nome || !kitForm.value.procedimentoId) {
    toast.error('Nome e procedimento são obrigatórios.')
    return
  }
  if (kitForm.value.itens.length === 0 || kitForm.value.itens.some((i) => !i.produtoId || !i.quantidadePadrao)) {
    toast.error('Todos os itens devem ter produto e quantidade definidos.')
    return
  }
  isSaving.value = true
  try {
    const isEdit = !!kitForm.value._id
    const result = isEdit
      ? await store.updateKit(kitForm.value._id, kitForm.value)
      : await store.createKit(kitForm.value)

    if (result.success) {
      toast.success(isEdit ? 'Kit atualizado!' : 'Kit criado!')
      fecharDrawer()
    } else {
      toast.error(result.error)
    }
  } finally {
    isSaving.value = false
  }
}

async function desativar(id) {
  if (!confirm('Desativar este kit? Ele não será mais sugerido em novos atendimentos.')) return
  const res = await store.deleteKit(id)
  if (res.success) toast.success('Kit desativado.')
  else toast.error(res.error)
}

const nomeProduto = (id) => store.produtos.find((p) => p._id === id)?.nome || id
const nomeProcedimento = (id) => procStore.procedures.find((p) => p._id === id)?.name || id

const totalPaginas = computed(() => store.kitsMeta?.totalPages || 1)
function irParaPagina(p) { page.value = p; store.fetchKits({ page: p, limit: 20 }) }
</script>

<template>
  <div class="kits-page">
    <header class="page-header">
      <div class="header-text-container">
        <div class="title-row">
          <h1 class="title">Kits de Procedimento</h1>
          <div class="tooltip-container">
            <CircleHelp :size="20" class="help-icon" />
            <div class="tooltip-content">
              O kit é onde você junta todos os produtos necessários. Quando o procedimento é aplicado, o sistema já desconta automaticamente esses itens do estoque.
            </div>
          </div>
        </div>
        <p class="subtitle">Receitas de insumos por procedimento — usadas para sugestão FEFO.</p>
      </div>
      <AppButton variant="primary" @click="abrirNovo"><Plus :size="16" /> Novo Kit</AppButton>
    </header>

    <!-- Lista de kits -->
    <div v-if="store.loadingKits && store.kits.length === 0" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-card"></div>
    </div>

    <div v-else-if="!store.loadingKits && store.kits.length === 0" class="empty-state">
      <div class="empty-icon"><Package :size="28"/></div>
      <h3>Nenhum kit cadastrado</h3>
      <p>Crie kits para automatizar o consumo de estoque nos atendimentos.</p>
      <button class="btn-primary-sm" @click="abrirNovo"><Plus :size="14" /> Novo Kit</button>
    </div>

    <div v-else class="kits-list">
      <div v-for="kit in store.kits" :key="kit._id" class="kit-card" :class="{ 'kit-card--inativo': !kit.ativo }">
        <!-- Header do kit -->
        <div class="kit-header" @click="toggleExpandir(kit._id)">
          <div class="kit-header-left">
            <div class="kit-icon"><Package :size="18" /></div>
            <div class="kit-info">
              <span class="kit-nome">{{ kit.nome }}</span>
              <span class="kit-proc">{{ nomeProcedimento(kit.procedimentoId?._id || kit.procedimentoId) }}</span>
            </div>
          </div>
          <div class="kit-header-right">
            <span v-if="!kit.ativo" class="badge badge--inativo">Inativo</span>
            <span class="kit-itens-count">{{ kit.itens?.length || 0 }} item(ns)</span>
            <div class="kit-actions" @click.stop>
              <button class="btn-icon" @click="abrirEditar(kit)" title="Editar"><Pencil :size="15" /></button>
              <button v-if="kit.ativo" class="btn-icon btn-icon--red" @click="desativar(kit._id)" title="Desativar"><Trash2 :size="15" /></button>
            </div>
            <ChevronUp v-if="expandido === kit._id" :size="18" class="expand-icon" />
            <ChevronDown v-else :size="18" class="expand-icon" />
          </div>
        </div>

        <!-- Itens do kit (expansível) -->
        <Transition name="slide">
          <div v-if="expandido === kit._id" class="kit-itens">
            <table class="itens-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd. necessária</th>
                  <th>Unidade</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in kit.itens" :key="idx">
                  <td class="nome-item">{{ item.nomeProduto || nomeProduto(item.produtoId?._id || item.produtoId) }}</td>
                  <td class="qtd-item">{{ item.quantidadePadrao }}</td>
                  <td class="txt-gray">{{ item.unidadeMedida || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Paginação -->
    <div v-if="totalPaginas > 1" class="paginacao">
      <button class="btn-pag" :disabled="page <= 1" @click="irParaPagina(page - 1)">← Anterior</button>
      <span class="pag-info">{{ page }} / {{ totalPaginas }}</span>
      <button class="btn-pag" :disabled="page >= totalPaginas" @click="irParaPagina(page + 1)">Próxima →</button>
    </div>

    <!-- Drawer -->
    <SideDrawer v-if="showDrawer" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-header-text">
            <h2 class="drawer-title">{{ kitForm._id ? 'Editar Kit' : 'Novo Kit' }}</h2>
            <p class="drawer-subtitle">
              {{ kitForm._id ? 'Ajuste os insumos e quantidades deste kit' : 'Crie um novo kit de procedimentos' }}
            </p>
          </div>
          <button @click="fecharDrawer" class="close-btn-header"><X :size="22" /></button>
        </div>
      </template>

      <div class="kit-form">
        <div class="field">
          <label class="label">Nome do kit <span class="req">*</span></label>
          <input class="input" type="text" placeholder="Ex: Preenchimento Labial" v-model="kitForm.nome" />
        </div>

        <div class="field">
          <label class="label">Procedimento <span class="req">*</span></label>
          <StyledSelect
            v-model="kitForm.procedimentoId"
            :options="procedimentoOptions"
          />
        </div>

        <div class="itens-section">
          <div class="itens-header">
            <span class="label">Insumos do kit <span class="req">*</span></span>
            <button class="btn-add-item" type="button" @click="adicionarItem"><Plus :size="14" /> Adicionar</button>
          </div>

          <div v-for="(item, idx) in kitForm.itens" :key="idx" class="item-row">
            <div class="item-input">
              <StyledSelect
                v-model="item.produtoId"
                :options="produtoOptions"
              />
            </div>
            <input class="input qtd-input" type="number" min="0.001" step="0.5" v-model.number="item.quantidadePadrao" placeholder="Qtd" />
            <button class="btn-remove" type="button" @click="removerItem(idx)" :disabled="kitForm.itens.length <= 1">
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="fecharDrawer"><X :size="15" /> Cancelar</AppButton>
          <AppButton variant="secondary" @click="salvar" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" :size="15" class="spin" /><Check v-else :size="15" />
            {{ kitForm._id ? 'Salvar' : 'Criar' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style scoped>
.kits-page { padding: 0; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.title { font-size:2rem; font-weight:700; margin-bottom:0.25rem; }
.subtitle { color:var(--cinza-texto); margin: 0; }

.header-text-container { display: flex; flex-direction: column; gap: 0.25rem; }
.title-row { display: flex; align-items: center; gap: 0.5rem; }

.tooltip-container { position: relative; cursor: help; display: flex; align-items: center; }
.help-icon { color: #9ca3af; transition: color 0.2s; }
.tooltip-container:hover .help-icon { color: var(--azul-principal); }

.tooltip-content {
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  background: #fff;
  color: #374151;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  width: 280px;
  font-size: 0.85rem;
  line-height: 1.4;
  font-weight: 500;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  border: 1px solid #e2e8f0;
  pointer-events: none;
}

.tooltip-content::after {
  content: '';
  position: absolute;
  top: -12px;
  left: 15px;
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent #fff transparent;
}

.tooltip-container:hover .tooltip-content {
  opacity: 1;
  visibility: visible;
}

@media (max-width: 600px) {
  .tooltip-content {
    left: -120px;
    width: 240px;
  }
  .tooltip-content::after {
    left: 135px;
  }
}

/* Kits list */
.kits-list { display:flex; flex-direction:column; gap:.75rem; }
.kit-card { background:#fff; border:1.5px solid #e5e7eb; border-radius:1rem; overflow:hidden; transition:border-color .15s; }
.kit-card:hover { border-color:#cbd5e1; }
.kit-card--inativo { opacity:.65; }

.kit-header { display:flex; justify-content:space-between; align-items:center; padding:1.25rem 1.5rem; cursor:pointer; gap:.75rem; flex-wrap:wrap; }
.kit-header:hover { background:#fafbfc; }
.kit-header-left { display:flex; align-items:center; gap:.875rem; flex:1; }
.kit-icon { width:40px; height:40px; background:#eff6ff; color:var(--azul-principal); border-radius:.625rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.kit-info { display:flex; flex-direction:column; gap:.2rem; }
.kit-nome { font-weight:700; color:#111827; font-size:.95rem; }
.kit-proc { font-size:.78rem; color:#9ca3af; }

.kit-header-right { display:flex; align-items:center; gap:.5rem; }
.kit-itens-count { font-size:.8rem; color:#6b7280; font-weight:600; white-space:nowrap; }
.expand-icon { color:#9ca3af; }
.kit-actions { display:flex; gap:.25rem; }

.btn-icon { background:none; border:none; cursor:pointer; padding:.35rem; border-radius:.4rem; color:#6b7280; display:flex; align-items:center; }
.btn-icon:hover { background:#f3f4f6; }
.btn-icon--red:hover { background:#fee2e2; color:#dc2626; }

.badge { display:inline-flex; align-items:center; padding:.15rem .55rem; border-radius:999px; font-size:.68rem; font-weight:700; text-transform:uppercase; }
.badge--inativo { background:#f3f4f6; color:#6b7280; }

/* Itens table */
.kit-itens { border-top:1px solid #f3f4f6; }
.itens-table { width:100%; border-collapse:collapse; }
.itens-table th, .itens-table td { padding:.75rem 1.5rem; text-align:left; border-bottom:1px solid #f3f4f6; font-size:.85rem; }
.itens-table tbody tr:last-child td { border-bottom:none; }
.itens-table th { background:#f9fafb; font-size:.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:.04em; }
.nome-item { font-weight:600; color:#374151; }
.qtd-item { font-weight:700; color:#7c3aed; }
.txt-gray { color:#9ca3af; }

/* Empty */
.empty-state { display:flex; flex-direction:column; align-items:center; gap:.75rem; padding:4rem; text-align:center; }
.empty-icon { width:56px; height:56px; background:#eff6ff; color:var(--azul-principal); border-radius:50%; display:flex; align-items:center; justify-content:center; }
.empty-state h3 { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.empty-state p { color:#9ca3af; font-size:.875rem; max-width:320px; margin:0; }
.btn-primary-sm { display:inline-flex; align-items:center; gap:.35rem; padding:.5rem 1.1rem; border-radius:.75rem; border:none; background:var(--azul-principal); color:#fff; font-size:.875rem; font-weight:600; cursor:pointer; }

/* Skeleton */
.skeleton-list { display:flex; flex-direction:column; gap:.75rem; }
.skeleton-card { height:72px; background:#f3f4f6; border-radius:1rem; animation:pulse 1.5s ease infinite; }

/* Paginação */
.paginacao { display:flex; align-items:center; justify-content:center; gap:1rem; padding:1.25rem 0 0; }
.btn-pag { padding:.45rem 1rem; border:1.5px solid #e5e7eb; border-radius:.65rem; font-size:.85rem; font-weight:600; cursor:pointer; background:#fff; color:#374151; }
.btn-pag:hover:not(:disabled) { background:#f9fafb; }
.btn-pag:disabled { opacity:.4; cursor:not-allowed; }
.pag-info { font-size:.85rem; color:#6b7280; }

/* Drawer */
.drawer-header { padding:1.5rem; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:flex-start; }
.drawer-header-text { display: flex; flex-direction: column; gap: 0.15rem; }
.drawer-title { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.drawer-subtitle { font-size: 0.8rem; color: #9ca3af; margin: 0; }
.drawer-footer { padding:1.25rem 1.5rem; display:flex; gap:.75rem; justify-content:flex-end; border-top:1px solid #f3f4f6; }

/* Kit form */
.kit-form { display:flex; flex-direction:column; gap:1.25rem; }
.field { display:flex; flex-direction:column; gap:.4rem; }
.label { font-size:.875rem; font-weight:600; color:#374151; }
.req { color:#ef4444; }
.input { padding:.625rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem; font-size:.9rem; color:#111827; background:#fff; outline:none; transition:border-color .2s; width:100%; }
.input:focus { border-color:var(--azul-principal); }

.itens-section { display:flex; flex-direction:column; gap:.6rem; }
.itens-header { display:flex; justify-content:space-between; align-items:center; }
.btn-add-item { display:inline-flex; align-items:center; gap:.3rem; padding:.3rem .75rem; border:1.5px solid var(--azul-principal); border-radius:.6rem; font-size:.8rem; font-weight:600; cursor:pointer; background:transparent; color:var(--azul-principal); }
.btn-add-item:hover { background:#eff6ff; }
.item-row { display:flex; gap:.5rem; align-items:center; }
.item-input { flex:1; }
.qtd-input { width:80px; flex-shrink:0; }
.btn-remove { background:none; border:1.5px solid #e5e7eb; border-radius:.5rem; cursor:pointer; padding:.45rem .5rem; color:#6b7280; display:flex; align-items:center; flex-shrink:0; }
.btn-remove:hover:not(:disabled) { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
.btn-remove:disabled { opacity:.35; cursor:not-allowed; }

/* Transitions */
.slide-enter-active, .slide-leave-active { transition:all .2s ease; overflow:hidden; }
.slide-enter-from, .slide-leave-to { opacity:0; max-height:0; }
.slide-enter-to, .slide-leave-from { max-height:500px; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes spin { to{transform:rotate(360deg)} }
.spin { animation:spin .8s linear infinite; }
</style>
