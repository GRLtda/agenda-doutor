<script setup>
import { computed, watch } from 'vue'
import { HardDrive, RefreshCw } from 'lucide-vue-next'
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
  <section
    class="storage-usage"
    :class="{ detailed, clickable: !detailed }"
    :role="!detailed ? 'menuitem' : undefined"
    :tabindex="!detailed ? 0 : undefined"
    :aria-label="detailed ? 'Armazenamento da clínica' : 'Ver detalhes do armazenamento da clínica'"
    :aria-busy="loading"
    @click="!detailed && emit('details')"
    @keydown.enter.self.prevent="!detailed && emit('details')"
    @keydown.space.self.prevent="!detailed && emit('details')"
  >
    <div class="storage-heading">
      <HardDrive :size="17" aria-hidden="true" />
      <strong>Armazenamento</strong>
      <button v-if="detailed" type="button" class="refresh" aria-label="Atualizar armazenamento" :disabled="loading" @click="refresh">
        <RefreshCw :size="16" />
      </button>
    </div>
    <div v-if="loading && !summary" class="storage-skeleton" aria-label="Carregando armazenamento" role="status">
      <AppSkeleton width="85%" height="1rem" />
      <AppSkeleton height="7px" border-radius="999px" />
      <AppSkeleton width="35%" height=".85rem" />
      <div v-if="detailed" class="storage-breakdown">
        <AppSkeleton width="45%" height="1rem" />
        <div v-for="row in 3" :key="row" class="storage-row">
          <AppSkeleton width="45%" height="1rem" />
          <AppSkeleton width="20%" height="1rem" />
        </div>
      </div>
    </div>
    <template v-else-if="summary">
      <p class="storage-count">{{ formatBytes(summary.usedBytes) }} de {{ formatBytes(summary.quotaBytes) }} utilizados</p>
      <div class="storage-meter" role="progressbar" :aria-valuenow="Math.min(100, percent)" aria-valuemin="0" aria-valuemax="100" :aria-label="`${percent}% do armazenamento utilizado`">
        <span :class="tone" :style="{ width: barWidth }"></span>
      </div>
      <p class="storage-percent" :class="tone">{{ percent }}% utilizado</p>
      <p v-if="summary.blocked" class="storage-note">Armazenamento em verificação. Novos envios estão temporariamente indisponíveis.</p>
      <p v-else-if="!summary.ready" class="storage-note">Inventário em atualização. O consumo pode mudar.</p>
      <p v-else-if="tone === 'full'" class="storage-note">Sem espaço disponível para novos arquivos.</p>
      <p v-else-if="tone === 'critical'" class="storage-note">Armazenamento quase cheio.</p>
      <p v-else-if="tone === 'warning'" class="storage-note">Armazenamento próximo do limite.</p>
      <div v-if="detailed" class="storage-breakdown">
        <h3>Consumo por tipo</h3>
        <p class="storage-muted">Identidade visual, fotos de perfil e assinaturas não consomem a cota da clínica.</p>
        <div v-if="clinicStore.storageDetailsLoading && !clinicStore.storageDetails" class="storage-skeleton">
          <div v-for="row in 3" :key="row" class="storage-row">
            <AppSkeleton width="45%" height="1rem" />
            <AppSkeleton width="20%" height="1rem" />
          </div>
        </div>
        <p v-else-if="clinicStore.storageDetails && !details.length" class="storage-muted">Nenhum arquivo contabilizado.</p>
        <div v-for="item in details" :key="item._id" class="storage-row">
          <span>{{ labels[item._id] || item._id }} <small>({{ item.files }})</small></span>
          <strong>{{ formatBytes(item.usedBytes) }}</strong>
        </div>
      </div>
    </template>
    <p v-if="error" class="storage-muted" role="status">{{ summary ? 'Não foi possível atualizar. Exibindo o último consumo consultado.' : 'Não foi possível consultar o armazenamento.' }}</p>
  </section>
</template>

<style scoped>
.storage-usage { padding: .85rem .75rem .45rem; color: #334155; font-size: .82rem; }
.storage-usage.clickable { cursor: pointer; border-radius: .5rem; transition: background-color .2s ease; }
.storage-usage.clickable:hover { background-color: #f3f4f6; }
.storage-usage.clickable:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.storage-skeleton { display: flex; flex-direction: column; gap: .55rem; margin-top: .8rem; }
.storage-usage.detailed { max-width: 640px; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 1rem; background: #fff; }
.storage-heading { display: flex; align-items: center; gap: .55rem; color: #1e293b; }
.storage-heading strong { font-size: .87rem; }
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
@media (max-width: 420px) { .storage-usage.detailed { padding: 1rem; } }
@media (prefers-reduced-motion: reduce) { .storage-meter span { transition: none; } }
</style>
