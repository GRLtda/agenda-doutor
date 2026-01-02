// src/router/dashboard.js

// Layouts
import DefaultLayout from '../layouts/DefaultLayout.vue'

// Views do Dashboard
import Calendario from '../views/pages/calendario.vue'
import ResumoView from '../views/pages/ResumoView.vue'
import SettingsView from '../views/pages/configuracoes/SettingsView.vue'
import PatientsListView from '../views/pages/pacientes/PatientsListView.vue'
import CreatePatientView from '../views/pages/pacientes/CreatePatientView.vue'
import PatientDetailView from '../views/pages/pacientes/PatientDetailView.vue'
import AppointmentsView from '../views/pages/atendimentos/AppointmentsView.vue'
import InProgressAppointmentView from '../views/pages/atendimentos/InProgressAppointmentView.vue'
import AjudaView from '../views/pages/ajuda/AjudaView.vue'
import PendingAnamnesesView from '../views/pages/resumo/PendingAnamnesesView.vue'
import BirthdayPatientsView from '../views/pages/resumo/BirthdayPatientsView.vue'
import ProfileView from '../views/pages/ProfileView.vue'

import MessagesTab from '../views/pages/marketing/pages/MessagesTab.vue'
import TemplatesTab from '../views/pages/marketing/pages/TemplatesTab.vue'
import ConnectionTab from '../views/pages/marketing/pages/ConnectionTab.vue'
import LogsTab from '../views/pages/marketing/pages/LogsTab.vue'
import SubscriptionView from '../views/pages/assinatura/SubscriptionView.vue'

const dashboardRoutes = [
  {
    path: '/app',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'calendario',
        name: 'calendario',
        component: Calendario,
        meta: { title: 'Calendário', layout: { noPadding: true } },
      },
      {
        path: '',
        name: 'resumo-dashboard',
        component: ResumoView,
        meta: { title: 'Visão Geral'},
      },
      {
        path: 'configuracoes',
        name: 'configuracoes',
        component: SettingsView,
        meta: { title: 'Configurações' },
      },
      {
        path: 'assinatura',
        name: 'subscription',
        component: SubscriptionView,
        meta: { title: 'Assinatura', feature: 'subscription' }
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: ProfileView,
        meta: { title: 'Meu Perfil' },
      },
      {
        path: 'pacientes',
        name: 'pacientes',
        component: PatientsListView,
        meta: { title: 'Pacientes' },
      },
      {
        path: 'pacientes/novo',
        name: 'novo-paciente',
        component: CreatePatientView,
        meta: { title: 'Novo Paciente' },
      },
      {
        path: 'pacientes/:id',
        name: 'detalhes-paciente',
        component: PatientDetailView,
        meta: { title: 'Detalhes do Paciente' },
      },
      {
        path: 'procedimentos',
        name: 'procedimentos',
        component: () => import('../views/pages/procedimentos/ProceduresListView.vue'),
        meta: { title: 'Procedimentos' },
      },
      {
        path: 'financeiro',
        name: 'financeiro',
        component: () => import('../views/pages/finance/FinanceDashboardView.vue'),
        meta: { title: 'Financeiro' },
      },
      {
        path: 'ajuda',
        name: 'ajuda',
        component: AjudaView,
      },
      {
        path: 'atendimentos',
        name: 'atendimentos',
        component: AppointmentsView,
        meta: { title: 'Atendimentos' },
      },
      {
        path: 'atendimentos/:appointmentId/patient/:patientId',
        name: 'atendimento-em-andamento',
        component: InProgressAppointmentView,
        meta: { title: 'Em Atendimento', layout: { noPadding: true, fullscreen: true } },
      },
      {
        path: 'marketing/mensagens',
        name: 'marketing-mensagens',
        component: MessagesTab,
        meta: { title: 'Mensagens Automáticas' },
      },
      {
        path: 'marketing/modelos',
        name: 'marketing-modelos',
        component: TemplatesTab,
        meta: { title: 'Modelos de Mensagem' },
      },
      {
        path: 'marketing/conexao',
        name: 'marketing-conexao',
        component: ConnectionTab,
        meta: { title: 'Conexão WhatsApp' },
      },
      {
        path: 'marketing/logs',
        name: 'marketing-logs',
        component: LogsTab,
        meta: { title: 'Histórico de Envios' },
      },
      {
        path: 'workflows',
        name: 'workflows-list',
        component: () => import('../views/pages/workflows/WorkflowsListView.vue'),
        meta: { title: 'Workflows' },
      },
      {
        path: 'workflows/:id',
        name: 'workflow-editor',
        component: () => import('../views/pages/workflows/WorkflowEditor.vue'),
        meta: { title: 'Editor de Workflow', layout: { noPadding: true, fullscreen: true } },
      },
      {
        path: 'anamneses-pendentes',
        name: 'anamneses-pendentes',
        component: PendingAnamnesesView,
        meta: { title: 'Anamneses Pendentes', layout: { noPadding: true } },
      },
      {
        path: 'aniversariantes',
        name: 'aniversariantes',
        component: BirthdayPatientsView,
        meta: { title: 'Aniversariantes do Mês', layout: { noPadding: true } },
      },
    ],
  },
]

export default dashboardRoutes
