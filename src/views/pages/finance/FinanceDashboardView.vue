<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'
import { useClinicStore } from '@/stores/clinic'
import { useEmployeesStore } from '@/stores/employees'

import FinanceDashboardFilters from '@/components/finance/FinanceDashboardFilters.vue'
import FinanceDashboardSummary from '@/components/finance/FinanceDashboardSummary.vue'
import FinanceDashboardCharts from '@/components/finance/FinanceDashboardCharts.vue'
import FinanceTopClients from '@/components/finance/FinanceTopClients.vue'
import FinanceTopProcedures from '@/components/finance/FinanceTopProcedures.vue'

const financeStore = useFinanceStore()
const employeesStore = useEmployeesStore()
const clinicStore = useClinicStore()

const router = useRouter()
const route = useRoute()
const selectedPeriod = ref('month')
const selectedProfessional = ref('')

const periods = [
  { label: 'Hoje', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' },
  { label: 'Personalizado', value: 'custom' }
]

const isHydratingFinanceFilters = ref(true)
const FINANCE_FILTER_QUERY_KEYS = ['period', 'professional', 'start', 'end']

const getSingleQueryValue = (queryValue) => {
  if (Array.isArray(queryValue)) return queryValue[0]
  return typeof queryValue === 'string' ? queryValue : ''
}

const parseQueryDate = (value) => {
  if (!value || typeof value !== 'string') return null
  const parts = value.split('-')
  if (parts.length !== 3) return null

  const [year, month, day] = parts.map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const normalizeQueryObject = (query) => {
  return Object.fromEntries(
    Object.entries(query)
      .map(([key, value]) => [key, Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')])
      .filter(([, value]) => value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
  )
}

const doctorOptions = computed(() => {
    const options = [
        { label: 'Todos os Médicos', value: '' }
    ]

    if (clinicStore.currentClinic) {
        const { owner, staff } = clinicStore.currentClinic
        const validRoles = ['owner', 'medico']

        const allUsers = []
        if (owner) allUsers.push(owner)
        if (staff && Array.isArray(staff)) allUsers.push(...staff)

        const doctorsAndOwners = allUsers
            .filter(u => u && validRoles.includes(u.role))
            .filter((user, index, self) =>
                index === self.findIndex((u) => u._id === user._id)
            )

        options.push(...doctorsAndOwners.map(emp => ({
            label: emp.name,
            value: emp._id
        })))
    }
    return options
})

const customDateRange = ref(null)
const customStartDate = computed({
  get: () => customDateRange.value?.[0] || null,
  set: (value) => {
    const currentEnd = customDateRange.value?.[1] || null
    if (!value && !currentEnd) {
      customDateRange.value = null
      return
    }
    customDateRange.value = [value || null, currentEnd]
  }
})
const customEndDate = computed({
  get: () => customDateRange.value?.[1] || null,
  set: (value) => {
    const currentStart = customDateRange.value?.[0] || null
    if (!value && !currentStart) {
      customDateRange.value = null
      return
    }
    customDateRange.value = [currentStart, value || null]
  }
})

const getPeriodDisplayLabel = (periodValue) => {
  if (periodValue === 'custom') {
    if (customDateRange.value && customDateRange.value[0] && customDateRange.value[1]) {
      return `${formatDateDisplay(customDateRange.value[0])} - ${formatDateDisplay(customDateRange.value[1])}`
    }
    return 'Personalizado'
  }
  const p = periods.find(p => p.value === periodValue)
  return p ? p.label : 'Período'
}

const getPeriodDateRange = (periodValue) => {
  if (periodValue === 'custom') return ''
  
  let start = new Date()
  let end = new Date()

  if (periodValue === 'day') {
    // already set
  } else if (periodValue === 'week') {
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    end = new Date(start)
    end.setDate(end.getDate() + 6)
  } else if (periodValue === 'month') {
    start = new Date(start.getFullYear(), start.getMonth(), 1)
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  } else if (periodValue === 'year') {
    start = new Date(start.getFullYear(), 0, 1)
    end = new Date(start.getFullYear(), 11, 31)
  } else {
    return ''
  }

  const fStart = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fEnd = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  
  if (periodValue === 'day') {
    return fStart
  }
  return `${fStart} - ${fEnd}`
}

const financeActiveFiltersCount = computed(() => {
  let count = 0
  if (selectedProfessional.value) count += 1
  const hasCustomRange = Boolean(customStartDate.value && customEndDate.value)
  if (selectedPeriod.value !== 'month' && (selectedPeriod.value !== 'custom' || hasCustomRange)) {
    count += 1
  }
  return count
})

const previousPeriod = ref('month')

const getCustomPeriodDates = () => {
  const startRaw = customDateRange.value?.[0]
  const endRaw = customDateRange.value?.[1]

  if (!startRaw || !endRaw) {
    return { startDate: null, endDate: null }
  }

  const startDateObj = new Date(startRaw)
  const endDateObj = new Date(endRaw)
  const from = startDateObj <= endDateObj ? startDateObj : endDateObj
  const to = startDateObj <= endDateObj ? endDateObj : startDateObj

  return {
    startDate: from.toISOString().split('T')[0],
    endDate: to.toISOString().split('T')[0]
  }
}

const formatDateDisplay = (dateInput) => {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  return date.toLocaleDateString('pt-BR')
}

const getFinanceFiltersFromState = () => {
  const query = {}

  if (selectedProfessional.value) {
    query.professional = selectedProfessional.value
  }

  if (selectedPeriod.value && selectedPeriod.value !== 'month' && selectedPeriod.value !== 'custom') {
    query.period = selectedPeriod.value
  }

  if (selectedPeriod.value === 'custom') {
    const { startDate, endDate } = getCustomPeriodDates()
    if (startDate && endDate) {
      query.period = 'custom'
      query.start = startDate
      query.end = endDate
    }
  }

  return query
}

const syncFinanceFiltersToQuery = async () => {
  const baseQuery = { ...route.query }
  FINANCE_FILTER_QUERY_KEYS.forEach((key) => delete baseQuery[key])

  const nextQuery = { ...baseQuery, ...getFinanceFiltersFromState() }
  const currentNormalized = normalizeQueryObject(route.query)
  const nextNormalized = normalizeQueryObject(nextQuery)

  if (JSON.stringify(currentNormalized) === JSON.stringify(nextNormalized)) return
  await router.replace({ query: nextQuery })
}

const applyFinanceFiltersFromQuery = () => {
  const periodFromQuery = getSingleQueryValue(route.query.period)
  const professionalFromQuery = getSingleQueryValue(route.query.professional)
  const startFromQuery = parseQueryDate(getSingleQueryValue(route.query.start))
  const endFromQuery = parseQueryDate(getSingleQueryValue(route.query.end))
  const validPeriods = periods.map((period) => period.value)
  const hasCustomDates = Boolean(startFromQuery && endFromQuery)

  selectedProfessional.value = professionalFromQuery || ''
  if (validPeriods.includes(periodFromQuery)) {
    selectedPeriod.value = periodFromQuery
  } else if (hasCustomDates) {
    selectedPeriod.value = 'custom'
  } else {
    selectedPeriod.value = 'month'
  }

  if (selectedPeriod.value === 'custom' && hasCustomDates) {
    customDateRange.value = [startFromQuery, endFromQuery]
  } else {
    if (selectedPeriod.value === 'custom') {
      selectedPeriod.value = 'month'
    }
    customDateRange.value = null
  }

  previousPeriod.value = selectedPeriod.value === 'custom' ? 'month' : selectedPeriod.value
}

onMounted(async () => {
  await employeesStore.fetchEmployees()
  applyFinanceFiltersFromQuery()
  isHydratingFinanceFilters.value = false
  await syncFinanceFiltersToQuery()
  await refreshDashboard()
})

const refreshDashboard = async () => {
    const { startDate, endDate } = selectedPeriod.value === 'custom'
      ? getCustomPeriodDates()
      : { startDate: null, endDate: null }

    const commonParams = {
        period: selectedPeriod.value,
        startDate,
        endDate,
        professionalId: selectedProfessional.value || null
    }

    await Promise.all([
        financeStore.fetchDashboardData(commonParams.period, commonParams.startDate, commonParams.endDate, commonParams.professionalId),
        financeStore.fetchTopClients({ ...commonParams, search: '' }),
        financeStore.fetchTopProcedures({ ...commonParams, search: '' })
    ])
}

watch(selectedProfessional, async () => {
    if (isHydratingFinanceFilters.value) return
    await refreshDashboard()
    await syncFinanceFiltersToQuery()
})

const handlePeriodChange = async (period) => {
  if (period === 'custom') {
    previousPeriod.value = selectedPeriod.value === 'custom' ? 'month' : selectedPeriod.value
    selectedPeriod.value = period
    customDateRange.value = null
    if (!isHydratingFinanceFilters.value) {
      await syncFinanceFiltersToQuery()
    }
    return
  }

  selectedPeriod.value = period
  await refreshDashboard()
  if (!isHydratingFinanceFilters.value) {
    await syncFinanceFiltersToQuery()
  }
}

const cancelCustomMode = () => {
    handlePeriodChange(previousPeriod.value)
}

const applyCustomFilter = async () => {
  if (!customStartDate.value || !customEndDate.value) return
  isLoadingCustom.value = true
  await refreshDashboard()
  await syncFinanceFiltersToQuery()
  isLoadingCustom.value = false
}

const isLoadingCustom = ref(false)

const handlePeriodChangeFromSheet = async (period) => {
  await handlePeriodChange(period)
}
</script>

<template>
  <div class="finance-dashboard">
    <!-- Header & Filters -->
    <FinanceDashboardFilters
      v-model:selectedPeriod="selectedPeriod"
      v-model:selectedProfessional="selectedProfessional"
      v-model:customStartDate="customStartDate"
      v-model:customEndDate="customEndDate"
      :doctorOptions="doctorOptions"
      :financeActiveFiltersCount="financeActiveFiltersCount"
      :isLoadingCustom="isLoadingCustom"
      :getPeriodDisplayLabel="getPeriodDisplayLabel"
      :getPeriodDateRange="getPeriodDateRange"
      :formatDateDisplay="formatDateDisplay"
      @periodChange="handlePeriodChangeFromSheet"
      @applyCustom="applyCustomFilter"
      @cancelCustom="cancelCustomMode"
    />

    <!-- Summary / KPIs -->
    <FinanceDashboardSummary />

    <!-- Charts -->
    <FinanceDashboardCharts
      :selectedPeriod="selectedPeriod"
    />

    <!-- Top Lists -->
    <div class="lists-grid">
      <FinanceTopClients
        :selectedPeriod="selectedPeriod"
        :selectedProfessional="selectedProfessional"
        :getCustomPeriodDates="getCustomPeriodDates"
      />
      
      <FinanceTopProcedures
        :selectedPeriod="selectedPeriod"
        :selectedProfessional="selectedProfessional"
        :getCustomPeriodDates="getCustomPeriodDates"
      />
    </div>
  </div>
</template>

<style scoped>
.finance-dashboard {
  font-family: var(--fonte-principal);
  color: var(--preto);
}

.lists-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1366px) {
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .finance-dashboard {
    padding: 0;
  }
}
</style>
