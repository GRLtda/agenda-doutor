<script setup>
import { onMounted, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ClipboardList,
  Calendar,
  Users,
  Cake,
  AlertTriangle,
  Info,
  Activity,
  CalendarClock,
  ClipboardCheck,
  UserPlus,
  LoaderCircle,
  Clock,
  CalendarDays,
  RefreshCw, // ✨ Novo ícone importado
  ArrowRight // ✨ Ícone para indicar navegação
} from 'lucide-vue-next'

const dashboardStore = useDashboardStore()
const authStore = useAuthStore()
const { summary, isLoading } = storeToRefs(dashboardStore)
const { user } = storeToRefs(authStore)

onMounted(() => {
  dashboardStore.fetchDashboardStats()
})

// --- Computed Properties ---
const clinicName = computed(() => user.value?.clinic?.name || 'Clínica Médica')
const clinicLogo = computed(() => user.value?.clinic?.logoUrl)

const currentDate = computed(() => {
  const dateStr = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })
  return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
})

const todayWorkingHours = computed(() => {
  const hours = user.value?.clinic?.workingHours
  if (!hours) return '--:--'

  const todayIndex = new Date().getDay()
  const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const todayName = daysMap[todayIndex]

  let todayConfig = null
  if (Array.isArray(hours)) {
    todayConfig = hours.find(h => h.day === todayName)
  }

  if (!todayConfig || todayConfig.isOpen === false) {
    return 'Fechado'
  }

  const start = todayConfig.startTime || '08:00'
  const end = todayConfig.endTime || '18:00'

  const now = new Date()
  const [endH, endM] = end.split(':').map(Number)
  const closingDate = new Date(now)
  closingDate.setHours(endH, endM, 0, 0)

  const diffMs = closingDate - now
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes <= 0) return 'Fechado'

  if (diffMinutes <= 120) {
    const h = Math.floor(diffMinutes / 60)
    const m = diffMinutes % 60
    if (h > 0) return `Fecha em ${h}h e ${m}min`
    return `Fecha em ${m}min`
  }

  return `Aberto até às ${end}`
})

const isClosingSoon = computed(() => todayWorkingHours.value.includes('Fecha em'))
const isClosed = computed(() => todayWorkingHours.value === 'Fechado')

// --- Helpers ---
function formatRelativeTime(dateString) {
  if (!dateString) return ''
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR })
  } catch (e) {
    return dateString
  }
}

function getFeedIcon(type) {
  switch (type) {
    case 'UPCOMING_APPOINTMENT': return CalendarClock
    case 'ANAMNESIS_FILLED': return ClipboardCheck
    case 'NEW_PATIENT': return UserPlus
    default: return Activity
  }
}

function getFeedIconColorClass(type) {
  switch (type) {
    case 'UPCOMING_APPOINTMENT': return 'icon-purple'
    case 'ANAMNESIS_FILLED': return 'icon-blue'
    case 'NEW_PATIENT': return 'icon-green'
    default: return 'icon-gray'
  }
}

// Ação do botão de atualizar
function handleRefresh() {
  dashboardStore.fetchDashboardStats()
}
</script>

<template>
  <div class="resumo-dashboard">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <div class="clinic-logo-wrapper">
            <img v-if="clinicLogo" :src="clinicLogo" alt="Logo" class="clinic-logo" />
            <div v-else class="clinic-logo-placeholder">
            {{ clinicName.charAt(0) }}
            </div>
        </div>
        <div class="header-text">
            <h1 class="title">{{ clinicName }}</h1>
            <p class="subtitle">Painel de Controle &bull; Visão Geral.</p>
        </div>
      </div>
      
      <div class="header-right">
        <div class="status-capsule">
           <div class="status-item">
             <CalendarDays :size="16" class="text-slate-500" />
             <span>{{ currentDate }}</span>
           </div>
           <div class="divider"></div>
           <div class="status-item status-hours" :class="{ 'closed': isClosed, 'warning': isClosingSoon }">
             <span class="status-dot" :class="{ 'pulse': !isClosed && !isClosingSoon }"></span>
             <span>{{ todayWorkingHours }}</span>
           </div>
        </div>
      </div>
    </header>

    <!-- Stats Row (Top Grid) -->
    <div class="top-grid">
      <!-- Anamneses -->
      <div class="kpi-card" @click="$router.push({ name: 'anamneses-pendentes' })" style="cursor: pointer">
        <div class="kpi-header">
          <span class="kpi-label">Anamneses Pendentes</span>
          <div class="icon-bg bg-orange-50">
            <ClipboardList :size="18" class="text-orange-500" />
          </div>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ summary.stats.pendingAnamnesis }}</span>
          <span class="kpi-sub hover-trigger">Ver detalhes <ArrowRight :size="12" class="inline ml-1" /></span>
        </div>
      </div>

      <!-- Atendimentos -->
      <div class="kpi-card" @click="$router.push({ name: 'atendimentos' })" style="cursor: pointer">
        <div class="kpi-header">
          <span class="kpi-label">Atendimentos Hoje</span>
          <div class="icon-bg bg-blue-50">
            <Calendar :size="18" class="text-blue-500" />
          </div>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ summary.stats.appointmentsToday }}</span>
          <span class="kpi-sub hover-trigger">Acessar agenda <ArrowRight :size="12" class="inline ml-1" /></span>
        </div>
      </div>

      <!-- Pacientes -->
      <div class="kpi-card" @click="$router.push({ name: 'pacientes' })" style="cursor: pointer">
        <div class="kpi-header">
          <span class="kpi-label">Total Pacientes</span>
          <div class="icon-bg bg-emerald-50">
            <Users :size="18" class="text-emerald-500" />
          </div>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ summary.stats.totalPatients }}</span>
          <span class="kpi-sub hover-trigger">Gerenciar Pacientes <ArrowRight :size="12" class="inline ml-1" /></span>
        </div>
      </div>

      <!-- Aniversariantes -->
      <div class="kpi-card" @click="$router.push({ name: 'aniversariantes' })" style="cursor: pointer">
        <div class="kpi-header">
          <span class="kpi-label">Aniversariantes Mês</span>
          <div class="icon-bg bg-pink-50">
            <Cake :size="18" class="text-pink-500" />
          </div>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ summary.stats.birthdaysMonth }}</span>
          <span class="kpi-sub hover-trigger">Ver Detalhes<ArrowRight :size="12" class="inline ml-1" /></span>
        </div>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="lists-grid">
      <!-- Atividades Recentes -->
      <div class="table-card">
        <div class="card-header">
          <div class="card-header-text">
            <h3 class="card-title">Atividades Recentes</h3>
            <p class="card-subtitle">Acompanhe as últimas ações da clínica.</p>
          </div>
          <button 
            class="refresh-btn" 
            @click="handleRefresh" 
            :disabled="isLoading"
            title="Atualizar"
          >
            <RefreshCw :size="16" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>
        
        <div class="feed-list scrollable-content">
          <div v-if="!summary.feed || summary.feed.length === 0" class="empty-state">
            <Activity :size="32" class="text-slate-300 mb-2" />
            <p>Nenhuma atividade recente.</p>
          </div>

          <div 
             v-else 
             v-for="item in summary.feed" 
             :key="item.id" 
             class="feed-item"
             :class="{ 'highlight': item.highlight }"
          >
            <div class="feed-icon" :class="getFeedIconColorClass(item.type)">
                <component :is="getFeedIcon(item.type)" :size="18" />
            </div>
            <div class="feed-content">
                <div class="feed-header">
                    <span class="feed-title">{{ item.title }}</span>
                    <span class="feed-time">{{ formatRelativeTime(item.date) }}</span>
                </div>
                <p class="feed-desc">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Avisos do Sistema -->
      <div class="table-card">
        <div class="card-header">
          <div class="card-header-text">
            <h3 class="card-title">Avisos do Sistema</h3>
            <p class="card-subtitle">Alertas e notificações importantes.</p>
          </div>
        </div>

        <div class="alerts-list scrollable-content">
           <div v-if="!summary.alerts || summary.alerts.length === 0" class="empty-state">
               <ClipboardCheck :size="32" class="text-slate-300 mb-2" />
               <p>Tudo certo! Sem avisos.</p>
           </div>
           
           <div 
             v-else 
             v-for="(alert, index) in summary.alerts" 
             :key="index"
             class="alert-item"
             :class="`alert-${alert.level || 'default'}`"
           >
              <div class="alert-icon-wrapper">
                  <AlertTriangle v-if="alert.level === 'warning' || alert.level === 'danger'" :size="16" />
                  <Info v-else :size="16" />
              </div>
              <span class="alert-text">{{ alert.message }}</span>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resumo-dashboard {
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

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.clinic-logo-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.clinic-logo { width: 100%; height: 100%; object-fit: cover; }
.clinic-logo-placeholder { font-weight: 700; color: var(--azul-principal); font-size: 1.5rem; }

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

.header-right {
    display: flex;
    align-items: center;
}

.status-capsule {
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: #f8fafc; /* Light gray background */
    padding: 0.6rem 1rem;
    border-radius: 99px; /* Pill shape */
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.status-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
}

.status-hours {
    color: #475569;
}
.status-hours.closed { color: #ef4444; }
.status-hours.warning { color: #d97706; }

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #22c55e;
}
.status-hours.closed .status-dot { background-color: #ef4444; }
.status-hours.warning .status-dot { background-color: #f59e0b; }

.status-dot.pulse {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.divider {
    width: 1px;
    height: 20px;
    background-color: #cbd5e1;
}

/* Grid Layouts */
.top-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 equal columns */
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
  gap: 0.75rem; /* Ensure consistent spacing */
}

.kpi-label {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1; /* Take available space */
  min-width: 0; /* Enable truncation in flex item */
}

.icon-bg {
    padding: 0.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* Colors for icon backgrounds */
.bg-orange-50 { background-color: #fff7ed; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-emerald-50 { background-color: #ecfdf5; }
.bg-pink-50 { background-color: #fdf2f8; }

.text-orange-500 { color: #f97316; }
.text-blue-500 { color: #3b82f6; }
.text-emerald-500 { color: #10b981; }
.text-pink-500 { color: #ec4899; }

.kpi-body {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--preto);
  line-height: 1.2;
}

.kpi-sub {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.kpi-card:hover .kpi-sub {
    opacity: 1;
    color: var(--azul-principal);
}

/* Layout Split */
.lists-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  /* height: 500px; Remove fixed height */
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
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill available space */
  max-height: 550px; /* Constrain max height */
  overflow: hidden; /* Ensure no leak */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Align for subtitle */
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1rem; /* 1rem size requested */
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

.refresh-btn {
    border: 1px solid #e5e7eb;
    background: transparent;
    border-radius: 0.5rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--cinza-texto);
    cursor: pointer;
    transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) {
    background-color: #f8fafc;
    color: var(--azul-principal);
}

.scrollable-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 0.5rem;
}

/* Custom Scrollbar */
.scrollable-content::-webkit-scrollbar { width: 4px; }
.scrollable-content::-webkit-scrollbar-track { background: transparent; }
.scrollable-content::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 2px; }

/* Feed Styling */
.feed-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.feed-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background-color: #f8fafc; /* Card look */
    transition: background 0.2s;
}

.feed-item:hover {
    background-color: #f1f5f9;
}

.feed-item.highlight {
    background-color: #eff6ff; 
    border: 1px solid #dbeafe;
}

.feed-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* Icon Colors */
.icon-purple { background: #f3e8ff; color: #a855f7; }
.icon-blue { background: #e0f2fe; color: #0ea5e9; }
.icon-green { background: #dcfce7; color: #22c55e; }
.icon-gray { background: #f3f4f6; color: #6b7280; }

.feed-content {
    flex: 1;
}

.feed-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.125rem;
}

.feed-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--preto);
}

.feed-time {
    font-size: 0.75rem;
    color: #94a3b8;
}

.feed-desc {
    font-size: 0.85rem;
    color: var(--cinza-texto);
    line-height: 1.4;
}

/* Alerts Styling */
.alerts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.alert-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.85rem;
    line-height: 1.4;
    align-items: flex-start;
}

.alert-warning { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
.alert-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.alert-default { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

.alert-text {
    flex: 1;
    font-weight: 500;
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #94a3b8;
    font-size: 0.9rem;
}

/* Responsive */
/* Responsive */
@media (max-width: 1024px) {
  .top-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .lists-grid {
    grid-template-columns: 1fr;
    /* Remove constrained height on tablet/mobile so it flows naturally */
    height: auto; 
  }
  
  .table-card {
      /* Allow cards to expand on mobile/tablet */
      height: auto; 
      max-height: 600px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
      height: auto;
      overflow-y: auto;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch; /* Stretch to fill width */
    gap: 1.5rem;
  }
  
  .header-left {
      flex-direction: row;
      align-items: center;
      text-align: left;
      gap: 1rem;
      width: 100%;
  }
  
  .header-text {
      align-items: flex-start;
  }
  
  .clinic-logo-wrapper {
      margin-bottom: 0;
      width: 48px; /* Slightly smaller on mobile */
      height: 48px;
  }
  
  .header-right {
      width: 100%;
  }
  
  .status-capsule {
      width: 100%;
      flex-direction: column;
      gap: 0.75rem;
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
      border-radius: 0;
  }

  .status-item {
      width: 100%;
      justify-content: center;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      border-radius: 0.75rem;
  }

  .divider {
      display: none;
  }
  
  .top-grid {
      grid-template-columns: repeat(2, 1fr); /* 2 columns for better density */
      gap: 0.75rem;
  }
  
  .kpi-card {
      padding: 1rem; /* Compact padding */
  }

  .kpi-value {
      font-size: 1.5rem; /* Slightly smaller number */
  }

  .kpi-label {
      font-size: 0.8rem;
      white-space: normal; /* Allow text to wrap on small screens */
      line-height: 1.2;
      display: -webkit-box;
      -webkit-line-clamp: 2; /* Limit to 2 lines */
      -webkit-box-orient: vertical;
      overflow: hidden; /* Hide overflow if > 2 lines */
      text-overflow: ellipsis; 
  }
  
  .lists-grid {
    gap: 1.5rem;
  }

  .table-card {
      max-height: none; /* Let it grow if needed, or keep constrained if preferred */
      height: auto;
  }
}
</style>
