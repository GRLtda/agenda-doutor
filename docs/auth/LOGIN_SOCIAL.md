# Login com provedores externos (frontend)

Contrato da API, segurança e erros: [api-clinic/docs/auth/OAUTH_PROVEDORES.md](../../../api-clinic/docs/auth/OAUTH_PROVEDORES.md).
Testes: `npm run test:oauth`.

> Visual refinado com os tokens do Design System (`--ds-*`, light e dark). Props, eventos, textos de erro e atributos de teste (`data-provider`, `data-connected`, `.social-login-section`, `.social-notice`, `.social-error`, `.security-alert-dot`) são o contrato e não mudam com o estilo.

**Prévia visual** (todos os estados lado a lado, claro/escuro): `npm run dev:oauth-preview` → http://127.0.0.1:5184/ (`?dark=1` abre no modo escuro). Fontes em `tests/oauth-preview/`; só API, roteador e store são substituídos.

## Peças

| Arquivo | Função |
|---|---|
| `src/api/oauth.js` | Chamadas à API (`/v2/auth/oauth/*`) |
| `src/composables/useOAuth.js` | Estado dos provedores, `binding` do navegador, início do fluxo, catálogo de mensagens e `parseOAuthApiError` |
| `src/components/auth/providers.config.js` | **Único** lugar que conhece cada provedor (id, nome, SVG do ícone, textos, descrição) |
| `src/components/auth/SocialLoginButton.vue` | Botão nativo genérico |
| `src/components/auth/SocialLoginSection.vue` | Divisor "ou" + botões + avisos/erros; usado no login e no cadastro |
| `src/components/auth/SecurityAlertDot.vue` | Bolinha amarela de pendência |
| `src/components/profile/ConnectedExperiences.vue` | Tab "Experiências conectadas" |
| `src/views/pages/autenticacao/OAuthCallbackView.vue` | Rota pública `/auth/callback` (retorno do provedor, etapa "Complete seu cadastro", erros) |
| `src/stores/auth.js` | `loginWithTokens`, `hasPassword`, `securityAlerts`, `hasSecurityAlert`, `connectedIdentities` |

Integrações: `LoginView.vue` (`intent="login"`), `RegisterView.vue` (`intent="signup"` + convite), `UserDropdown.vue` (bolinha no item "Perfil"), `TopBar.vue` e `Sidebar.vue` (bolinha no avatar), `ProfileView.vue`/`ProfileModal.vue` (card de senha com dois modos + tab `connected`, rótulo "Experiências Conectadas", ícone `Link2`). No card de senha, `.password-card[data-mode=set|reset]`: o modo **Definir senha** mostra a bolinha amarela ao lado do título e o texto explicando que a conta foi criada com o Google.

## Componentes (props, eventos, estados)

### `SocialLoginButton`
Props: `provider` (obrigatória), `mode` (`login`\|`signup`\|`link`, escolhe o texto), `label`, `loading`, `disabled`, `status` (`available`\|`degraded`), `block`. Evento: `click(providerId)`.
Visual: altura e raio do `AppButton` (`lg` 48px no login/cadastro; `sm` 32px no modo `link` "Conectar", sempre com 44px de toque no celular), logo colorido com espaço de proteção da marca Google (10px entre logo e texto), texto em peso médio.
Estados: padrão, hover, foco visível (outline 2px `--ds-border-focus`), pressionado, carregando (spinner + "Conectando...", `aria-busy`, bloqueia clique duplo), desabilitado e `degraded` (desabilitado com contorno tracejado). Respeita `prefers-reduced-motion`.

### `SocialLoginSection`
Props: `intent` (`login`\|`signup`), `returnTo` (caminho interno), `invitationToken`, `dividerText`, `disabled`. Eventos: `start(providerId)`, `error({ code, message, action })`.
- Sem provedor configurado → **não renderiza nada**.
- Divisor "ou" com linhas que esmaecem; botões em largura total, 44px de toque no celular.
- Provedor `degraded` → botão desabilitado + aviso `role="status"` (`.social-notice`, tom de atenção, ícone de alerta; login por e-mail/senha segue).
- Erro ao iniciar → mensagem inline `role="alert"` (`.social-error`, tom de erro, ícone), botão liberado para tentar de novo.

### `SecurityAlertDot`
Props: `alerts` (lista do `/me`, hoje `[{ code: 'no_password' }]`), `size` (`sm`\|`md`). Só renderiza com alertas; tem `aria-label`/`title` ("Defina uma senha para sua conta"). Para novos alertas, adicione o texto em `ALERT_LABELS`.

### `ConnectedExperiences`
Lista os provedores configurados (+ qualquer já conectado). Por cartão:
- **Conectado:** badge, "Conectado como x@gmail.com · desde dd/mm/aaaa", botão **Desconectar**.
- **Não conectado:** descrição e botão **Conectar** (`SocialLoginButton mode="link"`).
- Cartão: logo, nome, badge **Conectado** (verde) / **Não conectado** (neutro), skeleton ao carregar, `AppEmptyState` sem provedores, aviso de instabilidade com ícone.
- **Último método de acesso** (sem senha e só este provedor): botão primário **Definir senha** (emite `go-security`) e explicação em tom de atenção (não de erro).
- **Confirmação de identidade:** usuário com senha → formulário inline pedindo a senha (erro no campo); sem senha → passa de novo pelo provedor já conectado e retoma a ação ao voltar (`sessionStorage`: `oauth_pending_action`, `oauth_result`).
- Mensagem de resultado inline (sucesso/erro). Nota fixa: avisamos por notificação/WhatsApp a cada conexão.
Evento: `go-security`.

### `OAuthCallbackView`
Estados: `loading` → `error` | `complete` | redireciona.
- **Vínculo/confirmação (`?oauth=link|reauth`):** chama `POST /oauth/link/exchange` (usuário logado + binding), guarda o resultado em `sessionStorage.oauth_result` e volta ao `return`. A troca pública não conclui esses fluxos.
- **Carregando:** spinner + "Estamos concluindo seu acesso".
- **Erro:** ícone + mensagem amigável + saídas conforme `action`, com hierarquia: "Tentar novamente" é o botão primário; "Entrar com e-mail e senha" só é primário quando é a única saída (`use_password`); "Falar com o suporte" e "Voltar ao perfil" são secundários.
- **Complete seu cadastro:** cartão somente leitura com a **foto do Google** (se a imagem falhar, mostra a inicial), selo do Google, nome e e-mail; telefone (máscara), **senha opcional** e checkbox dos termos no mesmo estilo do `RegisterView`; erros **no próprio campo**; "Continuar" e "Usar outra conta".
  - Texto de apoio curto (o e-mail aparece só no cartão da conta, para não quebrar linha).
  - **Senha opcional**: botão de largura total "Definir uma senha agora"; ao abrir vira um painel (Senha, Confirmar senha, "Não definir agora") com transição suave.
  - O layout (`AuthCard`) é fixo na altura da tela: a imagem não rola e só o formulário tem scroll; a roda do mouse sobre a imagem também rola o formulário (no mobile a página rola normalmente).
  - **Senha opcional:** recolhida por padrão, só um link pequeno e cinza "Definir uma senha agora · opcional". Ao abrir mostra "Senha" (`PasswordInput` com força e requisitos ao digitar, como no cadastro) e "Confirmar senha", mais "Não definir senha agora". Só é enviada se a pessoa digitou algo (`password` + `password_confirmation`); sem senha a conta fica sem senha e aparece o alerta no perfil. Senha curta/longa, confirmação diferente e erros vindos da API aparecem no próprio campo.
  - **Foto:** `profile.picture` vem do `exchange` apenas se for URL confiável do provedor; depois do cadastro o `/me` devolve a foto como `profilePhotoUrl` (a importação para o storage acontece no backend, veja o guia do backend).
- Limpa `code` e demais parâmetros da barra de endereço, ignora `return` que não seja caminho interno e **nunca fica em branco** (sem parâmetros → "a tentativa expirou").

## Aba Segurança do perfil (`ProfileView.vue`)

Dois cartões, com animações suaves (avisos entram/saem com altura + opacidade, botões e requisitos com transição, `prefers-reduced-motion` respeitado):

- **Autenticação em duas etapas:** em desenvolvimento. Pílula "Em breve", linha "Aplicativo autenticador" com `Switch` desabilitado e aviso informativo.
- **Definir senha / Redefinir senha** (`.password-card[data-mode=set|reset]`; escolhido por `authStore.hasPassword`): botão "Enviar código" no cabeçalho (estados: enviando, contagem "Reenviar em 0:59", reenviar), campos "Código de verificação" e "Nova senha" (`PasswordInput`) e botão de confirmação. No modo **Definir senha** há a bolinha amarela no título e o aviso "Sua conta foi criada com o Google".

Tratamento de erros (nunca toast; textos sem termos técnicos):

| Situação | Onde aparece |
|---|---|
| Código vazio / senha vazia / senha com menos de 6 caracteres (mesma regra da API) | No próprio campo, antes de chamar a API |
| Código incorreto ou expirado (resposta 4xx da API) | No campo "Código de verificação" |
| Mensagem da API sobre a senha | No campo "Nova senha" |
| Conexão caiu (sem resposta) | Aviso de erro no cartão, mantendo o que foi digitado |
| 429 (muitos pedidos) | Aviso de atenção no cartão |
| Falha do servidor / WhatsApp | Aviso de erro no cartão |
| Sucesso | Aviso verde ("Senha definida." ou "Senha redefinida."); o perfil é recarregado e o cartão passa ao modo Redefinir |

`authStore.requestPasswordReset` e `performPasswordReset` agora devolvem também `status` (HTTP) para a tela separar erro de campo de falha geral; o status não aparece na tela. A prévia (`npm run dev:oauth-preview`, seção 7) mostra o `ProfileView` real em cada um desses estados.

## Contrato do `/me` usado pela UI

```js
authStore.user = {
  hasPassword: false,                       // conta criada por provedor e sem senha
  securityAlerts: [{ code: 'no_password' }],// alimenta a bolinha amarela
  identities: [{ provider: 'google', email, linkedAt, lastLoginAt }],
}
```
Getters: `authStore.hasPassword` (true enquanto o perfil não carregou, para não gerar alerta falso), `securityAlerts`, `hasSecurityAlert`, `connectedIdentities`. Depois de definir a senha ou conectar/desconectar, chame `authStore.fetchUser()` (já feito nas telas).

## Textos de erro e ações

Mensagens em `OAUTH_ERROR_MESSAGES` (espelham `GET /v2/auth/oauth/errors`); ações sugeridas em `OAUTH_ERROR_ACTIONS` (`retry`, `retry_or_use_password`, `use_password`, `use_other_account`, `set_password`, `reauthenticate`, `contact_support`, `wait`). Regras: sem termos técnicos, erro de campo no input (sem toast), toda falha termina com uma saída. O teste `oauth-login.spec.js` garante que todos os códigos do backend têm mensagem.

## Adicionar um provedor

1. Registre no backend (veja o guia do backend).
2. Inclua uma entrada em `providers.config.js` (`id`, `name`, `icon` SVG, `texts`, `description`).
Nenhum componente muda: eles leem `GET /oauth/providers` e `providers.config.js`.

## Armazenamento do navegador

`sessionStorage`: `oauth_binding` (prova de origem do fluxo, apagado ao concluir), `oauth_pending_action` e `oauth_result` (retomada do vínculo), `signupCampaignCode` (campanha, já existente). Nenhum token do provedor é guardado.
