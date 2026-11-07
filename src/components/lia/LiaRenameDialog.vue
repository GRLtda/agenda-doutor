<script setup>
import { ref } from 'vue'
import LiaModal from './LiaModal.vue'
import { useLiaStore } from '@/stores/lia'
const props = defineProps({ conversation: { type: Object, required: true } })
const emit = defineEmits(['close'])
const store = useLiaStore()
const title = ref(props.conversation.title || ''), saving = ref(false), error = ref('')
async function save() {
  if (saving.value || !title.value.trim()) return
  saving.value = true; error.value = ''
  try { await store.updateConversation(props.conversation.id, { title: title.value.trim() }); emit('close') }
  catch { error.value = 'Não foi possível renomear a conversa. Tente novamente.' }
  finally { saving.value = false }
}
</script>
<template><LiaModal title="Renomear conversa" :busy="saving" @close="emit('close')"><form @submit.prevent="save"><h2>Renomear conversa</h2><label>Novo título<input v-model="title" autofocus required maxlength="120" :disabled="saving" aria-label="Novo título" /></label><p v-if="error" role="alert">{{ error }}</p><footer><button type="button" :disabled="saving" @click="emit('close')">Cancelar</button><button type="submit" :disabled="saving || !title.trim()">{{ saving ? 'Salvando…' : 'Salvar' }}</button></footer></form></LiaModal></template>
<style scoped>
h2 { margin: 0 0 22px; font-size: 18px; font-weight: 550; }label { display: grid; gap: 9px; color: var(--lia-muted); font-size: 12px; }input { box-sizing: border-box; width: 100%; padding: 11px 12px; border: 1px solid var(--lia-line); border-radius: 10px; color: var(--lia-text); background: var(--lia-bg); font: inherit; font-size: 14px; }p { color: #c43d51; font-size: 12px; }footer { display: flex; justify-content: flex-end; gap: 9px; margin-top: 24px; }button { padding: 9px 14px; border: 1px solid var(--lia-line); border-radius: 9px; background: var(--lia-bg); color: var(--lia-text); font: inherit; font-size: 12px; cursor: pointer; }button[type=submit] { background: var(--lia-blue); border-color: var(--lia-blue); color: white; }button:disabled { opacity: .5; cursor: default; }button:focus-visible,input:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }@media(max-width:760px) { input { font-size: 16px; } }
</style>
