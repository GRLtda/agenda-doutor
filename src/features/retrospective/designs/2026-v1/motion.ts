// Funções de animação baseadas no tempo do story (ms), iguais às de Story.dc.html.
// Com prefers-reduced-motion ou no modo cartão, o tempo é "infinito" e tudo aparece no quadro final.
export const FINAL_MS = 1e9

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)

export function motion(ms: number) {
  const fu = (d: number) => {
    const o = ease((ms - d) / 450)
    return { opacity: o.toFixed(3), transform: `translateY(${((1 - o) * 14).toFixed(1)}px)` }
  }
  const fx = (d: number) => {
    const o = ease((ms - d) / 450)
    return { opacity: o.toFixed(3), transform: `translateX(${((1 - o) * 24).toFixed(1)}px)` }
  }
  const cnt = (v: number, d: number, dur: number) => Math.round(v * ease((ms - d) / dur))
  const F = { a: fu(0), a2: fu(120), b: fu(220), c: fu(380), c2: fu(520), d0: fu(1100), d: fu(1800), e: fu(2000) }
  return { ms, fu, fx, cnt, ease: (d: number, dur: number) => ease((ms - d) / dur), F }
}

export type Motion = ReturnType<typeof motion>

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
