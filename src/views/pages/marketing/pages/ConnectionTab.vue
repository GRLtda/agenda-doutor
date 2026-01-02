<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Wifi, 
  QrCode, 
  LogOut, 
  ShieldCheck, 
  Lock,
  MessageSquare,
  Server,
  Zap,
  Activity,
  RefreshCw,
  Mail,
  Globe,
  Briefcase,
  User
} from 'lucide-vue-next'
import { useCrmStore } from '@/stores/crm'

const crmStore = useCrmStore()

const status = computed(() => crmStore.status)
const qrCode = computed(() => crmStore.qrCode)
const isLoading = computed(() => crmStore.isLoading) // Loading geral da store
const connections = computed(() => crmStore.connections)
const isLoadingQrImage = computed(() => crmStore.isLoadingQrImage) // Pega o novo estado

const isTransitioning = ref(false)
const lastQrCode = ref('')

// Helpers para dados da instância
// Helpers para dados da instância
const instanceInfo = computed(() => connections.value[0]?.instance || {})
const apiVersion = computed(() => connections.value[0]?.apiVersion || 'v1.0.0')
const sessionId = computed(() => connections.value[0]?.sessionId || '---')

// Persiste o último QR Code válido para a animação
watch(qrCode, (newQr) => {
  if (newQr) {
    lastQrCode.value = newQr
  }
})

watch(status, (newStatus, oldStatus) => {
  // Só anima se não vier de 'disconnected' (evita animação ao recarregar a página já conectado)
  if (newStatus === 'connected' && oldStatus !== 'disconnected') {
    isTransitioning.value = true
    setTimeout(() => {
      isTransitioning.value = false
    }, 2000) // 2 segundos de transição
  }
})

async function initiateConnection() {
  await crmStore.initiateOrResetConnection()
}

async function logoutConnection() {
  await crmStore.logoutConnection()
}

async function getInitialStatus() {
  await crmStore.getInitialStatus()
}

function formatPhoneNumber(jid) {
  if (!jid) return 'Número desconhecido';
  // Remove o sufixo @s.whatsapp.net
  const number = jid.replace('@s.whatsapp.net', '');
  
  // Formatação simples para números brasileiros (ex: 5515991136994 -> +55 (15) 99113-6994)
  // Verifica se começa com 55 e tem tamanho suficiente
  if (number.startsWith('55') && number.length >= 12) {
    const ddd = number.substring(2, 4);
    const prefix = number.substring(4, number.length - 4);
    const suffix = number.substring(number.length - 4);
    return `+55 (${ddd}) ${prefix}-${suffix}`;
  }
  
  return number;
}

onMounted(() => {
  getInitialStatus()
})

onUnmounted(() => {
  crmStore.stopPolling()
})
</script>

<template>
  <div class="connection-tab dashboard-container">
    
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <div class="header-text">
            <h1 class="title">Conexão WhatsApp</h1>
            <p class="subtitle">Gerencie a conexão da sua clínica com o WhatsApp API.</p>
        </div>
      </div>
      
      <div class="header-right">
        <div class="status-capsule" :class="status === 'connected' ? 'status-online' : 'status-offline'">
           <div class="status-indicator"></div>
           <span>{{ status === 'connected' ? 'Online' : 'Desconectado' }}</span>
        </div>
      </div>
    </header>

    <!-- VIEW CONECTADO -->
    <div v-if="status === 'connected' && !isTransitioning" class="connected-dashboard">
      
      <!-- Top Grid: KPIs -->
      <div class="top-grid">
        <!-- Status -->
        <div class="kpi-card" title="Estado atual da conexão com o WhatsApp">
          <div class="kpi-header">
            <span class="kpi-label">Status da Conexão</span>
            <div class="icon-bg bg-green-50">
              <Wifi :size="18" class="text-green-500" />
            </div>
          </div>
          <div class="kpi-body">
            <span class="kpi-value text-green-600">Ativo</span>
            <span class="kpi-sub">Conectado e operante</span>
          </div>
        </div>

        <!-- Sessão -->
        <div class="kpi-card" title="Tipo de conta configurada (Business ou Pessoal)">
          <div class="kpi-header">
            <span class="kpi-label">Tipo de Conta</span>
            <div class="icon-bg bg-blue-50">
              <Briefcase v-if="instanceInfo.isBusiness" :size="18" class="text-blue-500" />
              <User v-else :size="18" class="text-blue-500" />
            </div>
          </div>
          <div class="kpi-body">
            <span class="kpi-value capitalize">{{ instanceInfo.isBusiness ? 'Business' : 'Pessoal' }}</span>
            <span class="kpi-sub">{{ instanceInfo.platform === 'md' ? 'Multi-device' : (instanceInfo.platform || 'Legacy') }}</span>
          </div>
        </div>

        <!-- Número -->
        <div class="kpi-card" title="Número e Nome da conta conectada">
          <div class="kpi-header">
            <span class="kpi-label">Número Conectado</span>
            <div class="icon-bg bg-emerald-50">
              <MessageSquare :size="18" class="text-emerald-500" />
            </div>
          </div>
          <div class="kpi-body">
            <span class="kpi-value phone-number">{{ formatPhoneNumber(connections[0]?.number) }}</span>
            <span class="kpi-sub">{{ connections[0]?.username || connections[0]?.name || 'WhatsApp' }}</span>
          </div>
        </div>

      </div>

      <!-- Main Content: Profile & Actions -->
      <div class="main-content-grid">
        <div class="table-card profile-details-card">
           <div class="card-header">
              <div class="card-header-text">
                <h3 class="card-title">Detalhes da Conta</h3>
                <p class="card-subtitle">Informações públicas do perfil conectado.</p>
              </div>
           </div>
           
           <div class="profile-content">
             <div class="profile-avatar-large">
                <img
                  v-if="connections[0]?.profileImage"
                  :src="connections[0].profileImage"
                  alt="Perfil WhatsApp"
                  class="profile-image"
                />
                <div v-else class="profile-image-placeholder">
                  <Smartphone :size="48" />
                </div>
                <div class="status-badge-profile">
                   <CheckCircle :size="20" class="text-white fill-green-500" />
                </div>
             </div>
             
             <div class="profile-info-large">
                <h2>{{ connections[0]?.username || connections[0]?.name || 'WhatsApp' }}</h2>
                <p class="phone-display">{{ formatPhoneNumber(connections[0]?.number) }}</p>
                
                <div class="tags-row">
                   <div class="security-badge">
                      <ShieldCheck :size="14" />
                      E2E Encrypted
                   </div>
                   <div v-if="instanceInfo.isBusiness" class="business-badge">
                      <Briefcase :size="14" />
                      Conta Comercial
                   </div>
                </div>

                <!-- Business Info Expansion -->
                <div v-if="instanceInfo.isBusiness" class="business-details-list">
                    <div v-if="instanceInfo.email" class="detail-item">
                        <Mail :size="14" class="text-gray-400" />
                        <span>{{ instanceInfo.email }}</span>
                    </div>
                    <div v-if="instanceInfo.websites && instanceInfo.websites.length > 0" class="detail-item">
                        <Globe :size="14" class="text-gray-400" />
                        <a :href="instanceInfo.websites[0]" target="_blank" rel="noopener">{{ instanceInfo.websites[0] }}</a>
                    </div>
                    <div v-if="instanceInfo.description" class="detail-item description">
                        <span>"{{ instanceInfo.description }}"</span>
                    </div>
                </div>
             </div>

             <div class="profile-actions">
                <button
                  @click="logoutConnection"
                  :disabled="isLoading"
                  class="btn-disconnect"
                >
                  <LogOut :size="18" />
                  <span>{{ isLoading ? 'Desconectando...' : 'Desconectar Sessão' }}</span>
                </button>
             </div>
           </div>
        </div>

        <!-- Recent Logs / Placeholder -->
        <div class="table-card">
           <div class="card-header">
              <div class="card-header-text">
                <h3 class="card-title">Logs de Conexão</h3>
                <p class="card-subtitle">Histórico recente de atividades da sessão.</p>
              </div>
              <button class="refresh-btn" title="Atualizar">
                  <RefreshCw :size="16" />
              </button>
           </div>
           
           <div class="logs-list">
              <!-- Placeholder Logs -->
              <div class="log-item">
                 <div class="log-icon success"><CheckCircle :size="14" /></div>
                 <div class="log-content">
                    <span class="log-msg">Sessão estabelecida com sucesso</span>
                    <span class="log-time">Agora</span>
                 </div>
              </div>
              <div class="log-item">
                 <div class="log-icon info"><Activity :size="14" /></div>
                 <div class="log-content">
                    <span class="log-msg">Perfil Business sincronizado</span>
                    <span class="log-time">há 1 min</span>
                 </div>
              </div>
              <div class="log-item">
                 <div class="log-icon info"><Activity :size="14" /></div>
                 <div class="log-content">
                    <span class="log-msg">Verificação de status automática</span>
                    <span class="log-time">há 5 min</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Technical Footer -->
      <footer class="tech-footer">
          <div class="tech-info">
             <span>API Version: {{ apiVersion }}</span>
             <span class="separator">•</span>
             <span>Session ID: {{ sessionId }}</span>
          </div>
      </footer>

    </div>

    <!-- VIEW DESCONECTADO / CONECTANDO -->
    <div v-else class="disconnected-view">
       <div class="table-card center-card">
          <div class="card-header centered-header">
             <div class="header-icon-large">
                <QrCode :size="48" class="text-blue-500" />
             </div>
             <h2 class="card-title-large">Conectar WhatsApp</h2>
             <p class="card-subtitle-large">
               Escaneie o QR Code abaixo com o aplicativo WhatsApp para conectar sua clínica.
             </p>
          </div>

          <div class="connection-body">
             <!-- Botão Iniciar -->
             <div v-if="status === 'disconnected'" class="action-area">
                <button @click="initiateConnection" :disabled="isLoading" class="btn-primary-large">
                  <Smartphone :size="20" />
                  <span>{{ isLoading ? 'Iniciando...' : 'Gerar QR Code' }}</span>
                </button>
                <p class="help-text">Clique para iniciar o processo de conexão.</p>
             </div>

             <!-- Displays de Status -->
             <div v-if="status === 'creating_qr'" class="status-display creating-qr">
               <Loader :size="24" class="animate-spin" />
               <span>Criando sessão segura...</span>
             </div>

             <div v-if="status === 'initializing'" class="status-display initializing">
               <Loader :size="24" class="animate-spin" />
               <span>Inicializando serviços...</span>
             </div>

             <!-- Área do QR Code -->
             <div v-if="status === 'qrcode_pending' || status === 'qrcode' || isTransitioning" class="qr-code-section">
                <p class="qr-instruction" v-if="!isTransitioning">Abra o WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho</p>
                <div class="qr-code-border">
                   <div class="qr-code-wrapper">
                         <img
                           v-if="qrCode || (isTransitioning && lastQrCode)"
                           :src="qrCode || lastQrCode"
                           alt="QR Code WhatsApp"
                           :class="{ 'fade-out': isLoadingQrImage && qrCode, 'qr-blur': isTransitioning }" />
                         
                         <div v-if="isLoadingQrImage && !isTransitioning" class="qr-placeholder loading-overlay">
                            <Loader :size="32" class="animate-spin text-blue-500" />
                         </div>
                         <div v-else-if="!qrCode && !isLoadingQrImage && !isTransitioning" class="qr-placeholder">
                             <Loader :size="24" class="animate-spin" /> Gerando...
                         </div>

                         <!-- Overlay de Sucesso -->
                         <div v-if="isTransitioning" class="success-overlay">
                            <div class="success-icon-wrapper">
                               <CheckCircle :size="64" class="text-green-500" />
                            </div>
                            <span class="success-text">Conectado!</span>
                         </div>
                   </div>
                   <!-- Scan Line Animation -->
                   <div class="scan-line" v-if="!isTransitioning && qrCode"></div>
                </div>
                <p class="qr-expiry" v-if="!isTransitioning">O código expira em breve.</p>
             </div>
          </div>

          <!-- Benefits Section -->
          <div v-if="status === 'disconnected'" class="benefits-section">
              <h4 class="benefits-title">Por que conectar?</h4>
              <ul class="benefits-list">
                  <li><CheckCircle :size="16" class="text-green-500" /> Automação de agendamentos 24/7</li>
                  <li><CheckCircle :size="16" class="text-green-500" /> Lembretes automáticos para pacientes</li>
                  <li><CheckCircle :size="16" class="text-green-500" /> Centralização do atendimento no CRM</li>
              </ul>
          </div>
       </div>

       <div class="security-footer">
          <Lock :size="14" />
          <span>Seus dados são protegidos com criptografia de ponta a ponta. Não temos acesso às suas mensagens privadas.</span>
       </div>
    </div>

  </div>
</template>

<style scoped>
.dashboard-container {
  font-family: var(--fonte-principal);
  color: var(--preto);
  width: 100%;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
  color: var(--preto);
  line-height: 1.2;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

.status-capsule {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 1rem;
    border-radius: 99px;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid transparent;
}

.status-online {
    background-color: #dcfce7;
    color: #16a34a;
    border-color: #bbf7d0;
}

.status-offline {
    background-color: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
}
.status-online .status-indicator {
    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2);
}

/* --- GRIDS --- */
.top-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.main-content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
}

.disconnected-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
}

/* --- CARDS --- */
.kpi-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.kpi-label {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 600;
}

.icon-bg {
    padding: 0.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bg-green-50 { background-color: #f0fdf4; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-emerald-50 { background-color: #ecfdf5; }
.bg-purple-50 { background-color: #faf5ff; }

.text-green-500 { color: #22c55e; }
.text-blue-500 { color: #3b82f6; }
.text-emerald-500 { color: #10b981; }
.text-purple-500 { color: #a855f7; }
.text-green-600 { color: #16a34a; }

.kpi-body {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preto);
  margin-bottom: 0.25rem;
}

.phone-number {
  letter-spacing: 0.2px;
}

.kpi-sub {
  font-size: 0.8rem;
  color: var(--cinza-texto);
}

/* --- TABLE CARD --- */
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--preto);
  margin: 0;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
}

.refresh-btn {
    background: transparent;
    border: 1px solid #e2e8f0;
    padding: 0.4rem;
    border-radius: 0.4rem;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
}
.refresh-btn:hover {
    color: #3b82f6;
    background: #eff6ff;
}

/* --- PROFILE CARD CONTENT --- */
.profile-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem 0;
}

.profile-avatar-large {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 1rem;
}

.profile-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #fff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.profile-image-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    border: 4px solid #fff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.status-badge-profile {
    position: absolute;
    bottom: 0;
    right: 0;
    color: #22c55e;
    background: #fff;
    border-radius: 50%;
    padding: 2px;
}

.profile-info-large h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.profile-info-large .phone-display {
    color: #64748b;
    margin: 0.25rem 0 1rem 0;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.security-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #f0fdf4;
    color: #16a34a;
    padding: 0.3rem 0.8rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
}

.business-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #eff6ff;
    color: #3b82f6;
    padding: 0.3rem 0.8rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
}

/* Business List */
.business-details-list {
    width: 100%;
    max-width: 380px;
    background: #f8fafc;
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: left;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: #475569;
}

.detail-item a {
    color: #3b82f6;
    text-decoration: none;
}
.detail-item a:hover {
    text-decoration: underline;
}

.detail-item.description {
    font-style: italic;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
    padding-top: 0.75rem;
    margin-top: 0.2rem;
    text-align: center;
    justify-content: center;
}

.profile-actions {
    margin-top: 2rem;
    width: 100%;
    max-width: 300px;
}

.btn-disconnect {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #fff;
    color: #ef4444;
    border: 1px solid #fee2e2;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-disconnect:hover:not(:disabled) {
    background-color: #fef2f2;
    transform: translateY(-1px);
}

/* --- LOGS --- */
.logs-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.log-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.5rem;
}

.log-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.log-icon.success { background: #dcfce7; color: #16a34a; }
.log-icon.info { background: #eff6ff; color: #3b82f6; }

.log-content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.log-msg {
    font-size: 0.85rem;
    color: #334155;
    font-weight: 500;
}

.log-time {
    font-size: 0.75rem;
    color: #94a3b8;
}


/* --- DISCONNECTED VIEW --- */
.center-card {
    align-items: center;
    text-align: center;
    max-width: 600px; /* Adjusted width for better proportion */
    width: 100%;
    padding: 3rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* Deep shadow */
    border: 1px solid #f1f5f9;
}

.benefits-section {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px dashed #e2e8f0;
    width: 100%;
}

.benefits-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    align-items: flex-start; /* Align text to left naturally, even if container is centered */
    display: inline-flex; /* Shrink to fit content so we can center the block */
}

.benefits-list li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #64748b;
    font-size: 1rem;
}
.tech-footer {
    border-top: 1px dashed #e2e8f0;
    padding-top: 1rem;
    display: flex;
    justify-content: center;
}

.tech-info {
    font-size: 0.75rem;
    color: #cbd5e1; /* Bem clarinho/discreto */
    font-family: monospace;
    display: flex;
    gap: 0.5rem;
}

.separator {
    color: #e2e8f0;
}

.centered-header {
    flex-direction: column;
    align-items: center;
    margin-bottom: 2.5rem;
}

.header-icon-large {
    width: 80px;
    height: 80px;
    background: #eff6ff;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
}

.card-title-large {
    font-size: 2rem; /* Increased size */
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 0.5rem;
}

.card-subtitle-large {
    font-size: 1.1rem; /* Increased size */
    color: #64748b;
    max-width: 500px;
    line-height: 1.6;
}

.action-area {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.connection-body {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.btn-primary-large {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 1rem 2.5rem; /* Larger button padding */
    border-radius: 0.75rem;
    font-size: 1.1rem; /* Larger button font */
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);
}

.btn-primary-large:hover:not(:disabled) {
    background: #2563eb;
}

.help-text {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-top: 0.75rem;
}

.status-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    color: #64748b;
    font-weight: 500;
}

/* QR Code Section */
.qr-code-section {
    margin-top: 1.5rem;
    width: 100%;
}

.qr-instruction {
    font-size: 0.85rem;
    color: #475569;
    margin-bottom: 1rem;
    background: #f8fafc;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
}

.qr-code-border {
    position: relative;
    padding: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 1rem;
    display: inline-block;
    background: white;
}

.qr-code-wrapper {
    width: 200px;
    height: 200px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-code-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.qr-placeholder {
    color: #94a3b8;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.scan-line {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: 2px;
    background: #3b82f6;
    box-shadow: 0 0 4px #3b82f6;
    animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    pointer-events: none;
    opacity: 0.5;
}

@keyframes scan {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(200px); opacity: 0; }
}

.qr-expiry {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.75rem;
}

.success-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    animation: fadeIn 0.3s;
}

.success-text {
    color: #16a34a;
    font-weight: 700;
    font-size: 1.1rem;
}

/* Security Footer */
.security-footer {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    max-width: 400px;
    text-align: center;
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 2rem;
}

/* Responsive */
@media (max-width: 1024px) {
    .top-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .main-content-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .top-grid {
        grid-template-columns: 1fr;
    }
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }
    .header-right {
        display: none;
    }
}

.animate-spin {
    animation: spin 1s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.qr-blur {
  filter: blur(4px);
  opacity: 0.6;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
