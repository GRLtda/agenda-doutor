<script setup>
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { unsupportedMessageVariables } from '@/utils/workflowMessageVariables'
const props = defineProps({ template: Object, events: { type: Array, default: () => [] }, support: Object })
const unavailable = computed(() => unsupportedMessageVariables(props.template, props.events, props.support))
</script>
<template>
  <div v-if="unavailable.length" class="variable-warning" role="status">
    <AlertTriangle :size="18" aria-hidden="true" />
    <div><strong>Revise as variáveis deste modelo</strong>
      <p>Estas variáveis não têm preenchimento garantido neste tipo de início:
        <span v-for="(variable, index) in unavailable" :key="variable"><code>{{ '{' + variable + '}' }}</code>{{ index < unavailable.length - 1 ? ', ' : '.' }}</span>
      </p>
      <p>Se estiverem sem dados no envio, serão substituídas por texto vazio e não aparecerão na mensagem. Os demais trechos serão enviados normalmente.</p>
    </div>
  </div>
</template>
<style scoped>
.variable-warning{display:flex;align-items:flex-start;gap:10px;margin-top:12px;padding:12px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:.75rem;line-height:1.6;overflow-wrap:anywhere}.variable-warning>svg{flex-shrink:0;margin-top:2px}.variable-warning strong{font-weight:600}.variable-warning p{margin-top:5px}.variable-warning code{font:inherit;font-weight:600}
</style>
