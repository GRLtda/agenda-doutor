<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import { MessageSquare, Clock, GitBranch, Zap, MoreHorizontal, CheckCircle, AlertCircle } from 'lucide-vue-next'

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
    default: return MessageSquare
  }
})

const nodeColor = computed(() => {
   switch (props.data.type) {
    case 'event': return 'node-event'
    case 'action': return 'node-action'
    case 'condition': return 'node-condition'
    case 'wait': return 'node-wait'
    default: return 'node-default'
  }
})

const formattedLabel = computed(() => {
  if (props.data.label) return props.data.label
  
  const subtype = props.data.subtype || props.data.type
  
  // Handle generic event trigger label
  if (subtype === 'event_trigger') {
    return 'Gatilho de Evento'
  }

  // Format: procedure_completed -> Procedure Completed
  return subtype
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

const details = computed(() => {
  const config = props.data.config || {}
  
  if (props.data.subtype === 'event_trigger') {
    const eventType = config.eventType || 'Não configurado'
    // Map internal event types to user-friendly labels
    const eventLabels = {
      'appointment_created': 'Agendamento Criado',
      'appointment_updated': 'Agendamento Atualizado',
      'appointment_completed': 'Agendamento Realizado',
      'appointment_canceled': 'Agendamento Cancelado',
      'procedure_completed': 'Procedimento Realizado'
    }
    return eventLabels[eventType] || eventType
  }

  if (props.data.subtype === 'wait_days') {
    return `Aguardar ${config.days} dia(s)`
  }
  if (props.data.subtype === 'send_message') {
    return config.message ? `"${config.message}"` : 'Enviar mensagem'
  }
  if (props.data.subtype === 'procedure_completed') {
    return `Procedimento: ${config.procedure_code}`
  }
  return props.data.description || ''
})
</script>

<template>
  <div 
    class="workflow-node" 
    :class="[
      nodeColor, 
      { 'selected': selected }
    ]"
  >
    <!-- Handles for connections -->
    <Handle type="target" :position="Position.Top" class="handle" />
    
    <div class="node-header">
      <div class="node-icon">
        <component :is="iconComponent" :size="16" />
      </div>
      <div class="node-title">{{ formattedLabel }}</div>
      <!-- <button class="node-menu-btn">
        <MoreHorizontal :size="14" />
      </button> -->
    </div>
    
    <div class="node-content" v-if="details">
      {{ details }}
    </div>

    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<style scoped>
.workflow-node {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  width: 240px;
  padding: 12px;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb; /* Default border */
}

.workflow-node:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.workflow-node.selected {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: #f3f4f6;
  color: #4b5563;
}

.node-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #111827;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  border-radius: 4px;
}

.node-menu-btn:hover {
  background-color: #f3f4f6;
  color: #4b5563;
}

.node-content {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.4;
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

/* Node Color Variants */
.node-event {
  border-left: 4px solid #f59e0b; /* Amber 500 */
}
.node-event .node-icon {
  background-color: #fef3c7;
  color: #d97706;
}

.node-action {
  border-left: 4px solid #3b82f6; /* Blue 500 */
}
.node-action .node-icon {
  background-color: #dbeafe;
  color: #2563eb;
}

.node-wait {
  border-left: 4px solid #6b7280; /* Gray 500 */
}
.node-wait .node-icon {
  background-color: #f3f4f6;
  color: #4b5563;
}

.node-condition {
  border-left: 4px solid #a855f7; /* Purple 500 */
}
.node-condition .node-icon {
  background-color: #f3e8ff;
  color: #9333ea;
}

.node-default {
  border-left: 4px solid #d1d5db;
}
</style>
