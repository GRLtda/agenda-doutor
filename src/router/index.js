import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkPlanAccess, getRouteFeature } from '@/composables/usePlanAccess'
import dashboardRoutes from './dashboard'


// Views Públicas e de Autenticação
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/pages/autenticacao/LoginView.vue'
import RegisterView from '../views/pages/autenticacao/RegisterView.vue'
import ClinicWizardView from '../views/pages/onboarding/ClinicWizardView.vue'
import AnswerAnamnesisView from '../views/public/AnswerAnamnesisView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import TermsView from '../views/TermsView.vue'
import PrivacyPolicyView from '../views/PrivacyPolicyView.vue'
import LgpdView from '../views/LgpdView.vue'
import ChangelogView from '../views/ChangelogView.vue'

const routes = [
  { path: '/', name: 'landing', component: LandingView, meta: { public: true, title: 'Bem-vindo' } },
  { path: '/termos', name: 'terms', component: TermsView, meta: { public: true, title: 'Termos de Uso' } },
  { path: '/privacidade', name: 'privacy', component: PrivacyPolicyView, meta: { public: true, title: 'Política de Privacidade' } },
  { path: '/lgpd', name: 'lgpd', component: LgpdView, meta: { public: true, title: 'LGPD' } },
  { path: '/atualizacao', name: 'atualizacao', component: ChangelogView, meta: { public: true, title: 'Atualizações' } },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true, title: 'Login' } },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { public: true, title: 'Cadastro' },
    beforeEnter: (to, from, next) => {
      const hasToken = to.query.token || to.query.invitationToken

      if (!hasToken) {
        next({ name: 'landing' })
      } else {
        next()
      }
    },
  },
  {
    path: '/onboarding/clinic',
    name: 'clinic-wizard',
    component: ClinicWizardView,
    meta: { requiresAuth: true, title: 'Configuração da Clínica' },
  },
  {
    path: '/anamnese/:token',
    name: 'answer-anamnesis',
    component: AnswerAnamnesisView,
    meta: { public: true, title: 'Responder Anamnese' },
  },
  {
    path: '/termo/:token',
    name: 'sign-consent-term',
    component: () => import('../views/public/SignConsentTermView.vue'),
    meta: { public: true, title: 'Assinar Termo' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: 'Página não encontrada' },
  },
  ...dashboardRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// --- GUARDAS GLOBAIS (afterEach e beforeEach) ---

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  const hasClinic = authStore.hasClinic

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    return next({ name: 'resumo-dashboard' })
  }

  if (to.meta.public) {
    return next()
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAuth && !to.meta.public) {
    if (isAuthenticated && !hasClinic) {
      if (to.name !== 'clinic-wizard') {
        return next({ name: 'clinic-wizard' })
      }
    }

    if (isAuthenticated && hasClinic) {
      if (to.name === 'clinic-wizard') {
        return next({ name: 'resumo-dashboard' })
      }

      const requiredFeature = getRouteFeature(to.name)
      if (requiredFeature) {
        const clinicPlan = authStore.user?.clinic?.plan || 'basic'
        const hasAccess = checkPlanAccess(clinicPlan, requiredFeature)

        if (!hasAccess) {
          if (from.name && from.name !== to.name) {
            return next(false)
          }
          return next({ name: 'resumo-dashboard' })
        }
      }
    }
  }

  next()
})






router.onError((error, to) => {
  if (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  ) {
    if (!to?.path) {
      window.location.reload()
      return
    }

    // Prevent infinite reload loop if the error persists
    const targetPath = to.fullPath
    const storageKey = `router-reload:${targetPath}`
    const lastReload = sessionStorage.getItem(storageKey)
    const now = Date.now()

    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem(storageKey, now.toString())
      window.location.assign(targetPath)
    } else {
      console.error('Too many reloads detected for path:', targetPath)
    }
  }
})

export default router
