<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Menu, User, Settings, LoaderCircle, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, UserPlus, CalendarPlus, CalendarOff, X, Bell, BellOff, CheckCircle, AlertCircle, Info, Share } from 'lucide-vue-next'
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
const route = useRoute()

const openSettingsModal = () => {
  router.replace({
    query: {
      ...route.query,
      settings: '1',
      tab: 'identidade',
    },
  })
}

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

const isIPhonePwaNoticeVisible = ref(false)

const checkIfIPhonePwa = () => {
  const isIPhone = /iPhone/.test(navigator.userAgent) && !window.MSStream
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  
  if (isIPhone && !isPwa) {
    isIPhonePwaNoticeVisible.value = true
  }
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const diffDays = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const relativeStr = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffDays, 'day')
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const relativeCap = relativeStr.charAt(0).toUpperCase() + relativeStr.slice(1)
  return `${relativeCap} às ${timeStr}`
}

const handleNotificationsClick = () => {
  isNotificationsOpen.value = !isNotificationsOpen.value
  if (isNotificationsOpen.value) {
    authStore.requestPushPermission()
  }
}

const handleNotificationClick = (notif) => {
  if (notif.data?.url) {
    if (notif.data.url.startsWith('http')) {
      window.open(notif.data.url, '_blank')
    } else {
      router.push(notif.data.url)
    }
    isNotificationsOpen.value = false
  }
}

const isGlobalLoading = computed(() => {
  return appointmentsStore.isLoading ||
         patientsStore.isLoading ||
         recordsStore.isLoading ||
         anamnesisStore.isLoading ||
         employeesStore.isLoading ||
         dashboardStore.isLoading;
})

const allShortcuts = ref([
  { name: 'Novo paciente', icon: UserPlus, path: '/pacientes/novo' },
  { name: 'Novo agendamento', icon: CalendarPlus, action: () => emit('open-schedule-modal') },
  //{ name: 'Novo bloqueio na agenda', icon: CalendarOff, action: () => emit('open-schedule-modal') },
  { name: 'Configurações', icon: Settings, action: openSettingsModal },
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
  checkIfIPhonePwa()
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
                placeholder="Pesquise aqui ou utilize nossa IA"
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
          @click="handleNotificationsClick"
          :class="{ 'is-active': isNotificationsOpen }"
        >
          <Bell :size="20" />
          <span v-if="authStore.unreadCount > 0" class="notification-badge">{{ authStore.unreadCount }}</span>
        </button>

        <Transition name="fade">
          <div v-if="isNotificationsOpen" class="notifications-dropdown">
            <div class="notifications-header">
              <h3>Notificações</h3>
              <button 
                v-if="authStore.unreadCount > 0" 
                class="mark-read-btn"
                @click="authStore.markAllNotificationsAsRead"
              >
                <CheckCircle :size="14" />
                Marcar todas como lidas
              </button>
            </div>

            <!-- iOS PWA Installation Notice -->
            <div v-if="isIPhonePwaNoticeVisible" class="pwa-install-notice">
              <div class="pwa-notice-content">
                <div class="pwa-notice-header">
                  <div class="pwa-icon">
                    <img src="/logo_brand.svg" alt="App Icon" />
                  </div>
                  <div class="pwa-text">
                    <span class="pwa-title">Instale em seu iPhone</span>
                    <span class="pwa-desc">Tenha uma experiência nativa e acesse mais rápido.</span>
                  </div>
                  <button class="pwa-close" @click="isIPhonePwaNoticeVisible = false">
                    <X :size="14" />
                  </button>
                </div>
                <div class="pwa-steps">
                  <span>Toque em <Share :size="14" style="display:inline; vertical-align:middle; margin: 0 2px;" /> e depois em <strong>"Adicionar à Tela de Início"</strong></span>
                </div>
              </div>
            </div>
            
            <div v-if="authStore.notifications.length > 0" class="notifications-list">
              <div 
                v-for="notif in authStore.notifications" 
                :key="notif.id" 
                class="notification-item"
                :class="[{ 'is-unread': !notif.isRead, 'is-clickable': !!notif.data?.url }, notif.type || 'info']"
                @click="handleNotificationClick(notif)"
              >
                <div v-if="!notif.isRead" class="unread-dot"></div>
                
                <div class="notif-logo">
                  <img :src="notif.data?.icon || '/logo_brand.svg'" alt="Ícone Notificação" />
                </div>
                
                <div class="notif-content">
                  <div class="notif-header">
                    <span class="notif-title">{{ notif.title }}</span>
                    <span class="notif-time">{{ formatTime(notif.time) }}</span>
                  </div>
                  <div class="notif-message">{{ notif.message }}</div>
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
  top: -4px;
  right: -4px;
  background-color: #ef4444;
  color: white;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: bold;
  border: 2px solid white;
  padding: 0 4px;
  line-height: normal;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 14px);
  right: 0px;
  width: 360px;
  max-width: 90vw; /* Ajuste responsivo */
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  overflow: hidden;
  transform-origin: top right;
}

.notifications-header {
  padding: 1.25rem 1rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px; /* Força espaço entre e evita estourar bordas */
}

.notifications-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.mark-read-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px; /* Substitui margin-right do icone e previne quebra bizarra */
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap; /* Impede pular linha */
}

.mark-read-btn:hover {
  background-color: #eff6ff;
  color: #2563eb;
}

.notifications-list {
  max-height: 350px;
  overflow-y: auto;
  padding: 0;
}

.notification-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem 1rem 1rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
  cursor: default;
}

.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.is-clickable {
  cursor: pointer;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.is-unread {
  background-color: #f4f8ff;
}

.notification-item.is-unread:hover {
  background-color: #eef2ff;
}

/* Tipos de Notificação Visual */
.notification-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: transparent;
    transition: background-color 0.2s ease;
}
.notification-item.info::before {
    background-color: #3b82f6;
}
.notification-item.success::before {
    background-color: #10b981;
}
.notification-item.warning::before {
    background-color: #f59e0b;
}
.notification-item.error::before {
    background-color: #ef4444;
}

.unread-dot {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border-radius: 50%;
}

.notif-logo {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background-color: white;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.notif-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.notif-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.notif-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.notif-time {
  font-size: 0.7rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}

.notif-message {
  font-size: 0.8125rem;
  color: #4b5563;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

/* --- iOS PWA Notice --- */
.pwa-install-notice {
  padding: 0 1rem 0.75rem;
}

.pwa-notice-content {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 0.75rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

.pwa-notice-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-right: 1.5rem;
}

.pwa-icon {
  width: 32px;
  height: 32px;
  background-color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pwa-icon img {
  width: 100%;
  height: 100%;
}

.pwa-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pwa-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0369a1;
}

.pwa-desc {
  font-size: 0.75rem;
  color: #075985;
  line-height: 1.2;
}

.pwa-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: #0ea5e9;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-close:hover {
  background-color: rgba(14, 165, 233, 0.1);
}

.pwa-steps {
  font-size: 0.75rem;
  color: #0c4a6e;
  background-color: rgba(255, 255, 255, 0.5);
  padding: 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
}

.pwa-steps strong {
  font-weight: 700;
}
</style>
