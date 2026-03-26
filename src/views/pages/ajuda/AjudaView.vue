<script setup>
import { computed, onMounted, ref } from 'vue'
import { BookOpenText, LifeBuoy, LoaderCircle, Mail, Search } from 'lucide-vue-next'
import MarkdownRenderer from '@/components/pages/ajuda/MarkdownRenderer.vue'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'

const knowledgeBaseStore = useKnowledgeBaseStore()

const searchQuery = ref('')
const selectedSlug = ref('')
const bootstrapping = ref(true)

function getFirstAvailableSlug(sourceCategories = knowledgeBaseStore.categories) {
  for (const category of sourceCategories) {
    if (Array.isArray(category.pages) && category.pages.length > 0) {
      return category.pages[0].slug
    }
  }
  return ''
}

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return knowledgeBaseStore.categories
  }

  return knowledgeBaseStore.categories
    .map((category) => ({
      ...category,
      pages: (category.pages || []).filter((page) =>
        page.title.toLowerCase().includes(query)
      ),
    }))
    .filter((category) => category.pages.length > 0)
})

const hasKnowledgeContent = computed(() =>
  knowledgeBaseStore.categories.some((category) => Array.isArray(category.pages) && category.pages.length > 0)
)

async function selectPageBySlug(slug) {
  if (!slug) return
  if (slug === selectedSlug.value && knowledgeBaseStore.currentPage?.slug === slug) return

  selectedSlug.value = slug
  await knowledgeBaseStore.loadPageBySlug(slug)
}

onMounted(async () => {
  bootstrapping.value = true
  const result = await knowledgeBaseStore.loadTree()

  if (result.success) {
    const firstSlug = getFirstAvailableSlug()
    if (firstSlug) {
      await selectPageBySlug(firstSlug)
    }
  }

  bootstrapping.value = false
})
</script>

<template>
  <div class="help-page">
    <aside class="help-sidebar">
      <div class="sidebar-content">
        <div class="icon-wrapper">
          <LifeBuoy :size="32" />
        </div>

        <h1 class="title">Central de Ajuda</h1>
        <p class="subtitle">Navegue por categorias e encontre instruções atualizadas do sistema.</p>

        <div class="search-bar">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por tópico..." />
        </div>

        <div class="category-block">
          <div v-if="knowledgeBaseStore.isLoadingTree" class="sidebar-loading">
            <LoaderCircle :size="18" class="spin" />
            Carregando tópicos...
          </div>

          <template v-else>
            <div v-if="filteredCategories.length === 0" class="no-categories">
              Nenhum artigo encontrado para "{{ searchQuery }}".
            </div>

            <div v-for="category in filteredCategories" :key="category._id" class="category-group">
              <h3 class="category-name">{{ category.name }}</h3>

              <button
                v-for="page in category.pages"
                :key="page._id"
                class="page-link"
                :class="{ active: selectedSlug === page.slug }"
                @click="selectPageBySlug(page.slug)"
              >
                <BookOpenText :size="14" />
                <span>{{ page.title }}</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div v-if="bootstrapping || knowledgeBaseStore.isLoadingPage" class="loading-state">
        <LoaderCircle :size="22" class="spin" />
        Carregando conteúdo...
      </div>

      <template v-else>
        <article v-if="knowledgeBaseStore.currentPage" class="doc-article">
          <header class="article-header">
            <p class="article-category">{{ knowledgeBaseStore.currentPage.category?.name }}</p>
            <h2 class="article-title">{{ knowledgeBaseStore.currentPage.title }}</h2>
          </header>

          <MarkdownRenderer :content="knowledgeBaseStore.currentPage.contentMarkdown" />
        </article>

        <div v-else-if="hasKnowledgeContent" class="empty-state">
          <h3>Selecione um artigo para começar</h3>
          <p>Escolha uma página no menu lateral para visualizar os detalhes.</p>
        </div>

        <div v-else class="empty-state">
          <h3>Base de conhecimento em construção</h3>
          <p>Ainda não há páginas publicadas. Volte em instantes.</p>
        </div>
      </template>

      <section class="support-card">
        <h3 class="support-title">Ainda com dúvidas?</h3>
        <p class="support-text">Nossa equipe de suporte pode te ajudar com qualquer etapa do sistema.</p>
        <a href="https://wa.me/5511921923978" class="support-button">
          <Mail :size="16" />
          Falar com o suporte
        </a>
      </section>
    </main>
  </div>
</template>

<style scoped>
.help-page {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 1.5rem;
}

.help-sidebar {
  border-right: 1px solid #e5e7eb;
  padding-right: 1.25rem;
}

.sidebar-content {
  position: sticky;
  top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #eff6ff;
  color: var(--azul-principal);
}

.title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin: 0;
  color: var(--cinza-texto);
  line-height: 1.5;
}

.search-bar {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 0.85rem;
  transform: translateY(-50%);
  color: #64748b;
}

.search-bar input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  padding: 0.72rem 0.8rem 0.72rem 2.5rem;
  font-size: 0.93rem;
}

.search-bar input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.category-block {
  max-height: calc(100vh - 290px);
  overflow-y: auto;
  padding-right: 0.2rem;
}

.category-block::-webkit-scrollbar {
  width: 4px;
}

.category-block::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 999px;
}

.sidebar-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.87rem;
  color: #64748b;
}

.category-group {
  margin-top: 1rem;
}

.category-name {
  margin: 0 0 0.5rem 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.page-link {
  width: 100%;
  border: 1px solid transparent;
  background-color: #ffffff;
  border-radius: 0.65rem;
  padding: 0.52rem 0.62rem;
  display: flex;
  align-items: flex-start;
  gap: 0.42rem;
  color: #334155;
  cursor: pointer;
  text-align: left;
  font-size: 0.86rem;
  margin-bottom: 0.35rem;
  transition: all 0.2s ease;
}

.page-link:hover {
  border-color: #bfdbfe;
  background-color: #eff6ff;
}

.page-link.active {
  background-color: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}

.main-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state,
.empty-state {
  min-height: 280px;
  border: 1px dashed #d1d5db;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-direction: column;
  gap: 0.35rem;
  color: #64748b;
  background-color: #ffffff;
}

.loading-state {
  flex-direction: row;
  gap: 0.5rem;
}

.doc-article {
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  background-color: #ffffff;
  padding: 1.2rem 1.3rem;
}

.article-header {
  border-bottom: 1px solid #eef2f7;
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
}

.article-category {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.article-title {
  margin: 0.4rem 0 0 0;
  color: #0f172a;
  font-size: 1.7rem;
  line-height: 1.2;
}

.support-card {
  border-radius: 1rem;
  background: linear-gradient(120deg, #eff6ff 0%, #f8fafc 55%, #ffffff 100%);
  border: 1px solid #dbeafe;
  padding: 1.1rem;
}

.support-title {
  margin: 0;
  font-size: 1.05rem;
  color: #1e3a8a;
}

.support-text {
  margin: 0.4rem 0 0.85rem 0;
  color: #475569;
  line-height: 1.5;
}

.support-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  text-decoration: none;
  border: 1px solid #3b82f6;
  color: #1d4ed8;
  border-radius: 0.65rem;
  padding: 0.52rem 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.support-button:hover {
  background-color: #2563eb;
  color: #ffffff;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .help-page {
    grid-template-columns: 1fr;
  }

  .help-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding-right: 0;
    padding-bottom: 1rem;
  }

  .sidebar-content {
    position: static;
  }

  .category-block {
    max-height: 280px;
  }
}
</style>
