import { onMounted, onUnmounted, ref, watch } from 'vue'

// One request at a time; changed keys invalidate stale responses and schedule a fresh read.
export function useWorkflowPolling(key, request) {
  const data = ref(null), loading = ref(true), error = ref('')
  let timer, busy = false, disposed = false, revision = 0, pending = false
  async function refresh() {
    if (disposed || document.hidden) return
    if (busy) { pending = true; return }
    busy = true
    const current = revision
    try {
      const result = await request()
      if (!disposed && current === revision) { data.value = result; error.value = '' }
    } catch {
      if (!disposed && current === revision) error.value = 'Não foi possível atualizar as execuções.'
    } finally {
      busy = false
      if (!disposed && current === revision) loading.value = false
      if (pending && !disposed) { pending = false; refresh() }
    }
  }
  watch(key, () => { revision++; data.value = null; loading.value = true; refresh() })
  function visibility() { if (!document.hidden) refresh() }
  onMounted(() => { refresh(); timer = setInterval(refresh, 5000); document.addEventListener('visibilitychange', visibility) })
  onUnmounted(() => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', visibility) })
  return { data, loading, error, refresh }
}
