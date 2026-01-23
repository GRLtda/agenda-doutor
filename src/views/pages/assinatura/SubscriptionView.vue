<script setup>
import { ref, onMounted, computed } from 'vue';
import { useClinicStore } from '@/stores/clinic';
import { useAuthStore } from '@/stores/auth';
import { CheckCircle, AlertTriangle, Package, CreditCard, Shield, Clock, X, MessageCircle, Edit3, FileText, Info } from 'lucide-vue-next';
import choroEmoji from '@/assets/imgs/choro_emoji.png';

const clinicStore = useClinicStore();
const authStore = useAuthStore();

const loading = ref(true);
const subscription = ref(null);
const error = ref(null);
const actionLoading = ref(false);
const showCancelModal = ref(false);

const isTrialActive = computed(() => authStore.user?.planStatus?.trial?.isActive);
const trialDaysRemaining = computed(() => authStore.user?.planStatus?.trial?.daysRemaining);

const statusMap = {
  active: { label: 'Ativa', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  past_due: { label: 'Pagamento Pendente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
  canceled: { label: 'Cancelada', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300', icon: AlertTriangle },
  trialing: { label: 'Período de Teste', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  free: { label: 'Gratuito', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: Package },
  enterprise: { label: 'Enterprise', color: 'text-purple-700', bg: 'bg-blue-50', border: 'border-purple-200', icon: Shield },
  enterprise_plus: { label: 'Enterprise Plus', color: 'text-purple-700', bg: 'bg-blue-50', border: 'border-purple-200', icon: Shield },
  lifetime: { label: 'Vitalício', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: CheckCircle }
};

const currentStatus = computed(() => {
  if (subscription.value?.planType === 'enterprise') return statusMap.enterprise;
  if (subscription.value?.planType === 'enterprise_plus') return statusMap.enterprise_plus;
  const status = subscription.value?.status || 'free';
  return statusMap[status] || statusMap.free;
});

const isCanceled = computed(() => {
  if (subscription.value?.planType === 'enterprise') return false;
  if (subscription.value?.planType === 'enterprise_plus') return false;
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
    // Redireciona para o checkout para criar nova assinatura
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
  <div class="subscription-page animate-fade-in">
    <div class="page-header">
      <div>
        <h1>Assinatura e Cobrança</h1>
        <p>Gerencie o plano da sua clínica e informações de pagamento.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando informações...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon-wrapper">
        <AlertTriangle :size="32" />
      </div>
      <h3>Ops, algo deu errado</h3>
      <p>{{ error }}</p>
      <button @click="fetchSubscription" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-else>
      <div class="content-grid">
        <!-- Status Card -->
        <div class="info-card status-card">
          <div class="card-header">
            <div class="icon-wrapper" :class="currentStatus.bg">
              <component :is="currentStatus.icon" :class="currentStatus.color" :size="24" />
            </div>
            <div class="status-info-wrapper">
              <span class="card-label">Status Atual</span>
              <div class="status-row">
                <div class="status-badge" :class="[currentStatus.bg, currentStatus.color, currentStatus.border]">
                  {{ currentStatus.label }}
                </div>
                <span v-if="isCanceled && subscription?.cancelAt" class="cancel-date">
                  Termina em {{ formatDate(subscription.cancelAt) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="card-divider"></div>
          
          <div class="card-body">
          <!-- Trial Notice -->
            <div v-if="isTrialActive" class="trial-notice mb-6">
              <div class="trial-notice-header">
                <Info :size="20" />
                <h3>Período de Teste Ativo</h3>
              </div>
              <p>Você está aproveitando o período de teste gratuito. Faltam <strong>{{ trialDaysRemaining }} dias</strong> para o fim do teste.</p>
              <p class="text-sm mt-2 opacity-90">Sua assinatura iniciará automaticamente ao fim deste período. Cancele a qualquer momento para evitar cobranças.</p>
            </div>

          <!-- Cancellation Message -->
          <div v-if="isCanceled" class="cancellation-notice">
            <div class="cancellation-header">
              <img :src="choroEmoji" alt="Triste" class="emoji-icon" />
              <h3>Assinatura Cancelada</h3>
            </div>
            <p>Sua assinatura foi cancelada. Você pode reativá-la a qualquer momento.</p>
            <button 
              @click="handleReactivateSubscription" 
              :disabled="actionLoading"
              class="reactivate-inline-btn"
            >
              {{ actionLoading ? 'Carregando...' : 'Reativar Assinatura' }}
            </button>
          </div>

          <!-- Regular Status Info -->
          <div v-else>


            <div class="info-row mt-4" v-if="subscription?.startDate">
               <div class="info-icon">
                <Shield :size="16" />
              </div>
              <div class="info-content">
                <p class="label">Desde</p>
                <p class="value">{{ formatDate(subscription.startDate) }}</p>
              </div>
            </div>

             <div v-if="subscription?.cancelAtPeriodEnd" class="cancellation-warning mt-4">
              <AlertTriangle :size="16" />
              <p>Cancelamento agendado para o fim do período.</p>
            </div>
          </div>
          </div>
        </div>

        <!-- Plan Card -->
        <div class="info-card plan-card">
          <div class="card-header">
             <div class="icon-wrapper bg-indigo-50">
              <Package class="text-indigo-600" :size="24" />
            </div>
            <div>
              <span class="card-label">Seu Plano</span>
              <h3 class="plan-name">
                {{ 
                  subscription?.planType === 'basic' ? 'Básico' :
                  subscription?.planType === 'premium' ? 'Premium' :
                  subscription?.planType === 'enterprise' ? 'Enterprise' :
                  subscription?.planType === 'enterprise_plus' ? 'Enterprise Plus' :
                  subscription?.planType ? subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1) :
                  'Básico'
                }}
              </h3>
            </div>
          </div>
          
          <div class="pricing-display">
            <template v-if="subscription?.status === 'lifetime'">
               <span class="currency">R$</span>
               <span class="amount">297,00</span>
               <span class="interval">/ único</span>
            </template>
            <template v-else-if="subscription?.planType === 'enterprise'">
               <span class="currency">R$</span>
               <span class="amount">199,00</span>
               <span class="interval">/ mês</span>
            </template>
            <template v-else-if="subscription?.planType === 'enterprise_plus'">
               <span class="currency">R$</span>
               <span class="amount">359,00</span>
               <span class="interval">/ mês</span>
            </template>
            <template v-else-if="subscription?.planType === 'premium'">
               <span class="currency">R$</span>
               <span class="amount">159,00</span>
               <span class="interval">/ mês</span>
            </template>
            <template v-else-if="subscription?.planType === 'basic' && subscription?.status !== 'free'">
               <span class="currency">R$</span>
               <span class="amount">99,90</span>
               <span class="interval">/ mês</span>
            </template>
            <template v-else-if="subscription?.plan && typeof subscription.plan === 'object'">
              <span class="currency">{{ subscription.plan.currency.toUpperCase() }}</span>
              <span class="amount">{{ formatCurrency(subscription.plan.amount, subscription.plan.currency).replace('R$', '').trim() }}</span>
              <span class="interval">/ {{ subscription.plan.interval === 'month' ? 'mês' : 'ano' }}</span>
            </template>
            <template v-else>
               <span class="amount">Grátis</span>
            </template>
          </div>

          <div class="card-divider"></div>

          <div class="card-body">
            <ul class="features-list">
              <li><div class="check-icon"><CheckCircle :size="14" /></div> Acesso total ao sistema</li>
              <li><div class="check-icon"><CheckCircle :size="14" /></div> Suporte prioritário via WhatsApp</li>
              <li><div class="check-icon"><CheckCircle :size="14" /></div> Backup automático</li>
            </ul>

            <!-- Installation Fee Notice -->
            <div v-if="(subscription?.status === 'free' || !subscription?.installationFeeCharged) && subscription?.planType !== 'enterprise' && subscription?.status !== 'lifetime' && subscription?.planType !== 'basic'" class="installation-fee-notice">
              <div class="fee-notice-header">
                <AlertTriangle :size="16" />
                <span>Taxa de Instalação</span>
              </div>
              <p class="fee-notice-text">
                Primeira mensalidade: <strong>{{ subscription?.plan ? formatCurrency(subscription.plan.amount + 10000, subscription.plan.currency) : 'R$ 149,00' }}</strong>
                <span class="fee-breakdown">({{ subscription?.plan ? formatCurrency(subscription.plan.amount, subscription.plan.currency) : 'R$ 49,00' }} + R$ 100,00 taxa única)</span>
              </p>
              <p class="fee-notice-text">Próximas mensalidades: <strong>{{ subscription?.plan ? formatCurrency(subscription.plan.amount, subscription.plan.currency) : 'R$ 49,00' }}</strong></p>
            </div>

            <div v-else-if="subscription?.installationFeeCharged" class="installation-fee-paid">
              <CheckCircle :size="16" />
              <span>Taxa de instalação já paga</span>
            </div>
          </div>
        </div>

        <!-- Payment Method Card -->
        <div class="info-card payment-card">
          <div class="card-header">
             <div class="icon-wrapper bg-violet-50">
              <CreditCard class="text-violet-600" :size="24" />
            </div>
            <div>
              <span class="card-label">Forma de Pagamento</span>
              <h3 class="card-title">Cartão de Crédito</h3>
            </div>
          </div>

          <div class="card-divider"></div>

          <div class="card-body">
            <div v-if="subscription?.card" class="credit-card-display">
              <div class="card-brand-icon">
                <img 
                  v-if="getCardIconUrl(subscription.card.brand)" 
                  :src="getCardIconUrl(subscription.card.brand)" 
                  :alt="subscription.card.brand"
                  width="48"
                  height="32"
                />
                 <div v-else class="generic-card-icon">
                   <CreditCard :size="24" />
                 </div>
              </div>
              <div class="card-info">
                <p class="card-number">•••• •••• •••• {{ subscription.card.last4 }}</p>
                <p class="card-expiry">Expira em {{ subscription.card.expMonth }}/{{ subscription.card.expYear }}</p>
              </div>
            </div>
            <div v-else class="no-payment-state">
              <div class="dashed-border">
                <p>Nenhum cartão vinculado</p>
              </div>
            </div>
            
            <div v-if="subscription?.lastPaymentFailure?.reason" class="payment-error mt-4">
              <div class="error-header">
                 <AlertTriangle :size="16" />
                 <span>Falha no Pagamento</span>
              </div>
              <p>{{ subscription.lastPaymentFailure.reason }}</p>
            </div>
          </div>
        </div>
      </div>


      <!-- Action Buttons -->
      <div class="actions-section">
        <h2>Ações</h2>
        <div class="actions-grid">
          <button 
            @click="handleUpdatePayment" 
            :disabled="actionLoading || isTrialActive"
            class="action-btn primary"
            :class="{ 'opacity-50 cursor-not-allowed': isTrialActive }"
            :title="isTrialActive ? 'Gerenciamento desabilitado durante o período de teste' : ''"
          >
            <Edit3 :size="20" />
            <div class="btn-content">
              <span class="btn-title">Gerenciar Assinatura</span>
              <span class="btn-subtitle">
                {{ isTrialActive ? 'Disponível após o período de teste' : 'Atualize pagamento e preferências' }}
              </span>
            </div>
          </button>

          <button 
            @click="handleNeedHelp"
            class="action-btn success"
          >
            <MessageCircle :size="20" />
            <div class="btn-content">
              <span class="btn-title">Preciso de Ajuda</span>
              <span class="btn-subtitle">Fale conosco via WhatsApp</span>
            </div>
          </button>

          <button 
            v-if="subscription?.status === 'active'"
            @click="handleViewInvoice"
            :disabled="actionLoading"
            class="action-btn info"
          >
            <FileText :size="20" />
            <div class="btn-content">
              <span class="btn-title">Ver Comprovante</span>
              <span class="btn-subtitle">Visualize sua última fatura</span>
            </div>
          </button>
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
  padding: 2.5rem;
  max-width: 1400px;
  margin: 0 auto;
  color: #1e293b;
}

.page-header {
  margin-bottom: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
  letter-spacing: -0.025em;
}

.page-header p {
  font-size: 1.125rem;
  color: #64748b;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 2rem;
  align-items: start;
  margin-bottom: 3rem;
}

/* Card Common Styles */
.info-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid #f1f5f9;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
}

.card-header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.125rem;
}

.card-title, .plan-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}

.card-divider {
  height: 1px;
  background: #f1f5f9;
  width: 100%;
}

.card-body {
  padding: 1.5rem;
  flex: 1;
}

/* Status Card Specifics */
.status-info-wrapper {
  flex: 1;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  border-width: 1px;
  border-style: solid;
}

/* Status Badge Colors - Active */
.bg-emerald-50 { background-color: #ecfdf5; }
.text-emerald-700 { color: #047857; }
.border-emerald-200 { border-color: #a7f3d0; }

/* Status Badge Colors - Past Due */
.bg-amber-50 { background-color: #fffbeb; }
.text-amber-700 { color: #b45309; }
.border-amber-200 { border-color: #fde68a; }

/* Status Badge Colors - Canceled */
.bg-slate-100 { background-color: #f1f5f9; }
.text-slate-700 { color: #334155; }
.border-slate-300 { border-color: #cbd5e1; }

/* Status Badge Colors - Trialing */
.bg-blue-50 { background-color: #eff6ff; }
.text-blue-700 { color: #1d4ed8; }
.border-blue-200 { border-color: #bfdbfe; }

/* Status Badge Colors - Free */
.bg-slate-50 { background-color: #f8fafc; }
.border-slate-200 { border-color: #e2e8f0; }

/* Icon Wrapper Colors - Indigo (Plan Card) */
.bg-indigo-50 { background-color: #eef2ff; }
.text-indigo-600 { color: #4f46e5; }

/* Icon Wrapper Colors - Violet (Payment Card) */
.bg-violet-50 { background-color: #f5f3ff; }
.text-violet-600 { color: #7c3aed; }

.cancel-date {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.info-row {
  display: flex;
  gap: 1rem;
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

.info-content .label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 0.125rem;
}

.info-content .value {
  font-size: 1rem;
  font-weight: 500;
  color: #334155;
}

.cancellation-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #fff1f2;
  border-radius: 8px;
  color: #be123c;
  font-size: 0.875rem;
  font-weight: 500;
}

.trial-notice {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.trial-notice-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1d4ed8;
}

.trial-notice-header h3 {
  font-weight: 600;
  font-size: 1rem;
}

/* Plan Card Specifics */
.pricing-display {
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.pricing-display .currency {
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
}

.pricing-display .amount {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.pricing-display .interval {
  font-size: 1rem;
  color: #64748b;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: #475569;
}

.check-icon {
  color: #10b981;
  display: flex;
  align-items: center;
}

/* Installation Fee Notice */
.installation-fee-notice {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.fee-notice-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #b45309;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.fee-notice-text {
  font-size: 0.875rem;
  color: #78350f;
  margin: 0.25rem 0;
  line-height: 1.5;
}

.fee-breakdown {
  display: block;
  font-size: 0.75rem;
  color: #92400e;
  margin-top: 0.125rem;
  opacity: 0.8;
}

.installation-fee-paid {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #047857;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Payment Card Specifics */
.credit-card-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.card-brand-icon img {
  display: block;
}

.generic-card-icon {
  width: 48px;
  height: 32px;
  background: #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-info .card-number {
  font-family: monospace;
  font-size: 1rem;
  color: #334155;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.card-info .card-expiry {
  font-size: 0.75rem;
  color: #94a3b8;
}

.no-payment-state .dashed-border {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
  background: #f8fafc;
}

.payment-error {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  color: #b91c1c;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.payment-error p {
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Cancellation Notice in Status Card */
.cancellation-notice {
  padding: 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: left;
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

.cancellation-notice .reactivate-info {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 1rem;
}

.reactivate-inline-btn {
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

.reactivate-inline-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.reactivate-inline-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Actions Section */
.actions-section {
  margin-top: 3rem;
}

.actions-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 2px solid;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.btn-title {
  font-weight: 600;
  font-size: 1rem;
}

.btn-subtitle {
  font-size: 0.875rem;
  opacity: 0.7;
}

.action-btn.primary {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--azul-principal);
  color: white;
}

.action-btn.success {
  border-color: #10b981;
  color: #10b981;
}

.action-btn.success:hover:not(:disabled) {
  background: #10b981;
  color: white;
}

.action-btn.danger {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.danger:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.action-btn.info {
  border-color: #6366f1;
  color: #6366f1;
}

.action-btn.info:hover:not(:disabled) {
  background: #6366f1;
  color: white;
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
  border-radius: 16px;
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
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
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

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 16px;
  gap: 1.5rem;
  color: #64748b;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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
  margin-bottom: 0.5rem;
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .subscription-page {
    padding: 1rem;
  }
  
  .page-header {
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }

  .page-header p {
    font-size: 1rem;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .info-card {
    border-radius: 12px;
  }

  .card-header {
    padding: 1.25rem;
  }

  .card-body {
    padding: 1.25rem;
  }

  .icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .pricing-display {
    padding: 0 1.25rem 1.25rem 1.25rem;
  }

  .pricing-display .amount {
    font-size: 2rem;
  }

  .installation-fee-notice {
    margin-top: 1rem;
    padding: 0.875rem;
  }

  .fee-notice-text {
    font-size: 0.8125rem;
  }

  .actions-section {
    margin-top: 2rem;
  }

  .actions-section h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .actions-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .action-btn {
    padding: 1rem 1.25rem;
  }

  .btn-title {
    font-size: 0.9375rem;
  }

  .btn-subtitle {
    font-size: 0.8125rem;
  }

  .modal-content {
    margin: 1rem;
  }

  .cancellation-notice {
    padding: 1rem;
  }

  .credit-card-display {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.875rem;
  }
}

@media (max-width: 640px) {
  .subscription-page {
    padding: 1rem 0.75rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }

  .page-header p {
    font-size: 0.9375rem;
  }

  .content-grid {
    gap: 1.25rem;
  }

  .card-header {
    padding: 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .status-info-wrapper {
    width: 100%;
  }

  .status-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .card-body {
    padding: 1rem;
  }

  .pricing-display {
    padding: 0 1rem 1rem 1rem;
  }

  .pricing-display .amount {
    font-size: 1.75rem;
  }

  .features-list {
    gap: 0.75rem;
  }

  .features-list li {
    font-size: 0.875rem;
  }

  .installation-fee-notice {
    padding: 0.75rem;
  }

  .fee-notice-header {
    font-size: 0.8125rem;
  }

  .fee-notice-text {
    font-size: 0.75rem;
  }

  .info-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-icon {
    width: 28px;
    height: 28px;
  }

  .action-btn {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .btn-title {
    font-size: 0.875rem;
  }

  .btn-subtitle {
    font-size: 0.75rem;
  }

  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header h3 {
    font-size: 1.125rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-footer button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .subscription-page {
    padding: 0.75rem 0.5rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.375rem;
  }

  .page-header p {
    font-size: 0.875rem;
  }

  .content-grid {
    gap: 1rem;
  }

  .card-header {
    padding: 0.875rem;
  }

  .card-body {
    padding: 0.875rem;
  }

  .icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .card-label {
    font-size: 0.8125rem;
  }

  .card-title,
  .plan-name {
    font-size: 1rem;
  }

  .pricing-display {
    padding: 0 0.875rem 0.875rem 0.875rem;
  }

  .pricing-display .currency {
    font-size: 0.875rem;
  }

  .pricing-display .amount {
    font-size: 1.5rem;
  }

  .pricing-display .interval {
    font-size: 0.875rem;
  }

  .status-badge {
    font-size: 0.8125rem;
    padding: 0.1875rem 0.625rem;
  }

  .cancel-date {
    font-size: 0.8125rem;
  }

  .info-content .label {
    font-size: 0.6875rem;
  }

  .info-content .value {
    font-size: 0.875rem;
  }

  .actions-section h2 {
    font-size: 1.125rem;
  }

  .action-btn {
    padding: 0.75rem 0.875rem;
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }
}
</style>
