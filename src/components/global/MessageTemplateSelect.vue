<script setup>
import { computed, markRaw, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessageSquare, Plus } from 'lucide-vue-next'
import StyledSelect from './StyledSelect.vue'
defineOptions({ inheritAttrs: false })
const props=defineProps({modelValue:[String,Number],options:{type:Array,default:()=>[]},disabled:Boolean})
const emit=defineEmits(['update:modelValue','create'])
const router=useRouter(), navigating=ref(false)
const decoratedOptions=computed(()=>props.options.map(option=>({...option,icon:option.icon || markRaw(MessageSquare)})))
const selectedHasIcon=computed(()=>decoratedOptions.value.some(option=>option.value===props.modelValue))
async function createModel(){if(navigating.value || props.disabled)return;navigating.value=true;emit('create');try{await router.push({name:'marketing-modelos',query:{novo:'1'}})}finally{navigating.value=false}}
</script>
<template>
 <StyledSelect v-bind="$attrs" :dropdown-min-width="400" :model-value="modelValue" :options="decoratedOptions" :inert="disabled" @update:model-value="emit('update:modelValue',$event)">
  <template #prefix><MessageSquare v-if="!selectedHasIcon" :size="16" class="message-placeholder-icon" /></template>
  <template #footer><button type="button" class="create-message-template" :disabled="disabled || navigating" @mousedown.prevent @click="createModel"><Plus :size="16" />Criar novo modelo</button></template>
 </StyledSelect>
</template>
<style scoped>
.message-placeholder-icon{flex-shrink:0;color:#64748b;}.create-message-template{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.75rem 1rem;border:1px solid #cbd5e1;border-radius:.75rem;background:#f8fafc;color:var(--azul-principal);font-size:.8rem;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s;}.create-message-template:hover,.create-message-template:focus-visible{background:#eff6ff;border-color:var(--azul-principal);outline:none;}.create-message-template:disabled{opacity:.5;cursor:default;}
</style>
