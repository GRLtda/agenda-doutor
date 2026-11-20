import { createApp } from 'vue'
import { phoneMask } from '../../src/directives/phone-mask'
import { cpfMask } from '../../src/directives/cpf-mask'
import { cnpjMask } from '../../src/directives/cnpj-mask'
import { cepMask } from '../../src/directives/cep-mask'
import '../../src/assets/css/normalize.css'
import '../../src/assets/css/global.css'
import Preview from './Preview.vue'
import './preview.css'

// Binding do navegador (a tela de retorno exige) fictício.
sessionStorage.setItem('oauth_binding', 'binding-de-previa-0123456789')

const app = createApp(Preview)
app.directive('phone-mask', phoneMask)
app.directive('cpf-mask', cpfMask)
app.directive('cnpj-mask', cnpjMask)
app.directive('cep-mask', cepMask)
app.mount('#app')
