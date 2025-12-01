<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Menu, User, Calendar, Settings, LoaderCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

import { useAppointmentsStore } from '@/stores/appointments'
import { usePatientsStore } from '@/stores/patients'
import { useRecordsStore } from '@/stores/records'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useEmployeesStore } from '@/stores/employees'
import { useDashboardStore } from '@/stores/dashboard'

defineProps({
  isSidebarCollapsed: {
    type: Boolean,
    default: false
  }
})

// Emite eventos para o DefaultLayout.vue
const emit = defineEmits(['toggle-sidebar', 'open-schedule-modal', 'toggle-collapse'])
const router = useRouter()

const searchQuery = ref('')
const isSearchFocused = ref(false)

const appointmentsStore = useAppointmentsStore()
const patientsStore = usePatientsStore()
const recordsStore = useRecordsStore()
const anamnesisStore = useAnamnesisStore()
const employeesStore = useEmployeesStore()
const dashboardStore = useDashboardStore()

const isGlobalLoading = computed(() => {
  return appointmentsStore.isLoading ||
         patientsStore.isLoading ||
         recordsStore.isLoading ||
         anamnesisStore.isLoading ||
         employeesStore.isLoading ||
         dashboardStore.isLoading;
})

const allShortcuts = ref([
  { name: 'Agendar Atendimento', icon: Calendar, action: () => emit('open-schedule-modal') },
  { name: 'Adicionar Paciente', icon: User, path: '/app/pacientes/novo' },
  { name: 'Ver Pacientes', icon: User, path: '/app/pacientes' },
  { name: 'Configurações', icon: Settings, path: '/app/configuracoes' },
])

const filteredShortcuts = computed(() => {
  if (!searchQuery.value) {
    return allShortcuts.value
  }
  return allShortcuts.value.filter(s =>
    s.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

function executeShortcut(shortcut) {
  isSearchFocused.value = false
  searchQuery.value = ''
  if (shortcut.action) {
    shortcut.action()
  } else if (shortcut.path) {
    router.push(shortcut.path)
  }
}

function handleSearchSubmit() {
  if (filteredShortcuts.value.length === 1) {
    executeShortcut(filteredShortcuts.value[0])
  }
  isSearchFocused.value = false
}
</script>

<template>
  <header class="top-bar">
    <div class="top-bar-left">
      <button @click="$emit('toggle-sidebar')" class="hamburger-button">
        <Menu :size="24" />
      </button>
      <button @click="$emit('toggle-collapse')" class="collapse-button">
        <PanelLeftClose v-if="!isSidebarCollapsed" :size="20" />
        <PanelLeftOpen v-else :size="20" />
      </button>
    </div>

    <div class="top-bar-center">
      <div class="search-container" v-click-outside="() => isSearchFocused = false">
        <div class="search-wrapper">
          <Search :size="18" class="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar..."
            v-model="searchQuery"
            @focus="isSearchFocused = true"
            @keydown.enter.prevent="handleSearchSubmit"
            class="search-input"
            :class="{ 'is-focused': isSearchFocused || searchQuery }"
          />
        </div>

        <Transition name="fade">
          <div v-if="isSearchFocused" class="shortcuts-dropdown">
            <div class="dropdown-header">Atalhos Rápidos</div>
            <ul v-if="filteredShortcuts.length > 0">
              <li
                v-for="shortcut in filteredShortcuts"
                :key="shortcut.name"
                @click="executeShortcut(shortcut)"
                class="shortcut-item"
              >
                <component :is="shortcut.icon" :size="16" />
                <span>{{ shortcut.name }}</span>
              </li>
            </ul>
            <div v-else class="no-results">
              Nenhum atalho encontrado para "{{ searchQuery }}"
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class="top-bar-right">
      <Transition name="fade-fast">
        <div v-if="isGlobalLoading" class="global-loading-indicator" title="Carregando...">
          <LoaderCircle :size="18" class="animate-spin" />
        </div>
      </Transition>

      <AppButton variant="primary" @click="$emit('open-schedule-modal')">
        <Plus :size="16" />
        Agendar Atendimento
      </AppButton>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 64px;
  padding: 0 1rem;
  background-color: #fafbfc; /* Mesma cor da sidebar */
  gap: 1rem;
  border-top-right-radius: 1rem; /* Border radius no canto superior direito */
}

.top-bar-left {
  display: flex;
  justify-content: flex-start;
}
.top-bar-center {
  display: flex;
  justify-content: center;
}
.top-bar-right {
  display: flex;
  justify-content: flex-end;
  /* ✨ Adicionado gap para o loading */
  gap: 1rem;
  align-items: center;
}

.hamburger-button {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: -0.5rem;
  color: var(--preto);
}

.collapse-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: -0.5rem;
  color: var(--cinza-texto);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.collapse-button:hover {
  background-color: #f3f4f6;
  color: var(--preto);
}

/* --- Barra de Pesquisa Minimalista --- */
.search-container {
  position: relative;
  width: 100%;
  max-width: 450px;
}
.search-wrapper {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--cinza-texto);
  pointer-events: none;
  transition: color 0.2s ease;
}
.search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 40px;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--preto);
  border: 1px solid transparent;
  background-color: #f9fafb;
  border-color: #f3f4f6;
  transition: all 0.2s ease;
}
.search-input::placeholder {
  color: var(--cinza-texto);
}
.search-input:hover:not(:focus) {
  background-color: #f3f4f6;
  border-color: #f3f4f6;
}
.search-input:focus,
.search-input.is-focused {
  outline: none;
  background-color: var(--branco);
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.search-input:focus ~ .search-icon {
  color: var(--azul-principal);
}

/* --- Dropdown de Atalhos --- */
.shortcuts-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 100;
  padding: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}
.dropdown-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cinza-texto);
  text-transform: uppercase;
}
.shortcuts-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}
.shortcut-item:hover {
  background-color: #f3f4f6;
}
.shortcut-item svg {
  color: var(--cinza-texto);
}
.no-results {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

/* ✨ 6. Estilos para o Loading Global */
.global-loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Animação para o loading */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
/* --- Fim dos Estilos de Loading --- */

/* --- Responsividade --- */
@media (max-width: 1024px) {
  .hamburger-button {
    display: block;
  }
  .collapse-button {
    display: none;
  }
  .top-bar-center {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .top-bar {
    padding: 0 1rem;
    grid-template-columns: auto 1fr auto;
    gap: 0.75rem;
  }
  .search-container {
    max-width: none;
  }
  .search-input {
    height: 38px;
    font-size: 0.875rem;
    background-color: #f3f4f6;
    border-color: #f3f4f6;
  }
  .search-input:focus {
     background-color: var(--branco);
     border-color: var(--azul-principal);
     box-shadow: 0 0 0 2px var(--azul-principal);
  }

  /* ✨ Garante que o loading não tenha texto no mobile */
  .global-loading-indicator span {
    display: none;
  }
}

/* Animação do Dropdown */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
