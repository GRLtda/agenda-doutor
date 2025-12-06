<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { LogOut, User, CreditCard, Settings, LifeBuoy } from 'lucide-vue-next'

const props = defineProps({
  direction: {
    type: String,
    default: 'up', // 'up' or 'down'
    validator: (value) => ['up', 'down'].includes(value)
  }
})

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dropdown-menu" :class="`direction-${direction}`">
    <ul>
      <li>
        <button class="dropdown-item">
          <User :size="16" />
          <span>Perfil</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item">
          <CreditCard :size="16" />
          <span>Assinatura</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item">
          <Settings :size="16" />
          <span>Configurações</span>
        </button>
      </li>
      
      <li class="separator"></li>

      <li>
        <button class="dropdown-item" @click="router.push('/app/ajuda')">
          <LifeBuoy :size="16" />
          <span>Central de Ajuda</span>
        </button>
      </li>
      <li>
        <button @click="handleLogout()" class="dropdown-item text-red">
          <LogOut :size="16" />
          <span>Deslogar</span>
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
  z-index: 10;
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
