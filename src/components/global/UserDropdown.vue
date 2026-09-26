<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, User, CreditCard, LifeBuoy, MessageCircle } from 'lucide-vue-next'

const props = defineProps({
  direction: {
    type: String,
    default: 'up', // 'up' or 'down'
    validator: (value) => ['up', 'down'].includes(value),
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'onboarding'].includes(value),
  },
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isOnboarding = computed(() => props.variant === 'onboarding')

function openProfileModal() {
  router.replace({
    query: {
      ...route.query,
      profile: '1',
      settings: undefined,
      tab: undefined,
    },
  })
}

function openSubscriptionTab() {
  router.replace({
    query: {
      ...route.query,
      profile: '1',
      profileTab: 'subscription',
      settings: undefined,
      tab: undefined,
    },
  })
}

function handleSupport() {
  const message = encodeURIComponent('Olá! Preciso de ajuda para escolher meu plano.')
  window.open(`https://wa.me/5511921923978?text=${message}`, '_blank', 'noopener,noreferrer')
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <div class="dropdown-menu" :class="`direction-${direction}`" role="menu">
    <ul>
      <li v-if="!isOnboarding">
        <button class="dropdown-item" role="menuitem" @click="openProfileModal">
          <User :size="16" />
          <span>Perfil</span>
        </button>
      </li>
      <li v-if="!isOnboarding && authStore.user?.role === 'owner'">
        <button class="dropdown-item" role="menuitem" @click="openSubscriptionTab">
          <CreditCard :size="16" />
          <span>Assinatura</span>
        </button>
      </li>

      <li v-if="!isOnboarding" class="separator"></li>

      <li>
        <button
          class="dropdown-item"
          role="menuitem"
          @click="isOnboarding ? handleSupport() : router.push('/ajuda')"
        >
          <MessageCircle v-if="isOnboarding" :size="16" />
          <LifeBuoy v-else :size="16" />
          <span>{{ isOnboarding ? 'Suporte pelo WhatsApp' : 'Central de Ajuda' }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item text-red" role="menuitem" @click="handleLogout()">
          <LogOut :size="16" />
          <span>{{ isOnboarding ? 'Sair' : 'Deslogar' }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown-menu {
  position: absolute;
  right: 0;
  background-color: var(--branco);
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  width: 220px;
  z-index: 100;
  animation: fade-in 0.2s ease-out;
}

.dropdown-menu.direction-up {
  bottom: 110%;
}

.dropdown-menu.direction-down {
  top: 120%;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

ul {
  list-style: none;
  padding: 0.5rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}

.separator {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0;
}

.text-red {
  color: #ef4444;
}

.text-red:hover {
  background-color: #fef2f2;
  color: #dc2626;
}
</style>
