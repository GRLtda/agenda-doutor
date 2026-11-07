<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useClinicStore } from '@/stores/clinic'
import { useAuthStore } from '@/stores/auth'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  Info,
  MessageCircle,
  Package,
  RefreshCw,
  Shield,
  ShoppingCart,
  Users,
} from 'lucide-vue-next'
import { trackClarityEvent } from '@/services/clarity'

const clinicStore = useClinicStore()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const subscription = ref(null)
const error = ref(null)
const actionLoading = ref(false)
const checkoutPlan = ref(null)

const payments = ref([])
const paymentsLoading = ref(true)
const paymentsError = ref(false)

const statusMap = {
  active: { label: 'Ativa', tone: 'success', icon: CheckCircle },
  past_due: { label: 'Pagamento pendente', tone: 'warning', icon: AlertTriangle },
  unpaid: { label: 'Não paga', tone: 'warning', icon: AlertTriangle },
  canceled: { label: 'Cancelada', tone: 'neutral', icon: AlertTriangle },
  trialing: { label: 'Período de teste', tone: 'info', icon: Clock },
  trial: { label: 'Período de teste', tone: 'info', icon: Clock },
  free: { label: 'Sem assinatura', tone: 'neutral', icon: Package },
  enterprise: { label: 'Enterprise', tone: 'brand', icon: Shield },
  enterprise_plus: { label: 'Enterprise Plus', tone: 'brand', icon: Shield },
  lifetime: { label: 'Vitalício', tone: 'brand', icon: CheckCircle },
}

const paymentStatusMap = {
  paid: { label: 'Pago', tone: 'success' },
  open: { label: 'Em aberto', tone: 'warning' },
  uncollectible: { label: 'Não cobrada', tone: 'danger' },
  void: { label: 'Anulada', tone: 'neutral' },
}

const actions = computed(() => subscription.value?.actions || {})
const accessWarning = computed(() => subscription.value?.accessWarning || null)
const plans = computed(() => subscription.value?.plans || [])
const currentPlan = computed(() => plans.value.find((plan) => plan.isCurrent) || null)

const currentStatus = computed(() => {
  const data = subscription.value
  if (!data) return statusMap.free
  if (['enterprise', 'enterprise_plus'].includes(data.planType) && data.status === 'active') {
    return statusMap[data.planType]
  }
  if (data.isTrial) return statusMap.trial
  return statusMap[data.status] || statusMap.free
})

const warningCopy = computed(() => {
  const warning = accessWarning.value
  if (!warning) return null

  const days = warning.daysRemaining
  const dayLabel = `${days} ${days === 1 ? 'dia' : 'dias'}`
  const endDate = formatDate(warning.accessEndsAt)

  if (warning.type === 'payment_overdue') {
    if (warning.expired) {
      return {
        title: 'Seu acesso foi suspenso por falta de pagamento',
        text: 'Regularize o pagamento para voltar a usar o sistema.',
        cta: 'Regularizar pagamento',
        action: 'portal',
      }
    }
    return {
      title: `Você perderá o acesso em ${dayLabel} se o pagamento não for regularizado`,
      text: `Não conseguimos processar a cobrança. O acesso é suspenso em ${endDate}.`,
      cta: 'Regularizar pagamento',
      action: 'portal',
    }
  }

  if (warning.type === 'trial') {
    return {
      title: `Seu teste gratuito termina em ${dayLabel}`,
      text: `Após ${endDate} será necessário assinar um plano para continuar usando o sistema.`,
      cta: null,
      action: null,
    }
  }

  return {
    title: `Sua assinatura termina em ${dayLabel}`,
    text: `O acesso será encerrado em ${endDate}. Você pode reativar a qualquer momento.`,
    cta: actions.value.canManageBilling ? 'Reativar assinatura' : null,
    action: 'portal',
  }
})

function planButton(plan) {
  if (actions.value.canCheckout && plan.purchasable) {
    const loadingThis = checkoutPlan.value === plan.key
    return { label: loadingThis ? 'Abrindo checkout...' : 'Escolher plano', disabled: Boolean(checkoutPlan.value), checkout: true }
  }
  if (plan.isCurrent) return { label: 'Plano atual', disabled: true }

  const currentAmount = currentPlan.value?.monthlyAmount
  if (currentAmount != null && plan.monthlyAmount != null) {
    return plan.monthlyAmount > currentAmount
      ? { label: 'Fazer upgrade', disabled: true }
      : { label: 'Fazer downgrade', disabled: true }
  }
  return { label: 'Indisponível', disabled: true }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatShortDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatCurrency(amount, currency = 'BRL') {
  if (amount == null) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: String(currency).toUpperCase(),
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

async function fetchPayments() {
  paymentsLoading.value = true
  paymentsError.value = false

  const response = await clinicStore.getSubscriptionPayments()
  if (response.success) {
    payments.value = response.data
  } else {
    paymentsError.value = true
  }
  paymentsLoading.value = false
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

function handleManageBilling() {
  openPaymentPortal('subscription_manage_click', 'Erro ao acessar portal de pagamento. Tente novamente.')
}

function handleWarningAction() {
  if (warningCopy.value?.action === 'portal') {
    openPaymentPortal('subscription_warning_click', 'Erro ao acessar portal de pagamento. Tente novamente.')
  }
}

async function handleCheckout(planKey) {
  checkoutPlan.value = planKey || subscription.value?.planType
  try {
    const result = await authStore.subscribe(planKey)
    if (!result.success) {
      toast.error(result.error?.response?.data?.message || result.error || 'Erro ao iniciar assinatura.')
    }
  } catch (err) {
    console.error('Erro ao iniciar checkout:', err)
    toast.error('Erro ao iniciar assinatura. Tente novamente.')
  } finally {
    checkoutPlan.value = null
  }
}

function handleNeedHelp() {
  trackClarityEvent('subscription_help_click')
  const url = subscription.value?.support?.whatsappUrl
  if (url) window.open(url, '_blank', 'noopener')
}

onMounted(() => {
  fetchSubscription()
  fetchPayments()
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
      <div v-if="warningCopy" class="notice access-warning" :class="accessWarning.severity" role="alert">
        <AlertTriangle v-if="accessWarning.severity !== 'info'" :size="18" />
        <Info v-else :size="18" />
        <div class="notice-body">
          <strong>{{ warningCopy.title }}</strong>
          <p>{{ warningCopy.text }}</p>
        </div>
        <button
          v-if="warningCopy.cta"
          type="button"
          class="compact-button warning-cta"
          :disabled="actionLoading"
          @click="handleWarningAction"
        >
          {{ actionLoading ? 'Abrindo...' : warningCopy.cta }}
        </button>
      </div>

      <div class="subscription-toolbar">
        <div class="toolbar-info">
          <span class="status-pill" :class="currentStatus.tone">
            <component :is="currentStatus.icon" :size="13" />
            {{ currentStatus.label }}
          </span>
          <span v-if="subscription.startDate" class="inline-muted">
            Assinante desde {{ formatDate(subscription.startDate) }}
          </span>
          <span v-if="actions.checkoutBlockedReason === 'TRIAL_ACTIVE'" class="inline-muted">
            A assinatura fica disponível quando o teste gratuito terminar.
          </span>
        </div>

        <div class="plan-actions">
          <button
            v-if="actions.canManageBilling"
            type="button"
            class="compact-button primary"
            :disabled="actionLoading"
            @click="handleManageBilling"
          >
            <Edit3 :size="16" />
            <span>{{ actionLoading ? 'Abrindo...' : 'Gerenciar assinatura' }}</span>
          </button>

          <button type="button" class="compact-button outline" @click="handleNeedHelp">
            <MessageCircle :size="16" />
            <span>Falar com o suporte</span>
          </button>
        </div>
      </div>

      <section v-if="plans.length" class="plans-section" aria-label="Planos disponíveis">
        <div class="plans-grid">
          <article
            v-for="plan in plans"
            :key="plan.key"
            class="plan-card"
            :class="{ current: plan.isCurrent, highlighted: plan.recommended }"
          >
            <div class="plan-card-top">
              <div class="plan-icon"><Users :size="18" /></div>
              <span v-if="plan.isCurrent" class="plan-tag current-tag">Plano atual</span>
              <span v-else-if="plan.recommended" class="plan-tag">Mais escolhido</span>
            </div>

            <div class="plan-copy">
              <span class="plan-doctors">{{ plan.doctorsLabel }}</span>
              <h2>{{ plan.name }}</h2>
              <p>{{ plan.tagline }}</p>
            </div>

            <div class="option-price">
              <strong>{{ formatCurrency(plan.monthlyAmount, plan.currency) }}</strong>
              <span>/mês</span>
            </div>

            <button
              type="button"
              class="option-button"
              :disabled="planButton(plan).disabled"
              :title="planButton(plan).checkout ? '' : 'Alteração de plano disponível em breve'"
              @click="planButton(plan).checkout && handleCheckout(plan.key)"
            >
              <span>{{ planButton(plan).label }}</span>
              <ArrowRight :size="17" />
            </button>

            <ul class="option-features">
              <li v-for="benefit in plan.benefits" :key="benefit">
                <CheckCircle :size="15" />
                <span>{{ benefit }}</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <div class="billing-layout">
        <section class="billing-card">
          <div class="billing-card-header">
            <span class="icon-box neutral"><FileText :size="18" /></span>
            <div>
              <span class="card-label">Histórico</span>
              <h3>Últimos pagamentos</h3>
            </div>
          </div>

          <div v-if="paymentsLoading" class="list-state"><div class="spinner small"></div></div>

          <div v-else-if="paymentsError" class="list-state">
            <span>Não foi possível carregar os pagamentos.</span>
            <button type="button" class="inline-action" @click="fetchPayments">Tentar novamente</button>
          </div>

          <div v-else-if="!payments.length" class="empty-payment">
            <FileText :size="18" />
            <div>
              <strong>Nenhum pagamento ainda</strong>
              <span>Suas cobranças aparecerão aqui depois da primeira fatura.</span>
            </div>
          </div>

          <ul v-else class="payments-list">
            <li v-for="payment in payments" :key="payment.id">
              <div class="payment-main">
                <strong>{{ formatCurrency(payment.amount, payment.currency) }}</strong>
                <span>{{ formatShortDate(payment.date) }}<template v-if="payment.description"> · {{ payment.description }}</template></span>
              </div>
              <span class="status-pill" :class="(paymentStatusMap[payment.status] || paymentStatusMap.void).tone">
                {{ (paymentStatusMap[payment.status] || { label: payment.status }).label }}
              </span>
              <a
                v-if="payment.hostedUrl"
                :href="payment.hostedUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="receipt-link"
                aria-label="Abrir comprovante"
              >
                <ExternalLink :size="15" />
              </a>
            </li>
          </ul>
        </section>

        <section class="billing-card">
          <div class="billing-card-header">
            <span class="icon-box neutral"><CreditCard :size="18" /></span>
            <div>
              <span class="card-label">Pagamento</span>
              <h3>Forma de pagamento</h3>
            </div>
          </div>

          <div v-if="subscription.card" class="payment-card">
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
              <span>O cartão é cadastrado ao finalizar o checkout.</span>
            </div>
          </div>

          <div v-if="subscription.paymentError?.message" class="notice danger">
            <AlertTriangle :size="16" />
            <div class="notice-body">
              <strong>Falha no pagamento</strong>
              <p>{{ subscription.paymentError.message }}</p>
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

.billing-card,
.state-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.subscription-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.plan-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.billing-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.billing-card h3 {
  margin: 0.1rem 0 0;
  color: #111827;
  font-size: 1.02rem;
  font-weight: 650;
  line-height: 1.2;
}

.billing-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.billing-card {
  min-width: 0;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-eyebrow,
.card-label {
  display: block;
  color: #94a3b8;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.compact-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-box,
.state-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-box.success,
.status-pill.success {
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
.status-pill.neutral {
  background: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

.notice.danger,
.status-pill.danger,
.state-icon.error {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fee2e2;
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
  white-space: nowrap;
}

.inline-muted {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 500;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px solid;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  font-size: 0.84rem;
  line-height: 1.45;
}

.notice-body {
  flex: 1;
  min-width: 0;
}

.notice p {
  margin: 0.15rem 0 0;
}

.notice strong {
  font-weight: 700;
}

.access-warning {
  align-items: center;
}

.access-warning.danger .warning-cta {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}

.access-warning.warning .warning-cta {
  background: #b45309;
  border-color: #b45309;
  color: #ffffff;
}

.inline-action {
  border: none;
  background: transparent;
  color: var(--azul-principal);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  align-items: stretch;
  padding-top: 10px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  padding: 1.1rem;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
}

.plan-card.current {
  border-color: var(--azul-principal);
}

.plan-card.highlighted {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.plan-card.highlighted.current {
  border-color: #2563eb;
}

.plan-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
}

.plan-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--azul-principal);
}

.highlighted .plan-icon {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.plan-tag {
  background: #2563eb;
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.28rem 0.62rem;
}

.plan-tag.current-tag {
  background: #eef2ff;
  color: var(--azul-principal);
}

.plan-copy {
  margin-top: 1rem;
}

.plan-doctors {
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 800;
}

.plan-copy h2 {
  margin: 0.35rem 0;
  font-size: 1.3rem;
}

.plan-copy p {
  margin: 0;
  min-height: 58px;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.45;
}

.highlighted .plan-doctors,
.highlighted .plan-copy p,
.highlighted .option-price span {
  color: rgba(255, 255, 255, 0.72);
}

.option-price {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin: 1.2rem 0 1rem;
}

.option-price strong {
  color: var(--azul-principal);
  font-size: 2rem;
  line-height: 1;
}

.highlighted .option-price strong {
  color: #ffffff;
}

.option-price span {
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 700;
}

.option-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 46px;
  padding: 0.85rem 0.95rem;
  border: none;
  border-radius: 12px;
  background: var(--azul-principal);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
}

.highlighted .option-button {
  background: #ffffff;
  color: #0f172a;
}

.option-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.option-features {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 1rem 0 0;
  border-top: 1px solid #e5e7eb;
}

.highlighted .option-features {
  border-color: rgba(255, 255, 255, 0.16);
}

.option-features li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #374151;
  font-size: 0.88rem;
}

.highlighted .option-features li {
  color: rgba(255, 255, 255, 0.82);
}

.option-features svg {
  color: #16a34a;
  flex-shrink: 0;
}

.payments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.payments-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.payments-list li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.payment-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.payment-main strong {
  color: #111827;
  font-size: 0.92rem;
}

.payment-main span {
  color: #64748b;
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-link {
  display: inline-flex;
  color: #64748b;
}

.receipt-link:hover {
  color: var(--azul-principal);
}

.list-state {
  min-height: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.84rem;
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
  gap: 0.65rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
  padding: 0.85rem;
}

.empty-payment div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.empty-payment strong {
  font-size: 0.86rem;
  color: #475569;
}

.empty-payment span {
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.35;
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

.state-card h3 {
  margin: 0.1rem 0 0;
  color: #111827;
  font-size: 1.02rem;
  font-weight: 600;
}

.state-card p {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.84rem;
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

.spinner.small {
  width: 22px;
  height: 22px;
  border-width: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .billing-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {

  .access-warning {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .billing-card {
    padding: 1rem;
  }

  .compact-button {
    width: 100%;
  }
}
</style>
