# Resumo do estoque

A rota `/estoque` (`EstoqueDashboardView`) segue a apresentação de
Financeiro → Resumo: título e descrição, controles compartilhados, quatro
indicadores com `FinanceSummaryCard`, painéis brancos com borda discreta,
sombra leve e espaçamento uniforme. Valores usam peso 500; títulos de seção
usam 600; descrições usam 400. Cards estáticos não mudam de borda nem saltam
ao passar o mouse. Indicadores reutilizam a aparência do `FinanceSummaryCard`
também no hover, sem contorno ou sombra adicional exclusiva do estoque;
a navegação conserva cursor e foco visível por teclado.

## Dados e navegação

A consulta permanece `GET /v2/estoque/alertas/dashboard?dias=30`, via
`useEstoqueStore.fetchDashboardSummary`. O filtro aceita 30, 60 e 90 dias e
afeta os vencimentos. O `StyledSelect` usa seu slot `prefix` com ícone de
relógio e texto “Vencimento”; as opções são “30 dias”, “60 dias” e “90 dias”.
Atualizar repete a consulta. Seletor e botão têm 44px de altura, raio de
12px, borda e sombra equivalentes, com ajuste local no botão compartilhado.
Durante carregamento,
filtro, atualização e atalhos dos indicadores ficam desabilitados; o layout
é preservado com `AppSkeleton` e o carregamento de `FinanceSummaryCard`.
Falha apresenta mensagem e nova tentativa no painel, sem exibir zeros ou
mensagens de estoque saudável como se a consulta tivesse sido bem-sucedida.

Os indicadores mostram produtos cadastrados, lotes ativos, quantidade de
produtos na lista de estoque mínimo e quantidade de lotes na lista de
vencimentos retornada pela consulta. Os dois últimos são contagens dessas
listas, não novos totais calculados pelo servidor. Catálogo e estoque mínimo
abrem Produtos; lotes ativos e vencimentos abrem Lotes. O cabeçalho contém
somente o filtro e a atualização, sem atalho para kits e receitas.
“Ver todas” no painel de movimentações abre a
listagem correspondente. Não há faixa de gerenciamento no rodapé. Alertas de reposição
abrem o detalhe do produto; vencimentos abrem a listagem de lotes.

Não houve alteração nas rotas, contratos, permissões, autenticação ou regras
de armazenamento. O painel apenas consulta dados e navega pelas rotas existentes.

## Indicador e gráficos

O velocímetro de saúde é um semicírculo SVG com traço de 11px, pontas arredondadas,
escala de 0 a 100, valor com peso 500 e classificação em um selo discreto.
O valor continua vindo de `healthScore` do backend, limitado visualmente a
0–100. Preserva as classificações: Excelente a partir de 80, Bom a partir
de 60, Regular a partir de 40 e Crítico abaixo de 40. Cores suaves preservam
as faixas anteriores de verde/atenção/crítico (80 e 50), usando o azul da marca
para a faixa saudável. Quando não há produtos, apresenta “Sem dados” e não
classifica o estoque como excelente. Usa semântica de medidor e respeita
movimento reduzido, sem GSAP nem seletores globais para animar o painel.

Movimentações usa `Bar` do Vue Chart.js, com entradas azuis e saídas cinza-azul,
totais acima do gráfico e tooltip nativo. Entradas leem `--azul-principal`
ao montar o painel, com fallback `#0057FF`. Mantém os últimos sete dias e as
chaves `YYYY-MM-DD` calculadas por ISO, como na implementação anterior.
Agrupa `ENTRADA` e todos os tipos iniciados por `SAIDA`; valores ausentes
entram como zero. Sem movimentos no período, mostra o estado vazio.
Categorias exibem nome, quantidade e proporção do total retornado, em vez
da escala mínima arbitrária anterior. Nomes longos quebram linha; a lista
tem rolagem interna quando necessário. As barras usam `--azul-principal`,
com 8px de altura; nomes das categorias usam texto de 13px em `#334155`.
Descrições dos alertas, do medidor e dos vazios usam `#64748b` para melhorar
o contraste sem aumentar o peso da fonte.

## Estados vazios e responsividade

`StockDashboardEmpty` reutiliza `AppEmptyState` com o SVG local
`stock-dashboard-empty.svg`: caixa e ficha em branco e azuis suaves, sem
emojis. A arte é decorativa e usa as variáveis `--empty-*` do padrão de
[Estados vazios](estados-vazios.md). Títulos e descrições são compactos,
centralizados no espaço útil de cada painel. Os vazios só aparecem após
consulta bem-sucedida. Não injete SVG recebido de usuários nesse componente.

Em telas amplas, indicadores ficam em quatro colunas e saúde, movimentações
e categorias ficam lado a lado. Em larguras intermediárias, categorias ocupam
uma linha própria. No celular, painéis e alertas ficam em uma coluna; abaixo
de 420px, indicadores e controles também ficam em uma coluna. Há rolagem
vertical natural, sem esconder textos ou exigir rolagem horizontal.

## Verificação

Execute `npm run test:stock`. A suíte monta o painel, simulando store, router
e gráfico: verifica carregamento, erro e nova tentativa, filtro de dias,
navegação, ausência de saúde fictícia sem produtos, proporção das categorias,
agregação de saídas e alertas. Não substitui teste com backend real.

Com `npm run dev`, abra `/tests/fixtures/stock-dashboard-preview.html`.
A prévia monta os componentes reais com dados fictícios, sem chamadas à API;
oferece estados com dados, vazio, carregamento e erro, além de um iframe de
375px para verificar as regras responsivas. Confira o gráfico e seus tooltips,
velocímetro, títulos longos, foco pelo teclado, filtro 30/60/90, erro e nova
tentativa. No aplicativo autenticado, confira as contagens retornadas e os
destinos dos links com as permissões da sessão.
