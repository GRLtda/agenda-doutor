<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { getAppointmentById } from '@/api/appointments'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
const props = defineProps({ appointmentId: { type: String, required: true } })
const emit = defineEmits(['close', 'changed'])
const event = ref(null), loading = ref(true), error = ref(''), editing = ref(false), initialData = ref(null)
let request = 0
async function load() {
  const current = ++request; loading.value = true; error.value = ''; event.value = null
  try {
    const { data } = await getAppointmentById(props.appointmentId)
    if (current !== request) return
    event.value = { originalEvent: data, start: data.startTime, end: data.endTime, title: data.patient?.name || 'Atendimento' }
  } catch { if (current === request) error.value = 'Não foi possível carregar o atendimento.' }
  finally { if (current === request) loading.value = false }
}
function edit(value) {
  const appointment = value?.originalEvent || value || event.value?.originalEvent
  if (!appointment) return
  initialData.value = { ...appointment, _mode: 'rebook' }; editing.value = true
}
function createReturn() {
  const appointment = event.value?.originalEvent
  if (!appointment) return
  initialData.value = { patient: appointment.patient, doctor: appointment.doctor, _mode: 'reschedule' }; editing.value = true
}
watch(() => props.appointmentId, load, { immediate: true })
onUnmounted(() => { request++ })
</script>
<template>
  <AppointmentDetailsModal v-if="!editing" :event="event" :loading="loading" :error="error" :total-count="1" @retry="load" @close="emit('close')" @edit="edit" @reschedule="edit()" @return="createReturn" />
  <CreateAppointmentModal v-else :initial-data="initialData" @close="emit('close')" @saved="emit('changed')" />
</template>
