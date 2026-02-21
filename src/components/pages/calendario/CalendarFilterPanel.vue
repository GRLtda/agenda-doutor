<script setup>
import { ref, computed } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'
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
const isDoctorSelectOpen = ref(false)

const filteredStaff = computed(() => {
    if (!clinicStore.currentClinic?.staff) return []
    return clinicStore.currentClinic.staff.filter(emp => 
        emp.role === 'medico' || emp.role === 'owner'
    )
})

const selectedDoctor = computed(() => {
    if (!props.selectedDoctorId || !filteredStaff.value) return null
    return filteredStaff.value.find(s => String(s._id) === String(props.selectedDoctorId))
})

const localDatePickerModel = computed({
    get: () => props.datePickerModel,
    set: (val) => emit('update:datePickerModel', val)
})

function handleSelectDoctor(doc) {
    emit('selectDoctor', doc)
    isDoctorSelectOpen.value = false
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
            <div class="relative">
                <button 
                    @click="isDoctorSelectOpen = !isDoctorSelectOpen"
                    class="custom-select-trigger"
                    :class="{ 'is-open': isDoctorSelectOpen }"
                >
                    <div class="selected-value">
                        <template v-if="selectedDoctor">
                            <div class="doc-avatar-option">
                                <img 
                                    v-if="selectedDoctor.profilePhotoUrl" 
                                    :src="selectedDoctor.profilePhotoUrl" 
                                    class="doc-img"
                                />
                                <div v-else class="doc-initial">
                                    {{ selectedDoctor.name.charAt(0) }}
                                </div>
                                <span class="truncate">{{ selectedDoctor.name }}</span>
                            </div>
                        </template>
                        <span v-else class="text-gray-500">Todos os profissionais</span>
                    </div>
                    <ChevronDown :size="16" class="text-gray-400" />
                </button>

                <div v-if="isDoctorSelectOpen" class="custom-select-dropdown">
                    <div 
                        class="select-option" 
                        @click="handleSelectDoctor(null)"
                        :class="{ 'selected': !selectedDoctorId }"
                    >
                        <span>Todos os profissionais</span>
                        <Check v-if="!selectedDoctorId" :size="16" class="check-icon" />
                    </div>
                    
                    <div 
                        v-for="emp in filteredStaff" 
                        :key="emp._id" 
                        class="select-option"
                        @click="handleSelectDoctor(emp)"
                        :class="{ 'selected': String(selectedDoctorId) === String(emp._id) }"
                    >
                         <div class="doc-avatar-option">
                            <img 
                                v-if="emp.profilePhotoUrl" 
                                :src="emp.profilePhotoUrl" 
                                class="doc-img"
                            />
                            <div v-else class="doc-initial bg-blue-100 text-blue-600">
                                {{ emp.name.charAt(0).toUpperCase() }}
                            </div>
                            <span class="truncate">{{ emp.name }}</span>
                        </div>
                        <Check v-if="String(selectedDoctorId) === String(emp._id)" :size="16" class="check-icon" />
                    </div>
                </div>
                
                <!-- Backdrop transparente para fechar ao clicar fora (simples) -->
                <div 
                    v-if="isDoctorSelectOpen" 
                    class="fixed inset-0 z-10" 
                    @click="isDoctorSelectOpen = false"
                ></div>
            </div>
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

/* Custom Select New */
.custom-select-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    background-color: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    z-index: 20; /* Above backdrop */
}
.custom-select-trigger:hover {
    border-color: #9ca3af;
}
.custom-select-trigger.is-open {
    border-color: var(--azul-principal);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.selected-value {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;
}

.custom-select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 30; /* Above trigger */
    max-height: 240px;
    overflow-y: auto;
    padding: 0.25rem;
}

.select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background 0.2s;
    font-size: 0.875rem;
    color: #374151;
}
.select-option:hover {
    background-color: #f3f4f6;
}
.select-option.selected {
    background-color: #eff6ff;
    color: var(--azul-principal);
    font-weight: 500;
}

.doc-avatar-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    overflow: hidden;
}
.doc-img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    background-color: #e5e7eb;
    border: 1px solid #e5e7eb;
}
.doc-initial {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #e0e7ff;
    color: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
}
.check-icon {
    color: var(--azul-principal);
    margin-left: 0.5rem;
}

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
