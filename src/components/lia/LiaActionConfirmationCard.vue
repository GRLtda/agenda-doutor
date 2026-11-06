<script setup>
import { CheckCircle2, XCircle, LoaderCircle } from 'lucide-vue-next'

const props = defineProps({ confirmation: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['confirm', 'cancel'])
const format = (value) => value && new Intl.DateTimeFormat('pt-BR', { timeZone: props.confirmation.timezone || 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const successLabel = { create_appointment: 'Agendamento confirmado', reschedule_appointment: 'Atendimento remarcado', cancel_appointment: 'Atendimento cancelado' }
const title = () => props.confirmation.title || ({ create_appointment: 'Novo agendamento', reschedule_appointment: 'Remarcar atendimento', cancel_appointment: 'Cancelar atendimento' }[props.confirmation.type])
</script>

<template>
  <section class="lia-action-card" :class="[confirmation.status, { destructive: confirmation.destructive }]">
    <template v-if="confirmation.status === 'pending'">
      <p class="eyebrow">{{ title() }}</p>
      <strong>{{ confirmation.patientName }}</strong>
      <template v-if="confirmation.type === 'reschedule_appointment'"><span>De: {{ format(confirmation.previousStartAt) }}</span><span>Para: {{ format(confirmation.startAt) }}</span></template>
      <span v-else>{{ format(confirmation.startAt) }}</span>
      <span>{{ confirmation.professionalName }}</span>
      <span>Fuso: {{ confirmation.timezone || 'America/Sao_Paulo' }}</span>
      <div class="actions"><button type="button" :disabled="disabled" :class="{ danger: confirmation.destructive }" @click="emit('confirm')">{{ confirmation.primaryActionLabel || 'Confirmar agendamento' }}</button><button type="button" :disabled="disabled" class="secondary" @click="emit('cancel')">{{ confirmation.type === 'cancel_appointment' ? 'Voltar' : 'Cancelar' }}</button></div>
    </template>
    <template v-else-if="confirmation.status === 'success'"><div class="result success"><CheckCircle2 :size="17" />{{ successLabel[confirmation.type] || 'Ação confirmada' }}</div><strong>{{ confirmation.patientName }}</strong><span>{{ format(confirmation.startAt) }}</span><span>{{ confirmation.professionalName }}</span></template>
    <template v-else-if="confirmation.status === 'processing'"><div class="result neutral" role="status"><LoaderCircle :size="17" />Ação em processamento. Aguarde a atualização.</div><div v-if="confirmation.recoverable" class="actions"><button type="button" :disabled="disabled" @click="emit('confirm')">Verificar e recuperar ação</button></div></template>
    <template v-else-if="confirmation.status === 'failed'"><div class="result neutral" role="alert"><XCircle :size="17" />Não foi possível concluir a ação.</div><span>{{ confirmation.errorMessage || 'Consulte novamente e solicite um novo card de confirmação.' }}</span></template>
    <template v-else><div class="result neutral"><XCircle :size="17" />Ação cancelada</div></template>
  </section>
</template>

<style scoped>
.lia-action-card{display:flex;flex-direction:column;gap:.3rem;margin-top:.72rem;padding:.8rem;border:1px solid #d8e0eb;border-radius:.7rem;color:#263247;background:#fff}.eyebrow{margin:0 0 .1rem;color:#2563eb;font-size:.68rem;font-weight:750;letter-spacing:.03em;text-transform:uppercase}.lia-action-card strong{font-size:.86rem}.lia-action-card span{color:#637089;font-size:.78rem}.actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.5rem}.actions button{border:0;border-radius:.5rem;padding:.48rem .6rem;color:#fff;background:#2563eb;font:inherit;font-size:.74rem;font-weight:650;cursor:pointer}.actions .danger{background:#c0392b}.actions .secondary{border:1px solid #cfd7e2;color:#536177;background:#fff}.actions button:disabled{opacity:.55}.result{display:flex;align-items:center;gap:.38rem;margin-bottom:.18rem;font-size:.8rem;font-weight:720}.success{border-color:#b9e3c8;background:#f6fcf8}.result.success{color:#16803d}.destructive .eyebrow{color:#b42318}.neutral{color:#687386}
</style>
