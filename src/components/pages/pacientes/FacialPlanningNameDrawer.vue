<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { FilePenLine } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const emit = defineEmits(['close', 'confirm'])

const title = ref('Planejamento Facial')
const titleInput = ref(null)

function confirm() {
  const value = title.value.trim()
  if (!value) return
  emit('confirm', value)
}

onMounted(() => {
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
})
</script>

<template>
  <SideDrawer size="sm" @close="emit('close')">
    <template #header>
      <div class="drawer-header">
        <span class="header-icon"><FilePenLine :size="20" /></span>
        <div>
          <h2>Novo planejamento facial</h2>
          <p>Defina um nome para identificar este planejamento.</p>
        </div>
      </div>
    </template>

    <form class="planning-name-form" @submit.prevent="confirm">
      <label for="facial-planning-title">Nome do planejamento</label>
      <input
        id="facial-planning-title"
        ref="titleInput"
        v-model="title"
        type="text"
        maxlength="120"
        autocomplete="off"
        placeholder="Ex.: Planejamento facial inicial"
      />
      <p>Pressione Enter para criar e salvar o rascunho.</p>
      <button type="submit" class="submit-on-enter" tabindex="-1" aria-hidden="true"></button>
    </form>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="outline" @click="emit('close')">Cancelar</AppButton>
        <AppButton variant="primary" :disabled="!title.trim()" @click="confirm"
          >Criar planejamento</AppButton
        >
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5eaf2;
}

.header-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #eaf1ff;
  color: #1d5eff;
}

.drawer-header h2,
.drawer-header p {
  margin: 0;
}

.drawer-header h2 {
  color: #17213b;
  font-size: 1rem;
}

.drawer-header p,
.planning-name-form p {
  color: #71809a;
  font-size: 0.8rem;
}

.drawer-header p {
  margin-top: 3px;
}

.planning-name-form {
  display: grid;
  gap: 8px;
}

.planning-name-form label {
  color: #34425d;
  font-size: 0.82rem;
  font-weight: 600;
}

.planning-name-form input {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #ccd7e7;
  border-radius: 7px;
  color: #1d2944;
  font: inherit;
  outline: none;
  box-sizing: border-box;
}

.planning-name-form input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.planning-name-form p {
  margin: 0;
}

.submit-on-enter {
  display: none;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid #e5eaf2;
}
</style>
