<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { version } from '../../../package.json'
import { useAuthStore } from '@/stores/auth'
import { usePlanAccess } from '@/composables/usePlanAccess'
import { RouterLink, useRoute } from 'vue-router'
import UserDropdown from '@/components/global/UserDropdown.vue'
import ClinicDropdown from '@/components/global/ClinicDropdown.vue'
import AppIcon from '@/components/global/AppIcon.vue'
import {
  Check,
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-vue-next'

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'toggle-collapse'])

const authStore = useAuthStore()
const route = useRoute()
const { hasAccess } = usePlanAccess()
const isUserDropdownOpen = ref(false)
const isClinicDropdownOpen = ref(false)

// Estado para controlar quais menus estão expandidos
const expandedItems = ref([])

// Refs para o indicador flutuante
const sidebarNavRef = ref(null)
const indicatorStyle = ref({
  top: '0px',
  height: '0px',
  opacity: 0
})

const toggleExpand = (key) => {
  if (props.isCollapsed) return
  const index = expandedItems.value.indexOf(key)
  if (index === -1) {
    expandedItems.value.push(key)
  } else {
    expandedItems.value.splice(index, 1)
  }
}

const isExpanded = (key) => expandedItems.value.includes(key)

// Verifica se um item pai está ativo (se a rota atual é filha dele)
const isParentActive = (children) => {
  return children.some(child => route.path.startsWith(child.to))
}

// Atualiza posição do indicador
const updateIndicator = () => {
  nextTick(() => {
    if (!sidebarNavRef.value) return
    
    const activeLink = sidebarNavRef.value.querySelector('.active-link, .nav-link.active')
    
    if (activeLink) {
      const navRect = sidebarNavRef.value.getBoundingClientRect()
      const linkRect = activeLink.getBoundingClientRect()
      
      indicatorStyle.value = {
        top: `${linkRect.top - navRect.top}px`,
        height: `${linkRect.height}px`,
        opacity: 1
      }
    } else {
      indicatorStyle.value = { ...indicatorStyle.value, opacity: 0 }
    }
  })
}

// Watch na rota para atualizar indicador
watch(() => route.path, () => {
  updateIndicator()
}, { immediate: true })

// Atualizar ao montar
onMounted(() => {
  setTimeout(updateIndicator, 100)
})

// Computed para organizar links por seções/módulos
const sidebarSections = computed(() => {
  // Seção Principal
  const principalSection = {
    title: null, // Sem título para a primeira seção
    links: [
      { icon: 'dashboard', text: 'Resumo', to: '/app' },
      { icon: 'calendar-search', text: 'Calendário', to: '/app/calendario' },
      { icon: 'calendar', text: 'Atendimentos', to: '/app/atendimentos' },
    ]
  }

  // Seção Gestão
  const gestaoLinks = [
    { icon: 'users', text: 'Pacientes', to: '/app/pacientes' },
    { icon: 'stethoscope', text: 'Procedimentos', to: '/app/procedimentos' },
  ]
  
  // Adiciona Financeiro apenas se tiver acesso
  if (hasAccess('finance')) {
    gestaoLinks.push({ icon: 'dollar', text: 'Financeiro', to: '/app/financeiro' })
  }
  
  const gestaoSection = {
    title: 'Gestão',
    links: gestaoLinks
  }

  // Seção Marketing - com subitens
  const allMarketingChildren = [
    { text: 'Visão Geral', to: '/app/marketing', icon: 'dashboard', feature: 'marketing_overview' },
    { text: 'Mensagens', to: '/app/marketing/mensagens', icon: 'message', feature: 'marketing_messages' },
    { text: 'Modelos', to: '/app/marketing/modelos', icon: 'template', feature: 'marketing_templates' },
    { text: 'Conexão', to: '/app/marketing/conexao', icon: 'link', feature: 'marketing_connection' },
    { text: 'Histórico', to: '/app/marketing/logs', icon: 'history', feature: 'marketing_logs' },
  ]
  
  const filteredMarketingChildren = allMarketingChildren.filter(child => hasAccess(child.feature))
  
  const marketingLinks = [
    {
      icon: 'megaphone',
      text: 'Marketing',
      key: 'marketing',
      children: filteredMarketingChildren
    }
  ]
  
  // Adiciona Workflows se tiver acesso
  if (hasAccess('workflows')) {
    marketingLinks.push({ icon: 'workflow', text: 'Workflows', to: '/app/workflows' })
  }
  
  const marketingSection = {
    title: 'Automação',
    links: marketingLinks
  }

  // Seção Configurações
  const configSection = {
    title: 'Sistema',
    links: [
      { icon: 'settings', text: 'Configurações', to: '/app/configuracoes' },
      { icon: 'support', text: 'Suporte', to: '/app/suporte' },
    ]
  }

  return [principalSection, gestaoSection, marketingSection]
})

</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="sidebar-header-wrapper" v-click-outside="() => (isClinicDropdownOpen = false)">
      <ClinicDropdown v-if="isClinicDropdownOpen && !isCollapsed" />
      <div class="sidebar-header" @click="!isCollapsed && (isClinicDropdownOpen = !isClinicDropdownOpen)">
        <div class="clinic-logo">
          <img
            v-if="authStore.user?.clinic?.logoUrl"
            :src="authStore.user.clinic.logoUrl"
            alt="Logo da Clínica"
            class="clinic-logo-img"
          />
          <span v-else>{{ authStore.user?.clinic?.name?.charAt(0) || 'C' }}</span>
        </div>
        <h1 v-show="!isCollapsed" class="clinic-name">{{ authStore.user?.clinic?.name || 'Sua Clínica' }}</h1>
        <MoreHorizontal v-show="!isCollapsed" :size="20" class="options-icon" />
      </div>
    </div>

    <nav ref="sidebarNavRef" class="sidebar-nav">
      <!-- Indicador flutuante que desliza -->
      <div 
        class="sliding-indicator" 
        :style="{ 
          top: indicatorStyle.top, 
          height: indicatorStyle.height,
          opacity: indicatorStyle.opacity 
        }"
      ></div>
      
      <div v-for="(section, sectionIndex) in sidebarSections" :key="sectionIndex" class="nav-section">
        <!-- Título da seção -->
        <div v-if="section.title && !isCollapsed" class="section-title">
          {{ section.title }}
        </div>
        <div v-else-if="section.title && isCollapsed" class="section-divider"></div>
        
        <ul class="nav-links">
          <li v-for="link in section.links" :key="link.text" class="nav-item">
            <!-- Item com Submenu -->
            <div v-if="link.children" class="nav-item-wrapper">
              <div
                class="nav-link parent-link"
                :class="{ 'active': isParentActive(link.children), 'expanded': isExpanded(link.key) }"
                @click="toggleExpand(link.key)"
                :title="isCollapsed ? link.text : ''"
              >
                <AppIcon :name="link.icon" :size="20" />
                <span v-show="!isCollapsed" class="nav-text">{{ link.text }}</span>
                <ChevronDown
                  v-show="!isCollapsed"
                  :size="16"
                  class="chevron-icon"
                  :class="{ 'rotate': isExpanded(link.key) }"
                />
              </div>

              <!-- Submenu -->
              <div
                class="submenu-wrapper"
                :class="{ 'is-open': isExpanded(link.key) && !isCollapsed }"
              >
                <ul class="submenu">
                  <li v-for="child in link.children" :key="child.text">
                    <RouterLink :to="child.to" class="submenu-link" active-class="active-child">
                      <AppIcon :name="child.icon" :size="18" class="submenu-icon" />
                      <span class="submenu-text">{{ child.text }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Item Simples -->
            <RouterLink
              v-else
              :to="link.to"
              class="nav-link"
              :title="isCollapsed ? link.text : ''"
              :active-class="link.to === '/app' ? '' : 'active-link'"
              :exact-active-class="link.to === '/app' ? 'active-link' : ''"
            >
              <AppIcon :name="link.icon" :size="20" />
              <span v-show="!isCollapsed" class="nav-text">{{ link.text }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <div class="sidebar-branding" :class="{ 'is-collapsed': isCollapsed }">
      <img src="@/assets/logo_brand.svg" alt="Agenda Doutor" class="branding-logo" />
      <div v-show="!isCollapsed" class="branding-info">
        <span class="brand-name">Agenda Doutor</span>
        <span class="version-text">v{{ version }}</span>
      </div>
    </div>

    <div class="sidebar-footer">
      <div
        class="user-profile"
        @click="!isCollapsed && (isUserDropdownOpen = !isUserDropdownOpen)"
        v-click-outside="() => (isUserDropdownOpen = false)"
      >
        <UserDropdown v-if="isUserDropdownOpen && !isCollapsed" />
        <div class="user-avatar">
          {{ authStore.user?.name.charAt(0) || 'U' }}
        </div>
        <div v-show="!isCollapsed" class="user-details">
          <span class="user-name">{{ authStore.user?.name || 'Usuário' }}</span>
          <span class="user-email">{{ authStore.user?.email || 'email@exemplo.com' }}</span>
        </div>
        <MoreHorizontal v-show="!isCollapsed" :size="20" class="options-icon" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  padding: 1rem;
  background-color: #fafbfc;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-x: hidden;
  border-top-right-radius: 1rem;
  height: 100dvh;
}

.sidebar.is-collapsed {
  width: 72px;
  padding: 1rem 0.5rem;
}

/* Cabeçalho */
.sidebar-header-wrapper {
  position: relative;
  margin-bottom: 1.5rem;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.sidebar:not(.is-collapsed) .sidebar-header:hover {
  background-color: #edf0f4;
}
.sidebar.is-collapsed .sidebar-header {
  justify-content: center;
  padding: 0.5rem;
  cursor: default;
}
.clinic-logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 0.375rem;
  background-color: var(--branco);
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
.clinic-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.clinic-name {
  font-family: var(--fonte-titulo);
  font-size: 1rem;
  font-weight: 600;
  color: var(--preto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  transition: opacity 0.25s ease;
}
.sidebar.is-collapsed .clinic-name {
  opacity: 0;
}

/* Navegação */
.sidebar-nav {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  position: relative; /* Para o indicador flutuante */
}

/* Indicador flutuante que desliza */
.sliding-indicator {
  position: absolute;
  left: 0;
  width: 3px;
  background-color: var(--azul-principal);
  border-radius: 0 2px 2px 0;
  transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  pointer-events: none;
  transform: scaleY(0.6);
  transform-origin: center;
}

/* Esconde a barra de rolagem */
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}

/* Seções */
.nav-section {
  margin-bottom: 0.25rem;
}

.nav-section:first-child {
  margin-top: 0;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  padding: 0.5rem 0.75rem 0.375rem 0.75rem;
  margin-top: 0.25rem;
}

.section-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0.5rem;
}

.nav-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  width: 100%;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #525866;
  font-weight: 500;
  font-size: 0.875rem;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.2s ease,
              padding-left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link svg {
  transition: color 0.2s ease, transform 0.2s ease;
}

.sidebar.is-collapsed .nav-link {
  justify-content: center;
  padding: 0.625rem;
}

.nav-text {
  transition: opacity 0.25s ease;
  white-space: nowrap;
  flex-grow: 1;
}
.sidebar.is-collapsed .nav-text {
  opacity: 0;
  width: 0;
  display: none;
}

/* Hover suave */
.nav-link:hover {
  background-color: #f0f2f5;
  color: var(--azul-principal);
  padding-left: 0.875rem;
}

.nav-link:hover svg {
  color: var(--azul-principal);
}

/* Estado ativo com animação */
.active-link, .nav-link.active {
  background-color: #eef2ff;
  color: var(--azul-principal);
  font-weight: 600;
  border: 1px solid transparent;
}

.active-link svg, .nav-link.active svg {
  color: var(--azul-principal);
  transform: scale(1);
}

/* Chevron Icon */
.chevron-icon {
  transition: transform 0.3s ease;
  color: #9ca3af;
}
.chevron-icon.rotate {
  transform: rotate(180deg);
}

/* Submenu */
.submenu-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}

.submenu-wrapper.is-open {
  grid-template-rows: 1fr;
}

.submenu {
  overflow: hidden;
  list-style: none;
  padding: 0;
  margin: 0 0 0 1.5rem; /* Alinhado com o ícone do pai */
  border-left: 1px solid #e5e7eb; /* Linha guia vertical */
}

.submenu-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem 0.5rem 1rem; /* Ajustado para a linha */
  text-decoration: none;
  color: #6b7280;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  position: relative;
  margin-left: -1px; /* Para sobrepor a borda no active */
  border-left: 2px solid transparent; /* Prepara para o estado ativo */
}

.submenu-link:hover {
  color: var(--preto);
}

.submenu-icon {
  color: #9ca3af;
  transition: color 0.2s ease;
}

.submenu-link:hover .submenu-icon,
.active-child .submenu-icon {
  color: var(--azul-principal);
}

.active-child {
  color: var(--azul-principal);
  font-weight: 500;
  background-color: #f9fafb; /* Fundo sutil no ativo */
  border-left-color: var(--azul-principal); /* Linha ativa colorida */
}

/* Rodapé */
.sidebar-footer {
  position: relative;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
  display: none;
}
.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.sidebar.is-collapsed .user-profile {
  justify-content: center;
  padding: 0.5rem;
  cursor: default;
}
.sidebar:not(.is-collapsed) .user-profile:hover {
  background-color: #edf0f4;
}
.user-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}
.user-details {
  flex-grow: 1;
  overflow: hidden;
  transition: opacity 0.25s ease;
}
.sidebar.is-collapsed .user-details {
  opacity: 0;
}
.user-name {
  display: block;
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--preto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-email {
  display: block;
  font-size: 0.6875rem;
  color: var(--cinza-texto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.options-icon {
  color: var(--cinza-texto);
  flex-shrink: 0;
  transition: opacity 0.25s ease;
}
.sidebar.is-collapsed .options-icon {
  opacity: 0;
}

/* Branding */
.sidebar-branding {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: flex-start; /* Alinhado ao início */
  align-items: center;
  gap: 0.75rem;
  transition: opacity 0.25s ease;
}

.branding-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.branding-logo {
  height: 24px;
  width: auto;
  opacity: 1;
  filter: none;
  transition: opacity 0.2s ease;
}

.branding-logo:hover {
  opacity: 0.9;
}

.brand-name {
  font-weight: 700;
  color: #334155;
  font-size: 0.85rem;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.version-text {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .desktop-only {
    display: none;
  }
  .sidebar-footer {
    display: block;
  }
  .mobile-dropdown-icon {
    display: block;
  }
  /* Em mobile, sidebar sempre expandida quando visível */
  .sidebar.is-collapsed {
    width: 240px;
    padding: 1rem;
  }
  .sidebar.is-collapsed .nav-link {
    justify-content: flex-start;
    padding: 0.5rem 0.75rem;
  }
  .sidebar.is-collapsed .nav-text,
  .sidebar.is-collapsed .user-details,
  .sidebar.is-collapsed .options-icon,
  .sidebar.is-collapsed .clinic-name {
    opacity: 1;
    width: auto;
    display: block;
  }
  .sidebar.is-collapsed .sidebar-header {
    justify-content: flex-start;
  }
}
</style>
