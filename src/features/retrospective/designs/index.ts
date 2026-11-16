// Registry de designs: designKey -> design.
// Para o ano seguinte: crie designs/<ano>-v1/, registre aqui e, quando quiser,
// apague a pasta antiga e a linha correspondente. Nada fora de designs/<key>/ conhece o visual.
import type { Component } from 'vue'
import design2026v1 from './2026-v1'

export interface RetrospectiveDesign {
  key: string
  /** Player em tela cheia (stories, navegação, compartilhar). Props: retrospective. Emite: close, share. */
  Player: Component
  /** Banner do dashboard (A1). Props: retrospective. Emite: open, dismiss. */
  Banner: Component
  /** Telas de carregando/erro (A2/A3). Props: state ('loading'|'error'). Emite: retry, close. */
  StatusScreen: Component
}

const registry: Record<string, RetrospectiveDesign> = {
  [design2026v1.key]: design2026v1,
}

/** Design usado nas telas de carregando/erro, antes de o payload (e o designKey) chegar. */
export const LATEST_DESIGN_KEY = design2026v1.key

export const hasDesign = (key?: string | null): boolean => Boolean(key && registry[key])
export const getDesign = (key?: string | null): RetrospectiveDesign | null => (key && registry[key]) || null
export const getLatestDesign = (): RetrospectiveDesign => registry[LATEST_DESIGN_KEY]
