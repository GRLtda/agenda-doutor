import { ref, computed } from 'vue'
import {
    startOfWeek,
    endOfWeek,
    startOfDay,
    endOfDay,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
    format,
    isSameDay,
    isToday,
    eachDayOfInterval
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type ViewMode = 'day' | 'week' | 'work_week'

export function useSchedulerDates(initialDate: Date = new Date()) {
    const selectedDate = ref<Date>(initialDate)
    const viewMode = ref<ViewMode>('week')

    // --- Computeds ---

    const currentPeriodStart = computed(() => {
        if (viewMode.value === 'day') {
            return startOfDay(selectedDate.value)
        }
        return startOfWeek(selectedDate.value, { weekStartsOn: 1 }) // Monday start
    })

    const currentPeriodEnd = computed(() => {
        if (viewMode.value === 'day') {
            return endOfDay(selectedDate.value)
        }
        return endOfWeek(currentPeriodStart.value, { weekStartsOn: 1 })
    })

    const visibleDays = computed(() => {
        return eachDayOfInterval({
            start: currentPeriodStart.value,
            end: currentPeriodEnd.value
        })
    })

    const formattedHeader = computed(() => {
        if (viewMode.value === 'day') {
            return format(selectedDate.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        }

        const start = currentPeriodStart.value
        const end = currentPeriodEnd.value
        const startMonth = format(start, 'MMMM', { locale: ptBR })
        const endMonth = format(end, 'MMMM', { locale: ptBR })
        const year = format(start, 'yyyy')

        if (startMonth === endMonth) {
            return `${format(start, 'dd')} - ${format(end, 'dd')} de ${startMonth} de ${year}`
        }
        return `${format(start, "dd 'de' MMMM")} - ${format(end, "dd 'de' MMMM 'de' yyyy")}`
    })

    // --- Actions ---

    const navigate = (direction: 'prev' | 'next') => {
        const step = direction === 'next' ? 1 : -1

        if (viewMode.value === 'day') {
            selectedDate.value = addDays(selectedDate.value, step)
        } else {
            selectedDate.value = addWeeks(selectedDate.value, step)
        }
    }

    const goToToday = () => {
        selectedDate.value = new Date()
    }

    const setViewMode = (mode: ViewMode) => {
        viewMode.value = mode
    }

    const setDate = (date: Date) => {
        selectedDate.value = date
    }

    return {
        selectedDate,
        viewMode,
        currentPeriodStart,
        currentPeriodEnd,
        visibleDays,
        formattedHeader,
        navigate,
        goToToday,
        setViewMode,
        setDate,
        isToday: (date: Date) => isToday(date),
        isSameDay: (d1: Date, d2: Date) => isSameDay(d1, d2)
    }
}
