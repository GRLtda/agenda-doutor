<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Building,
  Clock,
  FileSignature,
  FileText,
  History,
  Settings,
  Users,
} from 'lucide-vue-next'
import OptionsModalShell from '@/components/global/OptionsModalShell.vue'
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
  mobileStage.value = isMobileViewport && !route.query.tab ? 'menu' : 'detail'
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

const handleMobileBack = () => {
  if (mobileStage.value === 'detail') {
    handleBackToMenu()
    return
  }

  closeSettingsModal()
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

  const queryTab = normalizeTabQuery(route.query.tab)
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
</script>

<template>
  <OptionsModalShell
    :tabs="tabs"
    :active-tab="activeTab"
    :is-mobile="isMobile"
    :mobile-stage="mobileStage"
    title="Configurações"
    sidebar-description="Ajustes da clínica em um painel central."
    close-label="Fechar configurações"
    :overlay-opacity="0.527"
    :active-icon-only="true"
    :show-sliding-indicator="true"
    :show-tab-actions="true"
    @close="closeSettingsModal"
    @mobile-back="handleMobileBack"
    @select-tab="openTab"
  >
    <component :is="currentTab.component" />
  </OptionsModalShell>
</template>
