# Fundações

Valores definidos em [tokens.css](../../src/assets/css/tokens.css). A paleta
da marca está em [Cores](cores.md).

## Superfícies

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-canvas` | `#F6F8FB` | Fundo da área de conteúdo, atrás dos cards. A sidebar continua branca. |
| `--ds-surface` | `#FFFFFF` | Cards, painéis, inputs, menus, modais. |
| `--ds-surface-subtle` | `#F9FAFC` | Hover de linha em listas novas, rodapé de modal. |
| `--ds-surface-muted` | `#F1F4F8` | Hover de item de menu, trilhos. |
| `--ds-surface-brand` | `#EEF2FF` | Ícone de indicador, avatar, item ativo (mesmo tom da sidebar). |

Uma superfície por nível: card branco sobre o canvas. Dentro do card, separe
com divisória (`--ds-border-subtle`), não com outro card contornado.

## Bordas

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-border-subtle` | `#EEF1F5` | Divisórias internas, linhas de lista. |
| `--ds-border` | `#E6EAF0` | Contorno de cards, painéis, menus, toasts, sidebar. |
| `--ds-border-control` | `#E5E7EB` | Borda do `FormInput` e do `AppButton` outline. |
| `--ds-border-control-hover` | `#D1D5DB` | Hover do `AppButton` outline; borda do `StyledSelect`. |
| `--ds-border-focus` | `var(--azul-principal)` | Controle em foco. |
| `--ds-border-danger` | `#EF4444` | Campo inválido. |

| Nível | Quando usar |
| --- | --- |
| Sem contorno | Conteúdo dentro de uma seção e ações `ghost`. Não contorne cada texto ou agrupamento. |
| Separação | Divisórias de cabeçalhos, linhas e listas dentro de um painel. |
| Superfície | Painéis e indicadores (Resumo financeiro, estoque); sem destacar card estático no hover. |
| Controle | Inputs, botões outline, dropdowns e tabelas: preserve o valor do componente compartilhado. |
| Foco | Azul da marca, com outline de 2px ou halo do componente, sem deslocar o layout. |
| Erro de campo | Borda `#EF4444` e mensagem junto ao campo; cor não substitui a explicação. |

Bordas sempre com 1px. Hover e foco não mudam a espessura: use outline ou
`box-shadow`. Não confunda hover com foco.

## Raios

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-radius-xs` | 6px | Badge quadrado, tooltip, tag de código. |
| `--ds-radius-sm` | 8px | `AppButton`, item de menu, chip, botão de ícone, `AppSkeleton`. |
| `--ds-radius-md` | 12px | `FormInput`, `StyledSelect`, lista de opções, toast, `FinanceSummaryCard`. |
| `--ds-radius-lg` | 14px | Card e painel. |
| `--ds-radius-xl` | 18px | Modal, `SideDrawer` no desktop, bottom sheet. |
| `--ds-radius-full` | 9999px | Pill de status, avatar, switch, barra de progresso. |

Raios já usados por componentes que devem ser preservados: contêiner do
`AppTableList` com 16px e painéis do Resumo financeiro e do estoque com
`0.85rem`. No celular, o `SideDrawer` pode remover o raio para ocupar a tela.
Controles lado a lado devem ter altura e raio compatíveis.

A escala de `components/ui` (`--radius` de 10px em
[global.css](../../src/assets/css/global.css), com `--radius-sm` a `--radius-xl`)
continua valendo para esses componentes; não altere `--radius` para corrigir um
botão.

## Sombras e elevação

Todas as sombras usam a base fria `rgb(16 24 40)` com opacidade baixa.

| Nível | Token | Uso | Borda |
| --- | --- | --- | --- |
| 0 | — | Canvas. | — |
| 1 | `--ds-shadow-xs` | Card, painel. | `--ds-border` |
| 2 | `--ds-shadow-sm` | Cabeçalho fixo, elemento destacado. | conforme o componente |
| 3 | `--ds-shadow-md` | Dropdown, popover. | `--ds-border` |
| 4 | `--ds-shadow-lg` | Toast, drawer. | `--ds-border` (toast) |
| 5 | `--ds-shadow-xl` | Modal sobre `--ds-overlay`. | sem borda |

Botões e campos usam as sombras do próprio componente
([Componentes](componentes.md#botões), [Formulários](formularios.md)).
Card estático não ganha sombra nem borda azul no hover. Elevação no hover fica
para o que é clicável como um todo, como um card de agendamento arrastável.

## Foco

| Token | Valor |
| --- | --- |
| `--ds-ring` | `0 0 0 3px rgba(59, 130, 246, 0.3)` |
| `--ds-ring-danger` | `0 0 0 3px rgba(239, 68, 68, 0.2)` |

São os halos do `FormInput`. Campos usam o halo em `:focus`; o `AppButton`
usa outline azul de 2px em `:focus-visible`. Campo inválido em foco usa
`--ds-ring-danger`.

## Texto

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-text` | `#0F172A` | Títulos e valores. |
| `--ds-text-secondary` | `#334155` | Nomes em lista, itens. |
| `--ds-text-muted` | `#64748B` | Descrições, rótulos de indicador, ajuda. |
| `--ds-text-subtle` | `#94A3B8` | Ícones auxiliares. Não usar em conteúdo essencial. |
| `--ds-text-danger` | `#DC2626` | Texto de erro fora de campo. |

A escala tipográfica está em [Tipografia e ícones](tipografia-e-icones.md).

## Controles

| Token | Valor |
| --- | --- |
| `--ds-control-height-sm` | 32px (`AppButton` sm) |
| `--ds-control-height-md` | 38px (`AppButton` md) |
| `--ds-control-height-lg` | 48px (`AppButton` lg) |

Durações, curvas e classes de movimento estão em [Animações](animacoes.md).
Espaçamento e grid estão em [Layout](layout.md).
