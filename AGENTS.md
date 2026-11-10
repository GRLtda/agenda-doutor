# Instrucoes para agentes

## Unidades de atendimento

Consulte [api-clinic/docs/UNIDADES_ATENDIMENTO.md](../api-clinic/docs/UNIDADES_ATENDIMENTO.md)
para cadastro v2, seleção no atendimento, endereço do WhatsApp, auditoria e migração.

Consulte as instrucoes gerais de auditoria em [api-clinic/docs/AUDITORIA.md](../api-clinic/docs/AUDITORIA.md).

## Documentacao obrigatoria e sincronizada

Toda criacao, alteracao, atualizacao ou remocao de codigo, configuracao, modelo de dados, rota, contrato de API, fluxo, regra de negocio, interface, integracao ou teste deve incluir, na mesma entrega, a revisao e a atualizacao da documentacao relacionada.

Regras obrigatorias:

- Antes de editar, localize a documentacao existente do modulo e use-a como contexto.
- Depois de editar, atualize os arquivos em `docs/` que descrevem o comportamento afetado. Nunca deixe para uma tarefa futura.
- Se o recurso ainda nao possuir documentacao, crie uma pasta ou arquivo no diretorio `docs/` do projeto responsavel por ele.
- Documente o estado final que realmente ficou implementado: funcionamento, contratos, configuracao, seguranca, permissoes, limitacoes e forma de testar, conforme aplicavel.
- Remova ou corrija instrucoes, exemplos, rotas e limitacoes que ficaram obsoletos. Nao mantenha duas fontes concorrentes para o mesmo assunto; use um documento canonico e links de compatibilidade quando necessario.
- Para um novo subsistema relevante, adicione neste `AGENTS.md` um link para o ponto de entrada da documentacao correspondente.
- Considere a atualizacao documental parte da definicao de pronto. Uma alteracao nao esta concluida enquanto codigo, testes e documentacao estiverem divergentes.
- Na verificacao final, confira os links Markdown e procure referencias aos nomes ou caminhos antigos que foram alterados.

## Manutencao da Lia

Antes de alterar qualquer parte da Lia, leia [api-clinic/docs/lia/README.md](../api-clinic/docs/lia/README.md). Ele e o ponto de entrada para a arquitetura, fluxos, ferramentas, seguranca, frontend, testes e limitacoes conhecidas.

Regras obrigatorias ao trabalhar na Lia:

- Preserve o isolamento por `clinicId` e `userId` em conversas, mensagens e acoes.
- Nunca aceite `clinicId`, `userId`, permissoes ou identidade como argumento produzido pelo modelo ou enviado pelo frontend. Esses valores pertencem ao contexto autenticado do backend.
- Toda ferramenta deve estar registrada explicitamente, validar entrada com Zod e declarar permissoes.
- Toda escrita com efeito de negocio deve gerar uma `LiaAction` e exigir confirmacao visual antes de executar.
- Criacao, remarcacao e cancelamento de atendimento devem continuar idempotentes, auditaveis e revalidar permissoes e disponibilidade na confirmacao.
- Nunca exponha IDs internos no texto apresentado ao usuario.
- Atualize `api-clinic/docs/lia/` na mesma mudanca sempre que alterar comportamento, ferramenta, permissao, estado, prompt, rota, modelo de dados ou componente da Lia.
- Execute `npm run test:lia` em `api-clinic` depois de qualquer mudanca na Lia.

## Regra de tratamento de erros em formularios

Quando um erro de validacao local ou retornado pela API estiver associado a um campo especifico, exiba a mensagem diretamente no input correspondente, usando seu estado visual de erro. Nao use toast para erros que o usuario pode corrigir no proprio formulario, como campo obrigatorio, formato invalido, valor duplicado ou e-mail ja cadastrado. Limpe o erro do campo quando o usuario voltar a edita-lo. Reserve toast para falhas gerais sem campo correspondente e para feedback global de sucesso ou informacao.

## Tratamento de erros e mensagens ao usuário

Regras obrigatórias em toda mudança de frontend ou de API que o usuário veja.
O guia completo, com exemplos, está em
[Mensagens de erro](docs/Design%20System/acessibilidade.md#mensagens-de-erro).

- **Sempre verifique o tratamento de erros.** Toda chamada à API, validação,
  upload e ação assíncrona precisa de estado de erro visível. Nunca falhe em
  silêncio, nunca deixe um botão carregando para sempre e nunca apague o que o
  usuário digitou.
- **Mensagem amigável que explica o porquê.** Diga o que não foi feito, o
  motivo e o próximo passo: "Não foi possível agendar porque a Dra. Ana já tem
  um atendimento às 10:30. Escolha outro horário."
- **Nunca use termos técnicos na tela.** Nada de status HTTP, `500`, `timeout`,
  `network error`, `token`, `payload`, `undefined`, stack trace, nome de campo
  do banco ou ID interno. O detalhe técnico vai para log ou Sentry.
- **Nunca use mensagens genéricas.** Proibido "Erro ao processar", "Ocorreu um
  erro", "Algo deu errado", "Erro inesperado" e "Falha na requisição".
- **A API devolve o motivo.** Respostas de erro da `api-clinic` trazem uma
  mensagem em português pronta para o usuário (e, quando houver, o campo
  afetado), para o frontend não precisar inventar texto genérico.
- Ao revisar ou criar um fluxo, confira os casos de erro esperados (validação,
  conflito, permissão, limite do plano, conexão) e a mensagem de cada um.

## Regras de layout do frontend

Antes de alterar interfaces, consulte [docs/regras-layout.md](docs/regras-layout.md).

Para superfícies, bordas, raios, sombras, grid, espaçamento, tipografia,
ícones, gráficos, estados de formulário e animações, use o
[Design System](docs/Design%20System/README.md), os tokens
`--ds-*` de `src/assets/css/tokens.css` e as classes de
`src/assets/css/motion.css` (celebração de conclusão em
[Animações](docs/Design%20System/animacoes.md)).

### Regras do Design System para agentes

- **Use sempre componentes que já existem.** Antes de escrever HTML ou CSS,
  procure em `src/components/global`, `src/components/ui`
  e em [Componentes compartilhados](docs/componentes-compartilhados.md).
  Se nenhum servir, estenda o existente com uma prop em vez de criar outro.
- **Nenhum campo pode ser input, select ou textarea nativo.** Use `FormInput`,
  `PasswordInput`, `CurrencyInput`, `PhoneInputWithDDI`, `StyledSelect`,
  `SearchableSelect`, `StyledMultiSelect`, `Switch` e os demais listados em
  [Formulários](docs/Design%20System/formularios.md).
- **Textos longos crescem sozinhos.** Textarea com o visual do `FormInput`,
  `resize: none` e altura automática; a pessoa nunca redimensiona o campo.
- **Preserve os componentes base.** Não altere o visual de `AppButton`,
  `FormInput`, `StyledSelect`, `Switch`, da sidebar nem da tabela de
  `AppTableList` (avatar com a inicial azul sobre fundo azul claro) sem pedido
  explícito.
- **Mudanças no Design System são aplicadas direto.** Sempre que o usuário
  pedir para mudar algo do Design System, ou disser no pedido que não gosta de
  algo que ele cobre (cor, sombra, borda, raio, espaçamento, botão, campo,
  tabela, animação, texto etc.), identifique isso e atualize o Design System
  sozinho, na mesma entrega, sem perguntar: o documento em
  `docs/Design System/`, os tokens em `tokens.css` ou `motion.css`
  quando aplicável, a [vitrine](docs/Design%20System/vitrine.html)
  e a tabela de [decisões](docs/Design%20System/referencias.md#decisões).
  Ao final, diga em uma ou duas frases o que mudou no Design System.

Para criar ou alterar estados vazios, siga [docs/estados-vazios.md](docs/estados-vazios.md), incluindo SVG, centralização, cores e checklist.

## Whatszu local

Consulte [api-clinic/docs/WHATSZU_LOCAL.md](../api-clinic/docs/WHATSZU_LOCAL.md) para configuração local, TLS, autenticação e webhook.

## Cadastro de clínicas

Consulte [api-clinic/docs/CADASTRO_CLINICAS.md](../api-clinic/docs/CADASTRO_CLINICAS.md) para validação, criação do endereço padrão, consistência e testes.

## Cadastro de pacientes

Consulte [api-clinic/docs/CADASTRO_PACIENTES.md](../api-clinic/docs/CADASTRO_PACIENTES.md) para a relação de erros de validação e exibição por campo.

## Painel do médico

Consulte [API](../api-clinic/docs/SUMMARY_MEDICO.md) e [Interface](docs/resumo-medico.md) para a Visão Geral do médico logado.

## Assinatura do usuario

Consulte [API e trial](../api-clinic/docs/ASSINATURA_E_TRIAL.md) e [Interface da assinatura](docs/assinatura-perfil.md) para plano, avisos de acesso, pagamentos e checkout.

## Avisos de novas funcionalidades

Consulte [docs/avisos-funcionalidades.md](docs/avisos-funcionalidades.md) para campanhas, expiração e dispensa dos balões da clínica.

## Monitoramento de workflows

Consulte [Execuções v2](../api-clinic/docs/WORKFLOW_RUNS.md) e [Interface de execuções](docs/execucoes-workflows.md).

## Tempo real (WebSocket)

Consulte [API e eventos](../api-clinic/docs/REALTIME.md) e [Interface](docs/tempo-real.md) para atualizar telas quando o paciente assina termos ou responde anamneses.

## Armazenamento administrativo

Consulte [Armazenamento administrativo](../api-clinic/docs/ADMIN_STORAGE.md)
e [Interface administrativa](../crm-clinica-admin/docs/ARMAZENAMENTO.md)
para totais, inventário, permissões, índices, cache e testes.

## Sidebar do admin

A sidebar do `crm-clinica-admin` usa grupos expansíveis e só cria categoria nova para algo muito importante e diferente. Consulte [Sidebar do admin](../crm-clinica-admin/docs/SIDEBAR.md).

## Cabeçalho de página do admin

Toda página do `crm-clinica-admin` usa `AppPageHeader` (ícone, título e subtítulo, como a Auditoria do sistema). Consulte [Cabeçalho padrão](../crm-clinica-admin/docs/PADRAO_CABECALHO_PAGINA.md).

## Gestão de equipe do admin

Consulte [Gestão de Equipe](../crm-clinica-admin/docs/GESTAO_EQUIPE.md) para a tela `/team`, rotas e regras de remoção.

## Lia no admin (uso, tokens e erros)

Consulte [Lia no admin](../crm-clinica-admin/docs/LIA_ADMIN.md) e [Observabilidade administrativa da Lia](../api-clinic/docs/LIA.md#observabilidade-administrativa-uso-tokens-e-erros).

## Tabela padrão do admin

Toda listagem em linhas no `crm-clinica-admin` deve usar `AppDataTable`. Consulte [Tabela padrão do admin](../crm-clinica-admin/docs/TABELA_PADRAO.md).

## Dashboard do admin

Consulte [API e fórmulas](../api-clinic/docs/DASHBOARD_ADMIN.md) e [Interface do admin](../crm-clinica-admin/docs/DASHBOARD.md) para receita estimada, funil, saúde da base, Lia, permissões e verificação.

## Landing page institucional (home)

Consulte [Home da landing page](../landing-page/docs/home.md) para seções, movimento com scroll, conteúdo do FAQ (fonte única em `landing-page/src/seo/product.js`), CTAs e verificação.

## Campanhas de cadastro (feira Posicionamento no Digital)

Consulte [Landing page /evento](../landing-page/docs/evento.md),
[API, checkout e consulta de origem](../api-clinic/docs/ASSINATURA_E_TRIAL.md#campanha-de-autocadastro-com-teste-na-stripe),
[Cadastro e onboarding no app](docs/onboarding-assinatura-e-trial.md#campanha-da-feira-teste-com-cartão),
[Painel de campanhas no admin](../crm-clinica-admin/docs/CAMPANHAS.md),
[Testes do fluxo de cadastro e checkout](../api-clinic/docs/TESTES_FLUXO_CADASTRO_CHECKOUT.md)
e [Filtros do admin](../crm-clinica-admin/docs/LISTAS_ADMINISTRATIVAS.md#origem-do-cadastro-campanha-da-feira).
