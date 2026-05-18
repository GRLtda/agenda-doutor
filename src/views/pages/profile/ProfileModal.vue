<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, Shield, User } from 'lucide-vue-next'
import { version } from '../../../../package.json'
import OptionsModalShell from '@/components/global/OptionsModalShell.vue'
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

const syncMobileStage = (isMobileViewport) => {
  isMobile.value = isMobileViewport
  mobileStage.value = isMobileViewport && !route.query.profileTab ? 'menu' : 'detail'
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
  <OptionsModalShell
    :tabs="tabs"
    :active-tab="activeTab"
    :is-mobile="isMobile"
    :mobile-stage="mobileStage"
    title="Meu Perfil"
    sidebar-description="Ajustes da conta e da clínica em um painel central."
    close-label="Fechar perfil"
    :z-index="6200"
    :active-icon-only="true"
    :show-sliding-indicator="true"
    @close="closeProfileModal"
    @mobile-back="handleMobileBack"
    @select-tab="openTab"
  >
    <template #mobile-menu-footer>
      <div class="profile-mobile-branding">
        <img src="@/assets/logo_brand.svg" alt="Agenda Doutor" class="branding-logo" />
        <div class="branding-info">
          <span class="brand-name">Agenda Doutor</span>
          <span class="version-text">v{{ version }}</span>
        </div>
      </div>
    </template>

    <ProfileView :active-tab="activeTab" :hide-tabs="true" @update:active-tab="openTab" />
  </OptionsModalShell>
</template>

<style scoped>
.profile-mobile-branding {
  padding: 0.62rem 0.65rem;
  border-radius: 0.75rem;
  border: 1px solid #edf2f7;
  background-color: #fbfcff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.branding-logo {
  height: 24px;
  width: auto;
}

.branding-info {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-weight: 700;
  color: #334155;
  font-size: 0.85rem;
  line-height: 1.1;
}

.version-text {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 500;
}
</style>
