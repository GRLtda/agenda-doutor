<script setup>
// Resumo (último story, tema azul): título, subtítulo e um painel com os números do ano.
// O cabeçalho (foto + nome da clínica + "Retrospectiva <ano>") e o rodapé ficam no Story.vue.
// Painel: blocos com ícone (atendimentos, voltaram, mês campeão, procedimento nº 1) e, por último,
// o bloco de mensagens em destaque leve ("Otimizamos o seu tempo"), porque mostra o sistema
// trabalhando pela clínica. Vai para o Instagram: tudo precisa ser lido de relance.
// Larguras definidas em 100%/nowrap de propósito: a exportação PNG arredonda larguras "automáticas".
import { computed } from 'vue'
import { fmt, monthName } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, name: String, year: Number })

const LABELS = { at: 'Atendimentos', mes: 'Mês campeão', ret: 'Voltaram', proc: 'Procedimento nº 1', msg: 'Lembretes e confirmações' }
// Ícones (traço, 24 × 24), no estilo lucide.
const ICONS = {
  at: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm9 16 2 2 4-4'],
  mes: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  ret: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
  proc: ['M9.94 14.06 4 20', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M20 3v4', 'M22 5h-4'],
  msg: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
}

const items = computed(() => {
  const { cnt, fu } = props.m
  const raw = (Array.isArray(props.data?.items) ? props.data.items : []).filter((it) => LABELS[it?.key]).slice(0, 5)
  return raw.map((it, i) => {
    const base = { key: it.key, label: LABELS[it.key], icon: ICONS[it.key], st: fu(500 + i * 150), wide: false }
    if (it.key === 'at') return { ...base, value: fmt(cnt(Number(it.value) || 0, 600, 1200)), color: '#0057FF', fs: 30 }
    if (it.key === 'mes') return { ...base, value: monthName(Number(it.value)) || String(it.value || ''), color: '#0F172A', fs: 24 }
    if (it.key === 'ret') return { ...base, value: `${cnt(Number(it.value) || 0, 900, 1100)}%`, color: '#0057FF', fs: 30 }
    if (it.key === 'proc') {
      const v = String(it.value || '')
      return { ...base, value: v, color: '#0F172A', fs: v.length > 14 ? 19 : 24, wide: v.length > 14 }
    }
    return { ...base, value: fmt(cnt(Number(it.value) || 0, 1000, 1200)), color: '#0057FF', fs: 30 }
  })
})
// Blocos da grade (2 colunas). Nomes longos e um bloco sozinho na linha ocupam a linha toda.
const tiles = computed(() => {
  const list = items.value.filter((it) => it.key !== 'msg')
  const narrow = list.filter((it) => !it.wide)
  if (narrow.length % 2 === 1) narrow[narrow.length - 1].wide = true
  return list
})
const highlight = computed(() => items.value.find((it) => it.key === 'msg') || null)
</script>

<template>
  <div class="col">
    <!-- Largura total da coluna: sem isso, a exportação PNG arredonda a largura, quebra a linha e sobrepõe o nome. -->
    <div :style="{ width: '100%', fontSize: '56px', fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1, ...m.F.a2 }">{{ tx.p }}</div>
    <p :style="{ width: '100%', fontSize: '17px', lineHeight: 1.35, color: c.muted, ...m.F.a2 }">{{ tx.x }}</p>

    <div class="panel" :style="m.F.b">
      <div class="tiles">
        <div v-for="it in tiles" :key="it.key" class="cell tile" :style="{ gridColumn: it.wide ? 'span 2' : 'span 1', ...it.st }">
          <div class="tile-top">
            <span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path v-for="(d, k) in it.icon" :key="k" :d="d" /></svg></span>
            <span class="lbl">{{ it.label }}</span>
          </div>
          <span class="tnum val" :style="{ fontSize: `${it.fs}px`, color: it.color }">{{ it.value }}</span>
        </div>
      </div>

      <div v-if="highlight" class="cell hl" :style="highlight.st">
        <span class="hl-ico" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path v-for="(d, k) in highlight.icon" :key="k" :d="d" /></svg></span>
        <div class="hl-txt">
          <span class="hl-lbl">{{ highlight.label }}</span>
          <span class="hl-sub">Otimizamos o seu tempo</span>
        </div>
        <span class="tnum hl-val">{{ highlight.value }}</span>
      </div>
    </div>

    <p :style="{ width: '300px', margin: '10px 0 0', fontSize: '20px', fontWeight: 600, lineHeight: 1.35, ...m.F.d }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.panel { margin-top: 12px; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 22px; background: #FFFFFF; color: #0F172A; box-shadow: 0 18px 44px rgba(10, 18, 48, 0.3); display: flex; flex-direction: column; gap: 10px; text-align: left; }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tile { box-sizing: border-box; min-width: 0; padding: 12px; border-radius: 14px; background: #F3F6FD; display: flex; flex-direction: column; gap: 8px; }
.tile-top { display: flex; align-items: center; gap: 7px; min-width: 0; }
.ico { width: 26px; height: 26px; flex: none; border-radius: 999px; background: #E2EBFF; color: #0057FF; display: flex; align-items: center; justify-content: center; }
.lbl { font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; }
.val { font-weight: 700; letter-spacing: -0.025em; line-height: 1.05; overflow-wrap: anywhere; }
/* Destaque leve: fundo azul-claro, borda e ícone azul sólido; chama atenção sem brigar com o resto. */
.hl { box-sizing: border-box; padding: 12px 14px; border-radius: 16px; background: linear-gradient(120deg, #EEF4FF 0%, #DCE8FF 100%); box-shadow: inset 0 0 0 1px #C7DAFF; color: #0F172A; display: flex; align-items: center; gap: 12px; }
.hl-ico { width: 38px; height: 38px; flex: none; border-radius: 999px; background: #0057FF; color: #FFFFFF; box-shadow: 0 6px 14px rgba(0, 87, 255, 0.3); display: flex; align-items: center; justify-content: center; }
.hl-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hl-lbl { font-size: 14px; font-weight: 700; white-space: nowrap; }
.hl-sub { font-size: 12px; font-weight: 500; color: #0057FF; white-space: nowrap; }
.hl-val { flex: none; color: #0057FF; font-size: 30px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; white-space: nowrap; }
</style>
