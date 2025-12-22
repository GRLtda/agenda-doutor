<script setup>
import { RouterLink } from 'vue-router'
import { Instagram, MessageCircle } from 'lucide-vue-next'
</script>

<template>
  <footer id="footer" class="landing-footer">
    <div class="footer-bg-logo">
      <img src="@/assets/logo_texto.svg" alt="Agenda Doutor Background" />
    </div>
    
    <div class="container footer-content">
      <div class="footer-col brand-col">
        <div class="logo-wrapper-footer">
          <img src="@/assets/logo_dark.svg" alt="Agenda Doutor" class="logo-footer-img"/> 
        </div>
        <p class="brand-tagline">Transformando a gestão em todo o Brasil.</p>
        
        <div class="system-status">
          <span class="status-dot"></span>
          <span>Todos os sistemas operacionais</span>
        </div>
      </div>
      
      <div class="footer-col links-col">
        <h4>Produto</h4>
        <a href="/#funcionalidades">Funcionalidades</a>
        <a href="/#beneficios">Benefícios</a>
        <a href="/login">Área do Cliente</a>
      </div>
      
      <div class="footer-col links-col">
        <h4>Suporte</h4>
        <a href="https://wa.me/5511921923978">Central de Ajuda</a>
        <a href="https://wa.me/5511921923978">Fale Conosco</a>
        <a href="https://wa.me/5511921923978">WhatsApp</a>
      </div>

      <div class="footer-col links-col">
        <h4>Legal</h4>
        <router-link to="/termos">Termos de Uso</router-link>
        <router-link to="/privacidade">Privacidade</router-link>
        <router-link to="/lgpd">LGPD</router-link>
      </div>
    </div>
    
    <div class="footer-bottom container">
      <div class="copyright">
        © {{ new Date().getFullYear() }} Agenda Doutor. Todos os direitos reservados.
      </div>
      <div class="social-links">
          <a href="https://instagram.com/agendadoutor"  class="social-icon"><Instagram :size="20"/></a>
          <a href="https://wa.me/5511921923978" target="_blank" class="social-icon"><MessageCircle :size="20"/></a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer {
  background: #f8fafc;
  color: #475569;
  padding: 10rem 0 2rem;
  position: relative;
  z-index: 10; /* Lower than CTA but establishes context */
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  --primary: #2563eb;
}

.footer-bg-logo {
  position: absolute;
  top: 80%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 110%;
  pointer-events: none;
  z-index: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  mask-image: linear-gradient(to bottom, transparent 20%, black 30%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 20%, black 30%);
}
.footer-bg-logo img {
  width: 100%;
  height: auto;
  opacity: .026;
  filter: grayscale(100%) brightness(0);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.footer-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 4rem;
  margin-bottom: 4rem;
}

.brand-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.logo-wrapper-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-footer-img {
  height: 32px;
  width: auto;
}

.brand-tagline {
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 300px;
  color: #64748b;
}

.system-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #0f172a;
  width: fit-content;
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.footer-col h4 {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
}

.links-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.links-col a {
  font-size: 0.95rem;
  color: #64748b;
  text-decoration: none;
  transition: 0.3s;
}

.links-col a:hover {
  color: var(--primary);
  transform: translateX(2px);
}

.footer-bottom {
  position: relative;
  z-index: 1;
  border-top: 1px solid #e2e8f0;
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #94a3b8;
}

.social-links {
  display: flex;
  gap: 1rem;
}
.social-icon {
  color: #94a3b8;
  transition: color 0.3s;
}
.social-icon:hover {
  color: var(--primary);
}

@media(max-width: 900px) {
  .landing-footer {
    padding-top: 6rem;
  }
  .footer-content {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 3rem;
    column-gap: 1.5rem;
  }
  .brand-col {
    grid-column: span 3;
    text-align: left;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .brand-tagline {
    margin: 0;
  }
  .footer-bottom {
    flex-direction: column-reverse;
    gap: 1.5rem;
    text-align: center;
  }
}

@media(max-width: 600px) {
  .landing-footer {
    padding-top: 6rem; /* More space for the bg logo */
    overflow: hidden; 
  }
  .footer-bg-logo {
    display: flex;
    width: 150%; /* Larger on mobile */
    top: 60%;
    opacity: 0.5; /* Slightly more visible if needed, or keep same opacity but larger */
  }
  .footer-content {
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem 1rem;
    margin-bottom: 3rem;
    text-align: left;
  }
  .brand-col {
    grid-column: 1 / -1;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2rem;
    margin-bottom: 0;
    align-items: flex-start; /* Ensure left alignment */
  }
  .links-col {
    align-items: flex-start;
  }
  
  .footer-col h4 {
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
  .links-col a {
    font-size: 0.9rem;
    padding: 0.2rem 0;
  }
}
</style>
