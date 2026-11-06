<script setup>
import { computed, inject, ref, onUnmounted } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import { Plus } from 'lucide-vue-next'
const props=defineProps(['id','sourceX','sourceY','targetX','targetY','sourcePosition','targetPosition','markerEnd','style','label','selected'])
const insert=inject('workflowInsertEdge',null), menu=inject('workflowEdgeMenu',null)
const hovered=ref(false)
const geometry=computed(()=>getBezierPath(props))
let timer
function enter(){clearTimeout(timer);hovered.value=true}
function leave(){timer=setTimeout(()=>{hovered.value=false},120)}
onUnmounted(()=>clearTimeout(timer))
</script>
<template>
 <g @mouseenter="enter" @mouseleave="leave" @contextmenu.prevent.stop="menu?.(id,$event)">
  <BaseEdge :id="id" :path="geometry[0]" :marker-end="markerEnd" :style="{...style,stroke:hovered?'#0057ff':style?.stroke || '#94a3b8',strokeWidth:hovered?2:1.5}" :interaction-width="24" />
  <EdgeLabelRenderer><div class="workflow-edge-tools nodrag nopan" :style="{transform:`translate(-50%, -50%) translate(${geometry[1]}px, ${geometry[2]}px)`}" @mouseenter="enter" @mouseleave="leave" @contextmenu.prevent.stop="menu?.(id,$event)"><span v-if="label && !hovered" class="workflow-edge-label">{{label}}</span><button v-if="hovered || selected" class="insert-edge-button" aria-label="Inserir etapa nesta ligação" title="Inserir etapa nesta ligação" @pointerdown.stop @click.stop="insert?.(id)"><Plus :size="16" /></button></div></EdgeLabelRenderer>
 </g>
</template>
<style scoped>
.workflow-edge-tools {position:absolute;pointer-events:all;}.workflow-edge-label {display:block;background:#fff;padding:2px 5px;border-radius:4px;color:#526176;font-size:10px;}.insert-edge-button {display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#fff;color:#0057ff;border:1px solid #0057ff;box-shadow:0 2px 8px #0f172a12;cursor:pointer;}.insert-edge-button:hover,.insert-edge-button:focus-visible {background:#eff6ff;outline:2px solid #bfdbfe;}
</style>
