<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppIcon from '@/components/global/AppIcon.vue' // Use AppIcon
import { Menu } from 'lucide-vue-next' // Keep Menu for "Mais" as it's not in AppIcon
import { usePlanAccess } from '@/composables/usePlanAccess'

const router = useRouter()
const route = useRoute()
const { hasAccess } = usePlanAccess()

const emit = defineEmits(['open-menu'])

const navItems = computed(() => {
  const items = [
    {
      label: 'Resumo',
      icon: 'dashboard', // Sidebar uses 'dashboard'
      route: '/app',
      exact: true
    },
    {
      label: 'Atendimentos',
      icon: 'calendar', // Sidebar uses 'calendar'
      route: '/app/atendimentos'
    },
    {
      label: 'Pacientes',
      icon: 'users', // Sidebar uses 'users'
      route: '/app/pacientes'
    }
  ]
  
  if (hasAccess('finance')) {
    items.push({
      label: 'Financeiro',
      icon: 'dollar', // Sidebar uses 'dollar'
      route: '/app/financeiro'
    })
  }

  return items
})

const isActive = (item) => {
  if (item.exact) {
    return route.path === item.route
  }
  return route.path.startsWith(item.route)
}

const navigate = (path) => {
  router.push(path)
}
</script>

<template>
  <nav class="bottom-nav">
    <div 
      v-for="item in navItems" 
      :key="item.route"
      class="nav-item"
      :class="{ 'active': isActive(item) }"
      @click="navigate(item.route)"
      :title="item.label"
    >
      <div class="icon-container">
        <AppIcon :name="item.icon" :size="25" />
        <div class="active-indicator"></div>
      </div>
    </div>

    <!-- Menu Hamburger -->
    <div class="nav-item" @click="$emit('open-menu')" title="Mais">
        <div class="icon-container">
            <Menu :size="25" :stroke-width="2" />
        </div>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  height: 70px;
  background-color: #ffffff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 900;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  padding: 0 10px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  color: #9ca3af;
  transition: all 0.3s ease;
  cursor: pointer;
}

.icon-container {
  position: relative; /* Needed for absolute positioning of indicator */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.2s ease;
  background-color: transparent;
  width: 48px; /* Fixed width/height for consistent square/shape */
  height: 48px;
}

.nav-item.active {
  color: var(--azul-principal);
}

.nav-item.active .icon-container {
  background-color: #f3f4f6;
}

/* The "barrinha" (indicator) */
.active-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0); /* Start hidden/scaled down */
  width: 20px; /* Width of the bar */
  height: 4px; /* Height */
  background-color: var(--azul-principal);
  border-radius: 4px 4px 0 0; /* Top corners rounded only */
  opacity: 0;
  transition: all 0.3s ease;
}

.nav-item.active .active-indicator {
  opacity: 1;
  transform: translateX(-50%) scaleX(1); /* Reveal */
}

.nav-item:active {
    transform: scale(0.95);
}



/* Garante que não apareça em Desktop via media query no pai ou display:none aqui */
@media (min-width: 1025px) {
  .bottom-nav {
    display: none;
  }
}
</style>
