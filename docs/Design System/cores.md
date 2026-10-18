# Cores

## Paleta global da marca

Use as variáveis de [global.css](../../src/assets/css/global.css) em vez de
copiar valores hexadecimais para cada tela.

| Token | Cor atual | Uso |
| --- | --- | --- |
| `--azul-principal` | `#0057FF` | Ações principais, links, foco, barras e destaques da marca. |
| `--azul-escuro` | `#1B69FF` | Variação existente para estados específicos dos componentes. O nome do token é o atual do código. |
| `--branco` | `#FFFFFF` | Superfícies e texto sobre ações coloridas. |
| `--preto` | `#1E293B` | Texto principal do corpo da aplicação. |
| `--cinza-claro` | `#F3F4F6` | Fundos neutros e ações secundárias. |
| `--cinza-texto` | `#6B7281` | Texto de apoio nos componentes que adotam esse token. |

No estoque, as barras de categoria e o medidor saudável usam
`--azul-principal`. Gráficos em canvas recebem o valor resolvido da variável,
porque uma string `var(...)` não é uma cor de canvas. Não substitua o azul
da marca por uma variação lavada em cada tela. Gradientes de botões são
responsabilidade do componente compartilhado.

## Neutros de composição

Estes valores já são usados no Financeiro e no estoque; são referências de
composição, não variáveis globais adicionais.

| Cor | Situação |
| --- | --- |
| `#0F172A` | Títulos principais e de seção. |
| `#334155` | Nomes de itens e categorias. |
| `#64748B` | Descrições, rótulos e informações secundárias legíveis. |
| `#94A3B8` | Informação terciária discreta, escalas e detalhes auxiliares. Não usar em toda a tela nem em conteúdo essencial. |
| `#F8FAFC` | Fundo neutro suave e brilho do skeleton. |
| `#F1F5F9` | Trilhos de progresso e superfícies neutras compactas. |
| `#E8EDF4` / `#E9EDF3` | Contorno de painéis e indicadores. |
| `#E5E7EB` / `#D1D5DB` | Contorno de controles; veja [Bordas](bordas.md). |

## Estados semânticos

Reutilize o badge ou botão responsável pelo estado. As cores abaixo refletem
o [badge financeiro](../../src/components/financeiro/FinanceiroStatusBadge.vue)
e a validação dos campos, sem criar um novo tema global.

| Estado | Texto / destaque | Fundo de apoio | Situação |
| --- | --- | --- | --- |
| Sucesso | `#047857` | `#D1FAE5` | Conclusão e estado pago. |
| Atenção | `#B45309` | `#FEF3C7` | Pendência ou estado parcial. |
| Erro | `#DC2626` | `#FEE2E2` | Falha e atraso; campos inválidos usam borda `#EF4444`. |
| Neutro | `#64748B` | `#F1F5F9` | Cancelado ou estado sem destaque. |

Os componentes podem ter variantes específicas. Mantenha texto ou ícone
que explique o estado; não dependa somente da cor.

## Tokens semânticos do conjunto UI

`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--border`,
`--input`, `--ring` e suas variantes são definidos em OKLCH em `global.css`,
com valores próprios para `.dark`. Use esses tokens ao trabalhar nos
componentes que os adotam. `--primary` desse conjunto não é equivalente ao
azul da marca; não troque `--azul-principal` por ele automaticamente.
