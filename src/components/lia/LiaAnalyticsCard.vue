<script setup>
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-vue-next'
defineProps({ card: { type: Object, required: true } })
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Math.abs(value || 0))
const percent = (value) => value === null || value === undefined ? 'Sem base no período anterior' : `${Math.abs(value)}%`
const changeLabel = (comparison) => comparison.absoluteChange >= 0 ? 'a mais' : 'a menos'
</script>

<template>
  <section class="analytics-card" :class="card.type">
    <header><BarChart3 :size="16" /><strong>{{ card.title }}</strong></header>
    <template v-if="card.type === 'ranking'"><ol v-if="card.items?.length"><li v-for="item in card.items" :key="item.name"><span>{{ item.name }}</span><b>{{ item.value }}</b></li></ol><div v-else class="empty-result"><strong>0</strong><span>Sem dados no período selecionado.</span></div></template>
    <template v-else-if="card.type === 'patient_list'"><strong class="metric-value">{{ card.value }}</strong><ul><li v-for="item in card.items" :key="`${item.name}-${item.birthday}`">{{ item.name }} <span>{{ item.birthday }}</span></li></ul></template>
    <template v-else>
      <div v-if="card.comparison" class="comparison-summary">
        <div class="comparison-values">
          <div class="period-value"><span>Período consultado</span><strong>{{ card.comparison.current }}</strong></div>
          <div class="period-value"><span>Período anterior</span><strong>{{ card.comparison.previous }}</strong></div>
        </div>
        <p :class="card.comparison.absoluteChange >= 0 ? 'positive' : 'negative'">
          <TrendingUp v-if="card.comparison.absoluteChange >= 0" :size="14" />
          <TrendingDown v-else :size="14" />
          <b>{{ formatNumber(card.comparison.absoluteChange) }} {{ changeLabel(card.comparison) }}</b>
          <span>· {{ percent(card.comparison.percentChange) }}</span>
        </p>
      </div>
      <strong v-else class="metric-value">{{ card.value }}</strong>
    </template>
  </section>
</template>

<style scoped>
.analytics-card{margin-top:.68rem;padding:.75rem;border:1px solid #d8e2f1;border-radius:.7rem;color:#263247;background:#fff}.analytics-card header{display:flex;align-items:center;gap:.42rem;color:#526078;font-size:.76rem}.metric-value{display:block;margin:.35rem 0;color:#172b4d;font-size:1.35rem}.analytics-card p{display:flex;align-items:center;gap:.25rem;margin:.25rem 0 0;color:#61708a;font-size:.72rem}.analytics-card ol,.analytics-card ul{display:grid;gap:.38rem;margin:.62rem 0 0;padding:0;list-style:none}.analytics-card li{display:flex;justify-content:space-between;gap:.5rem;font-size:.77rem}.analytics-card li span:last-child{color:#6e7d92}.analytics-card li b{color:#2563eb}.patient_list ul{border-top:1px solid #e5eaf1;padding-top:.5rem}.empty-result{display:flex;align-items:baseline;gap:.45rem;margin-top:.45rem}.empty-result strong{color:#172b4d;font-size:1.25rem}.empty-result span{color:#718096;font-size:.74rem}.comparison-summary{margin-top:.55rem;border:1px solid #e1e8f2;border-radius:.55rem;background:#f8faff;overflow:hidden}.comparison-values{display:grid;grid-template-columns:1fr 1fr}.period-value{display:grid;gap:.14rem;padding:.55rem .62rem}.period-value+.period-value{border-left:1px solid #e1e8f2}.period-value span{color:#718096;font-size:.66rem}.period-value strong{color:#172b4d;font-size:1.13rem}.comparison-summary p{padding:.46rem .62rem;border-top:1px solid #e1e8f2}.comparison-summary p b{font-weight:650}.comparison-summary p.positive{color:#167343}.comparison-summary p.negative{color:#b5473c}.comparison-summary p span{color:#6e7d92}
</style>
