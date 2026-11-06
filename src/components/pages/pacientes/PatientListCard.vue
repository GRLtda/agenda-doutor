<script setup>
import { Calendar } from 'lucide-vue-next'
import { Checkbox } from '@/components/ui/checkbox'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import PatientListActions from './PatientListActions.vue'
defineProps({ patient: { type: Object, required: true }, selected: Boolean, loading: Boolean,
  showProfessional: Boolean, initial: Function, hasPhoto: Function, formatDate: Function })
defineEmits(['select', 'view-appointment', 'create-attendance', 'delete', 'photo-error'])
</script>
<template>
  <article class="patient-card" :class="{ selected }">
    <div class="card-header">
      <Checkbox :model-value="selected" :aria-label="`Selecionar ${patient.name}`" @update:model-value="$emit('select', $event === true)" />
      <div class="avatar"><img v-if="hasPhoto(patient.photoUrl)" :src="patient.photoUrl" alt="" @error="$emit('photo-error', patient.photoUrl)" /><span v-else>{{ initial(patient.name) }}</span></div>
      <div class="identity"><router-link :to="`/pacientes/${patient._id}`">{{ patient.name }}</router-link><span :title="patient.email">{{ patient.email || 'Sem e-mail' }}</span></div>
      <PatientListActions :patient="patient" :loading="loading" @view-appointment="$emit('view-appointment')" @create-attendance="$emit('create-attendance')" @delete="$emit('delete')" />
    </div>
    <div class="contact"><PatientPhoneDisplay v-if="patient.phone" :phone="patient.phone" :country-code="patient.countryCode" /><span v-else>Sem contato</span></div>
    <div class="card-dates">
      <div><span class="label">Último atendimento</span><span>{{ patient.lastAppointment ? formatDate(patient.lastAppointment.startTime) : 'Sem atendimento' }}</span></div>
      <div><span class="label">Próximo agendamento</span><button v-if="patient.nextAppointment" class="appointment-link" :disabled="loading" @click="$emit('view-appointment')"><Calendar :size="15" /><span>{{ formatDate(patient.nextAppointment.startTime) }} · {{ formatDate(patient.nextAppointment.startTime, true) }}</span></button><span v-else>Sem agendamento</span></div>
    </div>
    <div v-if="showProfessional" class="professional"><template v-if="patient.professional"><div class="avatar small"><img v-if="hasPhoto(patient.professional.photoUrl)" :src="patient.professional.photoUrl" alt="" @error="$emit('photo-error', patient.professional.photoUrl)" /><span v-else>{{ initial(patient.professional.name) }}</span></div>{{ patient.professional.name }}</template><span v-else>Sem profissional</span></div>
  </article>
</template>
<style scoped>
.patient-card { flex-shrink: 0; padding: .875rem; border: 1px solid #e5e7eb; border-radius: 12px; background: var(--branco, #fff); font-size: .8125rem; transition: background-color 150ms, border-color 150ms; }
.patient-card.selected { border-color: var(--azul-principal, #0057ff); background: #edf3ff; }
.card-header { display: flex; align-items: center; gap: .625rem; }
.identity { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: .25rem; }
.identity a { font-weight: 600; color: var(--preto); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.identity > span { color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem; }
.avatar { width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #eef2ff; color: var(--azul-principal); font-weight: 600; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.small { width: 26px; height: 26px; font-size: .7rem; }
.contact { margin: .875rem 0; color: #64748b; }
.card-dates { display: grid; gap: .75rem; border-top: 1px solid #eef0f3; padding-top: .75rem; }
.card-dates > div { display: flex; flex-direction: column; gap: .25rem; }
.label { color: #64748b; font-size: .7rem; }
.appointment-link { display: inline-flex; align-items: center; gap: .5rem; text-align: left; color: var(--azul-principal); background: transparent; border: 1px solid transparent; border-radius: 8px; padding: .5rem; margin-left: -.5rem; cursor: pointer; transition: background-color 150ms, border-color 150ms; }
.appointment-link:hover, .appointment-link:focus-visible { background: #edf3ff; border-color: #dce6fa; }
.appointment-link:disabled { opacity: .5; }
.professional { display: flex; align-items: center; gap: .5rem; margin-top: .875rem; color: #64748b; }
@media (prefers-reduced-motion: reduce) { .patient-card { transition: none; } }
</style>
