<script setup>
import { ref, onMounted, computed } from 'vue';
import { useClinicStore } from '@/stores/clinic';
import { CheckCircle, AlertTriangle, Package, CreditCard, Calendar, Shield, Clock, X, MessageCircle, Trash2, Edit3, FileText, ArrowRight } from 'lucide-vue-next';
import choroEmoji from '@/assets/imgs/choro_emoji.png';

const clinicStore = useClinicStore();

const loading = ref(true);
const subscription = ref(null);
const error = ref(null);
const actionLoading = ref(false);
const showCancelModal = ref(false);

const statusMap = {
  active: { label: 'Ativa', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  past_due: { label: 'Pagamento Pendente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
  canceled: { label: 'Cancelada', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300', icon: AlertTriangle },
  trialing: { label: 'Período de Teste', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  free: { label: 'Gratuito', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: Package }
};

const currentStatus = computed(() => {
  const status = subscription.value?.status || 'free';
  return statusMap[status] || statusMap.free;
});

const isCanceled = computed(() => {
  return subscription.value?.status === 'canceled' || !!subscription.value?.cancelAt;
});

const formatDate = (dateString, fullDate = true) => {
  if (!dateString) return 'N/A';
  const options = fullDate
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: 'numeric' };
  return new Date(dateString).toLocaleDateString('pt-BR', options);
};

const formatCurrency = (amount, currency) => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
};

const getCardIconUrl = (brand) => {
  if (!brand) return null;
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '-');
  return `https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/c2df917e4879ecba8e84a85c947ee7ee9dc5747d/flat-rounded/${normalizedBrand}.svg`;
};

const fetchSubscription = async () => {
  try {
    loading.value = true;
    const response = await clinicStore.getSubscriptionStatus();
    if (response.success) {
      subscription.value = response.data;
    } else {
      throw new Error(response.error);
    }
  } catch (err) {
    console.error('Erro ao carregar assinatura:', err);
    error.value = 'Não foi possível carregar os detalhes da assinatura.';
  } finally {
    loading.value = false;
  }
};

const handleCancelSubscription = async () => {
  try {
    actionLoading.value = true;
    const response = await clinicStore.cancelSubscription();
    
    if (response.success) {
      showCancelModal.value = false;
      await fetchSubscription();
      alert('Assinatura cancelada com sucesso! Você terá acesso até o final do período atual.');
    } else {
      alert(response.error || 'Erro ao cancelar assinatura');
    }
  } catch (err) {
    console.error('Erro ao cancelar:', err);
    alert('Erro ao cancelar assinatura. Tente novamente.');
  } finally {
    actionLoading.value = false;
  }
};

const handleUpdatePayment = async () => {
  try {
    actionLoading.value = true;
    const response = await clinicStore.createPortalSession();
    
    if (response.success && response.data.url) {
      window.location.href = response.data.url;
    } else {
      alert(response.error || 'Erro ao acessar portal de pagamento');
    }
  } catch (err) {
    console.error('Erro ao abrir portal:', err);
    alert('Erro ao acessar portal de pagamento. Tente novamente.');
  } finally {
    actionLoading.value = false;
  }
};

const handleNeedHelp = () => {
  const message = encodeURIComponent('Olá! Preciso de ajuda com minha assinatura.');
  const whatsappNumber = '5511921923978';
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
};

const handleReactivateSubscription = async () => {
  try {
    actionLoading.value = true;
    const response = await clinicStore.createPortalSession();
    
    if (response.success && response.data.url) {
      window.location.href = response.data.url;
    } else {
      alert(response.error || 'Erro ao acessar portal de pagamento');
    }
  } catch (err) {
    console.error('Erro ao reativar:', err);
    alert('Erro ao reativar assinatura. Tente novamente.');
  } finally {
    actionLoading.value = false;
  }
};

const handleViewInvoice = async () => {
  try {
    actionLoading.value = true;
    const response = await clinicStore.getLatestInvoice();
    
    if (response.success && response.data.invoiceUrl) {
      window.open(response.data.invoiceUrl, '_blank');
    } else {
      alert(response.error || 'Erro ao buscar comprovante');
    }
  } catch (err) {
    console.error('Erro ao buscar comprovante:', err);
    alert('Erro ao buscar comprovante. Tente novamente.');
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  fetchSubscription();
});
</script>

<template>
  <div class="subscription-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Assinatura e Cobrança</h1>
        <p class="subtitle">Gerencie o plano da sua clínica e informações de pagamento.</p>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando informações...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon-wrapper">
        <AlertTriangle :size="32" />
      </div>
      <h3>Ops, algo deu errado</h3>
      <p>{{ error }}</p>
      <button @click="fetchSubscription" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-else>
      <!-- Top Grid - KPI Cards -->
      <div class="top-grid">
        <!-- Status Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-header-text">
              <span class="kpi-label">Status Atual</span>
              <span class="kpi-description">Situação da sua assinatura</span>
            </div>
            <div class="icon-bg" :class="currentStatus.bg">
              <component :is="currentStatus.icon" :size="18" :class="currentStatus.color" />
            </div>
          </div>
          <div class="kpi-body">
            <div class="status-badge" :class="[currentStatus.bg, currentStatus.color, currentStatus.border]">
              {{ currentStatus.label }}
            </div>
            <span v-if="isCanceled && subscription?.cancelAt" class="kpi-sub">
              Termina em {{ formatDate(subscription.cancelAt) }}
            </span>
          </div>
        </div>

        <!-- Plan Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-header-text">
              <span class="kpi-label">Seu Plano</span>
              <span class="kpi-description">Plano atual da clínica</span>
            </div>
            <div class="icon-bg bg-indigo-50">
              <Package :size="18" class="text-indigo-600" />
            </div>
          </div>
          <div class="kpi-body">
            <span class="kpi-value">{{ subscription?.planId === 'price_1SYz5GPa5IK4JNeqLG1QriOK' ? 'Premium' : 'Básico' }}</span>
            <div class="kpi-sub pricing-inline">
              <template v-if="subscription?.plan">
                <span class="currency">{{ subscription.plan.currency.toUpperCase() }}</span>
                <span class="amount">{{ formatCurrency(subscription.plan.amount, subscription.plan.currency).replace('R$', '').trim() }}</span>
                <span class="interval">/ {{ subscription.plan.interval === 'month' ? 'mês' : 'ano' }}</span>
              </template>
              <template v-else>
                <span class="amount">Grátis</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Payment Method Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-header-text">
              <span class="kpi-label">Forma de Pagamento</span>
              <span class="kpi-description">Método de cobrança configurado</span>
            </div>
            <div class="icon-bg bg-violet-50">
              <CreditCard :size="18" class="text-violet-600" />
            </div>
          </div>
          <div class="kpi-body">
            <div v-if="subscription?.card" class="credit-card-display">
              <div class="card-brand-icon">
                <img 
                  v-if="getCardIconUrl(subscription.card.brand)" 
                  :src="getCardIconUrl(subscription.card.brand)" 
                  :alt="subscription.card.brand"
                  width="40"
                  height="26"
                />
                <div v-else class="generic-card-icon">
                  <CreditCard :size="18" />
                </div>
              </div>
              <div class="card-info">
                <p class="card-number">•••• •••• •••• {{ subscription.card.last4 }}</p>
                <p class="card-expiry">Expira em {{ subscription.card.expMonth }}/{{ subscription.card.expYear }}</p>
              </div>
            </div>
            <span v-else class="kpi-value text-muted">Nenhum cartão</span>
          </div>
        </div>
      </div>

      <!-- Lists Grid - Details Cards -->
      <div class="lists-grid">
        <!-- Subscription Details Card -->
        <div class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Detalhes da Assinatura</h3>
              <p class="card-subtitle">Informações do seu ciclo de cobrança.</p>
            </div>
          </div>

          <div class="card-content">
            <!-- Cancellation Notice -->
            <div v-if="isCanceled" class="cancellation-notice">
              <div class="cancellation-header">
                <img :src="choroEmoji" alt="Triste" class="emoji-icon" />
                <h3>Assinatura Cancelada</h3>
              </div>
              <p>Sua assinatura foi cancelada. Você pode reativá-la a qualquer momento.</p>
              <button 
                @click="handleReactivateSubscription" 
                :disabled="actionLoading"
                class="reactivate-btn"
              >
                {{ actionLoading ? 'Carregando...' : 'Reativar Assinatura' }}
              </button>
            </div>

            <!-- Regular Status Info -->
            <div v-else class="info-list">
              <div class="info-item">
                <div class="info-icon">
                  <Calendar :size="16" />
                </div>
                <div class="info-content">
                  <span class="info-label">Ciclo Atual</span>
                  <span v-if="subscription?.currentPeriodEnd" class="info-value">
                    Dia {{ formatDate(subscription.billingCycleAnchor, false) }} de cada mês
                  </span>
                  <span v-else-if="subscription?.billingCycleAnchor" class="info-value">
                    Dia {{ formatDate(subscription.billingCycleAnchor, false) }} de cada mês
                  </span>
                  <span v-else class="info-value">Vitalício / Gratuito</span>
                </div>
              </div>

              <div v-if="subscription?.startDate" class="info-item">
                <div class="info-icon">
                  <Shield :size="16" />
                </div>
                <div class="info-content">
                  <span class="info-label">Desde</span>
                  <span class="info-value">{{ formatDate(subscription.startDate) }}</span>
                </div>
              </div>

              <div v-if="subscription?.cancelAtPeriodEnd" class="alert-item alert-warning">
                <AlertTriangle :size="16" />
                <span>Cancelamento agendado para o fim do período.</span>
              </div>
            </div>

            <!-- Features -->
            <div class="features-section">
              <h4 class="features-title">Recursos inclusos</h4>
              <ul class="features-list">
                <li><CheckCircle :size="14" class="check-icon" /> Acesso total ao sistema</li>
                <li><CheckCircle :size="14" class="check-icon" /> Suporte prioritário via WhatsApp</li>
                <li><CheckCircle :size="14" class="check-icon" /> Backup automático</li>
              </ul>
            </div>

            <!-- Installation Fee Notice -->
            <div v-if="subscription?.status === 'free' || !subscription?.installationFeeCharged" class="alert-item alert-info">
              <AlertTriangle :size="16" />
              <div class="alert-content">
                <span class="alert-title">Taxa de Instalação</span>
                <p class="alert-text">
                  Primeira mensalidade: <strong>{{ subscription?.plan ? formatCurrency(subscription.plan.amount + 10000, subscription.plan.currency) : 'R$ 149,00' }}</strong>
                  <span class="alert-breakdown">({{ subscription?.plan ? formatCurrency(subscription.plan.amount, subscription.plan.currency) : 'R$ 49,00' }} + R$ 100,00 taxa única)</span>
                </p>
                <p class="alert-text">Próximas mensalidades: <strong>{{ subscription?.plan ? formatCurrency(subscription.plan.amount, subscription.plan.currency) : 'R$ 49,00' }}</strong></p>
              </div>
            </div>

            <div v-else-if="subscription?.installationFeeCharged" class="alert-item alert-success">
              <CheckCircle :size="16" />
              <span>Taxa de instalação já paga</span>
            </div>
          </div>
        </div>

        <!-- Actions Card -->
        <div class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Ações</h3>
              <p class="card-subtitle">Gerencie sua assinatura e pagamentos.</p>
            </div>
          </div>

          <div class="card-content">
            <div class="actions-list">
              <button 
                @click="handleUpdatePayment" 
                :disabled="actionLoading"
                class="action-item"
              >
                <div class="action-icon bg-blue-50">
                  <Edit3 :size="18" class="text-blue-500" />
                </div>
                <div class="action-content">
                  <span class="action-title">Gerenciar Assinatura</span>
                  <span class="action-subtitle">Atualize pagamento e preferências</span>
                </div>
                <ArrowRight :size="16" class="action-arrow" />
              </button>

              <button 
                @click="handleNeedHelp"
                class="action-item"
              >
                <div class="action-icon bg-emerald-50">
                  <MessageCircle :size="18" class="text-emerald-500" />
                </div>
                <div class="action-content">
                  <span class="action-title">Preciso de Ajuda</span>
                  <span class="action-subtitle">Fale conosco via WhatsApp</span>
                </div>
                <ArrowRight :size="16" class="action-arrow" />
              </button>

              <button 
                v-if="subscription?.status === 'active'"
                @click="handleViewInvoice"
                :disabled="actionLoading"
                class="action-item"
              >
                <div class="action-icon bg-purple-50">
                  <FileText :size="18" class="text-purple-500" />
                </div>
                <div class="action-content">
                  <span class="action-title">Ver Comprovante</span>
                  <span class="action-subtitle">Visualize sua última fatura</span>
                </div>
                <ArrowRight :size="16" class="action-arrow" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click="showCancelModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Cancelar Assinatura</h3>
          <button @click="showCancelModal = false" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja cancelar sua assinatura?</p>
          <p class="modal-warning">Você terá acesso até o final do período atual ({{ formatDate(subscription?.currentPeriodEnd) }}).</p>
        </div>
        <div class="modal-footer">
          <button @click="showCancelModal = false" class="btn-secondary">Voltar</button>
          <button @click="handleCancelSubscription" :disabled="actionLoading" class="btn-danger">
            {{ actionLoading ? 'Cancelando...' : 'Confirmar Cancelamento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subscription-page {
  font-family: var(--fonte-principal);
  color: var(--preto);
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

.header-text {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
  color: var(--preto);
  line-height: 1.2;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

/* Top Grid - KPI Style */
.top-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .top-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}

/* KPI Cards */
.kpi-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.kpi-header-text {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  color: var(--preto);
  font-size: 0.875rem;
  font-weight: 600;
}

.kpi-description {
  color: var(--cinza-texto);
  font-size: 0.75rem;
  margin-top: 0.125rem;
}

.icon-bg {
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-body {
  display: flex;
  flex-direction: column;
  margin-top: 0.75rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--preto);
  line-height: 1.2;
}

.kpi-sub {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  border-width: 1px;
  border-style: solid;
  width: fit-content;
}

/* Pricing inline */
.pricing-inline {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.pricing-inline .currency {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cinza-texto);
}

.pricing-inline .amount {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--preto);
}

.pricing-inline .interval {
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

/* Credit Card Display (compact) */
.credit-card-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-brand-icon img {
  display: block;
}

.generic-card-icon {
  width: 40px;
  height: 26px;
  background: #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-info .card-number {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--preto);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.card-info .card-expiry {
  font-size: 0.7rem;
  color: var(--cinza-texto);
}

.text-muted {
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

/* Lists Grid */
.lists-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

/* Table Card / Panels */
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.3rem;
  flex-shrink: 0;
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--preto);
  margin: 0;
  line-height: 1.2;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  line-height: 1.2;
}

.card-content {
  padding: 0 1.3rem 1.3rem;
  flex: 1;
}

/* Info List */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.info-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 0.125rem;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--preto);
}

/* Features Section */
.features-section {
  margin-bottom: 1.5rem;
}

.features-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cinza-texto);
  margin-bottom: 0.75rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
}

.check-icon {
  color: #10b981;
}

/* Alert Items */
.alert-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.4;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.alert-warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.alert-info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.alert-success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.alert-text {
  font-size: 0.8rem;
  margin: 0.125rem 0;
}

.alert-breakdown {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Cancellation Notice */
.cancellation-notice {
  padding: 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

.cancellation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.emoji-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.cancellation-notice h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.cancellation-notice p {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.reactivate-btn {
  padding: 0.625rem 1.25rem;
  background: var(--azul-principal);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reactivate-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.reactivate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Actions List */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background-color: #f8fafc;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  align-items: center;
}

.action-item:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.action-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--preto);
  display: block;
}

.action-subtitle {
  font-size: 0.75rem;
  color: var(--cinza-texto);
}

.action-arrow {
  color: var(--cinza-texto);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.action-item:hover .action-arrow {
  opacity: 1;
  color: var(--azul-principal);
}

/* Icon Colors */
.bg-emerald-50 { background-color: #ecfdf5; }
.bg-amber-50 { background-color: #fffbeb; }
.bg-slate-100 { background-color: #f1f5f9; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-slate-50 { background-color: #f8fafc; }
.bg-indigo-50 { background-color: #eef2ff; }
.bg-violet-50 { background-color: #f5f3ff; }
.bg-purple-50 { background-color: #faf5ff; }

.text-emerald-700 { color: #047857; }
.text-emerald-500 { color: #10b981; }
.text-amber-700 { color: #b45309; }
.text-slate-700 { color: #334155; }
.text-blue-700 { color: #1d4ed8; }
.text-blue-500 { color: #3b82f6; }
.text-indigo-600 { color: #4f46e5; }
.text-violet-600 { color: #7c3aed; }
.text-purple-500 { color: #a855f7; }

.border-emerald-200 { border-color: #a7f3d0; }
.border-amber-200 { border-color: #fde68a; }
.border-slate-300 { border-color: #cbd5e1; }
.border-blue-200 { border-color: #bfdbfe; }
.border-slate-200 { border-color: #e2e8f0; }

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  gap: 1.5rem;
  color: var(--cinza-texto);
  text-align: center;
}

.error-icon-wrapper {
  color: #ef4444;
  background: #fee2e2;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preto);
}

.spinner {
  border: 3px solid #f1f5f9;
  border-top: 3px solid var(--azul-principal);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

.retry-btn {
  padding: 0.75rem 1.5rem;
  background: var(--azul-principal);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.retry-btn:hover {
  opacity: 0.9;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preto);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cinza-texto);
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin-bottom: 1rem;
  color: #475569;
}

.modal-warning {
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #f1f5f9;
  justify-content: flex-end;
}

.btn-secondary, .btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  border: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  opacity: 0.8;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  .top-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .kpi-card {
    padding: 1rem;
  }

  .kpi-value {
    font-size: 1.25rem;
  }

  .lists-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card-header {
    padding: 1rem;
  }

  .card-content {
    padding: 0 1rem 1rem;
  }

  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-footer button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .kpi-card {
    padding: 0.875rem;
  }

  .kpi-label {
    font-size: 0.8rem;
  }
}
</style>
