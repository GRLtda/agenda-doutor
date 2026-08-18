import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const buildLiaPageContext = (route) => {
  if (route?.name !== 'detalhes-paciente') return null
  const entityId = typeof route.params?.id === 'string' ? route.params.id.trim() : ''
  return entityId ? { type: 'patient', entityId } : null
}

export const useLiaPageContext = () => {
  const route = useRoute()
  return computed(() => buildLiaPageContext(route))
}
