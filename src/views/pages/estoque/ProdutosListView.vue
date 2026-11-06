<script setup>
import StockTableList from '@/components/estoque/StockTableList.vue'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
// ProdutosListView.vue — Listagem de produtos do catálogo de estoque
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import { Plus, Search, Package, Eye, Pencil, Trash2, SlidersHorizontal, X, Check, LoaderCircle, FlaskConical, Tag, AlertTriangle } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
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
const listError = ref('')
const showDrawer = ref(false)
const isSaving = ref(false)
const produtoForm = ref(novoProdutoVazio())

const categorias = ['Preenchimento', 'Toxina Botulínica', 'Skinbooster', 'Fio', 'Anestésico', 'Material cirúrgico', 'Descartáveis', 'Outros']

const ativoOptions = [
  { label: 'Todos os status', value: '' },
  { label: 'Ativo', value: 'true' },
  { label: 'Inativo', value: 'false' },
]

const categoriaOptions = [
  { label: 'Todas as categorias', value: '' },
  ...categorias.map(c => ({ label: c, value: c }))
]

function novoProdutoVazio() {
  return { nome: '', unidadeMedida: '', aceitaFracao: false, quantidadeMinima: 0, categoria: '', fabricante: '' }
}

onMounted(() => carregar())

async function carregar() {
  const params = { page: page.value, limit: 20 }
  if (busca.value)       params.busca     = busca.value
  if (categoriaSel.value) params.categoria = categoriaSel.value
  if (ativoSel.value !== '') params.ativo   = ativoSel.value
  listError.value = ''
  const result = await store.fetchProdutos(params)
  if (!result.success) listError.value = result.error || 'Não foi possível carregar os registros.'
}

function abrirNovo() {
  produtoForm.value = novoProdutoVazio()
  showDrawer.value = true
}

function abrirEditar(produto) {
  produtoForm.value = { ...produto }
  showDrawer.value = true
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

  const result = await store.deleteProduto(id)
  if (result.success) {
    toast.success('Produto excluído.')
  } else {
    toast.error(result.error)
  }
}

function verDetalhes(id) {
  router.push({ name: 'estoque-produto-detalhe', params: { id } })
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
      <AppButton variant="primary" class="new-product" aria-label="Novo produto" @click="abrirNovo">
        <Plus :size="16" /><span>Novo Produto</span>
      </AppButton>
    </header>

    <StockTableList :loading="store.loadingProdutos" :error="listError" :empty="store.produtos.length === 0" empty-title="Nenhum produto encontrado" :empty-text="temFiltrosAtivos ? 'Tente ajustar os filtros.' : 'Comece cadastrando o primeiro insumo.'" :columns="6" :page="page" :meta="store.produtosMeta" :limit="20" @retry="carregar" @page-change="irParaPagina">
      <template #filters>
    <div class="filtros-bar">
      <div class="search-wrapper">
        <Search :size="16" class="search-icon" />
        <input
          class="search-input"
          type="text"
          placeholder="Buscar produto..."
          v-model="busca"
          aria-label="Buscar produto"
          @keyup.enter="aplicarFiltros"
        />
      </div>

      <div style="width: 270px">
        <StyledSelect
          v-model="categoriaSel"
          :options="categoriaOptions"
          @update:modelValue="aplicarFiltros">
          <template #prefix><span class="select-prefix"><Tag :size="14" />Categoria:</span></template>
        </StyledSelect>
      </div>

      <div style="width: 220px">
        <StyledSelect
          v-model="ativoSel"
          :options="ativoOptions"
          @update:modelValue="aplicarFiltros">
          <template #prefix><span class="select-prefix"><Check :size="14" />Status:</span></template>
        </StyledSelect>
      </div>

      <AppButton variant="outline" class="clear-filters" :disabled="!temFiltrosAtivos" @click="limparFiltros">Limpar</AppButton>
    </div>
      </template>
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

              <tr v-for="p in store.produtos" :key="p._id" class="produto-row" @click="verDetalhes(p._id)">
                <td>
                  <div class="nome-wrapper">
                    <span class="nome">{{ p.nome }}</span>
                    <span v-if="p.fabricante" class="fabricante">{{ p.fabricante }}</span>
                  </div>
                </td>
                <td>
                  <span class="tag-unidade">
                    <FlaskConical :size="12" /> {{ p.unidadeMedida }}
                  </span>
                </td>
                <td>
                  <span v-if="p.categoria" class="tag-categoria">
                    <Tag :size="12" /> {{ p.categoria }}
                  </span>
                  <span v-else class="txt-gray">—</span>
                </td>
                <td>
                  <div class="alerta-minimo-card" v-if="p.quantidadeMinima != null">
                    <AlertTriangle :size="13" class="alerta-icon" />
                    <span>Min: {{ p.quantidadeMinima }}</span>
                  </div>
                  <span v-else class="txt-gray">—</span>
                </td>
                <td>
                  <span class="badge" :class="p.ativo !== false ? 'badge--ativo' : 'badge--inativo'">
                    {{ p.ativo !== false ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="actions-cell" @click.stop>
                  <AppDropdownActions>
                    <template #default="{ close }">
                      <button
                        class="dropdown-item"
                        @click.stop="close(), verDetalhes(p._id)"
                      >
                        <Eye :size="14" />
                        Ver detalhes
                      </button>
                      <button
                        class="dropdown-item"
                        @click.stop="close(), abrirEditar(p)"
                      >
                        <Pencil :size="14" />
                        Editar
                      </button>
                      <button
                        class="dropdown-item delete"
                        @click.stop="close(), excluir(p._id)"
                      >
                        <Trash2 :size="14" />
                        Excluir
                      </button>
                    </template>
                  </AppDropdownActions>
                </td>
              </tr>

          </tbody>
        </table>
      </div>

      <!-- Mobile List -->
      <div class="mobile-list">

          <div class="mobile-grid">
            <div
              v-for="p in store.produtos" :key="p._id"
              class="produto-card"
              @click="verDetalhes(p._id)"
            >
              <div class="produto-card-header">
                <div class="nome-wrapper">
                  <span class="nome">{{ p.nome }}</span>
                  <span v-if="p.fabricante" class="fabricante">{{ p.fabricante }}</span>
                </div>
                <AppDropdownActions>
                  <template #default="{ close }">
                    <button
                      class="dropdown-item"
                      @click.stop="close(), verDetalhes(p._id)"
                    >
                      <Eye :size="14" />
                      Ver detalhes
                    </button>
                    <button
                      class="dropdown-item"
                      @click.stop="close(), abrirEditar(p)"
                    >
                      <Pencil :size="14" />
                      Editar
                    </button>
                    <button
                      class="dropdown-item delete"
                      @click.stop="close(), excluir(p._id)"
                    >
                      <Trash2 :size="14" />
                      Excluir
                    </button>
                  </template>
                </AppDropdownActions>
              </div>

              <div class="produto-card-tags">
                <span class="tag-unidade"><FlaskConical :size="12" /> {{ p.unidadeMedida }}</span>
                <span v-if="p.categoria" class="tag-categoria"><Tag :size="12" /> {{ p.categoria }}</span>
              </div>

              <div class="produto-card-footer" v-if="p.quantidadeMinima != null">
                <div class="alerta-minimo-card">
                  <AlertTriangle :size="14" class="alerta-icon" />
                  <span>Estoque Mín: {{ p.quantidadeMinima }}</span>
                </div>
                <span class="badge" :class="p.ativo !== false ? 'badge--ativo' : 'badge--inativo'">
                  {{ p.ativo !== false ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
              <div class="produto-card-footer" v-else>
                <div class="spacer"></div>
                <span class="badge" :class="p.ativo !== false ? 'badge--ativo' : 'badge--inativo'">
                  {{ p.ativo !== false ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>
          </div>

      </div>

    </StockTableList>

    <!-- Drawer de Formulário -->
    <SideDrawer v-if="showDrawer" @close="fecharDrawer">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-header-text">
            <h2 class="drawer-title">{{ produtoForm._id ? 'Editar Produto' : 'Novo Produto' }}</h2>
            <p class="drawer-subtitle">
              {{ produtoForm._id ? 'Ajuste detalhes e níveis de alerta deste item' : 'Cadastre um novo item do catálogo' }}
            </p>
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
.produtos-page { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; }

.page-header { flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom:1rem;
}
.title { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
.subtitle { color: var(--cinza-texto); }

/* Filtros */
.filtros-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom:1rem;
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

/* Table */

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
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: .15rem .55rem;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: .4rem;
  font-size: .72rem;
  font-weight: 700;
}

.tag-categoria {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f0fdf4;
  color: #16a34a;
  padding: .15rem .55rem;
  border-radius: .4rem;
  font-size: .72rem;
  font-weight: 700;
}

.alerta-minimo-card {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}
.alerta-icon { color: #ea580c; }

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

/* Empty */

.btn-primary-sm {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .5rem 1.1rem; border-radius: .75rem; border: none;
  background: var(--azul-principal); color: #fff;
  font-size: .875rem; font-weight: 600; cursor: pointer;
}

/* Mobile */
.mobile-list { display: none; }
.mobile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.produto-card {
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.produto-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}
.produto-card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.produto-card-tags {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
}
.produto-card-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #e5e7eb;
}

/* Paginação */

/* Drawer */
.drawer-header { padding: 1.5rem; border-bottom: 1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:flex-start; }
.drawer-header-text { display: flex; flex-direction: column; gap: 0.15rem; }
.drawer-title { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.drawer-subtitle { font-size: 0.8rem; color: #9ca3af; margin: 0; }
.drawer-id { font-size:.75rem; color:#6b7280; background:#f3f4f6; padding:.15rem .5rem; border-radius:4px; display:inline-block; margin-top:.25rem; }
.drawer-footer { padding:1.25rem 1.5rem; display:flex; gap:.75rem; justify-content:flex-end; border-top:1px solid #f3f4f6; }

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity .15s, transform .15s; }
.fade-enter-from, .fade-leave-to { opacity:0; transform:translateY(-4px); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes spin  { to{transform:rotate(360deg)} }
.spin { animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-list { display: block; }
  .mobile-grid { padding: 0.5rem 0; }

  .filtros-bar { flex-direction: column; }
  .search-wrapper { min-width: 100%; }
}
.clear-filters { width: 88px; min-width: 88px; }
@media (max-width: 768px) {
  .title { font-size: 1.5rem; }
  .subtitle { font-size: .8125rem; }
  .page-header { flex-wrap: nowrap; align-items: center; }
  .new-product { width: 40px; padding: 0; flex-shrink: 0; }
  .new-product span { display: none; }
}
</style>
