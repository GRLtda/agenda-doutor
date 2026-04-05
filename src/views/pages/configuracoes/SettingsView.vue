<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Building,
  ChevronRight,
  Clock,
  FileSignature,
  FileText,
  History,
  Settings,
  X,
  Users,
} from 'lucide-vue-next'
import GeneralSettings from '@/views/pages/configuracoes/tabs/GeneralSettings.vue'
import WorkingHoursSettings from '@/views/pages/configuracoes/tabs/WorkingHoursSettings.vue'
import AnamnesisTemplates from '@/views/pages/configuracoes/tabs/AnamnesisTemplates.vue'
import ConsentTermsTemplates from '@/views/pages/configuracoes/tabs/ConsentTermsTemplates.vue'
import EmployeesSettings from '@/views/pages/configuracoes/tabs/EmployeesSettings.vue'
import AuditLog from '@/views/pages/configuracoes/tabs/AuditLog.vue'
import ClinicConfigSettings from '@/views/pages/configuracoes/tabs/ClinicConfigSettings.vue'

const emit = defineEmits(['close'])
const route = useRoute()
const router = useRouter()
const activeTab = ref('identidade')
const MOBILE_BREAKPOINT = 1024
const getIsMobileViewport = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
}
const isMobile = ref(getIsMobileViewport())
const mobileStage = ref('menu')
const settingsSidebarNavRef = ref(null)
const settingsIndicatorStyle = ref({
  top: '0px',
  height: '0px',
  opacity: 0,
})
let mobileMediaQuery = null
let mobileMediaListener = null
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

const tabs = [
  {
    value: 'identidade',
    label: 'Identidade da Clínica',
    description: 'Dados básicos da clínica e marca visual.',
    icon: Building,
    component: GeneralSettings,
  },
  {
    value: 'configuracoes',
    label: 'Configurações',
    description: 'Preferências gerais e regras de operação.',
    icon: Settings,
    component: ClinicConfigSettings,
  },
  {
    value: 'horario',
    label: 'Horário de Funcionamento',
    description: 'Defina os horários de atendimento.',
    icon: Clock,
    component: WorkingHoursSettings,
  },
  {
    value: 'anamnese',
    label: 'Modelos de Anamnese',
    description: 'Crie e organize modelos para consultas.',
    icon: FileText,
    component: AnamnesisTemplates,
  },
  {
    value: 'termos',
    label: 'Termos de Consentimento',
    description: 'Gerencie os termos assinados por pacientes.',
    icon: FileSignature,
    component: ConsentTermsTemplates,
  },
  {
    value: 'funcionarios',
    label: 'Membros da Equipe',
    description: 'Acessos, papéis e convites da equipe.',
    icon: Users,
    component: EmployeesSettings,
  },
  {
    value: 'auditoria',
    label: 'Histórico de Atividades',
    description: 'Registro de alterações importantes no sistema.',
    icon: History,
    component: AuditLog,
  },
]

const isValidTab = (value) => tabs.some((tab) => tab.value === value)

const normalizeTabQuery = (value) => {
  const normalized = Array.isArray(value) ? value[0] : value
  return isValidTab(normalized) ? normalized : null
}

const syncMobileStage = (isMobileViewport) => {
  isMobile.value = isMobileViewport

  if (!isMobileViewport) {
    mobileStage.value = 'detail'
    return
  }

  mobileStage.value = route.query.tab ? 'detail' : 'menu'
}

const openTab = (value, options = {}) => {
  const { mobileFromMenu = false } = options
  if (!isValidTab(value)) return

  activeTab.value = value
  router.replace({ query: { ...route.query, tab: value } })

  if (isMobile.value && mobileFromMenu) {
    mobileStage.value = 'detail'
  }
}

const handleBackToMenu = () => {
  mobileStage.value = 'menu'
  router.replace({ query: { ...route.query, tab: undefined } })
}

const closeSettingsModal = () => {
  router.replace({
    query: {
      ...route.query,
      settings: undefined,
      tab: undefined,
    },
  })
  emit('close')
}

const lockBackgroundScroll = () => {
  if (typeof window === 'undefined') return

  previousBodyOverflow = document.body.style.overflow
  previousHtmlOverflow = document.documentElement.style.overflow

  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}

const unlockBackgroundScroll = () => {
  if (typeof window === 'undefined') return

  document.body.style.overflow = previousBodyOverflow
  document.documentElement.style.overflow = previousHtmlOverflow
}

const updateSettingsSidebarIndicator = () => {
  nextTick(() => {
    if (!settingsSidebarNavRef.value || isMobile.value) {
      settingsIndicatorStyle.value = { ...settingsIndicatorStyle.value, opacity: 0 }
      return
    }

    const activeItem = settingsSidebarNavRef.value.querySelector('.sidebar-item.active')

    if (!activeItem) {
      settingsIndicatorStyle.value = { ...settingsIndicatorStyle.value, opacity: 0 }
      return
    }

    const navRect = settingsSidebarNavRef.value.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const navScrollTop = settingsSidebarNavRef.value.scrollTop

    settingsIndicatorStyle.value = {
      top: `${itemRect.top - navRect.top + navScrollTop}px`,
      height: `${itemRect.height}px`,
      opacity: 1,
    }
  })
}

onMounted(() => {
  lockBackgroundScroll()

  const queryTab = normalizeTabQuery(route.query.tab)
  if (queryTab) {
    activeTab.value = queryTab
  }

  mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  mobileMediaListener = (event) => syncMobileStage(event.matches)

  syncMobileStage(mobileMediaQuery.matches)
  mobileMediaQuery.addEventListener('change', mobileMediaListener)
  updateSettingsSidebarIndicator()
})

onBeforeUnmount(() => {
  unlockBackgroundScroll()

  if (mobileMediaQuery && mobileMediaListener) {
    mobileMediaQuery.removeEventListener('change', mobileMediaListener)
  }
})

watch(
  () => route.query.tab,
  (value) => {
    const queryTab = normalizeTabQuery(value)

    if (queryTab) {
      activeTab.value = queryTab
      if (isMobile.value) {
        mobileStage.value = 'detail'
      }
      return
    }

    if (isMobile.value) {
      mobileStage.value = 'menu'
    }
  }
)

watch(activeTab, () => {
  updateSettingsSidebarIndicator()
})

watch(isMobile, () => {
  updateSettingsSidebarIndicator()
})

const currentTab = computed(() => tabs.find((tab) => tab.value === activeTab.value) || tabs[0])

const mobileHeaderTitle = computed(() =>
  mobileStage.value === 'detail' ? currentTab.value.label : 'Configurações'
)

const mobileHeaderDescription = computed(() =>
  mobileStage.value === 'detail'
    ? currentTab.value.description
    : 'Escolha uma seção para continuar.'
)

const mobileHeaderIcon = computed(() =>
  mobileStage.value === 'detail' ? currentTab.value.icon : Settings
)

const handleMobileBack = () => {
  if (mobileStage.value === 'detail') {
    handleBackToMenu()
    return
  }

  closeSettingsModal()
}
</script>

<template>
  <Teleport to="body">
    <div class="settings-workspace">
      <template v-if="!isMobile">
        <div class="settings-overlay" @click.self="closeSettingsModal">
          <div class="settings-modal-frame">
            <button
              type="button"
              class="desktop-close-button"
              aria-label="Fechar configurações"
              @click="closeSettingsModal"
            >
              <X :size="18" />
            </button>

            <div class="settings-modal">
              <aside class="settings-sidebar">
                <div class="sidebar-head">
                  <h1>Configurações</h1>
                  <p>Ajustes da clínica em um painel central.</p>
                </div>

                <nav
                  ref="settingsSidebarNavRef"
                  class="sidebar-nav"
                  @scroll.passive="updateSettingsSidebarIndicator"
                >
                  <div
                    class="settings-sliding-indicator"
                    :style="{
                      top: settingsIndicatorStyle.top,
                      height: settingsIndicatorStyle.height,
                      opacity: settingsIndicatorStyle.opacity,
                    }"
                  ></div>
                  <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="sidebar-item"
                    :class="{ active: tab.value === activeTab }"
                    @click="openTab(tab.value)"
                  >
                    <span class="sidebar-item-icon">
                      <component :is="tab.icon" :size="20" />
                    </span>
                    <span class="sidebar-item-label">{{ tab.label }}</span>
                  </button>
                </nav>
              </aside>

              <section class="settings-content">
                <header class="content-header">
                  <div class="content-header-left">
                    <span class="content-tab-icon">
                      <component :is="currentTab.icon" :size="18" />
                    </span>
                    <div>
                      <h2>{{ currentTab.label }}</h2>
                      <p>{{ currentTab.description }}</p>
                    </div>
                  </div>
                  <div id="tab-actions"></div>
                </header>

                <div class="content-body">
                  <component :is="currentTab.component" />
                </div>
              </section>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="settings-mobile">
          <header class="mobile-head">
            <div class="mobile-head-main">
              <button type="button" class="mobile-back" @click="handleMobileBack">
                <ArrowLeft :size="18" />
              </button>

              <span class="mobile-head-icon">
                <component :is="mobileHeaderIcon" :size="18" />
              </span>
              <div class="mobile-head-title">
                <h1>{{ mobileHeaderTitle }}</h1>
                <p>{{ mobileHeaderDescription }}</p>
              </div>
            </div>
          </header>

          <template v-if="mobileStage === 'menu'">
            <nav class="mobile-nav">
              <button
                v-for="tab in tabs"
                :key="tab.value"
                type="button"
                class="mobile-nav-item"
                @click="openTab(tab.value, { mobileFromMenu: true })"
              >
                <span class="mobile-nav-item-left">
                  <span class="mobile-nav-icon">
                    <component :is="tab.icon" :size="18" />
                  </span>
                  <span class="mobile-nav-text">
                    <span class="mobile-nav-label">{{ tab.label }}</span>
                    <span class="mobile-nav-description">{{ tab.description }}</span>
                  </span>
                </span>
                <ChevronRight :size="16" />
              </button>
            </nav>
          </template>

          <template v-else>
            <div id="tab-actions" class="mobile-tab-actions"></div>

            <div class="mobile-detail-content">
              <component :is="currentTab.component" />
            </div>
          </template>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-workspace {
  min-height: 100%;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 6000;
  padding: clamp(1rem, 2.4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.527);
  animation: settings-overlay-in 0.2s ease-out;
}

.settings-modal-frame {
  position: relative;
  width: min(1160px, 100%);
  height: min(82dvh, 880px);
  z-index: 1;
  animation: settings-modal-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}

.desktop-close-button {
  position: absolute;
  top: -0.8rem;
  right: -0.8rem;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  z-index: 10;
  border: 1px solid #d1d5db;
  background: rgba(255, 255, 255, 0.96);
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.desktop-close-button:hover {
  color: #111827;
  background: #ffffff;
}

.settings-modal {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5e7eb;
  border-radius: 1.5rem;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(2px);
  display: grid;
  grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
  overflow: hidden;
}

@keyframes settings-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes settings-modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.settings-sidebar {
  border-right: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.88);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-head h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.sidebar-head p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.45;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  position: relative;
}

.settings-sliding-indicator {
  position: absolute;
  left: 3px;
  width: 3px;
  background-color: var(--azul-principal);
  border-radius: 0 2px 2px 0;
  transition:
    top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
  pointer-events: none;
  transform: scaleY(0.6);
  transform-origin: center;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: #3f4752;
  padding: 0.5rem 0.75rem;
  border-radius: 0.8rem;
  min-height: 2.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition:
    background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s ease,
    padding-left 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1;
}

.sidebar-item:active {
  transform: scale(0.985);
}

.sidebar-item.active {
  background: #eef2ff;
  border-color: transparent;
  color: var(--azul-principal);
  font-weight: 600;
}

.sidebar-item-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: inherit;
  flex-shrink: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}

.sidebar-item.active .sidebar-item-icon {
  color: var(--azul-principal);
}

.settings-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.94);
}

.content-header-left {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.content-tab-icon {
  width: 34px;
  height: 34px;
  background: transparent;
  color: var(--azul-principal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.content-header-left h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #111827;
}

.content-header-left p {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
}

#tab-actions {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  justify-content: flex-end;
}

.content-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.settings-mobile {
  position: fixed;
  inset: 0;
  z-index: 6000;
  width: 100%;
  max-width: 100%;
  min-height: 100dvh;
  overflow-y: auto;
  padding: 0.35rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
}

.mobile-head,
.mobile-nav,
.mobile-detail-content {
  background: #ffffff;
}

.mobile-head {
  position: sticky;
  top: 0;
  z-index: 4;
  margin-left: -1rem;
  margin-right: -1rem;
  padding:
    calc(0.9rem + env(safe-area-inset-top, 0px))
    1rem
    0.85rem;
  border-bottom: 1px solid #e5e7eb;
}

.mobile-head-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.mobile-head-icon {
  width: 32px;
  height: 32px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  flex-shrink: 0;
}

.mobile-head-title {
  text-align: left;
  min-width: 0;
}

.mobile-head-title h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.mobile-head-title p {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.86rem;
  text-align: left;
}

.mobile-nav {
  margin-top: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.mobile-nav-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.85rem 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  text-align: left;
}

.mobile-nav-item-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.mobile-nav-icon {
  width: 32px;
  height: 32px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  flex-shrink: 0;
}

.mobile-nav-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.mobile-nav-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.mobile-nav-description {
  font-size: 0.77rem;
  color: #6b7280;
  margin-top: 0.1rem;
  line-height: 1.3;
  text-align: left;
}

.mobile-back {
  width: 42px;
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  text-align: center;
}

.mobile-tab-actions {
  padding: 0.8rem 0 0.2rem;
}

.mobile-tab-actions :deep(button) {
  width: 100%;
  justify-content: center;
}

.mobile-detail-content {
  margin-top: 0.5rem;
  padding-bottom: 5.5rem;
}

@media (max-width: 1024px) {
  .settings-workspace {
    min-height: 100dvh;
  }
}
</style>
