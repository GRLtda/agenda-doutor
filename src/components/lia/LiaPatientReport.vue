<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, LoaderCircle, Users } from 'lucide-vue-next'
const props = defineProps({ card: { type: Object, required: true }, conversationId: String, loadPage: Function })
const emit = defineEmits(['navigate'])
const current = ref(props.card), loading = ref(false), error = ref('')
const total = computed(() => current.value.report.total)
const page = computed(() => current.value.report.page)
const pages = computed(() => Math.max(1, Math.ceil(total.value / 10)))
const from = computed(() => total.value ? (page.value - 1) * 10 + 1 : 0)
const to = computed(() => Math.min(total.value, (page.value - 1) * 10 + current.value.items.length))
let controller, version = 0
watch(() => props.card, value => { controller?.abort(); version++; current.value = value; loading.value = false; error.value = '' })
onBeforeUnmount(() => { controller?.abort(); version++ })
async function changePage(next) {
  if (loading.value || next < 1 || next > pages.value) return
  const ticket = ++version
  controller?.abort(); controller = new AbortController(); loading.value = true; error.value = ''
  try {
    if (!props.loadPage) throw new Error('Relatório indisponível')
    const card = await props.loadPage(props.conversationId, current.value.report.id, next, controller.signal)
    if (ticket === version && card) current.value = card
  } catch (failure) { if (ticket === version && !controller.signal.aborted) error.value = failure.response?.data?.message || 'Não foi possível carregar esta página. Tente novamente.' }
  finally { if (ticket === version) loading.value = false }
}
const patientPath = id => /^[a-f0-9]{24}$/i.test(String(id)) ? `/pacientes/${id}` : null
function navigate(event, id) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault(); emit('navigate', id)
}
function format(value, column) {
  if (value === null || value === undefined) return '—'
  if (column.type === 'date') return new Intl.DateTimeFormat('pt-BR', { timeZone: current.value.report.timezone || 'America/Sao_Paulo' }).format(new Date(value))
  if (column.type === 'currency_cents') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
  return value
}
</script>
<template>
  <section class="patient-report clarity-mask" :aria-label="current.title" data-clarity-mask="true" data-sentry-mask>
    <header><span class="report-icon"><Users :size="17" /></span><div><h3>{{ current.title }}</h3><p>{{ total }} {{ total === 1 ? 'paciente encontrado' : 'pacientes encontrados' }}</p></div></header>
    <p v-if="current.definition" class="definition">{{ current.definition }}</p>
    <div class="report-table" :aria-busy="loading"><table><thead><tr><th v-for="column in current.report.columns" :key="column.key" scope="col">{{ column.label }}</th></tr></thead><tbody><tr v-for="item in current.items" :key="item.id"><td v-for="column in current.report.columns" :key="column.key"><template v-if="column.type === 'patient'"><a v-if="patientPath(item.id)" :href="patientPath(item.id)" :aria-label="`Abrir perfil de ${item.name}`" @click="navigate($event, item.id)">{{ item.name }}</a><span v-else>{{ item.name }}</span></template><span v-else>{{ format(item[column.key], column) }}</span></td></tr></tbody></table><p v-if="!current.items.length" class="empty">Nenhum paciente nesta página.</p></div>
    <p v-if="error" role="alert" class="report-error">{{ error }}</p>
    <footer><span role="status" aria-live="polite">{{ loading ? 'Carregando pacientes…' : `Mostrando ${from}–${to} de ${total}` }}</span><nav aria-label="Páginas do relatório"><button type="button" aria-label="Página anterior de pacientes" :disabled="loading || page <= 1" @click="changePage(page - 1)"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pages }}</span><button type="button" aria-label="Próxima página de pacientes" :disabled="loading || page >= pages" @click="changePage(page + 1)"><LoaderCircle v-if="loading" :size="16" class="spin" /><ChevronRight v-else :size="16" /></button></nav></footer>
    <details><summary>Sobre o relatório</summary><p>Filtros e período mantidos ao trocar de página. Os dados são consultados novamente e podem refletir atualizações da clínica.</p><p v-if="current.source">{{ current.source }}</p><p v-if="current.type === 'ranking' && current.total !== undefined">Total do período: {{ format(current.total, { type: 'currency_cents' }) }}. O ranking respeita a quantidade solicitada.</p></details>
  </section>
</template>
<style scoped>
.patient-report { margin-top: 16px; padding: 18px; border: 1px solid var(--lia-line); border-radius: 16px; background: var(--lia-surface); color: var(--lia-text); }header { display: flex; align-items: center; gap: 10px; }.report-icon { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 10px; background: var(--lia-tint); color: var(--lia-blue); }h3 { margin: 0; font-size: 13px; font-weight: 600; }header p { margin: 4px 0 0; color: var(--lia-muted); font-size: 11px; }.definition { margin: 15px 0; color: var(--lia-muted); font-size: 11px; line-height: 1.65; }.report-table { overflow-x: auto; margin-top: 16px; }.report-table[aria-busy=true] { opacity: .5; }table { width: 100%; border-collapse: collapse; font-size: 12px; }th { color: var(--lia-muted); font-weight: 500; text-align: left; }th,td { padding: 12px 8px; border-bottom: 1px solid var(--lia-line); }th:first-child,td:first-child { padding-left: 0; }td:last-child { font-variant-numeric: tabular-nums; }a { color: var(--lia-blue); text-decoration: none; font-weight: 500; }a:hover { text-decoration: underline; }footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; font-size: 10px; color: var(--lia-muted); }nav { display: flex; align-items: center; gap: 9px; }button { display: grid; place-items: center; width: 29px; height: 29px; padding: 0; border: 1px solid var(--lia-line); border-radius: 8px; background: var(--lia-bg); color: var(--lia-text); cursor: pointer; }button:disabled { opacity: .4; cursor: default; }a:focus-visible,button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.report-error { color: #c43d51; font-size: 12px; }.empty { padding: 20px; text-align: center; font-size: 12px; color: var(--lia-muted); }details { margin-top: 14px; font-size: 10px; color: var(--lia-muted); }summary { cursor: pointer; }details p { line-height: 1.6; }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion:reduce) { .spin { animation: none; } }
</style>
