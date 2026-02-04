<script setup>
import { useRouter } from 'vue-router'
import { Settings, UserPlus, Info } from 'lucide-vue-next'

const router = useRouter()

function navigateTo(path, query = {}) {
  router.push({ path, query })
}
</script>

<template>
  <div class="dropdown-menu">
    <ul>
      <li>
        <button @click="navigateTo('/configuracoes')" class="dropdown-item">
          <Settings :size="16" />
          <span>Configurações</span>
        </button>
      </li>
      <li>
        <button @click="navigateTo('/ajuda')" class="dropdown-item">
          <Info :size="16" />
          <span>Ajuda</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: var(--branco);
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  width: 220px;
  z-index: 100;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
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
</style>
