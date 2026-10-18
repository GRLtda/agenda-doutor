# Listagens de Termos e Anamneses

## Assinatura pelo paciente

A página `/termo/:token` consulta e envia sem autenticação do CRM, inclusive
quando existe sessão expirada no navegador. Aceita desenho, nome digitado ou
imagem PNG/JPEG/WebP de até 5 MB. Ao voltar à aba Desenhar, o canvas é
reinicializado. Durante o envio, o botão fica desabilitado.

Erros da imagem aparecem junto à área de assinatura; falhas gerais aparecem
antes do botão e permanecem visíveis, preservando a assinatura para nova
tentativa. A mensagem usa tanto `message` quanto `error.message` da API e
identifica falha de conexão ou excesso de tamanho quando não há mensagem.
Editar a assinatura ou as confirmações limpa o erro. Falhas de envio não
dependem de toast. Contrato e limitações:
[Assinatura pública de termos](../../api-clinic/docs/CONSENT_TERMS.md).

Verificar em desktop e celular: alternar os três métodos, selecionar imagem
inválida/grande, simular conexão perdida e respostas 403/409/413/500/503,
confirmar mensagem persistente e nova tentativa. Teste das mensagens:
`node --test tests/consent-signature-error.test.js`.

### Testes automatizados

Execute `npm run test:consent` em `crm-clinica`. O comando roda o teste de
mensagens com Node e a suíte Vitest configurada em `vitest.consent.config.js`.
As dependências de teste são Vitest, Vue Test Utils e JSDOM (26, compatível
com o runtime Node 22 usado pelo projeto).

- `tests/consent-view.spec.js` monta o componente real e verifica token,
  confirmações, envio digitado, desenho com mouse/toque, troca de abas,
  limpeza, upload válido/inválido/grande, falha de leitura, erro persistente,
  assinatura preservada, nova tentativa e bloqueio durante envio.
- `tests/consent-api-store.spec.js` verifica `skipAuth` nas duas chamadas
  públicas, propagação de erro sem toast e ciclo de carregamento do store.
- `tests/consent-signature-error.test.js` verifica ambos os contratos de
  mensagem, falha de conexão, 413 sem JSON e fallback HTTP.

Store, rota, confetti e APIs externos são simulados nos testes do componente;
canvas e FileReader também. Estes testes não substituem revisão visual nem
teste em navegador real. A cobertura do backend está descrita em
[Assinatura pública de termos](../../api-clinic/docs/CONSENT_TERMS.md#suíte-automatizada-do-módulo).

## Aplicar termo e anamnese

Ao abrir os modais de aplicação no paciente, a consulta inicial do WhatsApp é
silenciosa: não exibe toast de conexão ou desconexão. O status continua sendo
atualizado para habilitar o envio da notificação somente quando conectado.
Os dois modais usam `crmStore.getInitialStatus({ showToast: false })`; os
demais consumidores mantêm o comportamento padrão dos avisos.

Para verificar, abra os dois modais com WhatsApp conectado e desconectado:
não deve aparecer toast de status na abertura, e a opção de notificação deve
respeitar a disponibilidade da conexão. Na tela de conexão, confirme que o
aviso de sucesso continua aparecendo após conectar.

## Listagens

As rotas `/termos` e `/anamneses` usam o espaçamento e a rolagem padrão do `DefaultLayout`, como as outras páginas de listagem. O cabeçalho, os cartões e a paginação seguem as mesmas margens no desktop e no celular.

As duas telas preservam a busca por paciente, o filtro de status, os estados de carregamento e vazio, os cartões com ações e a paginação. Esta alteração afeta apenas a apresentação; não modifica a API, os dados ou as permissões.

A paginação reutiliza `AppPagination`, com adaptação dos valores `allPage`,
`allPages`, `allTotal` e `allLimit` e evento `page-change`. A listagem de pendências
também reutiliza o componente. Contratos e checklist estão em
[Componentes compartilhados](componentes-compartilhados.md).

Para verificar, abra ambas as rotas em largura ampla e estreita, compare o alinhamento com Pacientes e Galeria e confira busca, filtro, ações dos cartões e navegação entre páginas.
