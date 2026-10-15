# Execuções de workflows

A rota `/workflows/execucoes` usa `AppTableList`, como a [listagem de workflows](listagem-workflows.md), com dez registros por página e paginação no servidor. Filtros usam StyledSelect para workflow/status e AppDateRangePicker para período de início, incluindo o último dia completo no fuso do navegador. A ordenação é última atividade/ID decrescente. A consulta inicial inclui todos os status. Acesso pelo menu de um workflow envia definitionId na query string. Definições arquivadas continuam no histórico; quando a definição filtrada não consta das opções, aparece “Workflow selecionado”.

A tabela tem seis colunas: Workflow (ícone e nome), Paciente/atendimento, Status, Etapas atuais, Atividade (última atividade e início) e Ações. O skeleton repete essas seis colunas no desktop; no celular/secundário acompanha os cards, com ícone, nome, bloco da etapa, horários e botão. Em telas até 768px, cards preservam as informações. Altura limitada, rolagem interna e paginação fora da região rolável. Skeleton, falha com nova tentativa e AppEmptyState com workflows-empty.svg seguem as regras compartilhadas. Não há seleção em lote de execuções nem contador de execuções no cabeçalho dos filtros; a paginação mantém seu resumo padrão. Cards do secundário agrupam workflow/status, paciente, etapa e horários, com ação no rodapé.

## Atendimento e drawer

AppointmentDetailsModal mostra somente um botão de ícone, junto às setas de navegação do cabeçalho, quando o atendimento carregado possui ao menos uma execução (inclusive terminal). Sem execuções, durante carga ou falha, o ícone fica oculto. O botão usa aria-label/title e aria-expanded; clicar novamente recolhe o secundário, preservando os detalhes selecionados para reabrir. Consulta exclusivamente appointmentId; nunca inclui todo o histórico do paciente. O painel secundário abre à esquerda: 640px, fundo #f3f4f6, mesma altura do principal, sem gap, margem ou padding entre contêineres e sem arredondamento na junção. Conteúdo mantém padding interno. Um único overlay/contexto modal abriga ambos.

SideDrawer aceita `secondaryOpen`, `secondaryLabel`, `bodyClass`, slot `secondary` e evento `close-secondary`, todos opcionais; mantém os contratos anteriores. A transição horizontal dura 280ms e respeita movimento reduzido. Abaixo de 1100px, apenas o secundário fica visível; principal permanece montado e inerte, preservando formulários. Voltar fecha primeiro os detalhes da execução e depois a lista; Escape segue a mesma ordem. Ao fechar o secundário, o foco volta ao botão de origem. Tab permanece dentro do drawer. O X externo recalcula sua posição pela largura observada do conjunto (ResizeObserver), permanecendo à esquerda do secundário. Fechar por X ou clique no overlay aplica uma única animação de saída ao grupo inteiro, sem animação independente do principal, antes de desmontar ambos.

Selecionar execução substitui a lista no secundário, com “Voltar à lista”; na tela central, abre um SideDrawer xl. WorkflowRunDetails é compartilhado pelos dois acessos. Mostra grafo somente leitura da versão executada (pan/zoom permitidos), azul nas etapas atuais, verde nas concluídas, vermelho nas falhas e controles de zoom/enquadramento. O resumo usa card com ícone, paciente, status e datas; o histórico usa linha do tempo com marcadores, badges, tentativas, horários, esperas, prazos e falhas. Ramificações podem destacar múltiplos nós. Sem eventos inferidos, IDs visíveis ou payloads técnicos.

## Atualizações e interrupção

Consultas visíveis atualizam a cada cinco segundos; ao ocultar a aba ou desmontar o componente, não iniciam novas consultas. Uma consulta por instância de polling, com invalidação de respostas antigas ao trocar filtros/atendimento/execução. Falha periódica preserva dados e mostra nova tentativa. Navegar da lista para detalhes desmonta o polling da lista; a consulta que determina a disponibilidade do ícone do atendimento continua independente.

Interromper exige confirmação visual: “As próximas etapas não serão executadas. Mensagens já enviadas e ações já iniciadas não serão desfeitas.” Durante envio, “Interrompendo…” bloqueia duplicação; depois atualiza o detalhe e a listagem e a disponibilidade do ícone. Estado terminal é o retornado pelo servidor, inclusive se a execução concluiu durante a confirmação. Falha aparece no painel, sem toast. Interromper uma execução não desativa o workflow. Pausar, retomar e reexecutar não estão disponíveis.

Permissões e contratos: [Execuções v2](../../api-clinic/docs/WORKFLOW_RUNS.md).

## Verificação

Executar `npm run build`. Conferir em 1440×900 e 390×844: tabela/cards, filtros, paginação, scroll interno, textos extensos, carregamento, vazio, falha inicial e periódica, painel cinza encostado, movimento reduzido, Escape, foco e preservação do atendimento. Conferir grafo histórico, espera e ramificações simultâneas. Usar dados simulados ou uma clínica de teste para interrupção.

Verificação desta entrega: build aprovado e revisão com API simulada em 1440×900 e 390×844. Conferidos encaixe exato dos painéis, tabela/cards, grafo histórico, confirmação/interrupção simulada, Escape em dois níveis e restauração de foco, sem uso de dados reais.

Os nomes exibidos na tabela, no grafo e no histórico são traduzidos pelo backend. Nomes personalizados são preservados. Não há dicionário de traduções de etapas no frontend.

Correções visuais: conferir ícone oculto quando não há execuções; alternância abrir/recolher pelo mesmo ícone; posição do X com secundário aberto; saída conjunta pelo overlay; cards de resumo/histórico e nós do grafo em desktop/celular.
Validação das correções: revisão em 1440×900 e 390×844, sem erros de console, ícone ausente com total zero, alternância do secundário e X reposicionado com gap zero. O evento animationstart confirmou slide-out no drawer-group contendo os dois painéis, com animation:none no principal, e desmontagem conjunta após clicar fora.

## Ações por fluxo e confirmação

Ver execuções deste fluxo está nos menus da listagem de workflows e das linhas/cards de execuções. Abre /workflows/execucoes?definitionId=... com o filtro aplicado. Alterar o seletor de workflow sincroniza a query string; Limpar remove esse filtro junto com status e período; o vínculo fixo com atendimento no secundário é preservado. Atualizações após ações mantêm período/status/página e reconsultam a tabela, sem remontar a tela.

O cabeçalho possui Cancelar todas as execuções do fluxo, habilitado somente quando há uma definição selecionada. A mesma ação está nos menus de workflows e das execuções. Cancela todas as runs abertas daquele fluxo, mesmo fora do período/status/página visíveis; não cancela todos os fluxos da clínica e não inativa a definição. WorkflowActionDialog reutiliza BottomSheet, mostra o nome/escopo e aviso sobre efeitos já iniciados. O botão só libera após três segundos; o submit também confere o prazo, bloqueia duplicação e mantém erro geral no popup para nova tentativa. Fechar/desmontar limpa o timer. Inativar oferece new_only (opção inicial, mantém jornadas existentes) ou cancel_all (cancela e inativa, com espera de três segundos). A escolha também se aplica ao lote da listagem. Excluir usa o mesmo popup com espera; ativar usa confirmação sem espera.

## Ver atendimento

O resumo de Detalhes da execução oferece Ver atendimento somente se a API retornou um atendimento válido da clínica. Na tela central, WorkflowAppointmentPreview consulta GET /appointments/:id e abre o AppointmentDetailsModal existente sobre os detalhes, preservando a execução ao fechar. Carga/erro/retry usam o comportamento padrão do componente. Editar, reagendar e retorno reutilizam CreateAppointmentModal; não são recriados formulários. Dentro do secundário do próprio atendimento, Ver atendimento recolhe o secundário e retorna ao principal, evitando um modal recursivo. Execuções sem vínculo não exibem o botão.

Verificar cancelamento pelo menu e pelo cabeçalho com filtros aplicados, botão bloqueado nos primeiros três segundos, ambas as opções de inativação, falhas/retentativa, preservação dos filtros, skeleton em desktop/celular e abertura/fechamento/erro do atendimento vinculado.Validação desta entrega com API simulada em 1440×900 e 390×844: navegação por menu com filtro, confirmação bloqueada inicialmente e liberada depois de três segundos, envio do deactivationMode escolhido, cancelamento restrito à definição selecionada, botão desabilitado sem workflow, skeleton por coluna/card e abertura do atendimento preservando o detalhe da execução.
