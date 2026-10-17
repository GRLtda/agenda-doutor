<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, Search, MessageSquare, ArrowRight, ArrowLeft, X, Plus } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppButton from '@/components/global/AppButton.vue'
import MessageTemplateSelect from '@/components/global/MessageTemplateSelect.vue'
import { useWorkflowsStore } from '@/stores/workflows'
import { useCrmTemplatesStore } from '@/stores/crmTemplates'
import workflowsApi from '@/api/workflows'
import WorkflowCatalogPreview from './WorkflowCatalogPreview.vue'
import WorkflowMessageVariableWarning from './WorkflowMessageVariableWarning.vue'
const emit = defineEmits(['close'])
const store = useWorkflowsStore(), templates = useCrmTemplatesStore(), router = useRouter()
const workflowCatalog = ref([]), catalogLoading = ref(true), catalogError = ref('')
const search = ref(''), selected = ref(null), templateId = ref(''), fieldError = ref(''), creating = ref(false), failure = ref('')
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
const filtered = computed(()=>workflowCatalog.value.filter(item=>normalize(`${item.name} ${item.description} ${item.category}`).includes(normalize(search.value))))
const options = computed(()=>templates.templates.map(item=>({value:item._id,label:item.name,icon:markRaw(MessageSquare)})))
const variableSupport = ref(null)
const selectedTemplate = computed(() => templates.templates.find(item => item._id === templateId.value))
let disposed = false
async function loadCatalog() {
 catalogLoading.value=true;catalogError.value=''
 try {const response=await workflowsApi.getNodeTypes();const catalog=response.data?.data || response.data || {};workflowCatalog.value=catalog.templates || [];variableSupport.value=catalog.messageVariableSupport}
 catch {catalogError.value='Não foi possível carregar o catálogo.'}
 finally {catalogLoading.value=false}
}
onMounted(()=>{loadCatalog();templates.fetchTemplates()})
onUnmounted(()=>{disposed=true})
function choose(item) { selected.value=item;fieldError.value='';failure.value='' }
async function create() {
  if (creating.value) return
  if (!templateId.value) {fieldError.value='Escolha a mensagem que será enviada.';return}
  creating.value=true;failure.value=''
  try { const workflow=await store.createFromCatalog(selected.value.id,templateId.value);if(!disposed){emit('close');router.push(`/workflows/${workflow._id}`)} }
  catch (error) {const detail=error.response?.data?.error;if(detail?.field==='templateId')fieldError.value=detail.message;else failure.value=detail?.message || 'Não foi possível criar o workflow. Tente novamente.'}
  finally {creating.value=false}
}
</script>
<template>
  <SideDrawer size="xl" @close="emit('close')">
    <template #header><header class="catalog-header"><div class="catalog-title"><span><BookOpen :size="21" /></span><div><h2>Catálogo de workflows</h2><p>Escolha um ponto de partida para sua clínica.</p></div></div><button class="catalog-close" aria-label="Fechar catálogo" :disabled="creating" @click="emit('close')"><X :size="20" /></button></header></template>
    <template v-if="!selected"><div class="catalog-search"><Search :size="17" /><input v-model="search" placeholder="Buscar no catálogo" aria-label="Buscar no catálogo" /></div><div v-if="catalogLoading" class="catalog-grid" aria-label="Carregando catálogo"><div v-for="i in 4" :key="i" class="catalog-card"><AppSkeleton width="45%" height="14px" /><AppSkeleton width="75%" height="20px" /><AppSkeleton width="100%" height="32px" /><AppSkeleton width="100%" height="172px" /></div></div><div v-else-if="catalogError" class="catalog-empty" role="alert">{{catalogError}}<button class="catalog-back" @click="loadCatalog">Tentar novamente</button></div><div v-else class="catalog-grid"><button v-for="item in filtered" :key="item.id" class="catalog-card" @click="choose(item)"><span class="catalog-category">{{item.category}}</span><h3>{{item.name}}</h3><p>{{item.description}}</p><WorkflowCatalogPreview :steps="item.preview" /><span class="catalog-use">Escolher modelo <ArrowRight :size="14" /></span></button></div><p v-if="!catalogLoading && !catalogError && !filtered.length" class="catalog-empty">Nenhum modelo encontrado. Tente outra busca.</p></template>
    <div v-else class="catalog-detail"><button class="catalog-back" :disabled="creating" @click="selected=null"><ArrowLeft :size="16" />Voltar ao catálogo</button><span class="catalog-category">{{selected.category}}</span><h3>{{selected.name}}</h3><p>{{selected.description}}</p><WorkflowCatalogPreview :steps="selected.preview" /><div class="catalog-message"><h4>Qual mensagem enviar?</h4><MessageTemplateSelect v-model="templateId" label="Modelo de WhatsApp" :options="options" :error="fieldError" :required="true" :disabled="creating" @update:model-value="fieldError=''" @create="emit('close')" /><WorkflowMessageVariableWarning :template="selectedTemplate" :events="selected?.eventType ? [selected.eventType] : []" :support="variableSupport" /><p v-if="templates.isLoading">Carregando mensagens…</p><p v-else-if="templates.error">Não foi possível carregar as mensagens. <button class="catalog-back" @click="templates.fetchTemplates()">Tentar novamente</button></p><p v-else-if="!options.length">Crie um modelo em Marketing → Modelos para usar este workflow.</p></div><p class="catalog-note">O workflow será criado como rascunho. No editor, ajuste os prazos, os procedimentos e a mensagem antes de publicar.</p><p v-if="failure" class="catalog-error" role="alert">{{failure}}</p></div>
    <template #footer><footer class="catalog-footer"><AppButton variant="outline" :disabled="creating" @click="selected ? selected=null : emit('close')">{{selected?'Voltar':'Fechar'}}</AppButton><AppButton v-if="selected" variant="primary" :disabled="creating || templates.isLoading" @click="create">{{creating?'Criando…':'Usar workflow'}}<ArrowRight :size="16" /></AppButton></footer></template>
  </SideDrawer>
</template>
<style scoped>
.catalog-header { display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e2e8f0;gap:12px; }.catalog-title {display:flex;align-items:center;gap:12px;}.catalog-title>span {padding:10px;border-radius:10px;background:#eff6ff;color:#0057ff;}.catalog-title h2 {font-size:1rem;font-weight:650;color:#111827;}.catalog-title p,.catalog-detail>p {font-size:.8rem;color:#475569;line-height:1.6;margin-top:5px;}.catalog-close {color:#64748b;padding:8px;}.catalog-search {display:flex;align-items:center;gap:10px;border:1px solid #dce2eb;border-radius:10px;padding:11px 12px;margin-bottom:20px;color:#64748b;}.catalog-search input {width:100%;min-width:0;outline:none;font-size:.85rem;}.catalog-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}.catalog-card {text-align:left;padding:18px;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:10px;background:white;}.catalog-card:hover,.catalog-card:focus-visible {border-color:#0057ff;box-shadow:0 0 0 2px #0057ff0c;outline:none;}.catalog-category {font-size:.65rem;letter-spacing:.03em;font-weight:600;color:#1d4ed8;}.catalog-card h3,.catalog-detail h3 {font-size:.95rem;font-weight:650;color:#111827;}.catalog-card>p {font-size:.75rem;color:#475569;line-height:1.6;flex:1;}.catalog-use {display:flex;align-items:center;gap:8px;color:#0057ff;font-size:.75rem;font-weight:600;}.catalog-footer {display:flex;justify-content:space-between;align-items:center;padding:16px 24px;gap:10px;border-top:1px solid #e2e8f0;}.catalog-back {display:flex;align-items:center;gap:7px;font-size:.8rem;color:#0057ff;margin-bottom:24px;}.catalog-detail h3 {font-size:1.1rem;margin-top:8px;}.catalog-message {padding:18px;border:1px solid #e2e8f0;border-radius:12px;margin:24px 0;}.catalog-message h4 {font-size:.85rem;font-weight:600;margin-bottom:16px;}.catalog-message p,.catalog-note {font-size:.75rem;color:#475569;line-height:1.6;}.catalog-error {color:#b91c1c!important;}.catalog-empty {text-align:center;padding:32px;color:#475569;}
@media(max-width:768px) {.catalog-grid {grid-template-columns:1fr;}.catalog-header,.catalog-footer {padding:16px;}.catalog-title h2 {font-size:.9rem;}}

.template-placeholder-icon { flex-shrink: 0; color: #64748b; }.create-message-template { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; color: #0057ff; font-size: .8rem; font-weight: 600; text-align: left; border-radius: 7px; }.create-message-template:hover, .create-message-template:focus-visible { background: #eff6ff; outline: none; }
</style>
