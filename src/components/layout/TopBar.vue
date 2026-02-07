<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Menu, User, Settings, LoaderCircle, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, UserPlus, CalendarPlus, CalendarOff, X, Bell, BellOff, CheckCircle, AlertCircle, Info, LayoutDashboard, Calendar, Users, UserCog, FileText, ClipboardList } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import UserDropdown from '@/components/global/UserDropdown.vue'
import { useAuthStore } from '@/stores/auth'

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
const authStore = useAuthStore()

const isUserDropdownOpen = ref(false)
const isNotificationsOpen = ref(false)

// Dados dummy de notificação (Vazio por enquanto)
const notifications = ref([])

const isGlobalLoading = computed(() => {
  return appointmentsStore.isLoading ||
         patientsStore.isLoading ||
         recordsStore.isLoading ||
         anamnesisStore.isLoading ||
         employeesStore.isLoading ||
         dashboardStore.isLoading;
})

const allShortcuts = ref([
  // Navegação rápida
  { name: 'Dashboard', icon: LayoutDashboard, path: '/resumo' },
  { name: 'Calendário', icon: Calendar, path: '/calendario' },
  { name: 'Pacientes', icon: Users, path: '/pacientes' },
  { name: 'Funcionários', icon: UserCog, path: '/funcionarios' },
  { name: 'Anamneses', icon: ClipboardList, path: '/anamneses' },
  // Ações
  { name: 'Novo paciente', icon: UserPlus, path: '/pacientes/novo' },
  { name: 'Novo agendamento', icon: CalendarPlus, action: () => emit('open-schedule-modal') },
  // Configurações
  { name: 'Configurações', icon: Settings, path: '/configuracoes' },
  { name: 'Meu perfil', icon: User, path: '/perfil' },
])

// Estado de seleção com teclado
const selectedIndex = ref(0)
const searchInputRef = ref(null)

// Computed para filtrar atalhos
const filteredShortcuts = computed(() => {
  if (!searchQuery.value) {
    return allShortcuts.value
  }
  const query = searchQuery.value.toLowerCase()
  return allShortcuts.value.filter(s =>
    s.name.toLowerCase().includes(query)
  )
})

// Computed para pacientes recentes (mostra últimos 5 mesmo sem busca)
const recentPatients = computed(() => {
  const patients = patientsStore.patients || []
  if (!searchQuery.value) {
    return patients.slice(0, 5)
  }
  const query = searchQuery.value.toLowerCase()
  return patients.filter(p => 
    p.name?.toLowerCase().includes(query) ||
    p.phone?.includes(query) ||
    p.email?.toLowerCase().includes(query)
  ).slice(0, 5)
})

// Lista combinada para navegação
const allItems = computed(() => {
  const items = []
  filteredShortcuts.value.forEach((s, i) => items.push({ type: 'shortcut', data: s, index: i }))
  recentPatients.value.forEach((p, i) => items.push({ type: 'patient', data: p, index: filteredShortcuts.value.length + i }))
  return items
})

const showPatients = computed(() => recentPatients.value.length > 0)
const showShortcuts = computed(() => filteredShortcuts.value.length > 0)
const hasNoResults = computed(() => searchQuery.value && !showPatients.value && !showShortcuts.value)

// Reset selection quando busca muda
watch(searchQuery, () => {
  selectedIndex.value = 0
})

function executeShortcut(shortcut) {
  closeCommandPalette()
  if (shortcut.action) {
    shortcut.action()
  } else if (shortcut.path) {
    router.push(shortcut.path)
  }
}

function goToPatient(patient) {
  closeCommandPalette()
  router.push(`/pacientes/${patient._id}`)
}

function closeCommandPalette() {
  isSearchFocused.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

function handleSearchSubmit() {
  const item = allItems.value[selectedIndex.value]
  if (item) {
    if (item.type === 'shortcut') {
      executeShortcut(item.data)
    } else {
      goToPatient(item.data)
    }
  }
}

function handleKeyNavigation(e) {
  if (!isSearchFocused.value) return
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, allItems.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  }
}

// Keyboard shortcuts globais
function handleGlobalKeydown(e) {
  // Ctrl+K ou Cmd+K para abrir busca
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    isSearchFocused.value = true
    nextTick(() => searchInputRef.value?.focus())
  }
  
  // Escape para fechar
  if (e.key === 'Escape' && isSearchFocused.value) {
    closeCommandPalette()
  }
  
  // Arrow navigation
  handleKeyNavigation(e)
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

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
      <!-- Simple search trigger button -->
      <button class="search-trigger" @click="isSearchFocused = true">
        <Search :size="18" class="search-icon" />
        <span class="search-placeholder">Pesquisar...</span>
        <kbd class="search-kbd">Ctrl K</kbd>
      </button>
    </div>

    <!-- Command Palette Modal (full overlay) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isSearchFocused" class="command-overlay" @click.self="closeCommandPalette">
          <div class="command-palette">
            <!-- Search Header inside palette -->
            <div class="palette-header">
              <Search :size="18" class="palette-search-icon" />
              <input
                ref="searchInputRef"
                type="text"
                placeholder="Pesquise aqui"
                v-model="searchQuery"
                @keydown.enter.prevent="handleSearchSubmit"
                class="palette-search-input"
                autofocus
              />
              <button class="close-btn" @click="closeCommandPalette">
                <X :size="18" />
              </button>
            </div>

            <div class="palette-content">
              <!-- Actions Section -->
              <div v-if="showShortcuts" class="palette-section">
                <div class="section-label">Ações</div>
                <ul class="palette-list">
                  <li
                    v-for="(shortcut, idx) in filteredShortcuts"
                    :key="shortcut.name"
                    @click="executeShortcut(shortcut)"
                    class="palette-item"
                    :class="{ 'is-selected': selectedIndex === idx }"
                  >
                    <div class="item-left">
                      <component :is="shortcut.icon" :size="18" class="item-icon" />
                      <span class="item-label">{{ shortcut.name }}</span>
                    </div>
                    <ChevronRight v-if="selectedIndex === idx" :size="16" class="item-arrow" />
                  </li>
                </ul>
              </div>

              <!-- Contacts/Patients Section -->
              <div v-if="showPatients" class="palette-section">
                <div class="section-label">Contatos</div>
                <ul class="palette-list">
                  <li
                    v-for="(patient, idx) in recentPatients"
                    :key="patient._id"
                    @click="goToPatient(patient)"
                    class="palette-item contact-item"
                    :class="{ 'is-selected': selectedIndex === filteredShortcuts.length + idx }"
                  >
                    <div class="item-left">
                      <div class="contact-avatar">
                        <User :size="14" />
                      </div>
                      <span class="contact-name">{{ patient.name }}</span>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- No Results -->
              <div v-if="hasNoResults" class="no-results">
                <span>Nenhum resultado para "{{ searchQuery }}"</span>
              </div>
            </div>

            <!-- Footer Hint -->
            <div class="palette-footer">
              <span><kbd class="kbd-small">↑</kbd></span>
              <span><kbd class="kbd-small">↓</kbd></span>
              <span class="footer-text">Navegue</span>
              <span><kbd class="kbd-small">ENTER</kbd></span>
              <span class="footer-text">Abrir</span>
              <span><kbd class="kbd-small">ESC</kbd></span>
              <span class="footer-text">Fechar</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="top-bar-right">
      <Transition name="fade-fast">
        <div v-if="isGlobalLoading" class="global-loading-indicator" title="Carregando...">
          <LoaderCircle :size="18" class="animate-spin" />
        </div>
      </Transition>



      <!-- Notification Button -->
      <div 
        class="notification-container"
        v-click-outside="() => isNotificationsOpen = false"
      >
        <button 
          class="notification-btn" 
          @click="isNotificationsOpen = !isNotificationsOpen"
          :class="{ 'is-active': isNotificationsOpen }"
        >
          <Bell :size="20" />
          <span v-if="notifications.length > 0" class="notification-badge">{{ notifications.length }}</span>
        </button>

        <Transition name="fade">
          <div v-if="isNotificationsOpen" class="notifications-dropdown">
            <div class="notifications-header">
              <h3>Notificações</h3>
              <button v-if="notifications.length > 0" class="mark-read-btn">Marcar todas como lidas</button>
            </div>
            
            <div v-if="notifications.length > 0" class="notifications-list">
              <div v-for="notif in notifications" :key="notif.id" class="notification-item">
                <div class="notif-icon" :class="notif.type">
                  <CheckCircle v-if="notif.type === 'success'" :size="16" />
                  <AlertCircle v-else-if="notif.type === 'warning'" :size="16" />
                  <Info v-else :size="16" />
                </div>
                <div class="notif-content">
                  <div class="notif-title">{{ notif.title }}</div>
                  <div class="notif-message">{{ notif.message }}</div>
                  <div class="notif-time">{{ notif.time }}</div>
                </div>
              </div>
            </div>

            <div v-else class="notifications-empty">
              <div class="empty-icon-wrapper">
                <BellOff :size="24" />
              </div>
              <div class="empty-title">Sem notificações</div>
              <div class="empty-desc">Você não tem novas notificações por enquanto.</div>
            </div>

          </div>
        </Transition>
      </div>

      <div class="separator"></div>

      <div
        class="user-profile"
        @click="isUserDropdownOpen = !isUserDropdownOpen"
        v-click-outside="() => (isUserDropdownOpen = false)"
      >
        <UserDropdown v-if="isUserDropdownOpen" direction="down" />
        <div class="user-avatar">
          <img 
            v-if="authStore.user?.profilePhotoUrl" 
            :src="authStore.user.profilePhotoUrl" 
            alt="Foto de perfil"
            class="avatar-image"
          />
          <span v-else class="avatar-initials">{{ authStore.user?.name?.charAt(0) || 'U' }}</span>
        </div>
        <div class="user-details">
          <span class="user-name">{{ authStore.user?.name || 'Usuário' }}</span>
          <span class="user-email">{{ authStore.user?.email || 'email@exemplo.com' }}</span>
        </div>
        <ChevronDown :size="16" class="chevron-icon" :class="{ 'is-open': isUserDropdownOpen }" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 60px;
  padding: 0 1rem;
  background-color: #FFFEFF;
  gap: 1rem;
  border-top-right-radius: 1rem;
}

.top-bar-left {
  display: flex;
  justify-content: flex-start;
  min-width: 40px; /* Espaço para o menu */
}
.top-bar-center {
  display: flex;
  justify-content: flex-end; /* Alinha a busca à direita */
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

/* --- Search Trigger (Fake Input) --- */
.search-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 450px;
  height: 38px;
  padding: 0 12px;
  background-color: #FFFEFF;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  color: #6b7280;
  cursor: text;
  transition: all 0.2s ease;
}

.search-trigger:hover {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
}

.search-placeholder {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.75rem;
}

.search-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  color: #9ca3af;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

/* --- Command Palette Overlay --- */
.command-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 15vh;
}

.command-palette {
  width: 100%;
  max-width: 640px;
  background-color: var(--branco);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .command-palette,
.modal-leave-to .command-palette {
  transform: scale(0.95);
  opacity: 0;
}

.modal-enter-active .command-palette,
.modal-leave-active .command-palette {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Palette Header */
.palette-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.palette-search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.palette-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  color: #1e293b;
  background: transparent;
}

.palette-search-input::placeholder {
  color: #9ca3af;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* Palette Content */
.palette-content {
  max-height: 400px;
  overflow-y: auto;
}

.palette-section {
  padding: 0.5rem;
}

.palette-section + .palette-section {
  border-top: 1px solid #f3f4f6;
}

.section-label {
  padding: 0.5rem 0.75rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.palette-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.palette-item:hover {
  background-color: #f8fafc;
}

.palette-item.is-selected {
  background-color: #f1f5f9;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.item-icon {
  color: #64748b;
}

.palette-item.is-selected .item-icon {
  color: #1e293b;
}

.item-label {
  font-size: 0.9375rem;
  font-weight: 400;
  color: #1e293b;
}

.item-arrow {
  color: #9ca3af;
}

/* Contact/Patient Item */
.contact-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 50%;
  color: white;
}

.contact-name {
  font-size: 0.9375rem;
  font-weight: 400;
  color: #1e293b;
}

/* No Results */
.no-results {
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #9ca3af;
}

/* Palette Footer */
.palette-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.footer-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin-right: 0.75rem;
}

.kbd-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: inherit;
  color: #64748b;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
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

/* --- Separator --- */
.separator {
  width: 1px;
  height: 20px;
  background-color: #e5e7eb;
  margin: 0 0.5rem;
}

/* --- User Profile na TopBar --- */
.user-profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: -0.5rem;
}

.user-profile:hover {
  background-color: #f3f4f6;
}

.user-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
  border: 1px solid #e0e7ff;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name {
  font-weight: 700;
  font-size: 0.8125rem;
  color: #111827;
  line-height: 1.2;
}

.user-email {
  font-size: 0.75rem;
  color: #9ca3af;
  line-height: 1.1;
  margin-top: 1px;
}

.chevron-icon {
  margin-left: 0.25rem;
  color: #9ca3af;
  transition: transform 0.2s ease;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}


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
  
  .separator {
    display: none;
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

  /* Oculta a barra de pesquisa no mobile */
  .search-container {
    display: none;
  }

  /* Oculta o texto do botão no mobile */
  .button-text {
    display: none;
  }

  /* Oculta detalhes do usuário no mobile, mostra apenas avatar */
  .user-profile {
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






/* --- Notifications System --- */
.notification-container {
  position: relative;
}

.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px; /* Levemente menor e mais minimalista */
  height: 38px;
  border-radius: 0.6rem;
  background-color: #FFFEFF;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.notification-btn:hover,
.notification-btn.is-active {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
}

.notification-badge {
  position: absolute;
  top: 8px; /* Ajuste fino */
  right: 10px;
  background-color: #ef4444;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid white;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 14px);
  right: -80px; /* Ajuste para alinhar melhor */
  width: 360px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000; /* Z-index maior */
  overflow: hidden;
  transform-origin: top right;
}

.notifications-header {
  padding: 1.25rem 1rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notifications-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.notifications-list {
  max-height: 350px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

/* Empty State */
.notifications-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #9ca3af;
}

.empty-icon-wrapper {
  width: 48px;
  height: 48px;
  background-color: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: #9ca3af;
}

.empty-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.empty-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  max-width: 200px;
  line-height: 1.4;
}

.notifications-footer {
  padding: 0.75rem;
  background-color: #f9fafb;
  text-align: center;
  border-top: 1px solid #f3f4f6;
}

.notifications-footer button {
  background: none;
  border: none;
  color: #4b5563;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}
</style>
