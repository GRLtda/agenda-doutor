<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Zap, Clock, MessageSquare, CircleCheck, MoreHorizontal } from 'lucide-vue-next'
const props=defineProps({steps:{type:Array,default:()=>[]}})
const surface=ref(null), size=ref({width:340,height:190}), rootBox=ref(null)
let observer
const rootBottom=ref(84)
function measure() { if(!surface.value)return;size.value={width:surface.value.clientWidth,height:surface.value.clientHeight};rootBottom.value=20+(rootBox.value?.offsetHeight || 64) }
onMounted(()=>{observer=new ResizeObserver(measure);observer.observe(surface.value);if(rootBox.value)observer.observe(rootBox.value);measure()})
onUnmounted(()=>observer?.disconnect())
const linePath=computed(()=>{
 const w=size.value.width,c=w/2,l=w*.27-5,r=w*.73+5,b=rootBottom.value,m=(b+138)/2
 return `M${c} ${b} V${m-10} Q${c} ${m} ${c-10} ${m} H${l+10} Q${l} ${m} ${l} ${m+10} V138 M${c} ${m-10} Q${c} ${m} ${c+10} ${m} H${r-10} Q${r} ${m} ${r} ${m+10} V138 M${l} 202 V240 M${r} 202 V240`
})
const root=computed(()=>props.steps[0])
const children=computed(()=>[...props.steps.slice(1,3),...(props.steps.length===2?[{family:'control',label:'Encerrar'}]:[])])
const families={trigger:'Início',wait:'Espera',action:'Ação',control:'Controle'}
const icons={trigger:Zap,wait:Clock,action:MessageSquare,control:CircleCheck}
</script>
<template>
 <div class="catalog-tree" aria-label="Prévia ilustrativa das etapas">
  <div ref="surface" class="tree-surface" aria-hidden="true">
   <svg class="tree-lines" :viewBox="`0 0 ${size.width} 240`" preserveAspectRatio="none"><path :d="linePath" /></svg>
   <div v-if="root" ref="rootBox" class="tree-node tree-root trigger"><div class="mini-node-header"><span><Zap :size="11" />Início</span><MoreHorizontal :size="11" /></div><div class="mini-node-body">{{root.label}}</div><i></i></div>
   <div class="tree-children"><div v-for="(step,i) in children" :key="i" class="tree-node tree-child" :class="step.family"><div class="mini-node-header"><span><component :is="icons[step.family] || MessageSquare" :size="11" />{{families[step.family] || 'Ação'}}</span><MoreHorizontal :size="11" /></div><div class="mini-node-body">{{step.label}}</div><i></i></div></div>
  </div>
 </div>
</template>
<style scoped>
.catalog-tree {width:100%;margin-top:8px;}.tree-surface {height:190px;position:relative;background-color:#f8fafc;background-image:radial-gradient(circle at .5px .5px,#171717 .5px,transparent .6px);background-size:12px 12px;border:1px solid #e5e9ef;border-radius:10px;overflow:hidden;isolation:isolate;}.tree-surface::after {content:'';position:absolute;inset:auto 0 0;height:25px;background:linear-gradient(transparent,#f8fafc);z-index:3;pointer-events:none;}.tree-lines {position:absolute;inset:0;width:100%;height:240px;fill:none;stroke:#b8c1ce;stroke-width:1.25;}.tree-node {position:relative;--mini-color:#1d4ed8;--mini-bg:#eff6ff;background:white;border:1px solid #dce2ea;box-shadow:0 2px 5px #0f172a08;border-radius:8px;font-size:.65rem;line-height:1.4;color:#111827;min-height:64px;}.tree-node.trigger {--mini-color:#b45309;--mini-bg:#fff3e3;border-color:#ea8a22;}.tree-node.wait {--mini-color:#4338ca;--mini-bg:#eef2ff;}.tree-node.control {--mini-color:#047857;--mini-bg:#ecfdf5;}.mini-node-header {display:flex;align-items:center;justify-content:space-between;gap:4px;padding:5px 8px;color:var(--mini-color);background:var(--mini-bg);border-bottom:1px solid #eef1f5;border-radius:7px 7px 0 0;font-size:.6rem;font-weight:600;}.mini-node-header>span {display:flex;align-items:center;gap:4px;}.mini-node-header>svg {color:#94a3b8;}.mini-node-body {padding:8px;font-weight:600;overflow-wrap:anywhere;}.tree-root {position:absolute;left:50%;transform:translateX(-50%);top:20px;width:160px;}.tree-node i {position:absolute;bottom:-2.5px;left:50%;transform:translateX(-50%);width:5px;height:5px;border:1px solid #94a3b8;border-radius:50%;background:white;}.tree-children {position:absolute;top:138px;left:4%;right:4%;display:grid;grid-template-columns:1fr 1fr;gap:20px;}.tree-child {min-width:0;}.tree-child::before {content:'';position:absolute;top:-2.5px;left:50%;transform:translateX(-50%);width:5px;height:5px;border:1px solid #94a3b8;border-radius:50%;background:white;}
</style>
