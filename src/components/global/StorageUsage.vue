<script setup>
import { computed, watch } from 'vue'
import { HardDrive, RefreshCw, CircleAlert } from 'lucide-vue-next'
import { useClinicStore } from '@/stores/clinic'
import AppSkeleton from './AppSkeleton.vue'

const props = defineProps({ detailed: { type: Boolean, default: false } })
const emit = defineEmits(['details'])
const clinicStore = useClinicStore()
const summary = computed(() => clinicStore.storageSummary)
const details = computed(() => clinicStore.storageDetails || [])
const loading = computed(() => clinicStore.storageSummaryLoading || (props.detailed && clinicStore.storageDetailsLoading))
const error = computed(() => clinicStore.storageSummaryError || (props.detailed && clinicStore.storageDetailsError))

const labels = { branding: 'Identidade visual', perfil: 'Fotos de perfil', imagens: 'Imagens', documentos: 'Documentos', assinaturas: 'Assinaturas', outros: 'Outros' }
const percent = computed(() => Math.max(0, summary.value?.percentage || 0))
const barWidth = computed(() => `${Math.min(100, percent.value)}%`)
const tone = computed(() => summary.value?.status || 'normal')
const categories = [
  { id: 'imagens', label: 'Imagens', color: '#3b82f6' },
  { id: 'documentos', label: 'Documentos', color: '#8b5cf6' },
  { id: 'outros', label: 'Outros arquivos', color: '#14b8a6' },
]
const breakdown = computed(() => {
  const total = details.value.reduce((sum, item) => sum + Math.max(0, item.usedBytes || 0), 0)
  const types = [...categories, ...details.value
    .filter(item => !categories.some(category => category.id === item._id))
    .map(item => ({ id: item._id, label: labels[item._id] || 'Outros tipos', color: '#f59e0b' }))]
  return types.map(category => {
    const item = details.value.find(item => item._id === category.id)
    const usedBytes = Math.max(0, item?.usedBytes || 0)
    return { ...category, usedBytes, files: item?.files || 0, percentage: total ? usedBytes / total * 100 : 0 }
  }).sort((a, b) => b.usedBytes - a.usedBytes)
})
const breakdownTotal = computed(() => breakdown.value.reduce((sum, item) => sum + item.usedBytes, 0))
const quota = computed(() => Math.max(0, summary.value?.quotaBytes || 0))
const used = computed(() => Math.max(0, summary.value?.usedBytes || 0))
const freeBytes = computed(() => Math.max(0, quota.value - used.value))
const formatPercent = value => value > 0 && value < .1 ? '< 0,1%' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value) + '%'
const segments = computed(() => breakdown.value.map(item => ({ ...item,
  capacityPercent: quota.value ? item.usedBytes / quota.value * 100 : 0,
  width: Math.max(quota.value, used.value, breakdownTotal.value) ? item.usedBytes / Math.max(quota.value, used.value, breakdownTotal.value) * 100 : 0,
})))
const unclassifiedBytes = computed(() => Math.max(0, used.value - breakdownTotal.value))
const unclassifiedWidth = computed(() => Math.max(quota.value, used.value, breakdownTotal.value) ? unclassifiedBytes.value / Math.max(quota.value, used.value, breakdownTotal.value) * 100 : 0)

const notice = computed(() => {
  if (!summary.value) return null
  if (summary.value.blocked) return { title: 'Armazenamento em verificação', text: 'Novos envios estão temporariamente indisponíveis.' }
  if (!summary.value.ready) return { title: 'Inventário em atualização', text: 'O consumo pode mudar.' }
  if (tone.value === 'full') return { title: 'Armazenamento cheio', text: 'Sem espaço disponível para novos arquivos.' }
  if (tone.value === 'critical') return { title: 'Armazenamento quase cheio', text: 'Considere liberar espaço para novos arquivos.' }
  if (tone.value === 'warning') return { title: 'Armazenamento próximo do limite', text: 'Acompanhe o consumo da sua clínica.' }
  return null
})

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024 ** 2) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`
  const unit = bytes >= 1024 ** 3 ? 'GB' : 'MB'
  const value = bytes / (unit === 'GB' ? 1024 ** 3 : 1024 ** 2)
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${unit}`
}

function refresh() {
  return clinicStore.refreshStorage(props.detailed)
}

watch(() => [clinicStore.currentClinic?._id || clinicStore.currentClinic?.id || clinicStore.currentClinic, props.detailed], refresh, { immediate: true })
</script>

<template>
  <section :class="detailed ? 'storage-details' : 'storage-usage clickable'" :role="!detailed ? 'menuitem' : undefined" :tabindex="!detailed ? 0 : undefined" :aria-label="detailed ? 'Armazenamento da clínica' : 'Ver detalhes do armazenamento da clínica'" :aria-busy="loading" @click="!detailed && emit('details')" @keydown.enter.self.prevent="!detailed && emit('details')" @keydown.space.self.prevent="!detailed && emit('details')">
    <div :class="detailed ? 'storage-card storage-capacity' : undefined">
      <div class="storage-heading">
        <HardDrive :size="18" aria-hidden="true" />
        <strong>{{ detailed ? 'Capacidade utilizada' : 'Armazenamento' }}</strong>
        <span v-if="detailed && summary" class="storage-badge">{{ formatPercent(quota ? used / quota * 100 : 0) }} utilizado</span>
        <button v-if="detailed" type="button" class="refresh" aria-label="Atualizar armazenamento" :disabled="loading" @click="refresh"><RefreshCw :size="16" /></button>
      </div>
      <div v-if="loading && !summary" class="storage-skeleton" aria-label="Carregando armazenamento" role="status">
        <AppSkeleton width="65%" height="1.4rem" /><AppSkeleton height="7px" border-radius="999px" /><AppSkeleton width="35%" height=".85rem" />
      </div>
      <template v-else-if="summary">
        <p class="storage-count"><strong v-if="detailed">{{ formatBytes(used) }}</strong><template v-else>{{ formatBytes(used) }}</template> de {{ formatBytes(quota) }} utilizados</p>
        <div class="storage-meter" role="progressbar" :aria-valuenow="Math.min(100, percent)" aria-valuemin="0" aria-valuemax="100" :aria-label="percent + '% do armazenamento utilizado'"><span :class="tone" :style="{ width: barWidth }"></span></div>
        <p v-if="detailed" class="storage-capacity-footer">{{ formatBytes(freeBytes) }} disponíveis</p>
        <p v-else class="storage-percent" :class="tone">{{ percent }}% utilizado</p>
      </template>
    </div>
    <template v-if="detailed">
      <div v-if="summary" class="storage-card storage-breakdown">
        <h3>Distribuição do consumo</h3>
        <div v-if="clinicStore.storageDetailsLoading && !clinicStore.storageDetails" class="storage-skeleton">
          <div class="storage-legend"><AppSkeleton v-for="row in 4" :key="row" height="2.5rem" /></div>
          <AppSkeleton height="14px" border-radius="3px" />
        </div>
        <template v-else>
          <div class="storage-legend">
            <div v-for="item in segments" :key="item.id" class="storage-category">
              <span class="storage-dot" :style="{ backgroundColor: item.color }" aria-hidden="true"></span>
              <div class="storage-category-label"><strong>{{ item.label }}</strong><small>{{ formatBytes(item.usedBytes) }} · {{ formatPercent(item.capacityPercent) }}</small><small>{{ item.files }} {{ item.files === 1 ? 'arquivo' : 'arquivos' }}</small></div>
            </div>
            <div v-if="unclassifiedBytes" class="storage-category">
              <span class="storage-dot unclassified" aria-hidden="true"></span>
              <div class="storage-category-label"><strong>Em classificação</strong><small>{{ formatBytes(unclassifiedBytes) }} · {{ formatPercent(quota ? unclassifiedBytes / quota * 100 : 0) }}</small></div>
            </div>
            <div class="storage-category">
              <span class="storage-dot free" aria-hidden="true"></span>
              <div class="storage-category-label"><strong>Espaço livre</strong><small>{{ formatBytes(freeBytes) }} · {{ formatPercent(quota ? freeBytes / quota * 100 : 0) }}</small></div>
            </div>
          </div>
          <div class="storage-segments" role="progressbar" :aria-valuenow="Math.min(100, quota ? used / quota * 100 : 0)" aria-valuemin="0" aria-valuemax="100" aria-label="Ocupação da capacidade total do plano">
            <span v-for="item in segments" :key="item.id" :style="{ width: item.width + '%', backgroundColor: item.color }" :title="item.label + ': ' + formatBytes(item.usedBytes) + ' (' + formatPercent(item.capacityPercent) + ' da capacidade)'"></span>
            <span class="unclassified" :style="{ width: unclassifiedWidth + '%' }" title="Consumo aguardando classificação"></span>
          </div>
          <p class="storage-caption">Percentuais sobre a capacidade total do plano.</p>
          <p v-if="clinicStore.storageDetails && !breakdownTotal && !used" class="storage-muted">Nenhum arquivo contabilizado.</p>
        </template>

      </div>
      <div v-if="loading && !summary" class="storage-card storage-skeleton"><AppSkeleton width="40%" /><div class="storage-legend"><AppSkeleton v-for="row in 4" :key="row" height="2.5rem" /></div><AppSkeleton height="14px" /></div>
    </template>
    <div v-if="notice && detailed" class="storage-notice" role="status">
      <CircleAlert :size="20" aria-hidden="true" />
      <div><strong>{{ notice.title }}</strong><p>{{ notice.text }}</p></div>
    </div>
    <p v-else-if="notice" class="storage-note">{{ notice.title }}. {{ notice.text }}</p>
    <p v-if="error" class="storage-muted" role="status">{{ summary ? 'Não foi possível atualizar. Exibindo o último consumo consultado.' : 'Não foi possível consultar o armazenamento.' }}</p>
  </section>
</template>

<style scoped>
.storage-card { box-sizing: border-box; width: 100%; padding: 1.25rem 1.5rem; border: 1px solid #e8edf3; border-radius: 1rem; background: #fff; }
.storage-capacity .storage-heading > svg { color: #3b82f6; }
.storage-capacity .storage-count { margin: 1.2rem 0 .85rem; }
.storage-capacity .storage-count strong { color: #1e293b; font-size: 1.5rem; font-weight: 600; margin-right: .3rem; }
.storage-capacity-footer { margin: .7rem 0 0; color: #64748b; font-size: .76rem; }
.storage-notice { display: flex; align-items: flex-start; gap: .8rem; padding: 1rem 1.25rem; border: 1px solid #f3e8bd; border-radius: .85rem; background: #fffbef; color: #806629; }
.storage-notice > svg { flex-shrink: 0; margin-top: .05rem; color: #b49142; }
.storage-notice strong { font-size: .82rem; font-weight: 600; }
.storage-notice p { margin: .3rem 0 0; line-height: 1.5; font-size: .78rem; }
.storage-details .storage-breakdown h3 { font-size: .88rem; margin-bottom: 1.25rem; color: #1e293b; }
@media (max-width: 560px) { .storage-card { padding: 1rem; } .storage-notice { padding: 1rem; } .storage-heading { flex-wrap: wrap; } }

.storage-usage { padding: .85rem .75rem .45rem; color: #334155; font-size: .82rem; }
.storage-usage.clickable { cursor: pointer; border-radius: .5rem; transition: background-color .2s ease; }
.storage-usage.clickable:hover { background-color: #f3f4f6; }
.storage-usage.clickable:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.storage-skeleton { display: flex; flex-direction: column; gap: .55rem; margin-top: .8rem; }
.storage-details { display: flex; flex-direction: column; gap: 1rem; width: 100%; min-width: 0; color: #334155; font-size: .82rem; }
.storage-heading { display: flex; align-items: center; gap: .55rem; color: #1e293b; }
.storage-heading strong { font-size: .87rem; }
.storage-eyebrow { font-size: .9rem; font-weight: 600; }
.storage-badge { margin-left: auto; padding: .35rem .65rem; border: 1px solid #f1f5f9; border-radius: .5rem; background: #fafafa; color: #475569; font-size: .72rem; white-space: nowrap; }
.storage-details .refresh { margin-left: 0; }
.storage-details .storage-count { color: #64748b; }
.storage-details .storage-breakdown { margin-top: 0; }
.storage-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: .8rem; }
.storage-category { display: flex; align-items: flex-start; gap: .6rem; }
.storage-dot { width: 10px; height: 5px; margin-top: .35rem; border-radius: 3px; flex-shrink: 0; }
.storage-category-label { display: flex; flex-direction: column; gap: .25rem; min-width: 0; }
.storage-category-label strong { color: #334155; font-size: .78rem; font-weight: 500; }
.storage-category-label small { color: #64748b; font-size: .72rem; }
.storage-segments { display: flex; height: 14px; overflow: hidden; border-radius: 3px; background: #ededed; }
.storage-segments span { display: block; height: 100%; flex-shrink: 0; transition: width .6s ease, background-color .3s ease; }
.unclassified { background: #94a3b8; }
.free { background: #ededed; }
.storage-caption { color: #94a3b8; font-size: .72rem; margin: .6rem 0 0; }
.storage-exempt { margin: 1.25rem 0 0; color: #64748b; font-size: .76rem; line-height: 1.5; }
@media (max-width: 420px) { .storage-legend { grid-template-columns: repeat(2, minmax(0, 1fr)); } .storage-badge { padding: .3rem .4rem; } }

.storage-count { margin: .8rem 0 .55rem; }
.storage-meter { height: 7px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.storage-meter span { display: block; height: 100%; border-radius: inherit; background: #3b82f6; transition: width .6s ease, background-color .3s ease; }
.storage-meter span.warning { background: #f59e0b; }
.storage-meter span.critical, .storage-meter span.full { background: #ef4444; }
.storage-percent { margin: .4rem 0 0; color: #64748b; }
.storage-percent.warning { color: #a16207; }
.storage-percent.critical, .storage-percent.full { color: #b91c1c; }
.storage-note { margin: .6rem 0 0; line-height: 1.4; color: #92400e; }
.refresh { display: inline-flex; align-items: center; gap: .3rem; border: 0; background: none; color: #2563eb; cursor: pointer; }
.refresh:disabled { cursor: wait; opacity: .5; }
.refresh { margin-left: auto; padding: .2rem; }
.storage-muted { color: #64748b; }
.storage-breakdown { margin-top: 1.6rem; }
.storage-breakdown h3 { margin: 0 0 .8rem; font-size: .9rem; }
.storage-row { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem 0; border-top: 1px solid #e2e8f0; }
.storage-row small { color: #64748b; }
@media (prefers-reduced-motion: reduce) { .storage-meter span, .storage-segments span { transition: none; } }
</style>
