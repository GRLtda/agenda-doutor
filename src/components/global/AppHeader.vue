<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Menu, X } from 'lucide-vue-next'

const isMobileMenuOpen = ref(false)
const isScrolled = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : ''
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header class="app-header-wrapper" :class="{ 'is-scrolled': isScrolled }">
    <div class="app-header-pill">
      <router-link to="/" class="logo">
        Agenda Doutor
      </router-link>



      <div class="actions desktop-only">
        <router-link to="/login" class="btn-login">Entrar</router-link>
      </div>

      <button @click="toggleMobileMenu" class="mobile-menu-toggle">
        <Menu :size="24" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isMobileMenuOpen" class="mobile-nav-overlay" @click.self="toggleMobileMenu">
          <div class="mobile-nav-content">
            <div class="mobile-nav-header">
              <span class="logo">Agenda Doutor</span>
              <button @click="toggleMobileMenu" class="close-btn">
                <X :size="24" />
              </button>
            </div>
            


            <div class="mobile-actions">
              <router-link to="/login" class="btn-login-mobile" @click="toggleMobileMenu">Entrar</router-link>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.app-header-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1.5rem 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none; /* Permite clicar através do wrapper, mas não da pílula */
}

.app-header-wrapper.is-scrolled {
  padding: 1rem 0;
}

.app-header-pill {
  pointer-events: auto;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 90%; /* Fallback para telas menores */
}

.is-scrolled .app-header-pill {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -2px rgba(0, 0, 0, 0.025),
    0 0 0 1px rgba(0, 0, 0, 0.02);
}

/* LOGO */
.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.25rem;
  color: #0f172a;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.logo-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}



/* ACTIONS */
.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-login {
  color: #0f172a;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  padding: 0.5rem 1rem;
  transition: color 0.2s ease;
}

.btn-login:hover {
  color: #2563eb;
}



/* MOBILE */
.mobile-menu-toggle {
  display: none;
  background: none;
  border: none;
  color: #0f172a;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-nav-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  pointer-events: auto;
}

.mobile-nav-content {
  width: 100%;
  max-width: 320px;
  background: white;
  height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
}

.mobile-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
}



.mobile-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-login-mobile {
  text-align: center;
  padding: 1rem;
  font-weight: 600;
  color: #0f172a;
  text-decoration: none;
  background: #f1f5f9;
  border-radius: 12px;
}



.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .desktop-only {
    display: none;
  }
  .mobile-menu-toggle {
    display: block;
  }
  .app-header-pill {
    padding: 0.75rem 1.25rem;
  }
}
</style>
