<script setup>
import { computed, ref, useId } from 'vue'
import { BarChart3, CalendarDays, ChevronDown, TrendingDown, TrendingUp, Users } from 'lucide-vue-next'
import { buildLiaChart } from './liaChart'
const props = defineProps({ card: { type: Object, required: true } })
const gradientId = `lia-chart-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
const selected = ref(null)
const formatValue = value => props.card.unit === 'BRL_CENTS' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100) : new Intl.NumberFormat('pt-BR').format(value || 0)
const formatDate = value => {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { timeZone: props.card.timezone || 'America/Sao_Paulo' }).format(date) : ''
}
const periodLabel = period => period?.label === 'all_time' ? 'Todo o histórico' : period?.from && period?.to ? `${formatDate(period.from)} a ${formatDate(period.to)}` : ''
const percent = value => value === null || value === undefined ? 'Sem base no período anterior' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Math.abs(value))}%`
const chart = computed(() => buildLiaChart(props.card.items, props.card.unit))
const highlighted = computed(() => chart.value.points[selected.value ?? chart.value.points.length - 1])
const dateLabel = name => name?.length === 10 ? name.slice(8) + '/' + name.slice(5, 7) : name
const comparisonMaximum = computed(() => Math.max(1, Math.abs(props.card.comparison?.current || 0), Math.abs(props.card.comparison?.previous || 0)))
</script>

<template>
  <section class="analytics-card" :class="card.type" :aria-label="card.title">
    <header><span class="card-icon"><Users v-if="card.type === 'patient_list'" :size="15" /><BarChart3 v-else :size="15" /></span><strong>{{ card.title }}</strong><span v-if="card.period" class="period"><CalendarDays :size="11" />{{ periodLabel(card.period) }}</span></header>
    <template v-if="card.type === 'ranking'">
      <div v-if="card.total !== undefined" class="total"><small>Total do período</small><strong>{{ formatValue(card.total) }}</strong></div>
      <template v-if="chart.temporal">
        <div class="chart-highlight"><span>{{ highlighted?.name }}</span><strong>{{ formatValue(highlighted?.value) }}</strong></div>
        <svg class="area-chart" viewBox="0 0 480 148" role="group" aria-label="Distribuição por data. Use Tab para explorar os valores.">
          <defs><linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".23" /><stop offset="100%" stop-color="currentColor" stop-opacity="0" /></linearGradient></defs>
          <path d="M10 20H470 M10 75H470 M10 130H470" class="chart-grid" />
          <path :d="chart.area" :fill="`url(#${gradientId})`" />
          <polyline :points="chart.line" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          <g v-for="(point, index) in chart.points" :key="point.name" tabindex="0" :aria-label="`${point.name}: ${formatValue(point.value)}`" @focus="selected = index" @mouseenter="selected = index" @blur="selected = null" @mouseleave="selected = null"><circle :cx="point.x" :cy="point.y" r="13" fill="transparent" /><circle :cx="point.x" :cy="point.y" :r="highlighted?.name === point.name ? 5 : 3" fill="currentColor" stroke="var(--lia-surface, #fff)" stroke-width="2" /></g>
        </svg>
        <div class="chart-axis"><span>{{ dateLabel(chart.points[0]?.name) }}</span><span>{{ dateLabel(chart.points.at(-1)?.name) }}</span></div>
        <p class="chart-note">Datas retornadas pela consulta, em ordem cronológica.</p>
        <details class="chart-details"><summary>Ver valores <ChevronDown :size="12" /></summary><ul><li v-for="item in chart.points" :key="item.name"><span>{{ item.name }}</span><b>{{ formatValue(item.value) }}</b></li></ul></details>
      </template>
      <ol v-else-if="card.items?.length" class="ranking-list"><li v-for="(item, index) in card.items" :key="item.id || item.name"><span class="rank-position">{{ String(index + 1).padStart(2, '0') }}</span><div class="rank-item"><div><span>{{ item.name }}</span><b>{{ formatValue(item.value) }}</b></div><div class="rank-track" aria-hidden="true"><i :class="{ negative: item.value < 0 }" :style="{ width: `${chart.points[index]?.width || 0}%` }"></i></div></div></li></ol>
      <div v-else class="empty-result"><BarChart3 :size="22" /><span>Sem dados no período selecionado.</span></div>
    </template>
    <template v-else-if="card.type === 'patient_list'"><strong class="metric-value">{{ card.value }} <span>pacientes</span></strong><ul class="patient-list"><li v-for="(item, index) in card.items" :key="item.id || `${item.name}-${item.birthday}`"><span class="patient-initial">{{ item.name?.charAt(0) || index + 1 }}</span><strong>{{ item.name }}</strong><span>{{ item.lastProcedureAt ? formatDate(item.lastProcedureAt) : item.birthday }}</span></li></ul><p v-if="card.hasMore" class="more-note">Mostrando {{ card.items?.length }} de {{ card.value }}. Peça os próximos resultados à Lia.</p></template>
    <template v-else>
      <strong class="metric-value">{{ formatValue(card.comparison ? card.comparison.current : card.value) }}</strong>
      <template v-if="card.comparison">
        <p class="change" :class="card.comparison.absoluteChange >= 0 ? 'positive' : 'negative'"><TrendingUp v-if="card.comparison.absoluteChange >= 0" :size="14" /><TrendingDown v-else :size="14" /><b>{{ formatValue(Math.abs(card.comparison.absoluteChange)) }} {{ card.comparison.absoluteChange >= 0 ? 'a mais' : 'a menos' }}</b><span>· {{ percent(card.comparison.percentChange) }}</span></p>
        <div class="comparison-plot"><div><span>Período anterior</span><b>{{ formatValue(card.comparison.previous) }}</b><i :style="{ width: `${Math.abs(card.comparison.previous) / comparisonMaximum * 100}%` }"></i></div><div><span>Período consultado</span><b>{{ formatValue(card.comparison.current) }}</b><i :style="{ width: `${Math.abs(card.comparison.current) / comparisonMaximum * 100}%` }"></i></div></div>
        <p class="chart-note">Período anterior: {{ periodLabel(card.comparison.period) }}</p>
      </template>
    </template>
    <details v-if="card.definition || card.source" class="data-details"><summary>Sobre estes dados <ChevronDown :size="12" /></summary><p v-if="card.definition">{{ card.definition }}</p><p v-if="card.source">{{ card.source }}</p></details>
  </section>
</template>

<style scoped>
.analytics-card { margin-top: 14px; padding: 18px; border: 1px solid var(--lia-line, #e5e9ee); border-radius: 18px; color: var(--lia-text, #243247); background: var(--lia-surface, #fff); box-shadow: 0 4px 18px #14233d04; }
header { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }.card-icon { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--lia-line, #e5e9ee); border-radius: 9px; color: var(--lia-muted, #778195); }header>strong { font-size: 11px; font-weight: 600; }.period { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-left: auto; color: var(--lia-muted, #778195); font-size: 9px; }
.total { display: grid; gap: 4px; margin: 19px 0 20px; }.total small { color: var(--lia-muted, #778195); font-size: 10px; }.total strong,.metric-value { font-size: clamp(23px, 2.8vw, 32px); font-weight: 600; letter-spacing: -1px; line-height: 1.2; }.metric-value { display: block; margin: 18px 0; }.metric-value>span { color: var(--lia-muted, #778195); font-size: 12px; font-weight: 400; letter-spacing: 0; }
ul,ol { list-style: none; margin: 0; padding: 0; }.ranking-list { display: grid; gap: 14px; }.ranking-list>li { display: flex; align-items: flex-start; gap: 9px; }.rank-position { width: 19px; flex-shrink: 0; margin-top: 1px; color: var(--lia-muted, #778195); font-size: 10px; font-variant-numeric: tabular-nums; }.rank-item { flex: 1; min-width: 0; }.rank-item>div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; }.rank-item span { overflow-wrap: anywhere; }.rank-item b { flex-shrink: 0; font-size: 11px; font-weight: 550; font-variant-numeric: tabular-nums; }.rank-track { height: 4px; margin-top: 7px; border-radius: 4px; background: var(--lia-soft, #f2f4f7); overflow: hidden; }.rank-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #9ebdff, var(--lia-blue, #0057ff)); }.rank-track i.negative { background: #cf7080; }
.patient-list { display: grid; gap: 0; }.patient-list li { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-top: 1px solid var(--lia-line, #e5e9ee); }.patient-initial { display: grid; place-items: center; flex-shrink: 0; width: 27px; height: 27px; border-radius: 9px; color: var(--lia-blue, #0057ff); background: var(--lia-tint, #edf3ff); font-size: 11px; }.patient-list strong { min-width: 0; font-size: 11px; font-weight: 500; overflow-wrap: anywhere; }.patient-list li>span:last-child { flex-shrink: 0; margin-left: auto; font-size: 10px; color: var(--lia-muted, #778195); }.more-note,.chart-note { margin: 10px 0 0; color: var(--lia-muted, #778195); font-size: 10px; line-height: 1.6; }
.chart-highlight { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 0; font-size: 11px; color: var(--lia-muted, #778195); }.chart-highlight strong { color: var(--lia-text, #243247); font-weight: 550; }.area-chart { width: 100%; display: block; margin-top: 8px; color: #10bfa2; overflow: visible; }.chart-grid { fill: none; stroke: var(--lia-line, #e5e9ee); stroke-dasharray: 4 6; stroke-width: 1; }.area-chart g:focus { outline: none; }.area-chart g:focus circle:last-child { stroke: var(--lia-blue, #0057ff); stroke-width: 3; }.chart-axis { display: flex; justify-content: space-between; color: var(--lia-muted, #778195); font-size: 10px; font-variant-numeric: tabular-nums; }.chart-details { margin-top: 12px; }.chart-details li { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; font-size: 11px; }.chart-details b { font-weight: 550; }
.change { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: -5px 0 18px; font-size: 10px; }.change.positive { color: #099a78; }.change.negative { color: #c24c60; }.change b { font-weight: 550; }.change>span { color: var(--lia-muted, #778195); }.comparison-plot { display: grid; gap: 12px; padding: 14px; border-radius: 12px; background: var(--lia-soft, #f5f6f9); }.comparison-plot>div { display: grid; grid-template-columns: 1fr auto; gap: 6px; font-size: 10px; color: var(--lia-muted, #778195); }.comparison-plot b { color: var(--lia-text, #243247); font-weight: 550; }.comparison-plot i { grid-column: 1 / -1; height: 5px; border-radius: 3px; background: #aeb8ca; }.comparison-plot>div:last-child i { background: #13baa1; }
details summary { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; color: var(--lia-muted, #778195); cursor: pointer; font-size: 10px; list-style: none; }details summary::-webkit-details-marker { display: none; }details[open] summary>svg { transform: rotate(180deg); }.data-details { margin-top: 14px; padding-top: 6px; border-top: 1px solid var(--lia-line, #e5e9ee); }.data-details p { margin: 5px 0; color: var(--lia-muted, #778195); font-size: 10px; line-height: 1.6; }.empty-result { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 24px 0; color: var(--lia-muted, #778195); font-size: 11px; }
@media(max-width: 440px) { .analytics-card { padding: 14px; }header .period { flex-basis: 100%; margin: 3px 0 0 34px; } }
</style>
