<script setup>
import { computed, onMounted, ref } from 'vue'
import { HardDrive, ArrowRight, RefreshCw } from 'lucide-vue-next'
import { getStorageSummary, getStorageDetails } from '@/api/storage'

const props = defineProps({ detailed: { type: Boolean, default: false } })
const emit = defineEmits(['details'])
const summary = ref(null)
const details = ref([])
const loading = ref(true)
const error = ref(false)

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

async function refresh() {
  loading.value = true
  error.value = false
  try {
    const [usage, breakdown] = await Promise.all([
      getStorageSummary(),
      props.detailed ? getStorageDetails() : Promise.resolve(null),
    ])
    summary.value = usage.data
    if (breakdown) details.value = breakdown.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <section class="storage-usage" :class="{ detailed }" aria-label="Armazenamento da clínica">
    <div class="storage-heading">
      <HardDrive :size="17" aria-hidden="true" />
      <strong>Armazenamento</strong>
      <button v-if="detailed" type="button" class="refresh" aria-label="Atualizar armazenamento" @click="refresh">
        <RefreshCw :size="16" />
      </button>
    </div>
    <p v-if="loading" class="storage-muted">Carregando consumo…</p>
    <p v-else-if="error" class="storage-muted">Não foi possível consultar o armazenamento.</p>
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
      <button v-if="!detailed" type="button" class="details-link" @click="emit('details')">
        Ver detalhes <ArrowRight :size="14" aria-hidden="true" />
      </button>
      <div v-else class="storage-breakdown">
        <h3>Consumo por tipo</h3>
        <p v-if="!details.length" class="storage-muted">Nenhum arquivo contabilizado.</p>
        <div v-for="item in details" :key="item._id" class="storage-row">
          <span>{{ labels[item._id] || item._id }} <small>({{ item.files }})</small></span>
          <strong>{{ formatBytes(item.usedBytes) }}</strong>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.storage-usage { padding: .85rem .75rem .45rem; color: #334155; font-size: .82rem; }
.storage-usage.detailed { max-width: 640px; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 1rem; background: #fff; }
.storage-heading { display: flex; align-items: center; gap: .55rem; color: #1e293b; }
.storage-heading strong { font-size: .87rem; }
.storage-count { margin: .8rem 0 .55rem; white-space: nowrap; }
.storage-meter { height: 7px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.storage-meter span { display: block; height: 100%; border-radius: inherit; background: #3b82f6; transition: width .25s ease; }
.storage-meter span.warning { background: #f59e0b; }
.storage-meter span.critical, .storage-meter span.full { background: #ef4444; }
.storage-percent { margin: .4rem 0 0; color: #64748b; }
.storage-percent.warning { color: #a16207; }
.storage-percent.critical, .storage-percent.full { color: #b91c1c; }
.storage-note { margin: .6rem 0 0; line-height: 1.4; color: #92400e; }
.details-link, .refresh { display: inline-flex; align-items: center; gap: .3rem; border: 0; background: none; color: #2563eb; cursor: pointer; }
.details-link { padding: .65rem 0 0; font-size: .8rem; font-weight: 600; }
.refresh { margin-left: auto; padding: .2rem; }
.storage-muted { color: #64748b; }
.storage-breakdown { margin-top: 1.6rem; }
.storage-breakdown h3 { margin: 0 0 .8rem; font-size: .9rem; }
.storage-row { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem 0; border-top: 1px solid #e2e8f0; }
.storage-row small { color: #64748b; }
@media (max-width: 420px) { .storage-usage.detailed { padding: 1rem; } }
</style>
