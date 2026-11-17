// Abre/fecha a retrospectiva como camada sobre a página atual (query ?retrospectiva=1),
// no mesmo padrão dos modais de configurações e perfil do DefaultLayout.
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const RETROSPECTIVE_QUERY = 'retrospectiva'

export function useRetrospectiveOpener() {
  const route = useRoute()
  const router = useRouter()

  const isOpen = computed(() => {
    const value = route.query[RETROSPECTIVE_QUERY]
    const normalized = Array.isArray(value) ? value[0] : value
    return normalized === '1' || normalized === 'true'
  })

  function open() {
    if (isOpen.value) return
    router.push({ query: { ...route.query, [RETROSPECTIVE_QUERY]: '1' } })
  }

  function close() {
    router.replace({ query: { ...route.query, [RETROSPECTIVE_QUERY]: undefined } })
  }

  return { isOpen, open, close }
}
