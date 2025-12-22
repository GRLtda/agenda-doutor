import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import { useAuthStore } from './stores/auth'
import { clickOutside } from './directives/click-outside'
import { phoneMask } from './directives/phone-mask'
import { cpfMask } from './directives/cpf-mask'
import { cnpjMask } from './directives/cnpj-mask'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import App from './App.vue'
import router from './router'

// Estilos
import './assets/css/normalize.css'
import './assets/css/global.css'
import './assets/css/custom-toast.css'

const app = createApp(App)

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN, // Ler do .env
  integrations: [
    Sentry.browserTracingIntegration({ router }),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
})

// --- DIRETIVAS ---
app.directive('click-outside', clickOutside)
app.directive('phone-mask', phoneMask)
app.directive('cpf-mask', cpfMask)
app.directive('cnpj-mask', cnpjMask)
const toastOptions = {
  position: 'bottom-right',
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__fade',
  maxToasts: 4,
  newestOnTop: true,
}

app.use(Toast, toastOptions)

app.use(autoAnimatePlugin)
app.use(createPinia())

const authStore = useAuthStore()
authStore.checkAuth()

app.use(router)
app.mount('#app')
