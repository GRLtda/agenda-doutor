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
  <div class="dashboard-container">

    <div v-if="isLoading && !summary.stats" class="loading-overlay">
      <LoaderCircle :size="40" class="animate-spin" />
      <p>Carregando...</p>
    </div>

    <div v-else class="dashboard-layout">

      <header class="dashboard-header">
        <div class="header-content">
          <div class="identity-wrapper">
            <div class="clinic-logo-wrapper">
              <img v-if="clinicLogo" :src="clinicLogo" alt="Logo" class="clinic-logo" />
              <div v-else class="clinic-logo-placeholder">
                {{ clinicName.charAt(0) }}
              </div>
            </div>
            <div class="text-content">
              <h1 class="clinic-title">{{ clinicName }}</h1>
              <div class="subtitle-wrapper">
                <span class="page-subtitle">Painel de Controle</span>
                <span class="divider-dot">•</span>
                <span class="user-role">Visão Geral</span>
              </div>
            </div>
          </div>

          <div class="status-bar-capsule">
            <div class="status-item date-item">
              <CalendarDays :size="16" class="icon-dimmed" />
              <span>{{ currentDate }}</span>
            </div>

            <div class="vertical-divider"></div>

            <div class="status-item hours-item" :class="{ 'text-warning': isClosingSoon, 'text-closed': isClosed }">
              <span class="status-dot" :class="{ 'dot-pulse': !isClosed && !isClosingSoon, 'dot-warning': isClosingSoon, 'dot-closed': isClosed }"></span>
              <span class="hours-text">{{ todayWorkingHours }}</span>
            </div>
          </div>
        </div>
      </header>

      <section class="stats-row">
        <div class="stat-card clickable" @click="$router.push({ name: 'anamneses-pendentes' })">
          <div class="stat-icon-mini bg-orange">
            <ClipboardList :size="22" />
          </div>
          <div class="stat-text">
            <span class="stat-value">{{ summary.stats.pendingAnamnesis }}</span>
            <span class="stat-label">Anamneses Pendentes</span>
          </div>
          <div class="stat-nav-icon">
            <ArrowRight :size="18" />
          </div>
        </div>

        <div class="stat-card clickable" @click="$router.push({ name: 'atendimentos' })">
          <div class="stat-icon-mini bg-blue">
            <Calendar :size="22" />
          </div>
          <div class="stat-text">
            <span class="stat-value">{{ summary.stats.appointmentsToday }}</span>
            <span class="stat-label">Atendimentos Hoje</span>
          </div>
          <div class="stat-nav-icon">
            <ArrowRight :size="18" />
          </div>
        </div>

        <div class="stat-card clickable" @click="$router.push({ name: 'pacientes' })">
          <div class="stat-icon-mini bg-green">
            <Users :size="22" />
          </div>
          <div class="stat-text">
            <span class="stat-value">{{ summary.stats.totalPatients }}</span>
            <span class="stat-label">Total de Pacientes</span>
          </div>
          <div class="stat-nav-icon">
            <ArrowRight :size="18" />
          </div>
        </div>

        <div class="stat-card clickable" @click="$router.push({ name: 'aniversariantes' })">
          <div class="stat-icon-mini bg-pink">
            <Cake :size="22" />
          </div>
          <div class="stat-text">
            <span class="stat-value">{{ summary.stats.birthdaysMonth }}</span>
            <span class="stat-label">Aniversariantes do Mês</span>
          </div>
          <div class="stat-nav-icon">
            <ArrowRight :size="18" />
          </div>
        </div>
      </section>

      <div class="main-split">

        <div class="panel-column">
          <div class="panel-header">
            <h3>Atividades Recentes</h3>
            <button
              class="btn-refresh"
              @click="handleRefresh"
              :disabled="isLoading"
              title="Atualizar dados"
            >
              <RefreshCw :size="14" :class="{ 'spin-animation': isLoading }" />
              <span>Atualizar</span>
            </button>
          </div>

          <div class="panel-content scrollable">
            <div v-if="!summary.feed || summary.feed.length === 0" class="empty-state">
              <p>Nenhuma atividade recente registrada.</p>
            </div>

            <div class="feed-list" v-else>
              <div
                v-for="item in summary.feed"
                :key="item.id"
                class="feed-item"
                :class="{ 'highlight-item': item.highlight }"
              >
                <div class="feed-icon-wrapper" :class="getFeedIconColorClass(item.type)">
                  <component :is="getFeedIcon(item.type)" :size="18" />
                </div>
                <div class="feed-text">
                  <div class="feed-top">
                    <span class="feed-title">{{ item.title }}</span>
                    <span class="feed-time">{{ formatRelativeTime(item.date) }}</span>
                  </div>
                  <p class="feed-desc">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-column alerts-panel">
          <div class="panel-header">
            <h3>Avisos do Sistema</h3>
          </div>

          <div class="panel-content scrollable">
            <div v-if="!summary.alerts || summary.alerts.length === 0" class="empty-state">
              <p>Tudo certo! Nenhum aviso importante.</p>
            </div>

            <div class="alerts-list" v-else>
              <div
                v-for="(alert, index) in summary.alerts"
                :key="index"
                class="alert-card"
                :class="`alert-${alert.level || 'default'}`"
              >
                <div class="alert-icon">
                  <AlertTriangle v-if="alert.level === 'warning' || alert.level === 'danger'" :size="18" />
                  <Info v-else :size="18" />
                </div>
                <p class="alert-message">{{ alert.message }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- Layout Geral --- */
.dashboard-container {
  width: 100%;
  height: calc(100vh - 30px);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.5rem 1rem 1rem 1rem;
  /* Background removido conforme solicitado */
}

.dashboard-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.25rem;
  /* max-width e margin removidos para ocupar a tela toda */
  width: 100%;
}

.loading-overlay {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 1rem;
}
.animate-spin { animation: spin 1s linear infinite; color: var(--azul-principal); }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* --- Header --- */
.dashboard-header {
  flex-shrink: 0;
  background-color: var(--branco);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  border: 1px solid #f1f5f9;
}

.header-content { display: flex; justify-content: space-between; align-items: center; }
.identity-wrapper { display: flex; align-items: center; gap: 1rem; }
.clinic-logo-wrapper {
  width: 52px; height: 52px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.clinic-logo { width: 100%; height: 100%; object-fit: cover; }
.clinic-logo-placeholder { font-weight: 700; color: var(--azul-principal); font-size: 1.5rem; }

.text-content { display: flex; flex-direction: column; }
.clinic-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.2; letter-spacing: -0.01em; }
.subtitle-wrapper { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #64748b; margin-top: 0.1rem; }
.divider-dot { color: #cbd5e1; font-size: 0.6rem; }

.status-bar-capsule {
  display: flex; align-items: center; background-color: #f8fafc; border: 1px solid #e2e8f0;
  padding: 0.5rem 1rem; border-radius: 99px; gap: 1rem;
}
.status-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #475569; }
.icon-dimmed { color: #94a3b8; }
.vertical-divider { width: 1px; height: 20px; background-color: #cbd5e1; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #22c55e; display: inline-block; }
.dot-pulse { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); animation: pulse-green 2s infinite; }
.dot-warning { background-color: #f59e0b; }
.dot-closed { background-color: #ef4444; }
.text-warning { color: #d97706; font-weight: 600; }
.text-closed { color: #ef4444; }

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* --- Stats Row --- */
.stats-row { flex-shrink: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.stat-card {
  background: var(--branco); border: 1px solid #f1f5f9; border-radius: 1rem; padding: 1rem 1.25rem;
  display: flex; align-items: center; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { transform: translateY(-3px); box-shadow: 0 6px 12px -2px rgba(0,0,0,0.1); }
.stat-card.clickable:hover .stat-nav-icon { opacity: 1; transform: translateX(0); }
.stat-icon-mini { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-orange { background: #fff7ed; color: #f97316; }
.bg-blue { background: #eff6ff; color: #3b82f6; }
.bg-green { background: #f0fdf4; color: #22c55e; }
.bg-pink { background: #fdf2f8; color: #ec4899; }

.stat-text { display: flex; flex-direction: column; flex-grow: 1; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; line-height: 1.1; margin-bottom: 2px; }
.stat-label { font-size: 0.75rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em; }

/* ✨ Ícone de navegação no card */
.stat-nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: #edfbff;
  color: #3b82f6;
  flex-shrink: 0;
  opacity: 0.7;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}

/* --- Main Split --- */
.main-split { flex-grow: 1; min-height: 0; display: grid; grid-template-columns: 2.2fr 1fr; gap: 1.25rem; }

.panel-column {
  background: var(--branco); border: 1px solid #f1f5f9; border-radius: 1rem;
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.panel-header {
  padding: 0.75rem 1.25rem; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
  display: flex; justify-content: space-between; align-items: center; background-color: #ffffff;
}
.panel-header h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #334155; }

/* ✨ Botão Refresh Estilizado */
.btn-refresh {
  display: flex; align-items: center; gap: 0.5rem;
  background-color: #ffffff; border: 1px solid #e2e8f0; padding: 0.4rem 0.8rem;
  border-radius: 0.5rem; font-size: 0.8rem; font-weight: 500; color: #475569; cursor: pointer;
  transition: all 0.2s;
}
.btn-refresh:hover:not(:disabled) { background-color: #f8fafc; color: var(--azul-principal); border-color: #cbd5e1; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
.spin-animation { animation: spin 1s linear infinite; }

.panel-content.scrollable { flex-grow: 1; overflow-y: auto; padding: 1rem; background-color: #ffffff; }
.panel-content.scrollable::-webkit-scrollbar { width: 6px; }
.panel-content.scrollable::-webkit-scrollbar-track { background: transparent; }
.panel-content.scrollable::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
.panel-content.scrollable::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

/* Feed com Cores de Fundo e Ícones */
.feed-list { display: flex; flex-direction: column; gap: 0.75rem; }
.feed-item {
  display: flex; gap: 1rem; padding: 0.875rem; border-radius: 0.75rem;
  border: 1px solid #f1f5f9; background: #ffffff; transition: all 0.2s;
}
.feed-item:hover { background: #f8fafc; border-color: #e2e8f0; }
.feed-item.highlight-item { border-left: 3px solid var(--azul-principal); background: #f8fafc; }

.feed-icon-wrapper {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
/* Classes específicas para cores de fundo do ícone */
.icon-purple { background: #f3e8ff; color: #a855f7; }
.icon-blue { background: #e0f2fe; color: #0ea5e9; }
.icon-green { background: #dcfce7; color: #22c55e; }
.icon-gray { background: #f3f4f6; color: #6b7280; }

.feed-text { flex-grow: 1; }
.feed-top { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
.feed-title { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.feed-time { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
.feed-desc { font-size: 0.85rem; color: #475569; margin: 0; line-height: 1.5; }

/* Alertas */
.alerts-list { display: flex; flex-direction: column; gap: 0.75rem; }
.alert-card {
  padding: 0.875rem; border-radius: 0.75rem; display: flex; gap: 0.75rem; align-items: flex-start; font-size: 0.85rem;
}
.alert-warning { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
.alert-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.alert-default { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
.alert-icon { margin-top: 2px; flex-shrink: 0; }
.alert-message { margin: 0; line-height: 1.4; font-weight: 500; }

.empty-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.9rem; background: #f8fafc; border-radius: 0.75rem; border: 1px dashed #e2e8f0; }

@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .main-split { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .dashboard-container { height: auto; overflow: auto; padding: 0.5rem; }
  .header-content { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .status-bar-capsule { width: 100%; justify-content: space-between; }
  .stats-row { grid-template-columns: 1fr; }
  .panel-content.scrollable { overflow: visible; height: auto; }
}
</style>
