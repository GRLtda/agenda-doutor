import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Retrospective } from '../types'
import { fetchCurrentRetrospective, postRetrospectiveShare, postRetrospectiveView } from '../api/retrospective.api'
import { hasDesign } from '../designs'

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

const newViewId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useRetrospectiveStore = defineStore('retrospective', () => {
  const current = ref<Retrospective | null>(null)
  const status = ref<Status>('idle')
  let inflight: Promise<Retrospective | null> | null = null

  /** Só é exibível se houver design registrado para o designKey e pelo menos 1 story. */
  const available = computed(() =>
    Boolean(current.value && hasDesign(current.value.designKey) && current.value.stories?.length),
  )

  async function fetchCurrent({ force = false } = {}) {
    if (!force && status.value === 'ready') return current.value
    if (inflight) return inflight
    status.value = 'loading'
    inflight = fetchCurrentRetrospective()
      .then((data) => {
        current.value = data
        status.value = data ? 'ready' : 'empty'
        return data
      })
      .catch((error) => {
        status.value = 'error'
        throw error
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  /** Uma chamada por abertura do player. Falha de rastreio nunca interrompe a experiência. */
  async function trackView() {
    const retro = current.value
    if (!retro) return
    retro.viewed = true
    try {
      await postRetrospectiveView(retro.id, newViewId())
    } catch {
      /* rastreio silencioso */
    }
  }

  async function trackShare(storyKey: string) {
    const retro = current.value
    if (!retro) return
    try {
      await postRetrospectiveShare(retro.id, storyKey)
    } catch {
      /* rastreio silencioso */
    }
  }

  function reset() {
    current.value = null
    status.value = 'idle'
  }

  return { current, status, available, fetchCurrent, trackView, trackShare, reset }
})
