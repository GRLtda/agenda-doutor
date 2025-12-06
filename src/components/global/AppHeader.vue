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
  <header class="app-header" :class="{ 'is-scrolled': isScrolled }">
    <div class="app-header-content">
      
      <!-- ESQUERDA: Menu Mobile (apenas mobile) ou Espaço vazio (desktop) -->
      <div class="nav-left">
        <button @click="toggleMobileMenu" class="mobile-menu-toggle">
          <Menu :size="24" />
        </button>
      </div>

      <!-- CENTRO: Logo -->
      <div class="logo-wrapper">
        <router-link to="/" class="logo">
          <img src="@/assets/logo_dark.svg" alt="Agenda Doutor" class="logo-img" />
        </router-link>
      </div>

      <!-- DIREITA: Login -->
      <div class="nav-right">
        <router-link to="/login" class="btn-login">Entrar</router-link>
      </div>

    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isMobileMenuOpen" class="mobile-nav-overlay" @click.self="toggleMobileMenu">
          <div class="mobile-nav-content">
            <div class="mobile-nav-header">
              <span class="logo">
                <img src="@/assets/logo_dark.svg" alt="Agenda Doutor" class="logo-img" />
              </span>
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
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8); /* Fundo sempre visível, mas levemente transparente */
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  height: 80px; /* Altura fixa para evitar pulos */
  display: flex;
  align-items: center;
}

.app-header.is-scrolled {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  height: 70px; /* Leve redução ao rolar */
}

.app-header-content {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* Grid de 3 colunas: 1fr (nav-left) | auto (logo) | 1fr (nav-right) */
  align-items: center;
}

/* LEFT AREA */
.nav-left {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* CENTER AREA */
.logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-img {
  height: 48px;
  width: auto;
  transition: height 0.3s ease;
}

.is-scrolled .logo-img {
  height: 40px;
}

/* RIGHT AREA */
.nav-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.btn-login {
  color: #0f172a;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  border: 1px solid #e2e8f0;
  padding: 0.6rem 1.5rem;
  border-radius: 99px;
  transition: all 0.2s ease;
  background-color: transparent;
}

.btn-login:hover {
  background-color: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

/* MOBILE AREA */
.mobile-menu-toggle {
  display: none; /* Escondido no desktop */
  background: none;
  border: none;
  color: #0f172a;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: -0.5rem; /* Alinhamento visual */
}

/* Mobile Menu Styles */
.mobile-nav-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: flex-start; /* Menu saindo da esquerda é mais comum, mas mantive o padrão anterior layout */
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
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
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
  .app-header-content {
    display: flex; /* Flex no mobile para facilitar espaçamento */
    justify-content: space-between;
    padding: 0 1rem;
  }
  
  /* No mobile, o grid 1fr auto 1fr pode não funcionar tão bem se o logo crescer demais, 
     mas vamos manter o flex space-between clássico */
   
   .nav-left {
     order: 1;
     flex: 0 0 auto;
   }
   
   .logo-wrapper {
     order: 2;
     flex: 1; /* Ocupa o espaço */
     /* Logo no centro apenas se houver espaço, mas geralmente no mobile fica logo ao lado do menu ou centro absoluto */
     /* Vamos forçar centro absoluto usando position ou margens se quiser */
     position: absolute;
     left: 50%;
     transform: translateX(-50%);
   }
  
  .nav-right {
    order: 3;
    flex: 0 0 auto;
    /* Esconder o botão de login no header mobile se desejar, e mostrar só no menu hambúrguer? 
       Geralmente botão de login fica visível ou vai pro menu. Vou manter visível SE couber, ou esconder.
       O design anterior escondia 'desktop-only'. Vamos esconder o botão de login do header no mobile
       e deixar só no menu hambúrguer para limpar a interface.
    */
    display: none;
  }

  .mobile-menu-toggle {
    display: block;
  }
}
</style>
