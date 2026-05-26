<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useClinicStore } from '@/stores/clinic'
import { useAuthStore } from '@/stores/auth'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Edit3,
  FileText,
  Info,
  MessageCircle,
  Package,
  RefreshCw,
  Shield,
} from 'lucide-vue-next'
import { trackClarityEvent } from '@/services/clarity'

const clinicStore = useClinicStore()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const subscription = ref(null)
const error = ref(null)
const actionLoading = ref(false)

const isTrialActive = computed(() => authStore.user?.planStatus?.trial?.isActive)
const trialDaysRemaining = computed(() => authStore.user?.planStatus?.trial?.daysRemaining)

const statusMap = {
  active: { label: 'Ativa', tone: 'success', icon: CheckCircle },
  past_due: { label: 'Pagamento pendente', tone: 'warning', icon: AlertTriangle },
  canceled: { label: 'Cancelada', tone: 'neutral', icon: AlertTriangle },
  trialing: { label: 'Período de teste', tone: 'info', icon: Clock },
  free: { label: 'Gratuito', tone: 'neutral', icon: Package },
  enterprise: { label: 'Enterprise', tone: 'brand', icon: Shield },
  enterprise_plus: { label: 'Enterprise Plus', tone: 'brand', icon: Shield },
  lifetime: { label: 'Vitalício', tone: 'brand', icon: CheckCircle },
}

const currentStatus = computed(() => {
  if (subscription.value?.planType === 'enterprise') return statusMap.enterprise
  if (subscription.value?.planType === 'enterprise_plus') return statusMap.enterprise_plus

  const status = subscription.value?.status || 'free'
  return statusMap[status] || statusMap.free
})

const isCanceled = computed(() => {
  if (['enterprise', 'enterprise_plus'].includes(subscription.value?.planType)) return false
  return subscription.value?.status === 'canceled' || Boolean(subscription.value?.cancelAt)
})

const planName = computed(() => {
  const planType = subscription.value?.planType
  const labels = {
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
    enterprise_plus: 'Enterprise Plus',
  }

  if (labels[planType]) return labels[planType]
  if (planType) return `${planType.charAt(0).toUpperCase()}${planType.slice(1)}`
  return 'Básico'
})

const price = computed(() => {
  const data = subscription.value

  if (data?.status === 'lifetime') {
    return { currency: 'R$', amount: '297,00', interval: 'mês' }
  }

  const fixedPrices = {
    enterprise: '199,00',
    enterprise_plus: '359,00',
    premium: '159,00',
  }

  if (fixedPrices[data?.planType]) {
    return { currency: 'R$', amount: fixedPrices[data.planType], interval: 'mês' }
  }

  if (data?.planType === 'basic' && data?.status !== 'free') {
    return { currency: 'R$', amount: '99,90', interval: 'mês' }
  }

  if (data?.plan && typeof data.plan === 'object') {
    return {
      currency: data.plan.currency.toUpperCase(),
      amount: formatCurrency(data.plan.amount, data.plan.currency).replace('R$', '').trim(),
      interval: data.plan.interval === 'month' ? 'mês' : 'ano',
    }
  }

  return { currency: '', amount: 'Grátis', interval: '' }
})

const formatDate = (dateString, fullDate = true) => {
  if (!dateString) return 'N/A'
  const options = fullDate
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: 'numeric' }

  return new Date(dateString).toLocaleDateString('pt-BR', options)
}

function formatCurrency(amount, currency = 'BRL') {
  if (!amount && amount !== 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function getCardIconUrl(brand) {
  if (!brand) return null
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '-')
  return `https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/c2df917e4879ecba8e84a85c947ee7ee9dc5747d/flat-rounded/${normalizedBrand}.svg`
}

async function fetchSubscription() {
  loading.value = true
  error.value = null

  try {
    const response = await clinicStore.getSubscriptionStatus()
    if (!response.success) {
      throw new Error(response.error || 'Não foi possível carregar os detalhes da assinatura.')
    }

    subscription.value = response.data
  } catch (err) {
    console.error('Erro ao carregar assinatura:', err)
    error.value = 'Não foi possível carregar os detalhes da assinatura.'
  } finally {
    loading.value = false
  }
}

async function openPaymentPortal(eventName, fallbackMessage) {
  trackClarityEvent(eventName)
  actionLoading.value = true

  try {
    const response = await clinicStore.createPortalSession()

    if (response.success && response.data.url) {
      window.location.href = response.data.url
      return
    }

    toast.error(response.error || fallbackMessage)
  } catch (err) {
    console.error('Erro ao acessar portal de pagamento:', err)
    toast.error(fallbackMessage)
  } finally {
    actionLoading.value = false
  }
}

function handleUpdatePayment() {
  if (isTrialActive.value) {
    toast.info('O gerenciamento fica disponível após o período de teste.')
    return
  }

  openPaymentPortal('subscription_manage_click', 'Erro ao acessar portal de pagamento. Tente novamente.')
}

function handleNeedHelp() {
  trackClarityEvent('subscription_help_click')
  const message = encodeURIComponent('Olá! Preciso de ajuda com minha assinatura.')
  const whatsappNumber = '5511921923978'
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
}

function handleReactivateSubscription() {
  openPaymentPortal('subscription_reactivate_click', 'Erro ao reativar assinatura. Tente novamente.')
}

async function handleViewInvoice() {
  trackClarityEvent('subscription_view_invoice_click')
  actionLoading.value = true

  try {
    const response = await clinicStore.getLatestInvoice()

    if (response.success && response.data.invoiceUrl) {
      window.open(response.data.invoiceUrl, '_blank')
      return
    }

    toast.error(response.error || 'Erro ao buscar comprovante.')
  } catch (err) {
    console.error('Erro ao buscar comprovante:', err)
    toast.error('Erro ao buscar comprovante. Tente novamente.')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchSubscription()
})
</script>

<template>
  <div class="subscription-page">
    <div v-if="loading" class="state-card">
      <div class="spinner"></div>
      <p>Carregando informações da assinatura...</p>
    </div>

    <div v-else-if="error" class="state-card error-state">
      <span class="state-icon error">
        <AlertTriangle :size="22" />
      </span>
      <div>
        <h3>Não foi possível carregar</h3>
        <p>{{ error }}</p>
      </div>
      <button type="button" class="compact-button primary" @click="fetchSubscription">
        <RefreshCw :size="15" />
        <span>Tentar novamente</span>
      </button>
    </div>

    <template v-else>
      <section class="plan-overview">
        <div class="plan-header">
          <span class="icon-box brand">
            <Package :size="19" />
          </span>
          <div>
            <span class="section-eyebrow">Plano atual</span>
            <h2>{{ planName }}</h2>
          </div>
        </div>

        <div class="plan-price">
          <span v-if="price.currency" class="price-currency">{{ price.currency }}</span>
          <strong>{{ price.amount }}</strong>
          <span v-if="price.interval">/ {{ price.interval }}</span>
        </div>

        <div class="plan-status-line">
          <span class="status-pill" :class="currentStatus.tone">
            <component :is="currentStatus.icon" :size="14" />
            {{ currentStatus.label }}
          </span>
          <span v-if="subscription?.startDate" class="inline-muted">
            Assinante desde {{ formatDate(subscription.startDate) }}
          </span>
          <span v-if="isCanceled && subscription?.cancelAt" class="inline-muted">
            Termina em {{ formatDate(subscription.cancelAt) }}
          </span>
        </div>

        <ul class="features-list">
          <li>
            <CheckCircle :size="15" />
            <span>Acesso total ao sistema</span>
          </li>
          <li>
            <CheckCircle :size="15" />
            <span>Suporte via WhatsApp</span>
          </li>
          <li>
            <CheckCircle :size="15" />
            <span>Backup automático</span>
          </li>
        </ul>
      </section>

      <div class="billing-layout">
        <section class="billing-card manage-panel">
          <div class="panel-copy">
            <span class="section-eyebrow">Cobrança</span>
            <h3>Assinatura e pagamento</h3>
            <p>Atualize o cartão, veja faturas e altere o plano com segurança pelo portal.</p>
          </div>

          <button
            type="button"
            class="compact-button primary"
            :disabled="actionLoading || isTrialActive"
            :title="isTrialActive ? 'Gerenciamento desabilitado durante o período de teste' : ''"
            @click="handleUpdatePayment"
          >
            <Edit3 :size="16" />
            <span>{{ actionLoading ? 'Abrindo...' : 'Gerenciar assinatura' }}</span>
          </button>

          <div class="secondary-actions">
            <button type="button" class="compact-button outline" @click="handleNeedHelp">
              <MessageCircle :size="16" />
              <span>Suporte</span>
            </button>

            <button
              v-if="subscription?.status === 'active'"
              type="button"
              class="compact-button outline"
              :disabled="actionLoading"
              @click="handleViewInvoice"
            >
              <FileText :size="16" />
              <span>Comprovante</span>
            </button>
          </div>

          <div v-if="isTrialActive" class="notice info">
            <Info :size="16" />
            <p>
              Período de teste ativo. Faltam <strong>{{ trialDaysRemaining }} dias</strong>
              para o fim do teste.
            </p>
          </div>

          <div v-if="isCanceled" class="notice neutral">
            <AlertTriangle :size="16" />
            <div>
              <p>Sua assinatura está cancelada e pode ser reativada a qualquer momento.</p>
              <button
                type="button"
                class="inline-action"
                :disabled="actionLoading"
                @click="handleReactivateSubscription"
              >
                {{ actionLoading ? 'Abrindo portal...' : 'Reativar assinatura' }}
              </button>
            </div>
          </div>

          <div v-if="subscription?.cancelAtPeriodEnd" class="notice warning compact">
            <AlertTriangle :size="16" />
            <p>Cancelamento agendado para o fim do período.</p>
          </div>
        </section>

        <section class="billing-card payment-card-section">
          <div class="billing-card-header">
            <span class="icon-box neutral">
              <CreditCard :size="18" />
            </span>
            <div>
              <span class="card-label">Pagamento</span>
              <h3>Forma de pagamento</h3>
            </div>
          </div>

          <div v-if="subscription?.card" class="payment-card">
            <div class="brand-card">
              <img
                v-if="getCardIconUrl(subscription.card.brand)"
                :src="getCardIconUrl(subscription.card.brand)"
                :alt="subscription.card.brand"
                width="44"
                height="28"
              />
              <CreditCard v-else :size="20" />
            </div>
            <div class="payment-info">
              <strong>•••• {{ subscription.card.last4 }}</strong>
              <span>Expira em {{ subscription.card.expMonth }}/{{ subscription.card.expYear }}</span>
            </div>
          </div>

          <div v-else class="empty-payment">
            <CreditCard :size="18" />
            <div>
              <strong>Nenhum cartão vinculado</strong>
              <span>Adicione um cartão pelo portal de assinatura.</span>
            </div>
          </div>

          <div v-if="subscription?.lastPaymentFailure?.reason" class="notice danger">
            <AlertTriangle :size="16" />
            <div>
              <strong>Falha no pagamento</strong>
              <p>{{ subscription.lastPaymentFailure.reason }}</p>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.subscription-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #1e293b;
}

.subscription-actions-card,
.summary-card,
.state-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.subscription-actions-card {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.actions-copy {
  min-width: 0;
}

.plan-overview,
.manage-panel,
.billing-card,
.state-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.plan-overview {
  min-width: 0;
  padding: 1.35rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem 1.5rem;
  align-items: start;
}

.plan-header,
.billing-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.plan-header h2,
.manage-panel h3,
.billing-card h3 {
  margin: 0.1rem 0 0;
  color: #111827;
  font-size: 1.02rem;
  font-weight: 650;
  line-height: 1.2;
}

.plan-price {
  justify-self: end;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.3rem;
  color: #64748b;
  text-align: right;
}

.plan-price strong {
  color: #111827;
  font-size: clamp(1.85rem, 2.6vw, 2.35rem);
  line-height: 0.95;
  font-weight: 650;
}

.plan-status-line {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.plan-overview .features-list {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  padding: 0;
  border-top: 0;
}

.plan-overview .features-list li {
  min-height: 40px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fbfdff;
}

.manage-panel {
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.panel-copy p {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.45;
}

.secondary-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.billing-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.billing-card {
  min-width: 0;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-payment div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.empty-payment strong {
  font-size: 0.86rem;
  color: inherit;
}

.empty-payment span {
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.35;
}

.section-eyebrow,
.card-label,
.detail-label {
  display: block;
  color: #94a3b8;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions-copy h2,
.summary-card h3,
.state-card h3 {
  margin: 0.1rem 0 0;
  color: #111827;
  font-size: 1.02rem;
  font-weight: 600;
}

.actions-copy p,
.state-card p {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.84rem;
  line-height: 1.45;
}

.actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.compact-button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.compact-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #c4c9d2;
}

.compact-button.primary {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
  color: #ffffff;
}

.compact-button.primary:hover:not(:disabled) {
  background: var(--azul-escuro);
  border-color: var(--azul-escuro);
}

.compact-button.outline {
  background: #ffffff;
}

.compact-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}

.summary-card {
  min-width: 0;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.icon-box,
.state-icon,
.detail-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-box.success,
.status-pill.success,
.notice.success,
.state-icon.success {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.icon-box.warning,
.status-pill.warning,
.notice.warning {
  background: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

.icon-box.info,
.status-pill.info,
.notice.info {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.icon-box.brand,
.status-pill.brand {
  background: #eef2ff;
  color: var(--azul-principal);
  border-color: #c7d2fe;
}

.icon-box.neutral,
.status-pill.neutral,
.notice.neutral {
  background: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

.notice.danger,
.state-icon.error {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fee2e2;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 700;
}

.inline-muted {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 500;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: 1px solid;
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 0.82rem;
  line-height: 1.45;
}

.notice.compact {
  align-items: center;
  padding: 0.65rem 0.75rem;
}

.notice p,
.notice small {
  margin: 0;
}

.notice strong {
  font-weight: 700;
}

.inline-action {
  margin-top: 0.55rem;
  border: none;
  background: transparent;
  color: var(--azul-principal);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.detail-icon {
  width: 32px;
  height: 32px;
  background: #f8fafc;
  color: #94a3b8;
}

.detail-row strong {
  display: block;
  color: #111827;
  font-size: 0.92rem;
  font-weight: 600;
  margin-top: 0.1rem;
}

.price-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.28rem;
  color: #64748b;
}

.price-line strong {
  color: #111827;
  font-size: 1.8rem;
  line-height: 1;
}

.price-currency {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
}

.features-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
  padding: 0.9rem 0 0;
  border-top: 1px solid #f1f5f9;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #475569;
  font-size: 0.86rem;
}

.features-list svg {
  color: #10b981;
  flex-shrink: 0;
}

.payment-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.brand-card {
  width: 52px;
  height: 36px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.brand-card img {
  display: block;
}

.payment-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.payment-info strong {
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92rem;
}

.payment-info span {
  color: #64748b;
  font-size: 0.78rem;
}

.empty-payment {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.65rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.85rem;
}

.state-card {
  min-height: 220px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}

.state-card.error-state {
  align-items: center;
}

.state-icon {
  border: 1px solid;
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--azul-principal);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .billing-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .plan-overview {
    grid-template-columns: 1fr;
  }

  .plan-price {
    justify-self: start;
    text-align: left;
  }

  .plan-overview .features-list {
    grid-template-columns: 1fr;
  }

  .subscription-actions-card {
    align-items: stretch;
    flex-direction: column;
  }

  .actions-row {
    justify-content: stretch;
  }

  .compact-button {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .subscription-actions-card,
  .summary-card,
  .plan-overview,
  .manage-panel,
  .billing-card {
    padding: 1rem;
  }

  .actions-row {
    flex-direction: column;
  }

  .secondary-actions {
    grid-template-columns: 1fr;
  }

  .compact-button {
    width: 100%;
  }

  .summary-card-header {
    align-items: flex-start;
  }

  .price-line strong {
    font-size: 1.55rem;
  }
}
</style>
