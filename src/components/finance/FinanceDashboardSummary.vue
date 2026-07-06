<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AnimatedNumber from '@/components/global/AnimatedNumber.vue'
import {
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Wallet
} from 'lucide-vue-next'

const financeStore = useFinanceStore()

const getComparisonClass = (current, previous) => {
    if (!previous) return 'neutral'
    if (current >= previous) return 'positive'
    return 'negative'
}

const getComparisonIcon = (current, previous) => {
    if (!previous) return null
    if (current >= previous) return ArrowUpRight
    return ArrowDownRight
}

const getComparisonPercent = (current, previous) => {
    if (!previous) return 0
    return Math.round(((current - previous) / previous) * 100)
}
</script>

<template>
    <div class="unified-balance-card mb-8">
      <div class="ubc-header">
        <div class="ubc-title-group">
          <span class="ubc-subtitle">Visão Geral</span>
          <h3 class="ubc-title">Faturamento Total</h3>
        </div>
        <div class="ubc-icon-wrapper">
          <Wallet :size="20" class="text-blue-600" />
        </div>
      </div>

      <div class="ubc-body">
        <div v-if="financeStore.isLoading" class="flex flex-col gap-2">
            <AppSkeleton width="200px" height="48px" />
        </div>
        <div v-else class="ubc-amount-group">
          <h2 class="ubc-value">
            <AnimatedNumber :duration="1000" :value="financeStore.revenueSummary.totalRevenue" type="currency" />
          </h2>
          <div class="ubc-trend" :class="getComparisonClass(financeStore.comparison.current, financeStore.comparison.previous)">
              <component :is="getComparisonIcon(financeStore.comparison.current, financeStore.comparison.previous)" :size="16" stroke-width="3" />
              <span>{{ getComparisonPercent(financeStore.comparison.current, financeStore.comparison.previous) }}%</span>
          </div>
        </div>
      </div>

      <div class="ubc-footer">
          <div class="ubc-kpi-item">
            <div class="ubc-kpi-header">
               <TrendingUp :size="14" class="text-slate-400" />
               <span class="ubc-kpi-label">Ticket Médio</span>
            </div>
            <AppSkeleton v-if="financeStore.isLoading" width="80px" height="20px" class="mt-1" />
            <span v-else class="ubc-kpi-value"><AnimatedNumber :value="financeStore.kpi.averageTicket" type="currency" /></span>
          </div>
          
          <div class="ubc-kpi-item">
            <div class="ubc-kpi-header">
               <Activity :size="14" class="text-slate-400" />
               <span class="ubc-kpi-label">Procedimentos</span>
            </div>
            <template v-if="financeStore.isLoading">
               <AppSkeleton width="60px" height="20px" class="mt-1" />
            </template>
            <template v-else>
               <span class="ubc-kpi-value"><AnimatedNumber :value="financeStore.kpi.proceduresCount" type="number" /></span>
            </template>
          </div>

          <div class="ubc-kpi-item desktop-kpi-item">
            <div class="ubc-kpi-header">
               <Users :size="14" class="text-slate-400" />
               <span class="ubc-kpi-label">Pacientes Atendidos</span>
            </div>
            <AppSkeleton v-if="financeStore.isLoading" width="60px" height="20px" class="mt-1" />
            <span v-else class="ubc-kpi-value"><AnimatedNumber :value="financeStore.kpi.appointmentsCount || 0" type="number" /></span>
          </div>

          <div class="ubc-kpi-item desktop-kpi-item">
            <div class="ubc-kpi-header">
               <CalendarDays :size="14" class="text-slate-400" />
               <span class="ubc-kpi-label">Período Anterior</span>
            </div>
            <AppSkeleton v-if="financeStore.isLoading" width="80px" height="20px" class="mt-1" />
            <span v-else class="ubc-kpi-value"><AnimatedNumber :value="financeStore.comparison.previous || 0" type="currency" /></span>
          </div>
      </div>
    </div>
</template>

<style scoped>
/* Unified Balance Card */
.unified-balance-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1.25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.mb-8 {
  margin-bottom: 1rem;
}

.ubc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.ubc-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ubc-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 400;
}

.ubc-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--preto);
  margin: 0;
}

.ubc-icon-wrapper {
  background-color: #eff6ff;
  padding: 0.6rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ubc-body {
  margin-bottom: 2rem;
}

.ubc-amount-group {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ubc-value {
  font-size: 2.75rem;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1;
}

.ubc-trend {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.10rem;
}

.ubc-trend.positive { color: #059669; }
.ubc-trend.negative { color: #dc2626; }
.ubc-trend.neutral { color: #64748b; }

.ubc-footer {
  display: flex;
  align-items: flex-start;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.25rem;
  gap: 1.5rem;
}

.ubc-kpi-item {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0; /* allows text truncation */
}

.ubc-kpi-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.ubc-kpi-label {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.ubc-kpi-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.desktop-kpi-item {
  display: flex;
}

@media (max-width: 768px) {
  .desktop-kpi-item {
    display: none !important;
  }
  .ubc-value {
    font-size: 2.25rem;
  }
  .ubc-amount-group {
    gap: 0.75rem;
  }
  .ubc-footer {
    flex-wrap: wrap;
    gap: 1rem;
  }
  .ubc-kpi-item {
    flex: 1 1 calc(50% - 1rem); /* Creates a 2x2 grid on mobile for KPIs */
  }
}

@media (max-width: 480px) {
  .ubc-value {
    font-size: 2rem;
  }
  .ubc-kpi-value {
    font-size: 1.1rem;
  }
  .ubc-kpi-label {
    font-size: 0.7rem;
  }
}
</style>
