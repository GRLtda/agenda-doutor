<script setup>
import { Pencil, Trash2, Play, Pause, CheckSquare } from 'lucide-vue-next'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
defineProps({ active:Boolean, selected:Boolean, disabled:Boolean })
defineEmits(['edit', 'delete', 'activate', 'deactivate', 'select'])
</script>
<template>
  <div @click.stop><AppDropdownActions :disabled="disabled"><template #default="{ close }">
    <button class="dropdown-item" :disabled="disabled" @click="close(); $emit('select')"><CheckSquare :size="14" />{{selected?'Desmarcar':'Selecionar'}}</button>
    <button v-if="active" class="dropdown-item" :disabled="disabled" @click="close(); $emit('deactivate')"><Pause :size="14" />Inativar</button>
    <button v-else class="dropdown-item" :disabled="disabled" @click="close(); $emit('activate')"><Play :size="14" />Ativar</button>
    <button class="dropdown-item" :disabled="disabled" @click="close(); $emit('edit')"><Pencil :size="14" />Editar</button>
    <button class="dropdown-item delete" :disabled="disabled" @click="close(); $emit('delete')"><Trash2 :size="14" />Excluir</button>
  </template></AppDropdownActions></div>
</template>
