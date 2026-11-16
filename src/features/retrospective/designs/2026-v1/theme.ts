// Temas do design 2026-v1 (fonte: objeto T de Story.dc.html).
export type ThemeName = 'dark' | 'light' | 'blue'

export interface Theme {
  bg: string; text: string; muted: string; accent: string; onAccent: string; hi: string; soft: string
  line2: string; pb: string; pbf: string; btnBg: string; btnFg: string; btnShadow: string; bar: string
  barC: string; glow: string; ring: string; face: string; heat: string; logoBorder: string; chip: string
  chipBorder: string; seal: string
}

const DARK: Theme = {
  bg: 'linear-gradient(165deg, #0A1230 0%, #0B1D5C 55%, #0057FF 130%)', text: '#FFFFFF', muted: 'rgba(255,255,255,0.78)',
  accent: '#FFFFFF', onAccent: '#0A1230', hi: '#9DBEFF', soft: 'rgba(255,255,255,0.12)', line2: 'rgba(255,255,255,0.5)',
  pb: 'rgba(255,255,255,0.28)', pbf: '#FFFFFF', btnBg: '#FFFFFF', btnFg: '#0A1230', btnShadow: '0 10px 28px rgba(0,0,0,0.28)',
  bar: 'rgba(255,255,255,0.26)', barC: '#FFFFFF', glow: 'rgba(157,190,255,0.95)', ring: 'rgba(255,255,255,0.14)',
  face: 'rgba(255,255,255,0.9)', heat: '#9DBEFF', logoBorder: 'rgba(255,255,255,0)', chip: 'rgba(255,255,255,0.07)',
  chipBorder: 'rgba(255,255,255,0.14)', seal: 'rgba(255,255,255,0.82)',
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: DARK,
  light: {
    bg: '#F6F8FB', text: '#0F172A', muted: '#475569', accent: '#0057FF', onAccent: '#FFFFFF', hi: '#0057FF',
    soft: 'rgba(0,87,255,0.08)', line2: '#94A3B8', pb: 'rgba(15,23,42,0.14)', pbf: '#0F172A', btnBg: '#0057FF',
    btnFg: '#FFFFFF', btnShadow: '0 10px 24px rgba(0,87,255,0.3)', bar: 'rgba(0,87,255,0.2)', barC: '#0057FF',
    glow: 'rgba(0,87,255,0.5)', ring: '#E2E8F0', face: '#0F172A', heat: '#0057FF', logoBorder: '#E2E8F0',
    chip: '#FFFFFF', chipBorder: '#E2E8F0', seal: '#475569',
  },
  blue: {
    ...DARK,
    bg: 'radial-gradient(120% 70% at 50% 0%, #1B69FF 0%, #0057FF 60%, #004BE0 100%)', muted: 'rgba(255,255,255,0.88)',
    hi: '#FFFFFF', btnFg: '#0057FF', soft: 'rgba(255,255,255,0.16)', seal: 'rgba(255,255,255,0.9)',
  },
}

/** Sequência do protótipo (Main.dc.html): alterna escuro/claro; o resumo (último) é azul cheio. */
export function themeFor(kind: string, index: number): ThemeName {
  if (kind === 'resumo') return 'blue'
  return index % 2 === 0 ? 'dark' : 'light'
}
