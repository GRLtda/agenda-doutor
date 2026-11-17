import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Retrospective, RetrospectiveSummary } from '../types'
import { fetchCurrentRetrospective, postRetrospectiveShare, postRetrospectiveView } from '../api/retrospective.api'
import { hasDesign } from '../designs'

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

/** "Agora não" no banner vale para a sessão do navegador e para a retrospectiva atual. */
const DISMISS_KEY = 'agenda-doutor:retrospectiva:banner-oculto'

const newViewId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const readDismissed = (id?: string | null) => {
  if (!id) return false
  try {
    return sessionStorage.getItem(DISMISS_KEY) === id
  } catch {
    return false
  }
}

export const useRetrospectiveStore = defineStore('retrospective', () => {
  const auth = useAuthStore()
  /** O store de autenticação (JS) não é tipado; este é o formato que a store usa do usuário. */
  const user = computed<any>(() => auth.user)
  const current = ref<Retrospective | null>(null)
  const status = ref<Status>('idle')
  const bannerDismissed = ref(false)
  let inflight: Promise<Retrospective | null> | null = null

  /** Nome e logo da clínica: o que o /auth/me já trouxe (a URL do logo já está assinada e validada). */
  const clinic = computed(() => ({
    name: user.value?.clinic?.marketingName || user.value?.clinic?.name || '',
    logoUrl: user.value?.clinic?.logoUrl || null,
  }))

  /**
   * Resumo vindo do /auth/me (`user.retrospective`): existe só para o dono e só se houver retrospectiva
   * publicada. Sem requisição extra ao entrar; os stories só são pedidos quando a pessoa clica em "Ver".
   */
  const summary = computed<RetrospectiveSummary | null>(() => {
    const info = user.value?.role === 'owner' ? user.value?.retrospective : null
    return info?.id ? { id: info.id, year: info.year, designKey: info.designKey, viewed: Boolean(info.viewed), clinic: clinic.value } : null
  })

  /** Só é exibível se o /auth/me indicou uma publicada e há design registrado para ela. */
  const available = computed(() => Boolean(summary.value && hasDesign(summary.value.designKey)))
  const dismissedFor = computed(() => (summary.value ? readDismissed(summary.value.id) : false))

  /** Busca os dados completos (stories). Chamado só ao abrir a retrospectiva. */
  async function fetchCurrent({ force = false } = {}) {
    if (!force && status.value === 'ready') return current.value
    if (inflight) return inflight
    status.value = 'loading'
    inflight = fetchCurrentRetrospective()
      .then((data) => {
        current.value = data ? { ...data, clinic: clinic.value } : null
        status.value = data ? 'ready' : 'empty'
        return current.value
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

  /** Dados prontos para exibir: há stories e um design registrado para o designKey. */
  const ready = computed(() => Boolean(current.value && hasDesign(current.value.designKey) && current.value.stories?.length))

  /** Banner escondido: "Agora não" nesta sessão ou já viu os stories (o /auth/me traz `viewed`). Aí aparece o atalho. */
  const bannerHidden = computed(() => bannerDismissed.value || dismissedFor.value || Boolean(summary.value?.viewed))

  /** Esconde o banner do dashboard; o atalho da barra superior passa a aparecer. */
  function dismissBanner() {
    bannerDismissed.value = true
    try {
      sessionStorage.setItem(DISMISS_KEY, summary.value?.id || '')
    } catch {
      /* sem storage */
    }
  }

  /** Uma chamada por abertura do player. Falha de rastreio nunca interrompe a experiência. */
  async function trackView() {
    const retro = current.value
    if (!retro) return
    retro.viewed = true
    if (user.value?.retrospective) user.value.retrospective.viewed = true // o atalho passa a valer sem recarregar
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
    bannerDismissed.value = false
  }

  return { current, summary, ready, status, available, bannerDismissed, bannerHidden, fetchCurrent, dismissBanner, trackView, trackShare, reset }
})
