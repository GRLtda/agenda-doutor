<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import { MessageSquare, Clock, GitBranch, Zap, MoreHorizontal, CheckCircle, AlertCircle, Star } from 'lucide-vue-next'

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
      { id: 'true', label: 'Sim' },
      { id: 'false', label: 'Nao' }
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

const formattedLabel = computed(() => {
  if (props.data.label) return props.data.label
  
  const subtype = props.data.subtype || props.data.type
  
  // Mapeamento de subtypes para português
  const subtypeLabels = {
    'event_trigger': 'Gatilho de Evento',
    'send_message': 'Enviar Mensagem',
    'request_media': 'Pedir Foto',
    'wait_days': 'Aguardar',
    'wait_event': 'Esperar Evento',
    'condition_rules': 'Filtro',
    'restart_flow': 'Recomecar Fluxo',
    'restart_on_event': 'Reiniciar se acontecer',
    'end_flow': 'Finalizar',
    'create_appointment': 'Criar Agendamento',
    'update_patient': 'Atualizar Paciente',
    'check_variable': 'Verificar Condição',
    'procedure_completed': 'Procedimento Realizado'
  }
  
  if (subtypeLabels[subtype]) {
    return subtypeLabels[subtype]
  }
  
  // Fallback: formata o subtype para exibição
  return subtype
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

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
      'whatsapp_list_selected': 'Lista Selecionada'
    }
    return eventLabels[eventType] || eventType
  }

  if (props.data.subtype === 'wait_days') {
    const waitValue = config.days || config.hours || config.minutes
    if (!waitValue) return 'Configurar tempo de espera'
    
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
    return `${config.eventType || 'Evento'} por ${config.timeoutAmount || 3} ${config.timeoutUnit || 'days'}`
  }

  if (props.data.subtype === 'condition_rules') {
    return 'Caminhos Sim / Nao'
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
  <!-- Event Trigger: Circular Node -->
  <div 
    v-if="isEventTrigger"
    class="trigger-node"
    :class="{ 'selected': selected }"
  >
    <Handle type="target" :position="Position.Top" class="handle" />
    
    <div class="trigger-circle">
      <Star :size="28" fill="white" />
    </div>
    
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>

  <!-- Standard Rectangular Node -->
  <div 
    v-else
    class="workflow-node" 
    :class="[
      nodeColor, 
      { 'selected': selected }
    ]"
  >
    <!-- Handles for connections -->
    <Handle type="target" :position="Position.Top" class="handle" />
    
    <div class="node-body">
      <div class="node-icon-box" :class="`icon-${data.type}`">
        <component :is="iconComponent" :size="18" />
      </div>
      <div class="node-info">
        <div class="node-title">{{ formattedLabel }}</div>
        <div class="node-subtitle" v-if="details">{{ details }}</div>
      </div>
    </div>

    <template v-if="branchHandles.length">
      <div class="branch-handles">
        <div v-for="branch in branchHandles" :key="branch.id" class="branch-handle-wrap">
          <span>{{ branch.label }}</span>
          <Handle :id="branch.id" type="source" :position="Position.Bottom" class="handle branch-handle" />
        </div>
      </div>
    </template>
    <Handle v-else type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<style scoped>
/* Trigger Node - Circular */
.trigger-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

.trigger-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  transition: all 0.2s ease;
  cursor: pointer;
}

.trigger-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
}

.trigger-node.selected .trigger-circle {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* Standard Workflow Node */
.workflow-node {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-width: 180px;
  max-width: 220px;
  padding: 12px 14px;
  transition: all 0.2s ease;
  border: none;
}

.workflow-node:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.workflow-node.selected {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
}

.node-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.node-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

/* Icon colors by type */
.icon-action {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.icon-wait {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}

.icon-condition {
  background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
  color: white;
}

.icon-control {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.icon-event {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex-grow: 1;
}

.node-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
  line-height: 1.3;
}

.node-subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  line-height: 1.3;
}

/* Custom Handle Styles */
.handle {
  width: 10px;
  height: 10px;
  background: #9ca3af;
}

.handle:hover {
  background: var(--azul-principal);
  width: 12px;
  height: 12px;
}

.branch-handles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eef2f7;
}

.branch-handle-wrap {
  position: relative;
  min-height: 18px;
  text-align: center;
  font-size: 0.65rem;
  color: #6b7280;
}

.branch-handle {
  left: 50% !important;
  bottom: -14px !important;
}


.node-condition .node-icon {
  background-color: #f3e8ff;
  color: #9333ea;
}

</style>
