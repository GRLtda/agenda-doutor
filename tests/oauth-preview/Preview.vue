<script setup>
/**
 * Prévia local do login com provedores externos: todos os estados lado a lado.
 * Usa os componentes reais; só a API, o roteador e o store são substituídos (vite.oauth-preview.config.js).
 * Os estados hover/foco/pressionado do botão são forçados por classes desta página; na tela real são pseudo-classes.
 */
import { ref, reactive, watch } from 'vue'
import { KeyRound, User, CreditCard, LogOut } from 'lucide-vue-next'
import SocialLoginButton from '@/components/auth/SocialLoginButton.vue'
import SocialLoginSection from '@/components/auth/SocialLoginSection.vue'
import SecurityAlertDot from '@/components/auth/SecurityAlertDot.vue'
import OAuthCallbackView from '@/views/pages/autenticacao/OAuthCallbackView.vue'
import ConnectedExperiences from '@/components/profile/ConnectedExperiences.vue'
import FormInput from '@/components/global/FormInput.vue'
import ProfileView from '@/views/pages/ProfileView.vue'
import Scenario from './Scenario.vue'

const dark = ref(new URLSearchParams(location.search).get('dark') === '1')
watch(dark, (value) => document.documentElement.classList.toggle('dark', value), { immediate: true })

const alerts = [{ code: 'no_password' }]
const identity = { provider: 'google', email: 'ana.souza@gmail.com', linkedAt: '2026-03-12T10:00:00Z' }
const auth = (hasPassword, identities) => ({
  hasPassword,
  connectedIdentities: identities,
  fetchUser: async () => {},
  loginWithTokens: async () => ({ success: true }),
})
const google = (status = 'available') => [{ id: 'google', name: 'Google', status }]

const buttonStates = [
  { title: 'Padrão', props: {} },
  { title: 'Hover', props: {}, force: 'force-hover' },
  { title: 'Foco visível', props: {}, force: 'force-focus' },
  { title: 'Pressionado', props: {}, force: 'force-active' },
  { title: 'Carregando', props: { loading: true } },
  { title: 'Desabilitado', props: { disabled: true } },
  { title: 'Instável (degraded)', props: { status: 'degraded' } },
]

const sections = [
  { title: 'Normal', scenario: { providers: google() } },
  { title: 'Provedor instável', scenario: { providers: google('degraded') } },
  { title: 'Erro inline (clique simulado)', scenario: { providers: google() }, steps: ['.social-buttons button'] },
]

const callbacks = [
  { title: 'Carregando', query: { oauth: 'login', code: 'preview-loading' } },
  { title: 'Erro · Tentar novamente + e-mail e senha', query: { oauth_error: 'provider_unavailable' } },
  { title: 'Erro · só e-mail e senha', query: { oauth_error: 'email_not_verified' } },
  { title: 'Erro · Falar com o suporte', query: { oauth_error: 'account_disabled' } },
  { title: 'Erro · Voltar ao perfil (vínculo)', query: { oauth_error: 'identity_already_linked', intent: 'link', return: '/perfil' } },
  { title: 'Complete seu cadastro', query: { oauth: 'complete', code: 'preview-complete', intent: 'signup' } },
  { title: 'Complete seu cadastro · senha opcional aberta', query: { oauth: 'complete', code: 'preview-complete', intent: 'signup' }, steps: ['.oauth-optional-toggle'] },
  { title: 'Complete seu cadastro · com erros', query: { oauth: 'complete', code: 'preview-complete', intent: 'signup' }, steps: ['form button[type=submit]'] },
]

const experiences = [
  { title: 'Conectado (com mensagem de sucesso)', scenario: { auth: auth(true, [identity]), providers: google(), resume: 'linked' } },
  { title: 'Não conectado', scenario: { auth: auth(true, []), providers: google() } },
  { title: 'Último método de acesso', scenario: { auth: auth(false, [identity]), providers: google() } },
  { title: 'Confirmação de identidade com erro no campo', scenario: { auth: auth(true, [identity]), providers: google() }, steps: ['.ce-actions button', '.ce-confirm button[type=submit]'] },
  { title: 'Provedor instável', scenario: { auth: auth(true, []), providers: google('degraded') } },
  { title: 'Mensagem de erro (conectar sem senha)', scenario: { auth: auth(false, []), providers: google() }, steps: ['.ce-actions button'] },
  { title: 'Estado vazio', scenario: { auth: auth(true, []), providers: [] } },
  { title: 'Carregando (skeleton)', scenario: { auth: auth(true, []), providers: google(), neverLoads: true } },
]

// Aba Segurança real (ProfileView). Cada cartão tem seu próprio store fictício.
const makeAuth = ({ hasPassword, send = { success: true }, reset = { success: true } }) => {
  const store = reactive({
    hasPassword,
    user: { name: 'Ana Souza', email: 'ana.souza@gmail.com', role: 'owner', clinic: { address: {} } },
    securityAlerts: hasPassword ? [] : [{ code: 'no_password' }],
    connectedIdentities: [],
    requestPasswordReset: async () => { await new Promise((r) => setTimeout(r, 700)); return send },
    performPasswordReset: async () => { await new Promise((r) => setTimeout(r, 700)); store.done = reset.success; return reset },
    fetchUser: async () => { if (store.done) { store.hasPassword = true; store.securityAlerts = [] } },
  })
  return store
}
const typeCode = { fill: '#sec-password-title' }
const fillBoth = [{ fill: '.password-card input[placeholder="Digite o código recebido"]', value: '123456' }, { fill: '.password-card input[type=password], .password-card input[autocomplete="new-password"]', value: 'minhasenha' }]
const security = [
  { title: 'Definir senha · enviando código e contagem', scenario: { auth: makeAuth({ hasPassword: false }) }, steps: ['.sec-send-btn'] },
  { title: 'Redefinir senha · campos vazios (erros no campo)', scenario: { auth: makeAuth({ hasPassword: true }) }, steps: ['.save-btn'] },
  { title: 'Senha curta (erro no campo)', scenario: { auth: makeAuth({ hasPassword: true }) }, steps: [{ fill: '.password-card input[placeholder="Digite o código recebido"]', value: '123456' }, { fill: '.password-card input[autocomplete="new-password"]', value: 'abc' }, '.save-btn'] },
  { title: 'Código incorreto (resposta da API)', scenario: { auth: makeAuth({ hasPassword: true, reset: { success: false, status: 400, error: 'Código inválido ou expirado.' } }) }, steps: [...fillBoth, '.save-btn'] },
  { title: 'Conexão caiu ao enviar', scenario: { auth: makeAuth({ hasPassword: true, send: { success: false, error: 'x' } }) }, steps: ['.sec-send-btn'] },
  { title: 'Limite de pedidos', scenario: { auth: makeAuth({ hasPassword: true, send: { success: false, status: 429, error: 'x' } }) }, steps: ['.sec-send-btn'] },
  { title: 'Sucesso ao definir senha', scenario: { auth: makeAuth({ hasPassword: false }) }, steps: [...fillBoth, '.save-btn'] },
]
</script>

<template>
  <main class="page">
    <header class="top">
      <h1>Login com provedores externos · prévia</h1>
      <label class="toggle"><input v-model="dark" type="checkbox" /> Modo escuro</label>
    </header>

    <h2>1. Botão nativo (SocialLoginButton)</h2>
    <p class="hint">Contexto login/cadastro (largura total) e "Conectar" compacto.</p>
    <div class="grid">
      <div v-for="state in buttonStates" :key="state.title" class="cell" :class="state.force">
        <span class="label">{{ state.title }}</span>
        <SocialLoginButton provider="google" mode="login" v-bind="state.props" />
        <SocialLoginButton provider="google" mode="signup" v-bind="state.props" />
        <div class="compact"><SocialLoginButton provider="google" mode="link" :block="false" v-bind="state.props" /></div>
      </div>
    </div>

    <h2>2. Seção de login (SocialLoginSection)</h2>
    <div class="grid">
      <div v-for="item in sections" :key="item.title" class="cell auth">
        <span class="label">{{ item.title }}</span>
        <Scenario :value="item.scenario" :steps="item.steps">
          <FormInput label="E-mail" model-value="" />
          <SocialLoginSection intent="login" />
        </Scenario>
      </div>
    </div>

    <h2>3. Tela de retorno (OAuthCallbackView)</h2>
    <div class="frames">
      <div v-for="item in callbacks" :key="item.title" class="frame-wrap">
        <span class="label">{{ item.title }}</span>
        <div class="frame"><Scenario :value="{ query: item.query }" :steps="item.steps"><OAuthCallbackView /></Scenario></div>
      </div>
    </div>

    <h2>4. Bolinha de segurança (SecurityAlertDot)</h2>
    <div class="grid">
      <div class="cell">
        <span class="label">Avatar com inicial · TopBar/Sidebar</span>
        <span class="avatar-wrap"><span class="user-avatar">G</span><SecurityAlertDot :alerts="alerts" class="avatar-alert-dot" /></span>
      </div>
      <div class="cell">
        <span class="label">Avatar com foto</span>
        <span class="avatar-wrap"><span class="user-avatar photo" /><SecurityAlertDot :alerts="alerts" class="avatar-alert-dot" /></span>
      </div>
      <div class="cell">
        <span class="label">Sidebar recolhida</span>
        <div class="rail"><span class="avatar-wrap"><span class="user-avatar">G</span><SecurityAlertDot :alerts="alerts" class="avatar-alert-dot" /></span></div>
      </div>
      <div class="cell">
        <span class="label">Item "Perfil" do UserDropdown</span>
        <ul class="menu">
          <li><button class="dropdown-item"><User :size="16" /><span>Perfil</span><SecurityAlertDot :alerts="alerts" size="sm" class="menu-alert-dot" /></button></li>
          <li><button class="dropdown-item"><CreditCard :size="16" /><span>Assinatura</span></button></li>
          <li><button class="dropdown-item"><LogOut :size="16" /><span>Sair</span></button></li>
        </ul>
      </div>
      <div class="cell">
        <span class="label">Título do card "Definir senha"</span>
        <h3 class="card-title">Definir senha <SecurityAlertDot :alerts="alerts" size="sm" /></h3>
      </div>
    </div>

    <h2>5. Experiências conectadas (ConnectedExperiences)</h2>
    <div class="grid wide">
      <div v-for="item in experiences" :key="item.title" class="cell profile">
        <span class="label">{{ item.title }}</span>
        <Scenario :value="item.scenario" :steps="item.steps"><ConnectedExperiences /></Scenario>
      </div>
    </div>

    <h2>6. Card de senha (aba Segurança)</h2>
    <p class="hint">Réplica do markup do <code>ProfileView.vue</code> (mesmas classes e FormInput real).</p>
    <div class="grid wide">
      <section v-for="mode in ['set', 'reset']" :key="mode" class="cell profile">
        <span class="label">{{ mode === 'set' ? 'Definir senha (conta criada com o Google)' : 'Redefinir senha' }}</span>
        <div class="content-card simple-section password-card" :data-mode="mode">
          <div class="card-header simple-header">
            <div class="header-text">
              <h2 class="password-title">
                {{ mode === 'reset' ? 'Redefinir senha' : 'Definir senha' }}
                <SecurityAlertDot v-if="mode === 'set'" :alerts="alerts" size="sm" />
              </h2>
              <p v-if="mode === 'reset'">Envie um código de confirmação e cadastre uma nova senha.</p>
              <p v-else class="password-set-note">Sua conta foi criada com o Google e ainda não tem senha. Defina uma para também poder entrar com e-mail e senha. Enviaremos um código de confirmação para o seu WhatsApp.</p>
            </div>
            <button type="button" class="action-btn"><KeyRound :size="15" /><span>Enviar código</span></button>
          </div>
          <div class="security-form-grid">
            <div class="simple-info-item"><span class="simple-label">Código de verificação</span><FormInput model-value="" placeholder="Digite o código recebido" /></div>
            <div class="simple-info-item"><span class="simple-label">Nova senha</span><FormInput model-value="" type="password" placeholder="Digite sua nova senha" /></div>
          </div>
          <div class="security-actions"><button type="button" class="action-btn save-btn"><span>{{ mode === 'reset' ? 'Redefinir senha' : 'Definir senha' }}</span></button></div>
        </div>
      </section>
    </div>

    <h2>7. Aba Segurança (ProfileView real)</h2>
    <div class="grid wide">
      <div v-for="item in security" :key="item.title" class="cell profile">
        <span class="label">{{ item.title }}</span>
        <Scenario :value="item.scenario" :steps="item.steps"><ProfileView active-tab="security" :hide-tabs="true" /></Scenario>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page { max-width: 1400px; margin: 0 auto; padding: 24px; }
.top { display: flex; align-items: center; justify-content: space-between; }
h1 { font-size: 1.4rem; margin: 0; }
h2 { margin: 40px 0 8px; font-size: 1.1rem; }
.hint { margin: 0 0 12px; color: var(--ds-text-muted); font-size: 0.85rem; }
.toggle { font-size: 0.9rem; color: var(--ds-text-secondary); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; align-items: start; }
.grid.wide { grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr)); }
.cell { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px dashed var(--ds-border-control); border-radius: 12px; background: var(--ds-surface); }
.cell.auth { max-width: 400px; }
.cell.profile { background: var(--ds-canvas); }
.label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ds-text-muted); }
.compact { display: flex; }
.frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 620px), 1fr)); gap: 20px; }
.frame-wrap { display: flex; flex-direction: column; gap: 8px; }
.frame { height: 720px; overflow: hidden; border: 1px solid var(--ds-border); border-radius: 12px; transform: translateZ(0); }
.frame :deep(.auth-container) { min-height: 100%; height: 100%; }
.frame :deep(.image-panel) { height: 100%; }
/* Estados forçados do botão (na tela real são :hover, :focus-visible e :active) */
.force-hover :deep(.social-login-button.social-login-button) { background: var(--ds-surface-subtle); border-color: var(--ds-border-control-hover); box-shadow: var(--ds-shadow-sm); }
.force-focus :deep(.social-login-button.social-login-button) { outline: 2px solid var(--ds-border-focus); outline-offset: 2px; }
.force-active :deep(.social-login-button.social-login-button) { background: var(--ds-surface-muted); box-shadow: none; transform: scale(0.99); }
/* Contextos da bolinha: mesmas regras de TopBar/Sidebar/UserDropdown */
.avatar-wrap { position: relative; display: inline-flex; flex-shrink: 0; width: fit-content; }
.avatar-alert-dot { position: absolute; top: 0; right: 0; z-index: 1; pointer-events: none; }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--ds-surface-brand); color: var(--azul-principal); display: flex; align-items: center; justify-content: center; font-weight: 600; }
.user-avatar.photo { background: linear-gradient(135deg, #7ea6ff, #10b981); }
.rail { display: flex; justify-content: center; width: 72px; padding: 12px 0; border: 1px solid var(--ds-border); border-radius: 12px; background: var(--ds-surface); }
.menu { margin: 0; padding: 8px; width: 220px; list-style: none; border: 1px solid var(--ds-border); border-radius: 12px; background: var(--ds-surface); box-shadow: var(--ds-shadow-md); }
.dropdown-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.75rem; border: none; border-radius: 0.5rem; background: none; font: inherit; font-size: 0.875rem; font-weight: 500; color: var(--ds-text-secondary); text-align: left; }
.menu-alert-dot { margin-left: auto; margin-right: 0.125rem; }
.card-title { display: inline-flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.05rem; }
/* Card de senha (réplica das regras de ProfileView.vue) */
.content-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e5e7eb; }
.simple-section { padding: 1.35rem 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #eceff3; padding-bottom: 1rem; }
.simple-header { margin-bottom: 1.25rem; }
.header-text h2 { font-size: 1.05rem; font-weight: 600; color: #111827; margin: 0 0 0.25rem 0; }
.header-text p { color: #6b7280; font-size: 0.84rem; margin: 0; }
.password-title { display: inline-flex; align-items: center; gap: 0.5rem; }
.password-card[data-mode='set'] .password-set-note { max-width: 60ch; line-height: 1.5; }
.security-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 1.25rem; }
.simple-info-item { min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.simple-label { font-size: 0.76rem; letter-spacing: 0.04em; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
.security-actions { margin-top: 0.25rem; display: flex; justify-content: flex-end; }
.action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.46rem 0.9rem; border-radius: 8px; border: 1px solid #d1d5db; background: white; font-weight: 500; font-size: 0.82rem; color: #374151; white-space: nowrap; }
.save-btn { background: #16a34a; color: white; border-color: #16a34a; }
</style>
