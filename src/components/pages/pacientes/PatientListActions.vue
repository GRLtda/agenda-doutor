<script setup>
import { Eye, Calendar, ClipboardPlus, Pencil, Trash2 } from 'lucide-vue-next'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
defineProps({ patient: { type: Object, required: true }, loading: Boolean })
const emit = defineEmits(['view-appointment', 'create-attendance', 'delete'])
</script>
<template>
  <div @click.stop>
    <AppDropdownActions menu-width="240px">
      <template #default="{ close }">
        <router-link :to="`/pacientes/${patient._id}`" class="dropdown-item" @click="close"><Eye :size="14" />Ver paciente</router-link>
        <button v-if="patient.nextAppointment" class="dropdown-item" :disabled="loading" @click="close(); emit('view-appointment')"><Calendar :size="14" />Ver agendamento</button>
        <button class="dropdown-item" @click="close(); emit('create-attendance')"><ClipboardPlus :size="14" />Criar atendimento</button>
        <router-link :to="`/pacientes/${patient._id}?edit=true`" class="dropdown-item" @click="close"><Pencil :size="14" />Editar paciente</router-link>
        <button class="dropdown-item delete" @click="close(); emit('delete')"><Trash2 :size="14" />Excluir paciente</button>
      </template>
    </AppDropdownActions>
  </div>
</template>
