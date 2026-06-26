<script setup>
import { ref } from 'vue'
import BottomSheet from '@/components/global/BottomSheet.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import {
  Filter,
  User,
  Calendar,
  CalendarDays,
  Hash,
  Clock,
  ArrowRight
} from 'lucide-vue-next'

const props = defineProps({
  selectedPeriod: {
    type: String,
    required: true
  },
  selectedProfessional: {
    type: String,
    default: ''
  },
  customStartDate: {
    type: Date,
    default: null
  },
  customEndDate: {
    type: Date,
    default: null
  },
  doctorOptions: {
    type: Array,
    default: () => []
  },
  financeActiveFiltersCount: {
    type: Number,
    default: 0
  },
  isLoadingCustom: {
    type: Boolean,
    default: false
  },
  getPeriodDisplayLabel: {
    type: Function,
    required: true
  },
  getPeriodDateRange: {
    type: Function,
    required: true
  },
  formatDateDisplay: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedPeriod',
  'update:selectedProfessional',
  'update:customStartDate',
  'update:customEndDate',
  'periodChange',
  'applyCustom',
  'cancelCustom'
])

const isMobileFiltersOpen = ref(false)

const periods = [
  { label: 'Hoje', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' },
  { label: 'Personalizado', value: 'custom' }
]

const periodIcons = {
  day: Clock,
  week: Calendar,
  month: CalendarDays,
  year: Hash,
  custom: CalendarDays
}

const getPeriodIcon = (value) => periodIcons[value] || Calendar

const updateProfessional = (val) => {
  emit('update:selectedProfessional', val)
}

const updateStartDate = (val) => {
  emit('update:customStartDate', val)
}

const updateEndDate = (val) => {
  emit('update:customEndDate', val)
}

const handlePeriodChangeFromSheet = (period) => {
  emit('periodChange', period)
  if (period !== 'custom') {
    isMobileFiltersOpen.value = false
  }
}

const applyCustomFilterFromSheet = () => {
  if (!props.customStartDate || !props.customEndDate) return
  emit('applyCustom')
  isMobileFiltersOpen.value = false
}

const cancelCustomMode = () => {
  emit('cancelCustom')
}
</script>

<template>
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Dashboard Financeiro</h1>
        <div class="subtitle-group">
            <p class="subtitle">Visão geral do desempenho da sua clínica.</p>
        </div>
      </div>

      <div class="header-right">
        <!-- Mobile Filter Action (Icon Only) -->
        <button class="unified-filter-trigger mobile-filter-btn" type="button" @click="isMobileFiltersOpen = true">
          <Filter :size="16" class="filter-icon" />
          <div v-if="financeActiveFiltersCount > 0" class="mobile-filter-count-badge">
            {{ financeActiveFiltersCount }}
          </div>
        </button>

        <!-- Desktop Filter Action (Period Label) -->
        <button class="unified-filter-trigger desktop-filter-btn" type="button" @click="isMobileFiltersOpen = true">
          <component :is="getPeriodIcon(selectedPeriod)" :size="16" class="filter-icon" />
          <span class="period-label flex flex-col items-start leading-tight">
            <span>{{ getPeriodDisplayLabel(selectedPeriod) }}</span>
            <span v-if="selectedPeriod !== 'custom'" class="font-normal text-slate-500" style="font-size: 0.65rem;">{{ getPeriodDateRange(selectedPeriod) }}</span>
          </span>
          <div v-if="financeActiveFiltersCount > 0" class="mobile-filter-count-badge">
            {{ financeActiveFiltersCount }}
          </div>
        </button>
      </div>
    </header>

    <BottomSheet
      v-if="isMobileFiltersOpen"
      class="finance-mobile-filters-sheet"
      title="Filtros do Dashboard"
      @close="isMobileFiltersOpen = false"
    >
      <template #header>
        <div class="mobile-sheet-header">
          <div class="mobile-sheet-header-icon">
            <Filter :size="16" />
          </div>
          <div class="mobile-sheet-header-text">
            <h3 class="mobile-sheet-title">Filtros do Dashboard</h3>
            <p class="mobile-sheet-subtitle">Ajuste medico e periodo para refinar os dados.</p>
          </div>
        </div>
      </template>

      <div class="mobile-filter-sheet">
        <div v-if="doctorOptions.length > 0" class="mobile-filter-section">
          <span class="mobile-filter-label">
            <User :size="14" />
            <span>Medico</span>
          </span>
          <div class="mobile-doctor-select">
            <StyledSelect
              :model-value="selectedProfessional"
              @update:model-value="updateProfessional"
              :options="doctorOptions"
              placeholder="Selecione o medico"
              dropdown-direction="up"
            />
          </div>
        </div>

        <div class="mobile-filter-section">
          <span class="mobile-filter-label">
            <Calendar :size="14" />
            <span>Periodo</span>
          </span>
          <div class="mobile-period-grid">
            <button
              v-for="period in periods"
              :key="`sheet-${period.value}`"
              class="mobile-period-btn"
              :class="{ 'active': selectedPeriod === period.value }"
              @click="handlePeriodChangeFromSheet(period.value)"
            >
              <component :is="getPeriodIcon(period.value)" :size="14" class="mobile-period-icon" />
              <span class="mobile-period-text">{{ period.label }}</span>
            </button>
          </div>
        </div>

        <Transition name="custom-period-transition">
          <div v-if="selectedPeriod === 'custom'" class="mobile-filter-section custom-period-section">
            <span class="mobile-filter-label">Periodo personalizado</span>

            <div class="mobile-date-trigger">
              <div class="mobile-date-input-group">
                <span class="mobile-date-input-label">Inicio</span>
                <VueDatePicker
                  :model-value="customStartDate"
                  @update:model-value="updateStartDate"
                  :enable-time-picker="false"
                  locale="pt-BR"
                  format="dd/MM/yyyy"
                  auto-apply
                  teleport="body"
                  :z-index="12000"
                  :clearable="false"
                  placeholder="DD/MM/AAAA"
                >
                  <template #trigger>
                    <button class="mobile-single-date-trigger" type="button">
                      <CalendarDays :size="14" />
                      <span>{{ customStartDate ? formatDateDisplay(customStartDate) : 'DD/MM/AAAA' }}</span>
                    </button>
                  </template>
                </VueDatePicker>
              </div>

              <ArrowRight :size="14" class="mobile-date-arrow" />

              <div class="mobile-date-input-group">
                <span class="mobile-date-input-label">Fim</span>
                <VueDatePicker
                  :model-value="customEndDate"
                  @update:model-value="updateEndDate"
                  :enable-time-picker="false"
                  locale="pt-BR"
                  format="dd/MM/yyyy"
                  auto-apply
                  teleport="body"
                  :z-index="12000"
                  :clearable="false"
                  placeholder="DD/MM/AAAA"
                >
                  <template #trigger>
                    <button class="mobile-single-date-trigger" type="button">
                      <CalendarDays :size="14" />
                      <span>{{ customEndDate ? formatDateDisplay(customEndDate) : 'DD/MM/AAAA' }}</span>
                    </button>
                  </template>
                </VueDatePicker>
              </div>
            </div>

            <div class="mobile-filter-actions">
              <button class="mobile-filter-secondary" type="button" @click="cancelCustomMode">Cancelar</button>
              <button
                class="mobile-filter-primary"
                type="button"
                @click="applyCustomFilterFromSheet"
                :disabled="!customStartDate || !customEndDate || isLoadingCustom"
              >
                <span v-if="isLoadingCustom">...</span>
                <span v-else>Aplicar</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </BottomSheet>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.subtitle-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-right {
    display: flex;
    align-items: center;
    min-height: 52px;
}

.unified-filter-trigger {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.7rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.unified-filter-trigger.desktop-filter-btn {
  display: flex;
}

.unified-filter-trigger.mobile-filter-btn {
  display: none;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.filter-icon {
  color: #64748b;
}

.unified-filter-trigger:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.period-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--preto);
}

.mobile-filter-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: var(--azul-principal);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--preto);
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 1rem;
}

/* Mobile Filters Sheet */
.mobile-sheet-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.mobile-sheet-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 0.55rem;
  background: #eff6ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-sheet-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.mobile-sheet-title {
  font-size: 0.98rem;
  font-weight: 500;
  color: #0f172a;
  margin: 0;
}

.mobile-sheet-subtitle {
  font-size: 0.76rem;
  font-weight: 400;
  color: #64748b;
  margin: 0;
}

.mobile-filter-sheet {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 42vh;
}

.mobile-filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.mobile-filter-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: none;
  color: #64748b;
}

.mobile-doctor-select {
  width: 100%;
  position: relative;
  z-index: 12020;
}

.mobile-doctor-select :deep(.options-list) {
  z-index: 12030 !important;
}

.mobile-period-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.mobile-period-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0.7rem;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 500;
  padding: 0.6rem 0.45rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-period-icon {
  flex-shrink: 0;
}

.mobile-period-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.1;
}

.mobile-period-btn.active {
  border-color: var(--azul-principal);
  background: #eff6ff;
  color: var(--azul-principal);
}

.custom-period-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.75rem;
  overflow: visible;
}

.mobile-date-trigger {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 0.45rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 0.7rem;
  min-height: 58px;
  padding: 0.5rem;
}

.mobile-date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-date-input-label {
  font-size: 0.68rem;
  font-weight: 500;
  color: #94a3b8;
  padding-left: 0.15rem;
}

.mobile-single-date-trigger {
  width: 100%;
  min-height: 33px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.55rem;
  background-color: #f8fafc;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 400;
  padding: 0.4rem 0.65rem;
}

.mobile-date-arrow {
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.mobile-filter-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.mobile-filter-secondary,
.mobile-filter-primary {
  flex: 1;
  min-height: 40px;
  border-radius: 0.65rem;
  font-size: 0.84rem;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
}

:deep(.sheet-title) {
  font-weight: 500;
}

:deep(.bottom-sheet-body) {
  overflow: visible;
}

.finance-mobile-filters-sheet :deep(.bottom-sheet-panel) {
  max-height: 90vh;
}

.mobile-filter-secondary {
  border-color: #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.mobile-filter-primary {
  background: var(--azul-principal);
  color: #ffffff;
}

.mobile-filter-primary:disabled {
  background-color: #cbd5e1;
  cursor: not-allowed;
}

.custom-period-transition-enter-active,
.custom-period-transition-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    margin-top 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    padding-top 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    padding-bottom 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    border-top-width 0.24s ease,
    border-bottom-width 0.24s ease;
  overflow: hidden;
  transform-origin: top center;
}

.custom-period-transition-enter-from,
.custom-period-transition-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-width: 0;
  border-bottom-width: 0;
}

.custom-period-transition-enter-to,
.custom-period-transition-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  max-height: 360px;
  margin-top: 0.1rem;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  border-top-width: 1px;
  border-bottom-width: 1px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: nowrap;
  }
  .header-text {
    width: auto;
    text-align: left;
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: 1.45rem;
    margin-bottom: 0.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .subtitle {
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .header-right {
    width: auto;
    justify-content: flex-end;
    min-height: 0;
    flex-shrink: 0;
  }
  .desktop-filter-btn {
    display: none !important;
  }
  .mobile-filter-btn {
    display: flex !important;
  }
  .mobile-filter-trigger {
    display: inline-flex;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 0.55rem;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 1.5rem;
  }
  .mobile-period-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mobile-period-btn {
    font-size: 0.8rem;
    padding: 0.56rem 0.4rem;
    gap: 0.28rem;
  }
  .mobile-period-icon {
    width: 13px;
    height: 13px;
  }
}
</style>
