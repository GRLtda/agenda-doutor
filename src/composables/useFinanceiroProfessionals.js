import { computed } from 'vue'
import { useClinicStore } from '@/stores/clinic'

export function useFinanceiroProfessionals() {
  const clinicStore = useClinicStore()
  const professionals = computed(() => {
    const clinic = clinicStore.currentClinic
    const users = [clinic?.owner, ...(clinic?.staff || [])]
    return users.filter((user, index) =>
      user?._id && ['owner', 'medico'].includes(user.role) &&
      users.findIndex((item) => item?._id === user._id) === index
    )
  })
  const professionalOptions = computed(() => [
    { value: '', label: 'Todos os profissionais' },
    ...professionals.value.map((user) => ({ value: user._id, label: user.name })),
  ])
  const showProfessionalFilter = computed(() => professionals.value.length > 1)
  return { professionalOptions, showProfessionalFilter }
}
