# Galeria da clínica

A rota `/galeria` usa o espaçamento padrão do `DefaultLayout`, como as demais páginas de listagem. O cabeçalho fica acima de um painel de filtros; os arquivos aparecem em cartões e a paginação fica ao final do conteúdo. A rolagem pertence ao conteúdo principal do layout, inclusive em telas menores.

Os filtros de busca, categoria, tipo de arquivo, período e tags, assim como a abertura do arquivo e o acesso ao paciente, continuam disponíveis. A alteração é visual e não modifica os parâmetros enviados à API nem as permissões da galeria.

A paginação usa `AppPagination`, adaptando `pagination.totalPages` para
`totalPages` e mantendo o handler `changePage`. O resumo inclui o intervalo e
total de arquivos. Contratos e checklist em
[Componentes compartilhados](componentes-compartilhados.md).

O período usa `AppDateRangePicker`, compartilhado com Financeiro → A receber,
com botão "início até fim" e calendário de intervalo. Ao escolher as duas datas,
a galeria recarrega desde a primeira página e envia `from` e `to` no formato
`YYYY-MM-DD`; a ação Limpar período remove ambos os filtros.

Na largura de desktop, busca, categoria, tipo de arquivo, período e tags ficam na mesma linha. Em telas estreitas, os filtros se reorganizam para manter os controles utilizáveis.

Nomes de pacientes longos são abreviados com reticências nos cartões e no visualizador; o nome completo aparece ao passar o cursor. O visualizador também abre o atendimento vinculado pelo botão **Ir para o atendimento**, quando o arquivo possui paciente e atendimento identificados. O botão usa a rota existente `atendimento-em-andamento`.

As tags automáticas de categoria, tipo, contexto e análise geradas pela API, junto com as marcas da migração legada (`migrado` e `cloudinary-legacy`), ficam ocultas no `tag-row` das miniaturas, no campo Tags da pré-visualização e no seletor de tags. Cada opção visível do seletor tem uma caixa de seleção. A contagem `+N` considera apenas as tags visíveis. As tags continuam armazenadas e disponíveis para busca textual; o seletor envia apenas tags visíveis. Como a API combina tags automáticas e manuais em um único array, uma tag manual com o mesmo texto de uma automática também fica oculta nessas apresentações.

Para conferir, abra a galeria no desktop e no celular, compare o alinhamento do título e as margens com Pacientes e Procedimentos, e verifique filtros, cartões, modal e paginação. Use um paciente com nome longo para conferir as reticências e abra um arquivo vinculado a atendimento para testar o botão.
