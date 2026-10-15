<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed, inject } from 'vue'
import { stepTitle } from '@/utils/workflowEditor'
import { MessageSquare, Clock, GitBranch, Zap, MoreHorizontal, CheckCircle, AlertCircle, Star, Plus } from 'lucide-vue-next'

// Check if node is event trigger type

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const simulation = inject('workflowSimulation', null)
const connections = inject('workflowConnections', null)
const requestNext = inject('workflowAddNext', null)
function hasConnection(handle = null) { return connections?.value?.some(edge => edge.source === props.id && (edge.sourceHandle || null) === handle) }
function addNext(handle = null) { requestNext?.(props.id, handle) }
const simulationError = computed(() => simulation?.value?.errors.has(props.id))
const simulationCurrent = computed(() => simulation?.value?.current === props.id)
const simulationReviewed = computed(() => simulation?.value?.reviewed.has(props.id))
const iconComponent = computed(() => {
  switch (props.data.type) {
    case 'event': return Zap
    case 'action': return MessageSquare
    case 'condition': return GitBranch
    case 'wait': return Clock
    case 'control': return MoreHorizontal
    default: return MessageSquare
  }
})

const nodeColor = computed(() => {
   switch (props.data.type) {
    case 'event': return 'node-event'
    case 'action': return 'node-action'
    case 'condition': return 'node-condition'
    case 'wait': return 'node-wait'
    case 'control': return 'node-control'
    default: return 'node-default'
  }
})

// Check if node is event trigger (renders as circular node)
const isEventTrigger = computed(() => props.data.subtype === 'event_trigger')
const branchHandles = computed(() => {
  if (props.data.subtype === 'condition_rules') {
    return [
      { id: 'true', label: 'Sim, atende' },
      { id: 'false', label: 'Não atende' }
    ]
  }

  if (props.data.subtype === 'wait_event') {
    return [
      { id: 'received', label: 'Chegou' },
      { id: 'timeout', label: 'Prazo acabou' }
    ]
  }

  return []
})

const formattedLabel = computed(() => stepTitle(props.data.subtype))
const familyLabel = computed(() => ({ event: 'Início', action: 'Ação', wait: 'Espera', condition: 'Condição', control: 'Controle' })[props.data.type] || 'Etapa')

const details = computed(() => {
  const config = props.data.config || {}
  
  if (props.data.subtype === 'event_trigger') {
    const eventType = config.eventType || 'Não configurado'
    const eventLabels = {
      'appointment_created': 'Agendamento Criado',
      'appointment_updated': 'Agendamento Atualizado',
      'appointment_completed': 'Agendamento Realizado',
      'appointment_canceled': 'Agendamento Cancelado',
      'appointment_confirmed': 'Agendamento Confirmado',
      'appointment_rescheduled': 'Agendamento Remarcado',
      'procedure_completed': 'Procedimento Realizado',
      'whatsapp_inbound': 'WhatsApp Recebido',
      'whatsapp_button_clicked': 'Botao Clicado',
      'whatsapp_list_selected': 'Lista Selecionada',
      'anamnesis_completed': 'Anamnese respondida',
      'consent_signed': 'Termo assinado',
      'manual_started': 'Início manual'
    }
    const event = eventLabels[eventType]
    if (!event) return 'Escolha o que inicia a jornada do paciente'
    const count = config.procedure_codes?.length || 0
    return `Começa quando: ${event.toLowerCase()}${eventType === 'procedure_completed' ? (count ? ` · ${count} procedimento(s)` : ' · qualquer procedimento') : ''}`
  }

  if (props.data.subtype === 'wait_days') {
    const waitValue = config.months || config.days || config.hours || config.minutes
    if (!waitValue) return 'Configurar tempo de espera'
    
    if (config.months) return `Aguardar ${config.months} mês(es)`
    if (config.days) {
      return `Aguardar ${config.days} dia(s)`
    }
    if (config.hours) {
      return `Aguardar ${config.hours} hora(s)`
    }
    if (config.minutes) {
      return `Aguardar ${config.minutes} minuto(s)`
    }
    return 'Configurar tempo de espera'
  }
  
  if (props.data.subtype === 'send_message') {
    if (config.templateId) {
      return 'Modelo selecionado'
    }
    return 'Selecionar modelo'
  }

  if (props.data.subtype === 'request_media') {
    return config.templateId ? 'Modelo selecionado' : 'Selecionar modelo'
  }

  if (props.data.subtype === 'wait_event') {
    if (config.eventType === 'whatsapp_button_clicked' && config.buttonId) {
      return `Botao: ${config.buttonId}`
    }
    if (config.eventType === 'whatsapp_list_selected' && config.rowId) {
      return `Opcao: ${config.rowId}`
    }
    if (config.eventType === 'whatsapp_inbound' && config.textContains) {
      return `Texto contem: ${config.textContains}`
    }
    return 'Continuar quando houver resposta ou o prazo acabar'
  }

  if (props.data.subtype === 'condition_rules') {
    return 'Escolha o caminho para cada resposta'
  }

  if (props.data.subtype === 'restart_flow') {
    return 'Reinicia a jornada'
  }

  if (props.data.subtype === 'restart_on_event') {
    return 'Interrompe se o evento acontecer'
  }

  if (props.data.subtype === 'end_flow') {
    return 'Encerra a execucao'
  }
  
  if (props.data.subtype === 'create_appointment') {
    return config.procedureId ? 'Configurado' : 'Configurar agendamento'
  }
  
  if (props.data.subtype === 'update_patient') {
    return config.field ? 'Configurado' : 'Configurar atualização'
  }
  
  if (props.data.subtype === 'check_variable') {
    return config.variable ? 'Configurado' : 'Configurar condição'
  }
  
  if (props.data.subtype === 'procedure_completed') {
    return config.procedure_code ? `Procedimento: ${config.procedure_code}` : 'Selecionar procedimento'
  }
  
  return props.data.description || ''
})
</script>

<template>
  <div class="workflow-node" :class="[nodeColor, { selected, 'simulation-error': simulationError, 'simulation-current': simulationCurrent, 'simulation-reviewed': simulationReviewed }]">
    <Handle v-if="!isEventTrigger" type="target" :position="Position.Top" class="handle" />
    <div class="node-heading"><span class="node-family"><component :is="iconComponent" :size="14" />{{ familyLabel }}</span><MoreHorizontal :size="15" class="node-menu-icon" aria-hidden="true" /></div>
    <div class="node-body"><div class="node-title">{{ formattedLabel }}</div><div v-if="details" class="node-subtitle">{{ details }}</div></div>
    <div v-if="branchHandles.length" class="branch-handles"><div v-for="branch in branchHandles" :key="branch.id" class="branch-handle-wrap"><span>{{ branch.label }}</span><Handle :id="branch.id" type="source" :position="Position.Bottom" class="handle branch-handle" /><div v-if="!hasConnection(branch.id)" class="next-step-stub branch-stub"><span></span><button class="nodrag nopan" :aria-label="`Adicionar etapa: ${branch.label}`" @pointerdown.stop @click.stop="addNext(branch.id)"><Plus :size="15" /></button></div></div></div>
    <div v-if="simulationError || simulationCurrent" class="node-simulation-status"><AlertCircle v-if="simulationError" :size="15" />{{ simulationError ? 'Precisa corrigir' : 'Verificando etapa…' }}</div>
    <div v-if="!branchHandles.length && data.subtype !== 'end_flow' && !hasConnection()" class="next-step-stub"><span></span><button class="nodrag nopan" aria-label="Adicionar próxima etapa" @pointerdown.stop @click.stop="addNext()"><Plus :size="15" /></button></div>
    <Handle v-if="!branchHandles.length && data.subtype !== 'end_flow'" type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>
<style scoped>
.workflow-node { position: relative; width: 248px; background: #fff; border: 1px solid #e2e7ee; border-radius: 12px; box-shadow: 0 2px 8px #0f172a08; cursor: pointer; overflow: visible; transition: border-color 150ms, box-shadow 150ms; }
.workflow-node:hover { border-color: #b8c9e8; box-shadow: 0 4px 14px #0f172a0d; }
.workflow-node.selected { border-color: var(--azul-principal, #0057ff); box-shadow: 0 0 0 3px #0057ff12; }
.node-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: 9px 12px; border-bottom: 1px solid #eef1f5; background: #f8fafc; border-radius: 12px 12px 0 0; }
.node-family { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; }
.node-event .node-family { color: #846821; }.node-action .node-family { color: #3568ad; }.node-condition .node-family { color: #776395; }.node-control .node-family { color: #547868; }
.node-menu-icon { color: #526176; }.node-body { padding: 12px; }.node-title { font-size: 16px; font-weight: 600; color: #111827; line-height: 1.4; }.node-subtitle { margin-top: 5px; font-size: 13px; color: #475569; line-height: 1.5; overflow-wrap: anywhere; }
.node-caption { padding: 0 12px 11px; font-size: 12px; color: #526176; }
.handle { width: 9px; height: 9px; border: 2px solid white; background: #526176; box-shadow: 0 0 0 1px #cbd5e1; }.handle:hover { background: var(--azul-principal); }
.branch-handles { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; border-top: 1px solid #eef1f5; padding: 8px 12px 10px; }.branch-handle-wrap { position: relative; text-align: center; font-size: 12px; color: #475569; }.branch-handle { left: 50% !important; bottom: -15px !important; }
@media(prefers-reduced-motion:reduce) { .workflow-node { transition: none; } }

.node-event { border-color: #ea8a22; }.node-event .node-heading { background: #fff3e3; }.node-event .node-family { color: #b45309; }
.node-action .node-heading { background: #eff6ff; }.node-action .node-family { color: #1d4ed8; }.node-condition .node-heading { background: #faf0ff; }.node-condition .node-family { color: #7e22ce; }
.node-wait .node-heading { background: #eef2ff; }.node-wait .node-family { color: #4338ca; }.node-control .node-heading { background: #ecfdf5; }.node-control .node-family { color: #047857; }
.branch-handle-wrap:first-child { color: #15803d; font-weight: 600; }.branch-handle-wrap:last-child { color: #b91c1c; font-weight: 600; }
.branch-handle-wrap:first-child .handle { background: #16a34a; }.branch-handle-wrap:last-child .handle { background: #e11d48; }

.workflow-node.simulation-reviewed { border-color: #16a34a; }.workflow-node.simulation-current { border-color: #2563eb; box-shadow: 0 0 0 4px #2563eb25; animation: verify-pulse 850ms ease-in-out infinite; }.workflow-node.simulation-error { border-color: #e11d48; box-shadow: 0 0 0 3px #e11d4818; }.workflow-node.simulation-error .node-heading { background: #fff1f2; }.workflow-node.simulation-error .node-family { color: #be123c; }.node-simulation-status { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; border-radius: 0 0 11px 11px; }.simulation-error .node-simulation-status { background: #fff1f2; color: #be123c; }
@keyframes verify-pulse { 50% { box-shadow: 0 0 0 7px #2563eb10; } }
@media(prefers-reduced-motion:reduce) { .workflow-node.simulation-current { animation: none; } }

.next-step-stub { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; color: #94a3b8; }.next-step-stub > span { height: 24px; border-left: 1px dashed #cbd5e1; }.next-step-stub button { display: flex; justify-content: center; align-items: center; width: 24px; height: 24px; background: #fff; border: 1px solid #cbd5e1; border-radius: 50%; color: #64748b; cursor: pointer; }.next-step-stub button:hover, .next-step-stub button:focus-visible { color: #0057ff; border-color: #0057ff; background: #eff6ff; outline: none; }.branch-stub { top: calc(100% + 10px); }
</style>
