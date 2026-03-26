<script setup>
import { ref } from 'vue'
import { useLayoutStore } from '@/stores/layout'
import { useAuthStore } from '@/stores/auth'
import SubscribeButton from '@/components/SubscribeButton.vue'
import UserDropdown from '@/components/global/UserDropdown.vue'
import { Crown, CheckCircle2, AlertCircle, ChevronDown, X } from 'lucide-vue-next'

const layoutStore = useLayoutStore()
const authStore = useAuthStore()

const isUserDropdownOpen = ref(false)
</script>

<template>
  <Teleport to="body">
    <div v-if="layoutStore.isSubscriptionModalOpen" class="premium-overlay">
      <div class="premium-shell" @click="isUserDropdownOpen = false">
      <header class="premium-header">
        <div class="brand">
          <div class="brand-icon">
            <Crown :size="20" />
          </div>
          <div class="brand-texts">
            <span class="brand-title">Agenda Doutor Premium</span>
            <span class="brand-subtitle">Assinatura</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="user-area" @click.stop>
            <button class="user-trigger" @click="isUserDropdownOpen = !isUserDropdownOpen">
              <div class="user-avatar">
                <img
                  v-if="authStore.user?.profilePhotoUrl"
                  :src="authStore.user.profilePhotoUrl"
                  alt="Foto de perfil"
                  class="avatar-image"
                />
                <span v-else class="avatar-initials">{{ authStore.user?.name?.charAt(0) || 'U' }}</span>
              </div>
              <div class="user-details">
                <span class="user-name">{{ authStore.user?.name || 'Usuário' }}</span>
                <span class="user-email">{{ authStore.user?.email || 'email@exemplo.com' }}</span>
              </div>
              <ChevronDown :size="16" class="chevron-icon" :class="{ 'is-open': isUserDropdownOpen }" />
            </button>
            <UserDropdown v-if="isUserDropdownOpen" direction="down" />
          </div>

          <button class="close-btn" @click="layoutStore.closeSubscriptionModal">
            <X :size="18" />
          </button>
        </div>
      </header>

      <main class="premium-body">
        <section class="hero">
          <div class="hero-texts">
            <h1 class="title">Ative sua assinatura e mantenha a clínica no ritmo certo</h1>
            <p class="subtitle">
              Centralize agenda, prontuário, estoque e financeiro em um só lugar.
              Menos retrabalho, mais previsibilidade.
            </p>
          </div>

          <div class="hero-actions">
            <SubscribeButton class="premium-btn" />
            <p class="guarantee-text">Cancele quando quiser, sem letras miúdas.</p>
          </div>
        </section>

        <section class="lists-grid">
          <div class="list-card">
            <h3>Benefícios da assinatura</h3>
            <ul>
              <li><CheckCircle2 :size="18" /> Agenda unificada e sem conflitos</li>
              <li><CheckCircle2 :size="18" /> Prontuários digitais e organização das anamneses</li>
              <li><CheckCircle2 :size="18" /> Estoque com alertas e rastreio de consumo</li>
              <li><CheckCircle2 :size="18" /> Fluxo financeiro simples no checkout</li>
            </ul>
          </div>

          <div class="list-card warning">
            <h3>Sem assinatura, você volta para</h3>
            <ul>
              <li><AlertCircle :size="18" /> Papel e caneta no dia a dia</li>
              <li><AlertCircle :size="18" /> Anamneses guardadas em pastas físicas</li>
              <li><AlertCircle :size="18" /> Estoque em planilhas dispersas</li>
              <li><AlertCircle :size="18" /> Divergências de calendário entre equipe</li>
            </ul>
          </div>
        </section>
      </main>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.premium-overlay {
  position: fixed;
  inset: 0;
  background: #f8fafc;
  z-index: 9999;
  overflow: auto;
}

.premium-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.premium-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.85rem;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
}

.brand-texts {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 1rem;
}

.brand-subtitle {
  font-size: 0.8rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-area {
  position: relative;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.9rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 320px;
}

.user-trigger:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 0.75rem;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #475569;
  font-weight: 700;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.75rem;
  color: #6b7280;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron-icon {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  border-color: #cbd5e1;
  color: #111827;
}

.premium-body {
  flex: 1;
  padding: 2.5rem 2rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  align-items: flex-start;
}

.hero-texts {
  max-width: 620px;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  line-height: 1.6;
}

.hero-actions {
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.premium-btn {
  width: 100%;
}

.guarantee-text {
  font-size: 0.85rem;
  color: #94a3b8;
}

.lists-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.list-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.5rem;
}

.list-card.warning {
  border-color: #fee2e2;
  background: #fff7f7;
}

.list-card h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1rem;
}

.list-card ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  color: #334155;
}

.list-card li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
}

.list-card svg {
  color: #10b981;
  flex-shrink: 0;
}

.list-card.warning svg {
  color: #ef4444;
}

@media (max-width: 1024px) {
  .hero {
    flex-direction: column;
  }
  .hero-actions {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .premium-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .user-trigger {
    width: 100%;
  }
  .premium-body {
    padding: 2rem 1.5rem 2.5rem;
  }
  .lists-grid {
    grid-template-columns: 1fr;
  }
  .title {
    font-size: 1.6rem;
  }
}
</style>
