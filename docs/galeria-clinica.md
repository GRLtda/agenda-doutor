# Galeria da clínica

A rota `/galeria` usa o espaçamento padrão do `DefaultLayout`, como as demais páginas de listagem. O cabeçalho fica acima de um painel de filtros; os arquivos aparecem em cartões e a paginação fica ao final do conteúdo. A rolagem pertence ao conteúdo principal do layout, inclusive em telas menores.

Os filtros de busca, categoria, tipo de arquivo, período e tags, assim como a abertura do arquivo e o acesso ao paciente, continuam disponíveis. A alteração é visual e não modifica os parâmetros enviados à API nem as permissões da galeria.

O período usa um único `VueDatePicker` com seleção de intervalo. Ao escolher as duas datas, a galeria recarrega desde a primeira página e envia `from` e `to` no formato `YYYY-MM-DD`; limpar o período remove ambos os filtros.

Na largura de desktop, busca, categoria, tipo de arquivo, período e tags ficam na mesma linha. Em telas estreitas, os filtros se reorganizam para manter os controles utilizáveis.

Nomes de pacientes longos são abreviados com reticências nos cartões e no visualizador; o nome completo aparece ao passar o cursor. O visualizador também abre o atendimento vinculado pelo botão **Ir para o atendimento**, quando o arquivo possui paciente e atendimento identificados. O botão usa a rota existente `atendimento-em-andamento`.

Para conferir, abra a galeria no desktop e no celular, compare o alinhamento do título e as margens com Pacientes e Procedimentos, e verifique filtros, cartões, modal e paginação. Use um paciente com nome longo para conferir as reticências e abra um arquivo vinculado a atendimento para testar o botão.
