import { onMounted, ref, toValue, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// A creation link opens the existing draft form and consumes its query flag.
export function useCreateFromQuery(open, enabled = true) {
  const route = useRoute()
  const router = useRouter()
  const mounted = ref(false)
  let opening = false
  onMounted(() => { mounted.value = true })

  watch(() => [mounted.value, route.query.create, toValue(enabled)], async ([ready, create, allowed]) => {
    if (!ready || create !== '1' || !allowed || opening) return
    opening = true
    const path = route.fullPath
    try {
      await open()
      if (route.fullPath === path) {
        const { create, ...query } = route.query
        await router.replace({ query })
      }
    } finally {
      opening = false
    }
  }, { flush: 'post' })
}
