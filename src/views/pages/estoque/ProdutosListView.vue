<script setup>
// ProdutosListView.vue — Listagem de produtos do catálogo de estoque
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import {
  Plus, Search, Package, MoreHorizontal, Eye, Pencil,
  Trash2, SlidersHorizontal, X, Check, LoaderCircle,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import EstoqueFormProduto from '@/components/estoque/EstoqueFormProduto.vue'

const store = useEstoqueStore()
const router = useRouter()
const toast = useToast()

// Filtros
const busca = ref('')
const categoriaSel = ref('')
const ativoSel = ref('')
const page = ref(1)
const actionsMenuOpenFor = ref(null)
const showDrawer = ref(false)
const isSaving = ref(false)
const produtoForm = ref(novoProdutoVazio())

const categorias = ['Preenchimento', 'Toxina Botulínica', 'Skinbooster', 'Fio', 'Anestésico', 'Material cirúrgico', 'Descartáveis', 'Outros']

function novoProdutoVazio() {
  return { nome: '', unidadeMedida: '', aceitaFracao: false, quantidadeMinima: 0, categoria: '', fabricante: '' }
}

onMounted(() => carregar())

async function carregar() {
  const params = { page: page.value, limit: 20 }
  if (busca.value)       params.busca     = busca.value
  if (categoriaSel.value) params.categoria = categoriaSel.value
  if (ativoSel.value !== '') params.ativo   = ativoSel.value
  await store.fetchProdutos(params)
}

function toggleMenu(id) {
  actionsMenuOpenFor.value = actionsMenuOpenFor.value === id ? null : id
}

function abrirNovo() {
  produtoForm.value = novoProdutoVazio()
  showDrawer.value = true
}

function abrirEditar(produto) {
  produtoForm.value = { ...produto }
  showDrawer.value = true
  actionsMenuOpenFor.value = null
}

function fecharDrawer() {
  showDrawer.value = false
}

async function salvar() {
  if (isSaving.value) return
  if (!produtoForm.value.nome?.trim()) { toast.error('O nome do produto é obrigatório.'); return }
  if (!produtoForm.value.unidadeMedida) { toast.error('Selecione a unidade de medida.'); return }
  isSaving.value = true
  try {
    const isEdit = !!produtoForm.value._id
    const result = isEdit
      ? await store.updateProduto(produtoForm.value._id, produtoForm.value)
      : await store.createProduto(produtoForm.value)

    if (result.success) {
      toast.success(isEdit ? 'Produto atualizado!' : 'Produto criado com sucesso!')
      fecharDrawer()
    } else {
      toast.error(result.error || 'Erro ao salvar produto.')
    }
  } finally {
    isSaving.value = false
  }
}

async function excluir(id) {
  if (!confirm('Excluir este produto? Ele não estará mais disponível para novos lotes.')) return
  actionsMenuOpenFor.value = null
  const result = await store.deleteProduto(id)
  if (result.success) {
    toast.success('Produto excluído.')
  } else {
    toast.error(result.error)
  }
}

function verDetalhes(id) {
  router.push({ name: 'estoque-produto-detalhe', params: { id } })
  actionsMenuOpenFor.value = null
}

function aplicarFiltros() {
  page.value = 1
  carregar()
}

function limparFiltros() {
  busca.value = ''
  categoriaSel.value = ''
  ativoSel.value = ''
  page.value = 1
  carregar()
}

const temFiltrosAtivos = computed(() => busca.value || categoriaSel.value || ativoSel.value !== '')
const totalPaginas = computed(() => store.produtosMeta?.totalPages || 1)

function irParaPagina(p) {
  page.value = p
  carregar()
}
</script>

<template>
  <div class="produtos-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="title">Produtos</h1>
        <p class="subtitle">Catálogo de insumos cadastrados na clínica.</p>
      </div>
      <AppButton variant="primary" @click="abrirNovo">
        <Plus :size="16" /> Novo Produto
      </AppButton>
    </header>

    <!-- Filtros -->
    <div class="filtros-bar">
      <div class="search-wrapper">
        <Search :size="16" class="search-icon" />
        <input
          class="search-input"
          type="text"
          placeholder="Buscar produto..."
          v-model="busca"
          @keyup.enter="aplicarFiltros"
        />
      </div>

      <select class="filter-select" v-model="categoriaSel" @change="aplicarFiltros">
        <option value="">Todas as categorias</option>
        <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
      </select>

      <select class="filter-select" v-model="ativoSel" @change="aplicarFiltros">
        <option value="">Todos os status</option>
        <option value="true">Ativo</option>
        <option value="false">Inativo</option>
      </select>

      <button v-if="temFiltrosAtivos" class="btn-clear-filters" @click="limparFiltros">
        <X :size="14" /> Limpar
      </button>
    </div>

    <!-- Tabela -->
    <div class="table-wrapper" :class="{ 'is-loading': store.loadingProdutos && store.produtos.length > 0 }">
      <!-- Desktop -->
      <div class="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th><div class="th-content"><Package :size="14" /><span>Produto</span></div></th>
              <th><div class="th-content"><span>Unidade</span></div></th>
              <th><div class="th-content"><span>Categoria</span></div></th>
              <th><div class="th-content"><span>Estoque mínimo</span></div></th>
              <th><div class="th-content"><span>Status</span></div></th>
              <th class="actions-header"><div class="th-content"><SlidersHorizontal :size="14" /><span>Ações</span></div></th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton -->
            <template v-if="store.loadingProdutos && store.produtos.length === 0">
              <tr v-for="n in 6" :key="`sk-${n}`" class="skeleton-row">
                <td><div class="skeleton" style="width:60%"></div></td>
                <td><div class="skeleton" style="width:40%"></div></td>
                <td><div class="skeleton" style="width:50%"></div></td>
                <td><div class="skeleton" style="width:30%"></div></td>
                <td><div class="skeleton" style="width:40%"></div></td>
                <td><div class="skeleton skeleton-btn"></div></td>
              </tr>
            </template>

            <!-- Empty -->
            <template v-else-if="!store.loadingProdutos && store.produtos.length === 0">
              <tr>
                <td colspan="6" class="empty-cell">
                  <div class="empty-state">
                    <div class="empty-icon"><Package :size="28" /></div>
                    <h3>Nenhum produto encontrado</h3>
                    <p>{{ temFiltrosAtivos ? 'Tente ajustar os filtros.' : 'Comece cadastrando o primeiro insumo.' }}</p>
                    <button v-if="!temFiltrosAtivos" class="btn-primary-sm" @click="abrirNovo">
                      <Plus :size="15" /> Novo Produto
                    </button>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Dados -->
            <template v-else>
              <tr v-for="p in store.produtos" :key="p._id" class="produto-row" @click="verDetalhes(p._id)">
                <td>
                  <div class="nome-wrapper">
                    <span class="nome">{{ p.nome }}</span>
                    <span v-if="p.fabricante" class="fabricante">{{ p.fabricante }}</span>
                  </div>
                </td>
                <td><span class="tag-unidade">{{ p.unidadeMedida }}</span></td>
                <td class="txt-gray">{{ p.categoria || '—' }}</td>
                <td class="txt-gray">{{ p.quantidadeMinima ?? '—' }}</td>
                <td>
                  <span class="badge" :class="p.ativo !== false ? 'badge--ativo' : 'badge--inativo'">
                    {{ p.ativo !== false ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="actions-cell" @click.stop>
                  <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)">
                    <button class="btn-icon" @click.stop="toggleMenu(p._id)"><MoreHorizontal :size="20" /></button>
                    <Transition name="fade">
                      <div v-if="actionsMenuOpenFor === p._id" class="actions-dropdown">
                        <button class="dropdown-item" @click.stop="verDetalhes(p._id)"><Eye :size="14" /> Ver detalhes</button>
                        <button class="dropdown-item" @click.stop="abrirEditar(p)"><Pencil :size="14" /> Editar</button>
                        <button class="dropdown-item delete" @click.stop="excluir(p._id)"><Trash2 :size="14" /> Excluir</button>
                      </div>
                    </Transition>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile List -->
      <div class="mobile-list">
        <template v-if="store.loadingProdutos && store.produtos.length === 0">
          <div v-for="n in 5" :key="`sm-${n}`" class="produto-card skeleton-card">
            <div class="skeleton" style="width:50%;height:1rem;margin-bottom:0.4rem"></div>
            <div class="skeleton" style="width:35%;height:0.8rem"></div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="p in store.produtos" :key="p._id"
            class="produto-card"
            @click="verDetalhes(p._id)"
          >
            <div class="produto-card-info">
              <span class="nome">{{ p.nome }}</span>
              <span class="tag-unidade">{{ p.unidadeMedida }}</span>
              <span class="txt-gray" style="font-size:.78rem">{{ p.categoria || 'Sem categoria' }}</span>
            </div>
            <div class="actions-wrapper" v-click-outside="() => (actionsMenuOpenFor = null)" @click.stop>
              <button class="btn-icon" @click.stop="toggleMenu(p._id)"><MoreHorizontal :size="20" /></button>
              <Transition name="fade">
                <div v-if="actionsMenuOpenFor === p._id" class="actions-dropdown">
                  <button class="dropdown-item" @click.stop="verDetalhes(p._id)"><Eye :size="14" /> Ver detalhes</button>
                  <button class="dropdown-item" @click.stop="abrirEditar(p)"><Pencil :size="14" /> Editar</button>
                  <button class="dropdown-item delete" @click.stop="excluir(p._id)"><Trash2 :size="14" /> Excluir</button>
                </div>
              </Transition>
            </div>
          </div>
        </template>
        <div v-if="!store.loadingProdutos && store.produtos.length === 0" class="empty-cell">
          <div class="empty-state">
            <div class="empty-icon"><Package :size="28" /></div>
            <h3>Nenhum produto encontrado</h3>
            <button class="btn-primary-sm" @click="abrirNovo"><Plus :size="15" /> Novo Produto</button>
          </div>
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="paginacao">
        <button class="btn-pag" :disabled="page <= 1" @click="irParaPagina(page - 1)">← Anterior</button>
        <span class="pag-info">Página {{ page }} de {{ totalPaginas }}</span>
        <button class="btn-pag" :disabled="page >= totalPaginas" @click="irParaPagina(page + 1)">Próxima →</button>
      </div>
    </div>

    <!-- Drawer de Formulário -->
    <SideDrawer v-if="showDrawer" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div>
            <h2 class="drawer-title">{{ produtoForm._id ? 'Editar Produto' : 'Novo Produto' }}</h2>
            <span v-if="produtoForm._id" class="drawer-id">ID #{{ produtoForm._id.slice(-6).toUpperCase() }}</span>
          </div>
          <button @click="fecharDrawer" class="close-btn-header"><X :size="22" /></button>
        </div>
      </template>

      <EstoqueFormProduto v-model="produtoForm" />

      <template #footer>
        <div class="drawer-footer">
          <AppButton variant="default" @click="fecharDrawer"><X :size="16" /> Cancelar</AppButton>
          <AppButton variant="secondary" @click="salvar" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" :size="16" class="spin" />
            <Check v-else :size="16" />
            {{ produtoForm._id ? 'Salvar' : 'Criar' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style scoped>
.produtos-page { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.title { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
.subtitle { color: var(--cinza-texto); }

/* Filtros */
.filtros-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}
.search-input {
  width: 100%;
  padding: 0.6rem 0.875rem 0.6rem 2.25rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color .2s;
}
.search-input:focus { border-color: var(--azul-principal); }

.filter-select {
  padding: 0.6rem 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.btn-clear-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  color: #6b7280;
}
.btn-clear-filters:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

/* Table */
.table-wrapper {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  position: relative;
}
.table-wrapper.is-loading { opacity:.55; pointer-events:none; }
.table-container { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; }
th, td {
  padding: 0.875rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}
tbody tr:last-child td { border-bottom: none; }
th {
  background: #f9fafb;
  color: var(--cinza-texto);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 600;
}
.th-content { display: flex; align-items: center; gap: 0.4rem; }
.actions-header { width: 80px; }
.actions-header .th-content { justify-content: flex-end; }

.produto-row { cursor: pointer; transition: background .15s; }
.produto-row:hover td { background: #f9fafb; }

.nome-wrapper { display: flex; flex-direction: column; gap: .2rem; }
.nome { font-weight: 600; color: #111827; }
.fabricante { font-size: .78rem; color: #9ca3af; }
.txt-gray { color: #6b7280; font-size: .875rem; }

.tag-unidade {
  display: inline-block;
  padding: .15rem .55rem;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: .4rem;
  font-size: .72rem;
  font-weight: 700;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: .2rem .65rem;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
}
.badge--ativo { background: #dcfce7; color: #15803d; }
.badge--inativo { background: #f3f4f6; color: #6b7280; }

/* Actions */
.actions-cell { text-align: right; }
.actions-wrapper { position: relative; display: inline-block; }
.btn-icon { background:none; border:none; cursor:pointer; padding:.4rem; border-radius:50%; color:#6b7280; display:flex; align-items:center; }
.btn-icon:hover { background:#f3f4f6; }
.actions-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + .4rem);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: .75rem;
  box-shadow: 0 6px 20px rgba(0,0,0,.1);
  z-index: 20;
  width: 160px;
  padding: .4rem;
}
.dropdown-item {
  display: flex; align-items: center; gap: .65rem;
  padding: .55rem .65rem;
  border-radius: .5rem;
  width: 100%; background:none; border:none; cursor:pointer;
  font-size: .875rem; font-weight: 500; color: #374151;
}
.dropdown-item:hover { background: #f3f4f6; }
.dropdown-item.delete { color: #ef4444; }
.dropdown-item.delete:hover { background: #fee2e2; }

/* Empty */
.empty-cell { padding: 4rem; text-align: center; }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:.75rem; max-width: 320px; margin:0 auto; }
.empty-icon { width:56px; height:56px; background:#eff6ff; color:var(--azul-principal); border-radius:50%; display:flex; align-items:center; justify-content:center; }
.empty-state h3 { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.empty-state p { color:#9ca3af; font-size:.875rem; margin:0; text-align:center; }
.btn-primary-sm {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .5rem 1.1rem; border-radius: .75rem; border: none;
  background: var(--azul-principal); color: #fff;
  font-size: .875rem; font-weight: 600; cursor: pointer;
}

/* Mobile */
.mobile-list { display: none; }
.produto-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
}
.produto-card:last-child { border: none; }
.produto-card:hover { background: #f9fafb; }
.produto-card-info { display: flex; flex-direction: column; gap: .25rem; }
.skeleton-card { pointer-events: none; }

/* Paginação */
.paginacao {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; padding: 1rem;
  border-top: 1px solid #f3f4f6;
}
.btn-pag {
  padding: .45rem 1rem; border: 1.5px solid #e5e7eb; border-radius: .65rem;
  font-size: .85rem; font-weight: 600; cursor: pointer; background: #fff; color: #374151;
}
.btn-pag:hover:not(:disabled) { background: #f9fafb; }
.btn-pag:disabled { opacity: .4; cursor: not-allowed; }
.pag-info { font-size: .85rem; color: #6b7280; font-weight: 500; }

/* Drawer */
.drawer-header { padding: 1.5rem; border-bottom: 1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:flex-start; }
.drawer-title { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.drawer-id { font-size:.75rem; color:#6b7280; background:#f3f4f6; padding:.15rem .5rem; border-radius:4px; display:inline-block; margin-top:.25rem; }
.close-btn-header { background:none; border:none; cursor:pointer; color:#6b7280; padding:.25rem; border-radius:.5rem; display:flex; align-items:center; }
.close-btn-header:hover { background:#f3f4f6; }
.drawer-footer { padding:1.25rem 1.5rem; display:flex; gap:.75rem; justify-content:flex-end; border-top:1px solid #f3f4f6; }

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity .15s, transform .15s; }
.fade-enter-from, .fade-leave-to { opacity:0; transform:translateY(-4px); }
.skeleton { background:#e5e7eb; border-radius:.4rem; height:1rem; animation:pulse 1.5s ease infinite; }
.skeleton-btn { width:32px; height:32px; border-radius:50%; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes spin  { to{transform:rotate(360deg)} }
.spin { animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-list { display: block; }
  .filtros-bar { flex-direction: column; }
  .search-wrapper { min-width: 100%; }
}
</style>
