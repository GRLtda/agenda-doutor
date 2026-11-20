# Autenticação e indisponibilidade da API

## Preservação da sessão

Falha de conexão não é confirmação de sessão expirada. `fetchUser`,
`refreshTokens` e `checkAuth` preservam `auth_tokens`, o perfil `user`,
o contexto da clínica e a rota quando não conseguem validar a conta por
indisponibilidade. Esses dados já eram persistidos pelo frontend; não foi
adicionado cache de prontuários, pacientes ou outros dados clínicos.

As falhas temporárias reconhecidas por `utils/apiErrors.js` são:

- Erro de transporte Axios sem resposta, incluindo `ERR_NETWORK`.
- Timeout (`ECONNABORTED` ou `ETIMEDOUT`).
- HTTP 408, 429 e 500–599.

Cancelamento de requisição (`ERR_CANCELED`) não mostra aviso nem encerra a
sessão. Erros de formulário e permissões, como 400/403 comuns, continuam no
tratamento da funcionalidade correspondente. Respostas inesperadas ao buscar
o perfil também não provam invalidação: preservam a sessão local, mas não
criam uma identidade nem concedem permissões.

O código anterior chamava logout para qualquer erro de `/v2/auth/me` ou
`/v2/auth/refresh`, inclusive falha de rede e HTTP 503. Por isso, recarregar
durante uma queda da API apagava a sessão e levava ao login.

## Quando a sessão é encerrada

Continuam encerrando a sessão:

- Rejeição HTTP 401 definitiva na consulta do perfil ou renovação, após o
  fluxo de renovação aplicável. `AUTH_INVALID_REFRESH_TOKEN` e
  `AUTH_SESSION_REVOKED` são confirmações conhecidas de sessão inválida.
- HTTP 403 com `USER_INACTIVE`, que confirma usuário desativado.
- Token sem possibilidade de renovação quando ela é necessária.
- A ação explícita de sair.

Um HTTP 401 em uma chamada protegida pode tentar renovar o access token
antes de rejeitar a sessão. A fila de requisições compartilha uma única
renovação. Se ela falhar temporariamente, toda a fila é rejeitada e liberada,
preservando os tokens para a próxima tentativa; não fica aguardando indefinidamente
uma promessa já concluída. A API permanece responsável pela validade dos
tokens, autorização, clínica e assinatura de cada operação.

Sair explicitamente limpa tokens, usuário, clínica e header Authorization
imediatamente e redireciona ao login. A revogação no backend é tentada em
segundo plano, sem impedir a saída quando o servidor estiver fora do ar.
Respostas antigas de perfil/renovação não repõem a sessão depois de sair.

## Rota e recuperação da identidade

Na abertura/reload, o perfil em cache mantém a interface da conta e as
guardas existentes de clínica, plano e assinatura. Não há fallback que
conceda um plano ou permissão adicional. O router reavalia a autenticação
após consultar o perfil, em vez de reutilizar a flag anterior à consulta.

Se há tokens, mas nenhum perfil em cache e a consulta falha, a URL é
preservada. `App.vue` apresenta uma tela de recuperação com skeleton e não
monta o conteúdo protegido nem presume que o usuário precisa de onboarding.
Ao recuperar o perfil, força nova passagem pelas guardas da rota antes de
montar o conteúdo. Rotas públicas não recebem essa tela de recuperação.

## Aviso global

`services/apiAvailability.js` mantém um único estado reativo de
indisponibilidade. O interceptor Axios marca a falha; `isGlobalOffline`
continua exportado como alias de compatibilidade desse estado.

`ApiAvailabilityBanner`, montado uma única vez em `App.vue`, usa Teleport
para `body`, posição fixa no topo e z-index `2147483646`, acima dos modais,
seletores e notificações da aplicação. Segue o tratamento vermelho do aviso
de pagamento, com título, descrição e botão de recuperação. A mensagem é:

> Estamos com uma instabilidade no sistema. Já estamos verificando.

Para uma sessão local existente, informa que ela foi mantida e que dados
podem estar desatualizados. Sem sessão, não afirma que ela existe. O aviso
não expira durante a falha, não se duplica por requisição e respeita movimento
reduzido. Não altera nem remonta o formulário/página que já está aberto.

“Tentar novamente”, disponível para sessões locais existentes, executa
`checkAuth`: renova os tokens se necessário e consulta a conta. O botão
bloqueia cliques repetidos. Uma resposta bem-sucedida de uma requisição
iniciada após a última falha remove o aviso. Respostas de requisições antigas
concorrentes e erros de validação não escondem uma falha mais recente.

Falhas de integrações externas não acendem o aviso: se a API respondeu (por
exemplo, 502 em `/v2/whatsapp/...` porque o provedor de WhatsApp está
desligado), o sistema está no ar. O interceptor ignora esse caso e a própria
tela do WhatsApp mostra o estado da conexão. Falhas sem resposta (rede, timeout)
continuam acionando o aviso mesmo nessas rotas.

No login, a falha sem resposta do servidor (API fora do ar, rede) mostra no
formulário: "Não foi possível entrar porque não conseguimos falar com o sistema.
Confira sua conexão e tente novamente em instantes." Quando a API responde sem
mensagem própria, o texto é o equivalente para "o sistema não concluiu o acesso".
Credenciais erradas usam a mensagem da API ("E-mail ou senha incorretos...").

Não há polling, recarga automática da página nem repetição automática de
escritas por causa desse aviso. O refresh após 401 mantém a repetição já
existente da chamada autenticada; indisponibilidade não aciona essa repetição.
O usuário precisa repetir uma ação que falhou depois da recuperação. O banner
não afirma que um salvamento falho foi concluído e não cria fila offline.

Manter a sessão local não permite trabalhar integralmente sem API: consultas
e salvamentos dependem do servidor. Ao recarregar, dados que estavam somente
em memória não são restaurados. Tokens revogados, expirados sem renovação
válida ou efetivamente rejeitados continuam exigindo login.

## Testes e verificação

Execute `npm run test:auth`. A suíte verifica:

- Perfil, clínica e tokens preservados em falhas de rede e HTTP 5xx, incluindo
  reidratação do store como em um reload.
- Refresh com falha e posterior recuperação/rotação dos tokens.
- Consultas simultâneas, fila de 401 com sucesso e falha real do refresh.
- Sessão inválida, cancelamento, saída explícita e resposta antiga após saída.
- Guardas de rota, ausência de perfil e revalidação antes da montagem protegida.
- Aviso único, botão de tentativa e remoção após recuperação.

Com `npm run dev`, abra `/tests/fixtures/api-availability-preview.html` para
conferir o aviso sobre outra camada e um formulário com rascunho fictício.
O botão da prévia apenas simula recuperação; não acessa a API nem altera
credenciais ou localStorage. Acrescente `?mobile=1` para conferir o componente
em um iframe com viewport de 375px.

No aplicativo de teste autenticado:

1. Interrompa o acesso à API ou simule 503 em `/v2/auth/me` e recarregue uma
   rota protegida. Confira rota e sessão preservadas, aviso global e ausência
   de redirecionamento ao login.
2. Repita com access token próximo da expiração e falha no refresh.
3. Restabeleça a API e use Tentar novamente; confira desaparecimento do aviso
   e renovação/consulta da conta, sem reenvio de escritas que falharam.
4. Confirme que 401 de sessão revogada e a ação Sair continuam removendo a
   sessão. Teste também 400 de campo, 403 de permissão e cancelamento sem aviso.
5. Confira desktop/celular e uma página com formulário ou modal aberto.

Composição visual: [Design System](<Design System/README.md>).
As regras de acesso financeiro continuam em
[Onboarding e assinatura](onboarding-assinatura-e-trial.md).

## Telas de acesso (Entrar e Criar conta)

`/login`, `/register`, `/r/:token` e `/e/:token` são rotas filhas de **`AuthShell`** (`src/components/auth/AuthShell.vue`). A casca mantém a foto,
a citação e o layout; só o formulário troca (crossfade de 14 px + altura animada por `SmoothHeight`), então alternar entre as telas é suave.

- **Desktop:** a página não rola; só o formulário tem scroll e a roda do mouse sobre a foto também o rola. As duas fotos (`clinic1`, `clinic2`)
  alternam a cada 5 s com a citação, e a foto acompanha a tela (login → 1, cadastro → 2). Sem rodízio com `prefers-reduced-motion`.
- **Celular/iPhone (≤ 900 px):** foto no topo (só a marca branca), por trás de uma folha branca que flutua por cima; respeita
  `env(safe-area-inset-*)`; campos de 16 px (o iOS não dá zoom), botão de 52 px e alvos de toque de 44 px.
- **Peças:** `AuthHeader` (título com rabisco azul), `AuthBanner` (erro/atenção/info/sucesso, sempre com ícone), `AuthPromo` (campanha, plano, convite).
  `FormInput` e `PasswordInput` ganharam `icon` e `inputAttrs`; `PasswordInput` ganhou `placeholder`, o slot `label-action`, aviso de Caps Lock e olho com `aria-label`.

### Cuidados de segurança e reconhecimento como tela de acesso

- `autocomplete` correto (`username`, `current-password`, `new-password`, `email`, `tel`, `one-time-code`), `name`, `inputmode`, `autocapitalize="none"`,
  `autocorrect="off"` e `enterkeyhint`, para gerenciadores de senha e teclados do celular reconhecerem o formulário.
- Mensagem de credenciais **genérica** ("E-mail ou senha incorretos."), sem revelar se o e-mail existe; clique duplo bloqueado enquanto envia.
- `?redirect=` só aceita caminho interno (descarta `https://…` e `//host`); links externos abrem com `noopener,noreferrer`.
- Sincronização do preenchimento automático do iOS antes de enviar.

### Avisos de falha no login (cada um com texto próprio e uma saída)

| Situação | Aviso |
|---|---|
| `AUTH_INVALID_CREDENTIALS` (401) | Erro: "E-mail ou senha incorretos." |
| Erro por campo (`details.fields`) | No próprio campo, sem aviso geral |
| `AUTH_RATE_LIMITED` / 429 | Atenção + botão "Aguarde 0:45" com contagem (usa `retry_after`) e atalho "Esqueci minha senha" |
| `AUTH_SUBSCRIPTION_REQUIRED` | Atenção + "Falar com o suporte" |
| `AUTH_SESSION_REVOKED` | Informação: sessão terminou por segurança |
| Sem resposta (conexão) | Erro + "Tentar novamente" |
| 5xx | Erro + "Tentar novamente" |
| Chegou por link protegido (`?redirect=`) | Informação: "Entre para continuar de onde parou." |

No cadastro: e-mail já cadastrado (no campo, com "Entrar com este e-mail"), erros de nome/telefone/senha nos campos, termos não aceitos, convite inválido
(com suporte), limite de tentativas (contagem), sem conexão/5xx (com "Tentar novamente") e oferta expirada ("Esta oferta não está mais disponível").
`stores/auth.js` (`login` e `register`) agora devolve também `status` (HTTP) para separar essas falhas; o status não aparece na tela.

Testes: `tests/auth-access-login.spec.js` (`npx vitest run --config vitest.auth.config.js`) e `tests/signup-register-view.spec.js`.

### Cadastro: confirmar senha e conta criada

- O cadastro tem **Confirmar senha** logo abaixo da senha. Se não bater, o erro aparece no campo ("As senhas não conferem…") e a API não é chamada; quando bate, aparece "As senhas conferem.". A confirmação não é enviada à API.
- **Conta criada** não abre mais uma tela cheia: a animação acontece na própria tela (`RegisterView`). O formulário recolhe, o topo da casca fica verde
  (`AuthShell` expõe `provide('authShell', { celebrate })`; só um brilho suave, sem barra), o Lottie `check.json` (o mesmo do termo aplicado) toca, e uma barra de
  cerca de 3 s leva sozinha para `/onboarding/clinic` (convite de funcionário vai para `/`). "Ir agora" pula a espera. No celular o brilho fica só na folha de baixo.
  Com `prefers-reduced-motion` a barra enche de uma vez. Sem confete.
- A marca branca sobre a foto da clínica fica no canto superior **direito** no desktop e no canto superior esquerdo no celular; a folha branca do celular sobe 100 px sobre a foto.

### Ajustes de layout e links

- O formulário tem largura máxima de 500 px, e a folga vertical do painel acompanha a altura da tela (`clamp`), com espaçamento compacto em telas baixas, para não aparecer uma rolagem mínima.
- Trocar entre Entrar e Criar conta só faz fade (sem deslocamento lateral); a altura é animada.
- "Termos de Uso" e "Política de Privacidade" do cadastro abrem `/termos` e `/privacidade` do site institucional em nova aba (`VITE_LANDING_URL`, padrão `https://www.agendadoutor.com`).

- `/auth/callback` (retorno do Google, incluindo "Complete seu cadastro") agora também é filha da casca `AuthShell`, com o mesmo visual (título com rabisco azul, campos com ícone, termos com link, painel de senha opcional). A tela de conta criada usa só fade (sem `<Transition>` aninhado), para sempre terminar visível.
