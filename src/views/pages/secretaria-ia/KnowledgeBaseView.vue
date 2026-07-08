<script setup>
import { computed, onMounted, ref } from 'vue'
import { BookOpen, Plus, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAiSecretaryStore } from '@/stores/aiSecretary'
import AppButton from '@/components/global/AppButton.vue'

const store = useAiSecretaryStore()
const toast = useToast()
const knowledgeItems = computed(() => store.knowledgeItems)
const form = ref({ title: '', type: 'faq', content: '', tagsText: '' })

onMounted(async () => {
  await Promise.all([store.fetchSummary(), store.fetchKnowledgeItems()])
})

async function createKnowledge() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    toast.error('Informe titulo e conteudo.')
    return
  }

  await store.createKnowledgeItem({
    title: form.value.title.trim(),
    type: form.value.type,
    content: form.value.content.trim(),
    tags: form.value.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
  })

  form.value = { title: '', type: 'faq', content: '', tagsText: '' }
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
  }
  return map[type] || type
}
</script>

<template>
  <div class="knowledge-page">
    <header class="page-header">
      <div>
        <h1 class="title">Base de conhecimento</h1>
        <p class="subtitle">Respostas aprovadas para orientar a Secretária IA.</p>
      </div>
    </header>

    <section class="layout">
      <form class="panel form-panel" @submit.prevent="createKnowledge">
        <div class="panel-title">
          <BookOpen :size="18" />
          <h2>Novo item</h2>
        </div>

        <label>Titulo<input v-model="form.title" class="field" placeholder="Ex: Endereco da clinica" /></label>
        <label>
          Tipo
          <select v-model="form.type" class="field">
            <option value="faq">FAQ</option>
            <option value="procedure">Procedimento</option>
            <option value="insurance">Convenio</option>
            <option value="address">Endereco</option>
            <option value="policy">Regra</option>
            <option value="preparation">Preparo</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label>Conteudo<textarea v-model="form.content" class="field" rows="8"></textarea></label>
        <label>Tags<input v-model="form.tagsText" class="field" placeholder="agenda, preparo, convenio" /></label>

        <AppButton variant="primary" :disabled="store.isSaving">
          <Plus :size="16" />
          Adicionar
        </AppButton>
      </form>

      <div class="items-list">
        <article v-for="item in knowledgeItems" :key="item._id" class="knowledge-card">
          <div class="card-header">
            <div>
              <span class="type-pill">{{ getTypeLabel(item.type) }}</span>
              <h3>{{ item.title }}</h3>
            </div>
            <button class="icon-button" @click="store.removeKnowledgeItem(item._id)">
              <Trash2 :size="16" />
            </button>
          </div>
          <p>{{ item.content }}</p>
          <div v-if="item.tags?.length" class="tags">
            <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
          </div>
        </article>

        <div v-if="knowledgeItems.length === 0" class="panel empty">
          Cadastre endereco, horario, convenios, preparos e regras de reagendamento.
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.knowledge-page { display: flex; flex-direction: column; gap: 1rem; }
.title { margin: 0; font-size: 2rem; color: #111827; }
.subtitle { margin: 0.25rem 0 0; color: #64748b; }
.layout { display: grid; grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr); gap: 1rem; }
.panel, .knowledge-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; }
.form-panel { display: flex; flex-direction: column; gap: 1rem; }
.panel-title, .card-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.panel-title { justify-content: flex-start; color: var(--azul-principal); }
.panel-title h2 { color: #111827; margin: 0; }
label { display: flex; flex-direction: column; gap: 0.4rem; color: #334155; font-weight: 700; }
.field { border: 1px solid #dbe3ef; border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit; }
.items-list { display: flex; flex-direction: column; gap: 0.75rem; }
.knowledge-card h3 { margin: 0.45rem 0 0; }
.knowledge-card p { color: #475569; line-height: 1.5; white-space: pre-wrap; }
.type-pill, .tags span { display: inline-flex; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.type-pill { padding: 0.18rem 0.5rem; background: #eef2ff; color: var(--azul-principal); }
.tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.tags span { padding: 0.2rem 0.5rem; background: #f1f5f9; color: #64748b; }
.icon-button { border: 0; background: transparent; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #64748b; }
.icon-button:hover { color: #dc2626; background: #fef2f2; }
.empty { color: #64748b; text-align: center; }
@media (max-width: 980px) { .layout { grid-template-columns: 1fr; } }
</style>

