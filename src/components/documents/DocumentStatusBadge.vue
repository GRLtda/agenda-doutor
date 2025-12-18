<script setup>
import { computed } from 'vue'
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['draft', 'awaiting_signature', 'signed', 'signature_failed', 'cancelled'].includes(value)
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value)
  }
})

const statusConfig = computed(() => {
  const configs = {
    draft: {
      label: 'Rascunho',
      icon: FileText,
      bgColor: '#e0f2fe',
      textColor: '#0369a1',
      iconColor: '#0284c7'
    },
    awaiting_signature: {
      label: 'Aguardando Assinatura',
      icon: Clock,
      bgColor: '#fef3c7',
      textColor: '#92400e',
      iconColor: '#d97706'
    },
    signed: {
      label: 'Assinado',
      icon: CheckCircle,
      bgColor: '#dcfce7',
      textColor: '#166534',
      iconColor: '#16a34a'
    },
    signature_failed: {
      label: 'Falha na Assinatura',
      icon: AlertTriangle,
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      iconColor: '#dc2626'
    },
    cancelled: {
      label: 'Cancelado',
      icon: XCircle,
      bgColor: '#f3f4f6',
      textColor: '#4b5563',
      iconColor: '#6b7280'
    }
  }
  return configs[props.status] || configs.draft
})

const iconSize = computed(() => {
  const sizes = {
    small: 12,
    default: 14,
    large: 16
  }
  return sizes[props.size]
})
</script>

<template>
  <span 
    class="status-badge"
    :class="[`size-${size}`]"
    :style="{
      backgroundColor: statusConfig.bgColor,
      color: statusConfig.textColor
    }"
  >
    <component 
      :is="statusConfig.icon" 
      :size="iconSize" 
      :style="{ color: statusConfig.iconColor }"
    />
    {{ statusConfig.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-weight: 500;
  white-space: nowrap;
}

.size-small {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  gap: 0.25rem;
}

.size-default {
  font-size: 0.75rem;
}

.size-large {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}
</style>
