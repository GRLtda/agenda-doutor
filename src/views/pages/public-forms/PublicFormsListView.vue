<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Copy, ExternalLink, FilePlus2, LoaderCircle, Pencil, Power } from 'lucide-vue-next'
import { disablePublicForm, listPublicForms } from '@/api/public-forms'

const router = useRouter(); const forms = ref([]); const loading = ref(true); const baseUrl = window.location.origin
async function load() { loading.value = true; try { forms.value = (await listPublicForms()).data.forms } finally { loading.value = false } }
onMounted(load)
function url(form) { return `${baseUrl}/f/${form.publicToken}` }
async function copy(form) { await navigator.clipboard.writeText(url(form)) }
async function disable(form) { if (!confirm(`Desativar o formulário “${form.name}”? O link deixará de funcionar.`)) return; await disablePublicForm(form._id); await load() }
function status(status) { return { draft: 'Rascunho', published: 'Publicado', disabled: 'Desativado' }[status] || status }
</script>

<template>
  <main class="page">
    <header class="page-header"><div><p class="eyebrow">Configurações</p><h1>Formulários públicos</h1><p class="subtitle">Crie links seguros para coletar informações sem exigir login.</p></div><button class="primary" @click="router.push({ name: 'public-forms-new' })"><FilePlus2 :size="18" /> Novo formulário</button></header>
    <section v-if="loading" class="empty"><LoaderCircle class="spin" :size="28" /> Carregando...</section>
    <section v-else-if="!forms.length" class="empty"><h2>Nenhum formulário criado</h2><p>Comece criando um formulário genérico para validar a experiência.</p><button class="primary" @click="router.push({ name: 'public-forms-new' })">Criar formulário</button></section>
    <section v-else class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Status</th><th>Submissões</th><th>Atualizado em</th><th aria-label="Ações"></th></tr></thead><tbody><tr v-for="form in forms" :key="form._id"><td><strong>{{ form.name }}</strong></td><td>Genérico</td><td><span class="badge" :class="form.status">{{ status(form.status) }}</span></td><td>{{ form.submissionsCount }}</td><td>{{ new Date(form.updatedAt).toLocaleDateString('pt-BR') }}</td><td class="actions"><button title="Editar" @click="router.push({ name: 'public-forms-edit', params: { id: form._id } })"><Pencil :size="17" /></button><button v-if="form.status === 'published'" title="Abrir formulário" @click="window.open(url(form), '_blank', 'noopener')"><ExternalLink :size="17" /></button><button v-if="form.status === 'published'" title="Copiar link" @click="copy(form)"><Copy :size="17" /></button><button v-if="form.status !== 'disabled'" title="Desativar" class="danger" @click="disable(form)"><Power :size="17" /></button></td></tr></tbody></table></section>
  </main>
</template>

<style scoped>
.page { max-width: 1160px; margin: 0 auto; padding: 34px; color: #172033; }.page-header { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 30px; }.eyebrow { margin: 0 0 5px; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; } h1 { margin: 0; font-size: 29px; }.subtitle { margin: 8px 0 0; color: #64748b; }.primary { border: 0; border-radius: 9px; padding: 11px 15px; background: #2563eb; color: white; display: inline-flex; align-items: center; gap: 8px; font: inherit; font-weight: 650; cursor: pointer; white-space: nowrap; }.table-wrap { overflow: auto; border: 1px solid #e2e8f0; border-radius: 13px; background: #fff; } table { width: 100%; border-collapse: collapse; min-width: 720px; } th,td { padding: 15px 18px; text-align: left; border-bottom: 1px solid #eef2f7; font-size: 14px; } th { color: #64748b; background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }.badge { display: inline-flex; padding: 4px 9px; border-radius: 20px; font-size: 12px; font-weight: 700; }.badge.draft { color: #92400e; background: #fef3c7; }.badge.published { color: #166534; background: #dcfce7; }.badge.disabled { color: #991b1b; background: #fee2e2; }.actions { display: flex; gap: 6px; }.actions button { width: 33px; height: 33px; display: grid; place-items: center; border: 1px solid #e2e8f0; background: #fff; border-radius: 7px; color: #475569; cursor: pointer; }.actions .danger { color: #b91c1c; }.empty { min-height: 260px; display: grid; align-content: center; justify-items: center; gap: 10px; border: 1px dashed #cbd5e1; border-radius: 13px; color: #64748b; text-align: center; }.empty h2,.empty p { margin: 0; }.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } @media(max-width: 640px){.page{padding:20px 16px}.page-header{align-items:start;flex-direction:column}.primary{width:100%;justify-content:center}}
</style>
