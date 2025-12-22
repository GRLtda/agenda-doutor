<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const isMobileMenuOpen = ref(false)
const isScrolled = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : ''
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

function scrollToSection(id) {
  // Se não estiver na home, vai para a home primeiro
  if (route.path !== '/') {
    router.push({ path: '/', hash: `#${id}` })
    return
  }

  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    if (isMobileMenuOpen.value) toggleMobileMenu()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header class="landing-header" :class="{ 'is-scrolled': isScrolled }">
      <div class="header-container">
        <div class="logo">
          <router-link to="/">
            <img src="@/assets/logo_dark.svg" alt="Agenda Doutor" style="height: 32px;" />
          </router-link>
        </div>

        <nav class="desktop-nav">
          <a href="#funcionalidades" @click.prevent="scrollToSection('funcionalidades')">Funcionalidades</a>
          <a href="#beneficios" @click.prevent="scrollToSection('beneficios')">Benefícios</a>
          <a href="#faq" @click.prevent="scrollToSection('faq')">FAQ</a>
          <a href="#contato" @click.prevent="scrollToSection('footer')">Contato</a>
        </nav>

        <div class="header-actions">
          <router-link to="/login" class="btn-login">Login</router-link>
          <router-link to="/register" class="btn-primary-sm">Começar agora</router-link>
        </div>

        <!-- Mobile Toggle -->
        <button class="mobile-toggle" @click="toggleMobileMenu">
          <Menu v-if="!isMobileMenuOpen" />
          <X v-else />
        </button>
      </div>

      <!-- Mobile Menu -->
      <div v-if="isMobileMenuOpen" class="mobile-menu">
        <nav>
          <a href="#funcionalidades" @click="toggleMobileMenu()">Funcionalidades</a>
          <a href="#beneficios" @click="toggleMobileMenu()">Benefícios</a>
          <a href="#faq" @click="toggleMobileMenu()">FAQ</a>
          <div class="mobile-actions-list">
            <router-link to="/login" class="btn-login-mobile">Login</router-link>
            <router-link to="/register" class="btn-primary mobile-full">Começar agora</router-link>
          </div>
        </nav>
      </div>
    </header>
</template>

<style scoped>
/* Header Styles moved from LandingView.vue */
.landing-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 80px;
  display: flex;
  align-items: center;
  z-index: 100;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1); 
  backdrop-filter: blur(0px);
}
.landing-header.is-scrolled {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  height: 60px;
}
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  position: relative; /* Context for absolute nav */
}
.logo { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 1.25rem; color: #0f172a; }

.desktop-nav { 
  display: flex; 
  gap: 2rem; 
  align-items: center; 
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.desktop-nav a { font-weight: 500; font-size: 0.95rem; color: #475569; position: relative; cursor: pointer; text-decoration: none; }
.desktop-nav a:hover { color: var(--primary); }

.header-actions { display: flex; align-items: center; gap: 1rem; }

.btn-primary-sm {
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
  text-decoration: none;
}
.btn-primary-sm:hover { background: var(--primary-dark); }

.btn-login {
  color: var(--text-main);
  padding: 0.6rem 1.25rem;
  font-weight: 500;
  text-decoration: none;
}
.btn-login:hover { color: var(--primary); }

.mobile-toggle { display: none; background: none; border: none; cursor: pointer; color: #0f172a; }

/* Mobile Menu */
.mobile-menu {
  position: absolute; top: 100%; left: 0; right: 0;
  background: white; padding: 2rem;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  display: flex; flex-direction: column; gap: 1rem;
}
.mobile-menu a { font-size: 1.1rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; display: block; text-decoration: none; color: #1e293b; }
.mobile-actions-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.mobile-full { width: 100%; text-align: center; }
.btn-login-mobile { text-align: center; padding: 0.8rem; background: #f8fafc; border-radius: 8px; font-weight: 600; text-decoration: none; color: #1e293b; }

.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.875rem 2rem;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3);
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
  text-decoration: none;
}

@media(max-width: 900px) {
  .desktop-nav, .header-actions { display: none; }
  .mobile-toggle { display: block; }
}
</style>
