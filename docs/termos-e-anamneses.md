# Listagens de Termos e Anamneses

As rotas `/termos` e `/anamneses` usam o espaçamento e a rolagem padrão do `DefaultLayout`, como as outras páginas de listagem. O cabeçalho, os cartões e a paginação seguem as mesmas margens no desktop e no celular.

As duas telas preservam a busca por paciente, o filtro de status, os estados de carregamento e vazio, os cartões com ações e a paginação. Esta alteração afeta apenas a apresentação; não modifica a API, os dados ou as permissões.

A paginação reutiliza `AppPagination`, com adaptação dos valores `allPage`,
`allPages`, `allTotal` e `allLimit` e evento `page-change`. A listagem de pendências
também reutiliza o componente. Contratos e checklist estão em
[Componentes compartilhados](componentes-compartilhados.md).

Para verificar, abra ambas as rotas em largura ampla e estreita, compare o alinhamento com Pacientes e Galeria e confira busca, filtro, ações dos cartões e navegação entre páginas.
