<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Building2, ChevronRight, Monitor, Shield, User, X } from 'lucide-vue-next'
import ProfileView from '@/views/pages/ProfileView.vue'

const emit = defineEmits(['close'])
const route = useRoute()
const router = useRouter()

const activeTab = ref('personal')
const MOBILE_BREAKPOINT = 1024

const tabs = [
  {
    value: 'personal',
    label: 'Informações Pessoais',
    description: 'Dados do perfil e identificação de acesso.',
    icon: User,
  },
  {
    value: 'security',
    label: 'Segurança',
    description: '2FA, redefinição de senha e proteção de conta.',
    icon: Shield,
  },
  {
    value: 'devices',
    label: 'Dispositivos Conectados',
    description: 'Gerencie as sessões ativas da sua conta.',
    icon: Monitor,
  },
  {
    value: 'clinic',
    label: 'Dados da Clínica',
    description: 'Informações institucionais da clínica.',
    icon: Building2,
  },
]

const getIsMobileViewport = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
}

const isMobile = ref(getIsMobileViewport())
const mobileStage = ref('menu')
let mobileMediaQuery = null
let mobileMediaListener = null
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

const isValidTab = (value) => tabs.some((tab) => tab.value === value)

const normalizeTabQuery = (value) => {
  const normalized = Array.isArray(value) ? value[0] : value
  return isValidTab(normalized) ? normalized : null
}

const currentTab = computed(() => tabs.find((tab) => tab.value === activeTab.value) || tabs[0])

const syncMobileStage = (isMobileViewport) => {
  isMobile.value = isMobileViewport

  if (!isMobileViewport) {
    mobileStage.value = 'detail'
    return
  }

  mobileStage.value = route.query.profileTab ? 'detail' : 'menu'
}

const openTab = (value, options = {}) => {
  const { mobileFromMenu = false } = options
  if (!isValidTab(value)) return

  activeTab.value = value

  router.replace({
    query: {
      ...route.query,
      profile: '1',
      profileTab: value,
    },
  })

  if (isMobile.value && mobileFromMenu) {
    mobileStage.value = 'detail'
  }
}

const handleBackToMenu = () => {
  mobileStage.value = 'menu'
  router.replace({
    query: {
      ...route.query,
      profileTab: undefined,
    },
  })
}

const closeProfileModal = () => {
  router.replace({
    query: {
      ...route.query,
      profile: undefined,
      profileTab: undefined,
    },
  })
  emit('close')
}

const handleMobileBack = () => {
  if (mobileStage.value === 'detail') {
    handleBackToMenu()
    return
  }

  closeProfileModal()
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

onMounted(() => {
  lockBackgroundScroll()

  const queryTab = normalizeTabQuery(route.query.profileTab)
  if (queryTab) {
    activeTab.value = queryTab
  }

  mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  mobileMediaListener = (event) => syncMobileStage(event.matches)

  syncMobileStage(mobileMediaQuery.matches)
  mobileMediaQuery.addEventListener('change', mobileMediaListener)
})

onBeforeUnmount(() => {
  unlockBackgroundScroll()

  if (mobileMediaQuery && mobileMediaListener) {
    mobileMediaQuery.removeEventListener('change', mobileMediaListener)
  }
})

watch(
  () => route.query.profileTab,
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
</script>

<template>
  <Teleport to="body">
    <div class="profile-workspace">
      <template v-if="!isMobile">
        <div class="profile-overlay" @click.self="closeProfileModal">
          <div class="profile-modal-frame">
            <button
              type="button"
              class="desktop-close-button"
              aria-label="Fechar perfil"
              @click="closeProfileModal"
            >
              <X :size="18" />
            </button>

            <div class="profile-modal">
              <aside class="profile-sidebar">
                <div class="sidebar-head">
                  <h1>Meu Perfil</h1>
                  <p>Ajustes da conta e da clínica em um painel central.</p>
                </div>

                <nav class="sidebar-nav">
                  <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="sidebar-item"
                    :class="{ active: tab.value === activeTab }"
                    @click="openTab(tab.value)"
                  >
                    <span class="sidebar-item-icon">
                      <component :is="tab.icon" :size="18" />
                    </span>
                    <span class="sidebar-item-label">{{ tab.label }}</span>
                  </button>
                </nav>
              </aside>

              <section class="profile-content">
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
                </header>

                <div class="content-body">
                  <ProfileView :active-tab="activeTab" :hide-tabs="true" @update:active-tab="openTab" />
                </div>
              </section>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="profile-mobile">
          <header class="mobile-head">
            <button type="button" class="mobile-back" @click="handleMobileBack">
              <ArrowLeft :size="16" />
            </button>

            <div class="mobile-head-main">
              <span class="mobile-head-icon">
                <component :is="currentTab.icon" :size="18" />
              </span>
              <div class="mobile-head-title">
                <h1>{{ mobileStage === 'menu' ? 'Meu Perfil' : currentTab.label }}</h1>
                <p>
                  {{
                    mobileStage === 'menu'
                      ? 'Escolha uma seção para continuar.'
                      : currentTab.description
                  }}
                </p>
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
            <div class="mobile-detail-content">
              <ProfileView :active-tab="activeTab" :hide-tabs="true" @update:active-tab="openTab" />
            </div>
          </template>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.profile-workspace {
  min-height: 100%;
}

.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 6200;
  padding: clamp(1rem, 2.4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.34);
  animation: profile-overlay-in 0.2s ease-out;
}

.profile-modal-frame {
  position: relative;
  width: min(1160px, 100%);
  height: min(82dvh, 880px);
  z-index: 1;
  animation: profile-modal-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}

.desktop-close-button {
  position: absolute;
  top: -0.8rem;
  right: -0.8rem;
  width: 36px;
  height: 36px;
  border-radius: 999px;
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

.profile-modal {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #e5e7eb;
  border-radius: 1.5rem;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2);
  display: grid;
  grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
  overflow: hidden;
}

.profile-sidebar {
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
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: #3f4752;
  padding: 0.7rem 0.85rem;
  border-radius: 0.8rem;
  font-size: 0.89rem;
  font-weight: 600;
  text-align: left;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.sidebar-item:hover {
  background: #eef1f4;
  color: #111827;
}

.sidebar-item.active {
  background: #e5e7eb;
  border-color: #dde2e8;
  color: #111827;
}

.sidebar-item-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: #eef2ff;
  color: var(--azul-principal);
  flex-shrink: 0;
}

.profile-content {
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
  border-radius: 0.7rem;
  background: #eef2ff;
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

.content-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.profile-mobile {
  position: fixed;
  inset: 0;
  z-index: 6200;
  width: 100%;
  min-height: 100dvh;
  overflow-y: auto;
  padding: 0.35rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
}

.mobile-head {
  position: sticky;
  top: 0;
  z-index: 4;
  margin-left: -1rem;
  margin-right: -1rem;
  padding: calc(0.9rem + env(safe-area-inset-top, 0px)) 1rem 0.85rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.mobile-head-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.mobile-head-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.7rem;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
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
  background: #ffffff;
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
  border-radius: 0.7rem;
  background: #f3f4f6;
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
}

.mobile-back {
  width: 42px;
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  text-align: center;
  margin-bottom: 0.65rem;
}

.mobile-detail-content {
  margin-top: 0.5rem;
  padding-bottom: 5.5rem;
}

@keyframes profile-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes profile-modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
