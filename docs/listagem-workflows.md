# Listagem de workflows

`/workflows` usa `AppTableList` no mesmo padrão da listagem de pacientes.
O painel ocupa a altura restante abaixo do cabeçalho, independentemente de
ter zero, um ou vários registros. A página não cresce com as linhas: conteúdo
excedente rola internamente e a paginação fica fora da região rolável.

## Filtros e paginação

Busca por nome/descrição, ignorando caixa e acentos. Status usa `StyledSelect`
com prefixo e ícone (Todos, Ativo, Inativo); `isActive` mantém o mapeamento
existente do status `active` da API. Limpar tem largura fixa de 88px. A busca
tem lupa, X personalizado e borda/foco iguais aos seletores compartilhados.

Filtros e paginação são locais sobre a lista completa já retornada por
`GET /v2/workflows/definitions`, que exclui arquivados e restringe a clínica
autenticada. A lista inclui lastExecution; ações individuais/em lote usam endpoints v2 de ciclo de vida. Mostra dez itens por página;
filtrar volta à primeira, e excluir ajusta a página quando necessário.
`AppPagination` preserva salto direto pelo número e limite automático.

## Desktop e celular

Desktop: seletor, Workflow (ícone, nome e descrição), Última execução, Status e Ações.
Cabeçalho discreto e fixo durante rolagem. Clicar na linha/nome abre o editor.
Menu Ver execuções deste fluxo/Cancelar todas as execuções/Selecionar/Ativar ou Inativar/Editar/Excluir é independente da navegação da linha.

Até 768px, cards substituem a tabela, com borda completa e fundo azul suave
na seleção. Nome/descrição longos usam reticências; última execução e status ficam abaixo.
Selecionar página fica fora da rolagem e há espaço reservado para scrollbar.
O layout usa o padding natural da página, sem container adicional com fundo.
Filtros extras expandem/recolhem com animação de 200ms, respeitando movimento
reduzido e impedindo foco nos controles recolhidos. Novo workflow é um botão
com ícone no celular e ícone/texto no desktop. Paginação móvel compacta mantém
anterior, número editável e próxima, sem resumo de resultados.

Seleção é local, com Ativar/Inativar/Excluir em lote no cabeçalho. Limpa ao filtrar
ou paginar; após lote, itens que falharam permanecem selecionados se visíveis. Carregamento usa `AppSkeleton`; falha mostra nova tentativa. Vazio
usa `AppEmptyState` com `workflows-empty.svg` e distingue filtros sem resultado.

## Ações e validação

Criação e edição mantêm os SideDrawers e chamadas existentes. Nome obrigatório
é informado no campo e o erro é limpo ao editar; exclusão mantém confirmação.
Permissões seguem o router existente. Ativar sem versão publicada publica o rascunho;
reativar um inativo usa a versão já publicada. Editar metadados e publicar
o fluxo continuam ações distintas do módulo existente.
Interface e proteções do canvas: [Editor de workflows](editor-workflows.md).

## Verificação

- Conferir alturas iguais com 0/1/20 registros, carregamento, vazio e falha.
- Buscar nome/descrição com acento, combinar status, limpar e paginar.
- Selecionar um/todos, estado parcial, troca de página e menu sem abrir a linha.
- Em 1440×900 e 390×844, conferir rolagem interna, paginação fixa, cards,
  filtros recolhidos/abertos e nomes extensos.
- Abrir criação/edição, cancelar e conferir validação do nome; salvar/excluir
  somente com dados de teste em sessão autenticada. Executar `npm run build`.

Validação isolada com dados simulados: 1440×900 e 390×844, altura igual com um
e vinte workflows, página sem scroll, filtros por acento/status, seleção de card,
paginação com posição constante durante rolagem, vazio, erro e skeleton.

Regras: [Layout](regras-layout.md), [Componentes](componentes-compartilhados.md),
[Estados vazios](estados-vazios.md). Backend existente:
[Guia de workflows](../../api-clinic/docs/WORKFLOWS_GUIDE.md).

## Catálogo

Ao lado de Novo workflow, Catálogo de workflows abre um painel responsivo com
10 modelos, busca, descrições e prévias de até três etapas. Usar um modelo pede
um modelo de mensagem da clínica e cria um rascunho pelo endpoint do catálogo no backend,
abrindo o editor sem publicar. Contrato, ideias e fontes:
[Catálogo de workflows](catalogo-workflows.md).

## Ações de ciclo de vida

Ações usam WorkflowActionDialog sobre o BottomSheet existente e impedem submissão dupla. Excluir cancela
as execuções e as esperas no backend. Excluir arquiva: não apaga definitivamente.
Após ações, recarrega a lista para atualizar última execução/status. Lote informa
falhas parciais e mantém os itens com falha selecionados. Última execução mostra
data/hora e situação da run, inclusive com workflow inativo; nunca executado é
um estado explícito. No celular, cards e ações em lote mantêm a mesma funcionalidade.
Contrato e limites: [ciclo de vida v2](../../api-clinic/docs/WORKFLOW_LIFECYCLE.md).

Validação isolada com API simulada: coluna Última execução em workflow inativo,
Nunca executado, selecionar pelo menu, Ativar/Inativar/Excluir em lote, confirmação,
remoção visual após arquivar e cards em 390×844. O editor mostra Inativo quando
esse é o estado retornado pela API; Excluir etapa no menu restaura pelo Desfazer.

A resposta da listagem é resumida: não contém draftGraph/runPolicy; esses campos
são carregados no GET individual ao abrir o editor. A última execução vem de lookup
indexado limitado a um registro por definição, sem buscar todos os históricos.

## Execuções

O topo oferece Ver todas as execuções; os menus de desktop e cards oferecem Ver execuções, com filtro por definição. Consulte [Execuções de workflows](execucoes-workflows.md).

Inativar abre a escolha entre Apenas novos atendimentos (padrão, mantém execuções existentes) e Cancelar execuções e inativar. A segunda opção e o cancelamento de todas pelo menu aguardam três segundos antes de liberar confirmação. Ativar e excluir também usam o mesmo popup. Contratos e detalhes: [Execuções](execucoes-workflows.md) e [Ciclo de vida v2](../../api-clinic/docs/WORKFLOW_LIFECYCLE.md).
