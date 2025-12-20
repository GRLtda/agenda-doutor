import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkPlanAccess, getRouteFeature } from '@/composables/usePlanAccess'
import dashboardRoutes from './dashboard'
import { nextTick } from 'vue'

// Views Públicas e de Autenticação
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/pages/autenticacao/LoginView.vue'
import RegisterView from '../views/pages/autenticacao/RegisterView.vue'
import ClinicWizardView from '../views/pages/onboarding/ClinicWizardView.vue'
import AnswerAnamnesisView from '../views/public/AnswerAnamnesisView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import TermsView from '../views/TermsView.vue'

const routes = [
  { path: '/', name: 'landing', component: LandingView, meta: { public: true, title: 'Bem-vindo' } },
  { path: '/termos', name: 'terms', component: TermsView, meta: { public: true, title: 'Termos de Uso' } },
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

  if (to.meta.public) {
    return next()
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    // Permite que o usuário acesse a página para trocar de conta se desejar (o logout ocorrerá ao submeter o form)
    return next()
  }

  // 4. Se a rota exige uma clínica (a maioria das rotas 'requiresAuth')
  if (to.meta.requiresAuth && !to.meta.public) {
    // E o usuário está autenticado MAS não tem clínica
    if (isAuthenticated && !hasClinic) {
      // E ele NÃO ESTÁ indo para o wizard
      if (to.name !== 'clinic-wizard') {
        // Força ele a ir para o wizard
        return next({ name: 'clinic-wizard' })
      }
    }

    // E o usuário está autenticado E TEM clínica
    if (isAuthenticated && hasClinic) {
      // Mas está tentando acessar o wizard
      if (to.name === 'clinic-wizard') {
        // Redireciona para o dashboard
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


// Função para criar favicon com cantos arredondados
const createRoundedFavicon = (imageUrl, callback) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Desenhar círculo com cantos arredondados (border-radius)
    const radius = size * 0.2 // 20% de arredondamento
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(size - radius, 0)
    ctx.quadraticCurveTo(size, 0, size, radius)
    ctx.lineTo(size, size - radius)
    ctx.quadraticCurveTo(size, size, size - radius, size)
    ctx.lineTo(radius, size)
    ctx.quadraticCurveTo(0, size, 0, size - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.clip()

    // Desenhar a imagem dentro do clipping path
    ctx.drawImage(img, 0, 0, size, size)

    callback(canvas.toDataURL('image/png'))
  }
  img.onerror = () => {
    callback(imageUrl) // Fallback para a imagem original
  }
  img.src = imageUrl
}

router.afterEach((to) => {
  nextTick(() => {
    const setMetaTag = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('apple-mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');

    const authStore = useAuthStore()
    const clinic = authStore.user?.clinic
    const clinicName = clinic?.name
    const clinicLogo = clinic?.logoUrl
    const pageTitle = to.meta.title
    const defaultAppName = 'Agenda Doutor'

    const favicon = document.getElementById('favicon')
    const appleTouchIcon = document.getElementById('apple-touch-icon')

    if (clinicLogo) {
      // Criar favicon com cantos arredondados
      createRoundedFavicon(clinicLogo, (roundedUrl) => {
        if (favicon) favicon.href = roundedUrl
        if (appleTouchIcon) appleTouchIcon.href = roundedUrl
      })
    } else {
      if (favicon) favicon.href = '/activity.svg'
      if (appleTouchIcon) appleTouchIcon.href = '/activity.svg'
    }

    if (pageTitle && clinicName && to.meta.requiresAuth) {
      document.title = `${pageTitle} | ${clinicName}`
    } else if (pageTitle) {
      document.title = `${pageTitle} | ${defaultAppName}`
    } else if (clinicName) {
      document.title = clinicName
    } else {
      document.title = defaultAppName
    }

    if (clinicName) {
      setMetaTag('apple-mobile-web-app-title', clinicName);
    } else {
      setMetaTag('apple-mobile-web-app-title', defaultAppName);
    }
  })
})

export default router
