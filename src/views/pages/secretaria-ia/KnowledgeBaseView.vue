<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAiSecretaryStore } from '@/stores/aiSecretary'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import Stepper from '@/components/pages/onboarding/Stepper.vue'

const store = useAiSecretaryStore()
const toast = useToast()

const searchTerm = ref('')
const categoryFilter = ref('all')
const typeFilter = ref('all')
const statusFilter = ref('all')
const selectedItemId = ref(null)
const showCreateModal = ref(false)
const createStep = ref(1)
const form = ref({ title: '', type: 'faq', content: '', tagsText: '' })

const createSteps = [
  { name: 'Identificacao', icon: FileText, subtitle: 'Titulo e tipo' },
  { name: 'Conteudo', icon: BookOpen, subtitle: 'Resposta e tags' },
  { name: 'Revisao', icon: CheckCircle2, subtitle: 'Conferencia' },
]

const knowledgeItems = computed(() => store.knowledgeItems || [])

const normalizedItems = computed(() => {
  return knowledgeItems.value.map((item) => {
    const category = getItemCategory(item)
    const status = getItemStatus(item)
    const tags = getItemTags(item)

    return {
      ...item,
      id: item._id || item.id || item.title,
      category,
      status,
      tags,
      typeLabel: getTypeLabel(item.type),
      updatedLabel: formatDate(item.updatedAt || item.createdAt),
      updatedBy: getUpdatedBy(item),
      description: getItemDescription(item),
      icon: getCategoryIcon(category),
      tone: getCategoryTone(category),
    }
  })
})

const filteredItems = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  return normalizedItems.value.filter((item) => {
    const matchesTerm = !term || [
      item.title,
      item.content,
      item.category,
      item.type,
      item.updatedBy,
      ...(item.tags || []),
    ].some((value) => String(value || '').toLowerCase().includes(term))

    const matchesCategory = categoryFilter.value === 'all' || item.category === categoryFilter.value
    const matchesType = typeFilter.value === 'all' || item.type === typeFilter.value
    const matchesStatus = statusFilter.value === 'all' || item.status === statusFilter.value

    return matchesTerm && matchesCategory && matchesType && matchesStatus
  })
})

const selectedItem = computed(() => {
  return normalizedItems.value.find((item) => item.id === selectedItemId.value) || normalizedItems.value[0] || null
})

const categoryOptions = computed(() => {
  const categories = [...new Set(normalizedItems.value.map((item) => item.category).filter(Boolean))]
  return categories.map((category) => ({ value: category, label: getCategoryLabel(category) }))
})

const typeOptions = computed(() => {
  const types = [...new Set(normalizedItems.value.map((item) => item.type).filter(Boolean))]
  return types.map((type) => ({ value: type, label: getTypeLabel(type) }))
})

const categoryFilterOptions = computed(() => [
  { value: 'all', label: 'Todas as categorias' },
  ...categoryOptions.value,
])

const typeFilterOptions = computed(() => [
  { value: 'all', label: 'Tipo' },
  ...typeOptions.value,
])

const statusFilterOptions = [
  { value: 'all', label: 'Status' },
  { value: 'active', label: 'Ativos' },
  { value: 'review', label: 'Revisao' },
  { value: 'inactive', label: 'Inativos' },
]

const formTypeOptions = [
  { value: 'faq', label: 'FAQ' },
  { value: 'procedure', label: 'Procedimento' },
  { value: 'insurance', label: 'Convenio' },
  { value: 'address', label: 'Endereco' },
  { value: 'policy', label: 'Regra' },
  { value: 'preparation', label: 'Preparo' },
  { value: 'other', label: 'Outro' },
]

const stats = computed(() => {
  const total = normalizedItems.value.length
  const active = normalizedItems.value.filter((item) => item.status === 'active').length
  const review = normalizedItems.value.filter((item) => item.status === 'review').length
  const usage = normalizedItems.value.reduce((sum, item) => sum + getMockedUsage(item), 0)

  return [
    {
      label: 'Total de itens',
      value: store.counters?.knowledgeCount || total,
      subtext: 'Conhecimentos cadastrados',
      icon: Layers,
      tone: 'blue',
    },
    {
      label: 'Ativos',
      value: active,
      subtext: 'Itens disponiveis para IA',
      icon: CheckCircle2,
      tone: 'green',
    },
    {
      label: 'Precisam de revisao',
      value: review,
      subtext: 'Itens vencidos ou antigos',
      icon: Clock3,
      tone: 'amber',
    },
    {
      label: 'Usados pela IA (30 dias)',
      value: formatNumber(usage),
      subtext: 'Respostas geradas',
      icon: TrendingUp,
      tone: 'purple',
    },
  ]
})

onMounted(async () => {
  await Promise.all([store.fetchSummary(), store.fetchKnowledgeItems()])
})

watch(normalizedItems, (items) => {
  if (!items.length) {
    selectedItemId.value = null
    return
  }

  if (!items.some((item) => item.id === selectedItemId.value)) {
    selectedItemId.value = items[0].id
  }
}, { immediate: true })

async function createKnowledge() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    toast.error('Informe titulo e conteudo.')
    return
  }

  const item = await store.createKnowledgeItem({
    title: form.value.title.trim(),
    type: form.value.type,
    content: form.value.content.trim(),
    tags: form.value.tagsText.split(',').map((tagValue) => tagValue.trim()).filter(Boolean),
  })

  form.value = { title: '', type: 'faq', content: '', tagsText: '' }
  showCreateModal.value = false
  createStep.value = 1
  selectedItemId.value = item?._id || item?.id || selectedItemId.value
}

function openCreateDrawer() {
  createStep.value = 1
  showCreateModal.value = true
}

function closeCreateDrawer() {
  showCreateModal.value = false
  createStep.value = 1
}

function nextCreateStep() {
  if (createStep.value === 1 && !form.value.title.trim()) {
    toast.warning('Informe o titulo do item.')
    return
  }

  if (createStep.value === 2 && !form.value.content.trim()) {
    toast.warning('Informe o conteudo da resposta.')
    return
  }

  if (createStep.value < createSteps.length) {
    createStep.value += 1
  }
}

function previousCreateStep() {
  if (createStep.value > 1) {
    createStep.value -= 1
  }
}

function selectItem(item) {
  selectedItemId.value = item.id
}

function resetFilters() {
  searchTerm.value = ''
  categoryFilter.value = 'all'
  typeFilter.value = 'all'
  statusFilter.value = 'all'
}

function getTypeLabel(type) {
  const map = {
    faq: 'FAQ',
    procedure: 'Procedimento',
    insurance: 'Convenio',
    address: 'Endereco',
    policy: 'Regra',
    preparation: 'Preparo',
    other: 'Outro',
    article: 'Artigo',
    list: 'Lista',
  }
  return map[type] || 'FAQ'
}

function getItemTags(item) {
  if (Array.isArray(item.tags)) return item.tags.filter(Boolean)
  if (typeof item.tags === 'string') return item.tags.split(',').map((tagValue) => tagValue.trim()).filter(Boolean)
  return []
}

function getItemCategory(item) {
  if (item.category) return normalizeCategory(item.category)

  const text = `${item.title || ''} ${item.type || ''} ${getItemTags(item).join(' ')}`.toLowerCase()
  if (text.includes('endereco') || text.includes('horario') || text.includes('local')) return 'localizacao'
  if (text.includes('valor') || text.includes('preco') || text.includes('pagamento')) return 'precos'
  if (text.includes('objec')) return 'objecoes'
  if (text.includes('beneficio')) return 'beneficios'
  if (text.includes('preparo') || text.includes('cuidado')) return 'cuidados'
  if (text.includes('convenio') || text.includes('plano')) return 'convenios'
  if (text.includes('politica') || text.includes('regra') || text.includes('cancelamento')) return 'politicas'
  if (text.includes('agenda') || text.includes('reagenda')) return 'agendamento'
  return 'geral'
}

function normalizeCategory(category) {
  return String(category)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getCategoryLabel(category) {
  const map = {
    localizacao: 'Localizacao',
    precos: 'Precos',
    objecoes: 'Objecoes',
    beneficios: 'Beneficios',
    cuidados: 'Cuidados',
    convenios: 'Convenios',
    politicas: 'Politicas',
    agendamento: 'Agendamento',
    geral: 'Geral',
  }
  return map[category] || String(category || 'Geral')
}

function getCategoryIcon(category) {
  const map = {
    localizacao: MapPin,
    precos: DollarSign,
    objecoes: HelpCircle,
    beneficios: Sparkles,
    cuidados: ShieldCheck,
    convenios: Users,
    politicas: FileText,
    agendamento: Clock3,
  }
  return map[category] || BookOpen
}

function getCategoryTone(category) {
  const map = {
    localizacao: 'blue',
    precos: 'green',
    objecoes: 'purple',
    beneficios: 'amber',
    cuidados: 'sky',
    convenios: 'pink',
    politicas: 'slate',
    agendamento: 'orange',
  }
  return map[category] || 'blue'
}

function getItemStatus(item) {
  const rawStatus = String(item.status || item.reviewStatus || '').toLowerCase()
  if (['inactive', 'disabled', 'archived'].includes(rawStatus)) return 'inactive'
  if (['review', 'needs_review', 'expired', 'pending'].includes(rawStatus) || item.needsReview) return 'review'

  const updatedAt = item.updatedAt || item.createdAt
  if (updatedAt) {
    const updatedTime = new Date(updatedAt).getTime()
    const staleTime = Date.now() - 1000 * 60 * 60 * 24 * 120
    if (Number.isFinite(updatedTime) && updatedTime < staleTime) return 'review'
  }

  return 'active'
}

function getStatusLabel(status) {
  const map = {
    active: 'Ativo',
    review: 'Revisao',
    inactive: 'Inativo',
  }
  return map[status] || 'Ativo'
}

function getItemDescription(item) {
  return item.description || item.summary || item.content || 'Item de conhecimento para orientar a Secretaria IA.'
}

function getUpdatedBy(item) {
  return item.updatedBy?.name || item.author?.name || item.metadata?.updatedBy || 'Equipe'
}

function formatDate(date) {
  if (!date) return '--/--/----'

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return String(date)

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0)
}

function getMockedUsage(item) {
  if (Number.isFinite(Number(item.usage30d))) return Number(item.usage30d)
  if (Number.isFinite(Number(item.analytics?.usage30d))) return Number(item.analytics.usage30d)

  const base = String(item.id || item.title || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 18 + (base % 96)
}

function getMockedSuccessRate(item) {
  if (Number.isFinite(Number(item.successRate30d))) return Number(item.successRate30d)
  if (Number.isFinite(Number(item.analytics?.successRate30d))) return Number(item.analytics.successRate30d)
  return 88 + (getMockedUsage(item) % 10)
}

function getMockedFeedback(item) {
  if (Number.isFinite(Number(item.positiveFeedback30d))) return Number(item.positiveFeedback30d)
  if (Number.isFinite(Number(item.analytics?.positiveFeedback30d))) return Number(item.analytics.positiveFeedback30d)
  return Math.max(8, Math.round(getMockedUsage(item) * 0.72))
}
</script>

<template>
  <div class="knowledge-page">
    <header class="knowledge-hero">
      <div class="hero-copy">
        <div class="hero-icon">
          <BookOpen :size="24" />
        </div>
        <div>
          <h1>Base de conhecimento</h1>
          <p>Respostas aprovadas para orientar a Secretaria IA.</p>
        </div>
      </div>

      <AppButton variant="primary" size="lg" type="button" @click="openCreateDrawer">
        <Plus :size="16" />
        Novo item
      </AppButton>
    </header>

    <section class="stats-grid" aria-label="Resumo da base de conhecimento">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <span class="stat-icon" :class="`tone-${stat.tone}`">
          <component :is="stat.icon" :size="20" />
        </span>
        <div>
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.subtext }}</small>
        </div>
      </article>
    </section>

    <section class="knowledge-workspace">
      <div class="table-panel">
        <div class="table-header">
          <div>
            <h2>Biblioteca de conhecimento</h2>
            <p>Gerencie todos os conhecimentos que a IA pode utilizar.</p>
          </div>

          <div class="toolbar">
            <label class="search-field">
              <Search :size="16" />
              <input v-model="searchTerm" type="search" placeholder="Buscar itens..." />
            </label>

            <StyledSelect
              v-model="categoryFilter"
              :options="categoryFilterOptions"
              class="filter-select filter-select--category"
              dropdown-direction="down"
            />

            <StyledSelect
              v-model="typeFilter"
              :options="typeFilterOptions"
              class="filter-select"
              dropdown-direction="down"
            />

            <StyledSelect
              v-model="statusFilter"
              :options="statusFilterOptions"
              class="filter-select filter-select--status"
              dropdown-direction="down"
            />

            <button class="filter-button" type="button" @click="resetFilters">
              <Filter :size="15" />
              Filtros
            </button>
          </div>
        </div>

        <div class="knowledge-table-scroll">
          <table class="knowledge-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Ultima atualizacao</th>
                <th aria-label="Acoes"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :key="item.id"
                :class="{ selected: selectedItem?.id === item.id }"
                @click="selectItem(item)"
              >
                <td>
                  <div class="title-cell">
                    <span class="item-icon" :class="`tone-${item.tone}`">
                      <component :is="item.icon" :size="17" />
                    </span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.description }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="category-pill" :class="`tone-${item.tone}`">
                    {{ getCategoryLabel(item.category) }}
                  </span>
                </td>
                <td>{{ item.typeLabel }}</td>
                <td>
                  <span class="status-pill" :class="`status-${item.status}`">
                    <span></span>
                    {{ getStatusLabel(item.status) }}
                  </span>
                </td>
                <td>
                  <div class="updated-cell">
                    <span>{{ item.updatedLabel }}</span>
                    <small>{{ item.updatedBy }}</small>
                  </div>
                </td>
                <td>
                  <button class="row-action" type="button" @click.stop>
                    <MoreHorizontal :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!filteredItems.length" class="empty-state">
            <BookOpen :size="26" />
            <strong>Nenhum item encontrado</strong>
            <p>Cadastre endereco, horario, convenios, preparos e regras de reagendamento.</p>
          </div>
        </div>

        <footer class="table-footer">
          <span>Mostrando 1 a {{ filteredItems.length }} de {{ normalizedItems.length }} itens</span>
          <div class="pagination">
            <button type="button" disabled>‹</button>
            <button type="button" class="active">1</button>
            <button type="button" disabled>2</button>
            <button type="button" disabled>3</button>
            <span>...</span>
            <button type="button" disabled>›</button>
          </div>
          <span class="page-size-display">8 por pagina</span>
        </footer>
      </div>

      <aside class="detail-panel">
        <template v-if="selectedItem">
          <header class="detail-header">
            <span class="detail-icon" :class="`tone-${selectedItem.tone}`">
              <component :is="selectedItem.icon" :size="24" />
            </span>
            <div>
              <h2>{{ selectedItem.title }}</h2>
              <span class="status-pill" :class="`status-${selectedItem.status}`">
                <span></span>
                {{ getStatusLabel(selectedItem.status) }}
              </span>
            </div>
          </header>

          <p class="detail-meta">
            {{ selectedItem.typeLabel }} · {{ getCategoryLabel(selectedItem.category) }}
          </p>
          <p class="detail-meta">Atualizado em {{ selectedItem.updatedLabel }} por {{ selectedItem.updatedBy }}</p>

          <div class="detail-actions">
            <button class="detail-action detail-action--primary" type="button">
              <Pencil :size="15" />
              Editar
            </button>
            <button class="detail-action" type="button">
              <Copy :size="15" />
              Duplicar
            </button>
            <button class="detail-action" type="button">
              <MoreHorizontal :size="15" />
              Mais
            </button>
          </div>

          <section class="detail-section">
            <h3>Descricao</h3>
            <p>{{ selectedItem.description }}</p>
          </section>

          <section class="detail-section">
            <h3>Tags</h3>
            <div class="tag-list">
              <span v-for="tagValue in selectedItem.tags" :key="tagValue">
                <Tag :size="12" />
                {{ tagValue }}
              </span>
              <span v-if="!selectedItem.tags.length">Sem tags</span>
            </div>
          </section>

          <section class="detail-section">
            <h3>Uso pela IA (30 dias)</h3>
            <div class="usage-grid">
              <div>
                <strong>{{ getMockedUsage(selectedItem) }}</strong>
                <span>Vezes utilizado</span>
              </div>
              <div>
                <strong>{{ getMockedSuccessRate(selectedItem) }}%</strong>
                <span>Taxa de sucesso</span>
              </div>
              <div>
                <strong>{{ getMockedFeedback(selectedItem) }}</strong>
                <span>Feedbacks positivos</span>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <h3>Previa da resposta</h3>
            <div class="preview-box">
              {{ selectedItem.content }}
            </div>
          </section>

          <button class="full-button" type="button">
            Ver item completo
            <ExternalLink :size="15" />
          </button>

          <button class="danger-button" type="button" @click="store.removeKnowledgeItem(selectedItem.id)">
            <Trash2 :size="15" />
            Remover item
          </button>
        </template>

        <div v-else class="empty-detail">
          <BookOpen :size="28" />
          <strong>Selecione um item</strong>
          <p>Os detalhes da base aparecem aqui.</p>
        </div>
      </aside>
    </section>

    <SideDrawer v-if="showCreateModal" size="xl" @close="closeCreateDrawer">
      <template #header>
        <div class="kb-drawer-header">
          <div class="kb-drawer-title-group">
            <h2 class="kb-drawer-title">
              <div class="kb-drawer-icon">
                <BookOpen :size="24" />
              </div>
              Novo item
            </h2>
            <p class="kb-drawer-description">Preencha as informacoes para criar um conhecimento aprovado.</p>
          </div>
          <button type="button" class="close-btn-header" @click="closeCreateDrawer">
            <X :size="24" />
          </button>
        </div>
      </template>

      <div class="kb-drawer-body">
        <div class="kb-stepper-wrapper">
          <Stepper :steps="createSteps" :current-step="createStep" />
        </div>

        <section v-show="createStep === 1" class="kb-step-content">
          <div class="kb-form-section">
            <label class="kb-form-label">
              <FileText :size="14" />
              Titulo <span class="required-asterisk">*</span>
            </label>
            <input v-model="form.title" class="kb-form-input" placeholder="Ex: Endereco da clinica" autofocus />
          </div>

          <div class="kb-form-section">
            <label class="kb-form-label">
              <Layers :size="14" />
              Tipo
            </label>
            <StyledSelect v-model="form.type" :options="formTypeOptions" />
          </div>
        </section>

        <section v-show="createStep === 2" class="kb-step-content">
          <div class="kb-form-section">
            <label class="kb-form-label">
              <BookOpen :size="14" />
              Conteudo <span class="required-asterisk">*</span>
            </label>
            <textarea
              v-model="form.content"
              class="kb-form-textarea"
              rows="9"
              placeholder="Texto que a IA pode usar como referencia."
            ></textarea>
          </div>

          <div class="kb-form-section">
            <label class="kb-form-label">
              <Tag :size="14" />
              Tags
            </label>
            <input v-model="form.tagsText" class="kb-form-input" placeholder="agenda, preparo, convenio" />
          </div>
        </section>

        <section v-show="createStep === 3" class="kb-step-content">
          <article class="kb-review-card">
            <span class="detail-icon tone-blue">
              <BookOpen :size="22" />
            </span>
            <div>
              <h3>{{ form.title || 'Sem titulo' }}</h3>
              <p>{{ getTypeLabel(form.type) }}</p>
            </div>
          </article>

          <div class="kb-review-section">
            <h3>Previa da resposta</h3>
            <p>{{ form.content || 'Nenhum conteudo informado.' }}</p>
          </div>

          <div class="kb-review-section">
            <h3>Tags</h3>
            <div class="tag-list">
              <span v-for="tagValue in form.tagsText.split(',').map((tagText) => tagText.trim()).filter(Boolean)" :key="tagValue">
                <Tag :size="12" />
                {{ tagValue }}
              </span>
              <span v-if="!form.tagsText.trim()">Sem tags</span>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="kb-drawer-footer">
          <AppButton variant="default" @click="createStep === 1 ? closeCreateDrawer() : previousCreateStep()">
            <X v-if="createStep === 1" :size="18" />
            <ArrowLeft v-else :size="18" />
            {{ createStep === 1 ? 'Cancelar' : 'Voltar' }}
          </AppButton>

          <AppButton
            variant="primary"
            :loading="store.isSaving"
            :disabled="store.isSaving"
            @click="createStep === 3 ? createKnowledge() : nextCreateStep()"
          >
            <CheckCircle2 v-if="createStep === 3" :size="18" />
            <ArrowRight v-else :size="18" />
            {{ createStep === 3 ? 'Criar item' : 'Proximo' }}
          </AppButton>
        </div>
      </template>
    </SideDrawer>
  </div>
</template>

<style>
.knowledge-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 0;
  color: #0f172a;
}

.knowledge-hero,
.stats-grid,
.knowledge-workspace {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.knowledge-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.hero-copy {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.hero-icon,
.stat-icon,
.item-icon,
.detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
}

.hero-icon {
  width: 48px;
  height: 48px;
  color: #2563eb;
  background: #eff6ff;
}

.knowledge-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: 0;
}

.knowledge-hero p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.94rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-height: 96px;
  padding: 1rem;
  border: 1px solid #e9edf3;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fdfefe 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 26px rgba(15, 23, 42, 0.035);
}

.stat-card > div {
  min-width: 0;
}

.stat-card span:not(.stat-icon),
.stat-card small {
  display: block;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.3;
}

.stat-card strong {
  display: block;
  margin-top: 0.1rem;
  color: #0f172a;
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.1;
}

.stat-card small {
  margin-top: 0.2rem;
  color: #7b8798;
  font-weight: 500;
}

.stat-icon,
.detail-icon {
  width: 40px;
  height: 40px;
}

.knowledge-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: 1rem;
  overflow: hidden;
}

.table-panel,
.detail-panel {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.table-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: min(620px, calc(100vh - 300px));
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #edf1f7;
}

.table-header h2,
.detail-panel h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
  font-weight: 700;
}

.table-header p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

.knowledge-page .toolbar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.knowledge-page .search-field,
.knowledge-page .filter-button,
.knowledge-page .page-size-display {
  min-height: 38px;
  border: 1px solid #dbe3ef;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font: inherit;
  font-size: 0.83rem;
}

.knowledge-page .search-field {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 210px;
  padding: 0 0.75rem;
  color: #94a3b8;
}

.knowledge-page .search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #0f172a;
  font: inherit;
  font-size: 0.83rem;
}

.knowledge-page .filter-select {
  width: 134px;
  flex: 0 0 134px;
}

.knowledge-page .filter-select--category {
  width: 168px;
  flex-basis: 168px;
}

.knowledge-page .filter-select--status {
  width: 112px;
  flex-basis: 112px;
}

.knowledge-page .filter-select .select-button {
  min-height: 38px;
  border-radius: 6px;
  font-size: 0.83rem;
  box-shadow: none;
}

.knowledge-page .page-size-display {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.75rem;
  color: #64748b;
  background: #f8fafc;
}

.knowledge-page .filter-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.knowledge-table-scroll {
  flex: 1;
  min-height: 320px;
  max-height: min(560px, calc(100vh - 430px));
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.knowledge-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 0;
}

.knowledge-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fbfcfe;
}

.knowledge-table th,
.knowledge-table td {
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid #edf1f7;
  text-align: left;
  vertical-align: middle;
  font-size: 0.82rem;
  min-width: 0;
}

.knowledge-table th {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
}

.knowledge-table th:nth-child(1) { width: 35%; }
.knowledge-table th:nth-child(2) { width: 16%; }
.knowledge-table th:nth-child(3) { width: 13%; }
.knowledge-table th:nth-child(4) { width: 12%; }
.knowledge-table th:nth-child(5) { width: 18%; }
.knowledge-table th:nth-child(6) { width: 48px; }

.knowledge-table tbody tr {
  cursor: pointer;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.knowledge-table tbody tr:hover,
.knowledge-table tbody tr.selected {
  background: #f3f7ff;
}

.knowledge-table tbody tr.selected {
  box-shadow: inset 3px 0 0 #2563eb;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.title-cell > div,
.updated-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-cell strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-cell small,
.updated-cell small {
  overflow: hidden;
  color: #64748b;
  font-size: 0.74rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-icon {
  width: 32px;
  height: 32px;
}

.category-pill,
.knowledge-page .status-pill,
.knowledge-page .tag-list span {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.category-pill {
  padding: 0.34rem 0.55rem;
}

.knowledge-page .status-pill {
  padding: 0.32rem 0.55rem;
}

.knowledge-page .status-pill span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.knowledge-page .status-active {
  color: #059669;
  background: #ecfdf5;
}

.knowledge-page .status-review {
  color: #b45309;
  background: #fffbeb;
}

.knowledge-page .status-inactive {
  color: #64748b;
  background: #f1f5f9;
}

.knowledge-page .row-action,
.knowledge-page .close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  color: #64748b;
  background: transparent;
  cursor: pointer;
}

.knowledge-page .row-action:hover,
.knowledge-page .close-button:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.empty-state,
.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 260px;
  padding: 2rem;
  color: #64748b;
  text-align: center;
}

.empty-state strong,
.empty-detail strong {
  color: #0f172a;
}

.empty-state p,
.empty-detail p {
  margin: 0;
  max-width: 320px;
  font-size: 0.86rem;
}

.table-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid #edf1f7;
  color: #64748b;
  font-size: 0.78rem;
}

.knowledge-page .pagination {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.knowledge-page .pagination button {
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #64748b;
  background: transparent;
}

.knowledge-page .pagination button.active {
  color: #2563eb;
  background: #eef4ff;
  border-color: #dbeafe;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: min(650px, calc(100vh - 230px));
  padding: 1rem;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.detail-header > div {
  min-width: 0;
}

.detail-panel h2 {
  overflow: hidden;
  margin-bottom: 0.45rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-meta {
  margin: -0.45rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.35;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.detail-action,
.knowledge-page .full-button,
.knowledge-page .danger-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  min-height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.detail-action--primary {
  color: #fff;
  background: #2563eb;
  border-color: #2563eb;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.detail-section h3 {
  margin: 0;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 700;
}

.detail-section p {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.45;
}

.knowledge-page .tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.knowledge-page .tag-list span {
  padding: 0.38rem 0.5rem;
  color: #2563eb;
  background: #eff6ff;
}

.knowledge-page .usage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.knowledge-page .usage-grid div {
  min-width: 0;
  padding: 0.75rem 0.45rem;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  text-align: center;
}

.knowledge-page .usage-grid strong {
  display: block;
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.1;
}

.knowledge-page .usage-grid span {
  display: block;
  margin-top: 0.28rem;
  color: #64748b;
  font-size: 0.66rem;
  line-height: 1.2;
}

.preview-box {
  max-height: 132px;
  overflow: auto;
  padding: 0.85rem;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  color: #475569;
  background: #f8fafc;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.knowledge-page .full-button,
.knowledge-page .danger-button {
  width: 100%;
}

.knowledge-page .danger-button {
  color: #dc2626;
}

.kb-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.kb-drawer-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kb-drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 700;
}

.kb-drawer-icon {
  display: flex;
  align-items: center;
  color: var(--azul-principal);
}

.kb-drawer-description {
  margin: 0 0 0 2rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.kb-drawer-body {
  display: flex;
  flex-direction: column;
}

.kb-stepper-wrapper {
  margin-bottom: 2rem;
  padding: 0.5rem 0;
}

.kb-step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: kbFadeIn 0.3s ease;
}

.kb-form-section,
.kb-review-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.kb-form-label,
.kb-review-section h3 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
}

.kb-form-input,
.kb-form-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 0.95rem;
  outline: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.kb-form-input {
  min-height: 44px;
  padding: 0 0.875rem;
}

.kb-form-textarea {
  padding: 0.875rem;
  resize: vertical;
}

.kb-form-input:focus,
.kb-form-textarea:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 131, 246, 0.1);
}

.kb-review-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid #edf1f7;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.kb-review-card h3 {
  margin: 0;
  color: #111827;
  font-size: 1rem;
}

.kb-review-card p,
.kb-review-section p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.kb-review-section {
  padding: 1rem;
  border: 1px solid #edf1f7;
  border-radius: 0.75rem;
  background: #fff;
}

.kb-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

@keyframes kbFadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.knowledge-page .tone-blue { color: #2563eb; background: #eff6ff; }
.knowledge-page .tone-green { color: #059669; background: #ecfdf5; }
.knowledge-page .tone-amber { color: #b45309; background: #fffbeb; }
.knowledge-page .tone-purple { color: #7c3aed; background: #f5f3ff; }
.knowledge-page .tone-sky { color: #0284c7; background: #f0f9ff; }
.knowledge-page .tone-pink { color: #db2777; background: #fdf2f8; }
.knowledge-page .tone-slate { color: #475569; background: #f1f5f9; }
.knowledge-page .tone-orange { color: #ea580c; background: #fff7ed; }

@media (max-width: 1180px) {
  .knowledge-workspace {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    min-height: 0;
  }
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-header,
  .knowledge-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .knowledge-page .toolbar {
    flex-wrap: wrap;
  }

  .knowledge-page .search-field {
    width: min(100%, 320px);
  }
}

@media (max-width: 720px) {
  .stats-grid,
  .table-footer,
  .detail-actions,
  .usage-grid {
    grid-template-columns: 1fr;
  }

  .knowledge-table-scroll {
    max-height: 520px;
  }

  .knowledge-table th:nth-child(2),
  .knowledge-table td:nth-child(2),
  .knowledge-table th:nth-child(3),
  .knowledge-table td:nth-child(3) {
    display: none;
  }
}
</style>
