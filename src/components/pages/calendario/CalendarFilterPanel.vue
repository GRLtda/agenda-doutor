<script setup>
import StyledSelect from '@/components/global/StyledSelect.vue'
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { useClinicStore } from '@/stores/clinic'

const props = defineProps({
    calendarView: {
        type: String,
        required: true
    },
    datePickerModel: {
        type: [Date, Array, Object],
        required: true
    },
    selectedDoctorId: {
        type: String,
        required: true
    },
    selectedStatuses: {
        type: Array,
        required: true
    },
    statusOptions: {
        type: Array,
        required: true
    },
    isMobile: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits([
    'update:calendarView',
    'update:datePickerModel',
    'update:selectedDoctorId',
    'update:selectedStatuses',
    'switchView',
    'selectDoctor',
    'toggleStatus'
])

const clinicStore = useClinicStore()

const filteredStaff = computed(() => {
    if (!clinicStore.currentClinic?.staff) return []
    return clinicStore.currentClinic.staff.filter(emp =>
        emp.role === 'medico' || emp.role === 'owner'
    )
})

const doctorOptions = computed(() => [
  { value: '', label: 'Todos os profissionais' },
  ...filteredStaff.value.map(staff => ({ value: String(staff._id), label: staff.name, image: staff.profilePhotoUrl })),
])

const localDatePickerModel = computed({
    get: () => props.datePickerModel,
    set: (val) => emit('update:datePickerModel', val)
})

function handleSelectDoctor(id) {
    emit('selectDoctor', filteredStaff.value.find(staff => String(staff._id) === id) || null)
}

function handleSwitchView(view) {
    emit('switchView', view)
}

function handleToggleStatus(status) {
    emit('toggleStatus', status)
}
</script>

<template>
    <div class="calendar-filter-content">
        <div class="sidebar-section">
            <h3 class="sidebar-title">Calendário</h3>
            <div class="view-switcher">
                <button
                    class="view-btn"
                    :class="{ 'active': calendarView === 'week' || calendarView === 'day' }"
                    @click="handleSwitchView(isMobile ? 'day' : 'week')"
                >
                    {{ isMobile ? 'Dia' : 'Semana' }}
                </button>
                <button
                    class="view-btn"
                    :class="{ 'active': calendarView === 'month' }"
                    @click="handleSwitchView('month')"
                >
                    Mês
                </button>
            </div>

            <!-- Date Picker Inline -->
             <div class="calendar-inline-container">
                 <VueDatePicker
                    :key="'dp-' + calendarView"
                    v-model="localDatePickerModel"
                    :enable-time-picker="false"
                    inline
                    auto-apply
                    locale="pt-BR"
                    :clearable="false"
                    :week-picker="calendarView === 'week'"
                    :month-picker="calendarView === 'month'"
                    :week-start="1"
                    menu-class-name="inline-calendar-custom"
                    calendar-class-name="inline-calendar-custom"
                />
             </div>
        </div>

        <div class="sidebar-section">
            <h3 class="sidebar-title">Profissionais</h3>
            <!-- ✨ Custom Select com Fotos -->
            <StyledSelect
              :model-value="selectedDoctorId || ''"
              :options="doctorOptions"
              placeholder="Todos os profissionais"
              @update:model-value="handleSelectDoctor"
            />
        </div>

        <div class="sidebar-section">
            <h3 class="sidebar-title">Status</h3>
            <div class="status-filters-list">
                <div
                    v-for="status in statusOptions"
                    :key="status.value"
                    class="status-checkbox-item"
                    @click="handleToggleStatus(status.value)"
                >
                    <div
                        class="custom-checkbox"
                        :class="{ 'is-checked': selectedStatuses.includes(status.value) }"
                    >
                        <Check v-if="selectedStatuses.includes(status.value)" :size="12" stroke-width="3" />
                    </div>
                    <span class="status-label">{{ status.label }}</span>
                    <span class="status-dot" :class="status.color.split(' ')[0]"></span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.calendar-filter-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280; /* Gray 500 */
  /* text-transform: uppercase; */
  letter-spacing: 0.05em;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

/* Custom Select New */

/* Custom Checkbox */
.custom-checkbox {
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    transition: all 0.2s;
    color: white;
}
.status-checkbox-item:hover .custom-checkbox {
    border-color: var(--azul-principal);
}
.custom-checkbox.is-checked {
    background-color: var(--azul-principal);
    border-color: var(--azul-principal);
}

/* Status List */
.status-filters-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.status-checkbox-item:hover {
  background-color: #f9fafb;
}

.status-label {
  flex: 1;
  font-size: 0.875rem;
  color: #4b5563;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Cores dos status no filtro */
.status-dot.bg-blue-100 { background-color: #3b82f6; } /* Agendado */
.status-dot.bg-yellow-100 { background-color: #eab308; } /* Confirmado */
.status-dot.bg-green-100 { background-color: #22c55e; } /* Realizado */
.status-dot.bg-red-100 { background-color: #ef4444; } /* Cancelado */
.status-dot.bg-purple-100 { background-color: #a855f7; } /* Em Atendimento */

/* View Switcher */
.view-switcher {
    display: flex;
    background-color: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.5rem;
    gap: 0.25rem;
}
.view-btn {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
}
.view-btn.active {
    background-color: #fff;
    color: var(--azul-principal);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    font-weight: 600;
}

/* DatePicker Inline Customization */
.calendar-inline-container {
    display: flex;
    justify-content: center;
    width: 100%;
}

:deep(.inline-calendar-custom) {
    border: none !important;
    box-shadow: none !important;
    font-family: var(--fonte-principal) !important;
}
:deep(.dp__calendar_header_item) {
    font-weight: 500;
    color: #6b7280;
}
:deep(.dp__range_end), :deep(.dp__range_start), :deep(.dp__active_date) {
    background-color: var(--azul-principal) !important;
}
:deep(.dp__today) {
    border: 1px solid var(--azul-principal) !important;
}
</style>
