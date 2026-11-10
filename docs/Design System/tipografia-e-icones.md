# Tipografia e ícones

Exemplo visual nas seções Tipografia e Ícones da [vitrine](vitrine.html#tipografia).

## Fontes

As fontes são importadas em [global.css](../../src/assets/css/global.css).

| Token | Família | Situação |
| --- | --- | --- |
| `--fonte-principal` | DM Sans, com fallback para fontes do sistema | Corpo da interface, inputs, botões, rótulos e valores |
| `--fonte-titulo` | DM Sans, com o mesmo fallback | Títulos de página, seção e componentes |
| `--fonte-mono` | DM Mono, com fallback para SF Mono, Consolas e monospace | Conteúdo técnico com alinhamento monoespaçado (códigos, lotes, links) |

Não introduza uma fonte diferente para um módulo.

## Escala

| Token | Tamanho | Peso | Uso |
| --- | --- | --- | --- |
| `--ds-font-2xl` | `clamp(1.45rem, 1.3vw + 1rem, 2rem)` | 650 | Título de página |
| `--ds-font-xl` | 20px | 600 | Título de drawer e modal |
| `--ds-font-lg` | 17px | 650 | Título de seção |
| `--ds-font-kpi` | `clamp(1.28rem, 1.15vw + 0.9rem, 1.62rem)` | 500 | Valor de indicador, com `tabular-nums` |
| `--ds-font-md` | 15px | 600 / 400 | Título de card, nome em destaque, valor de input |
| `--ds-font-base` | 14px | 400 / 500 | Corpo, rótulos, links da sidebar, células |
| `--ds-font-sm` | 13px | 400 | Ajuda, erro de campo, descrições compactas |
| `--ds-font-xs` | 12px | 500 / 600 | Badges, eixos de gráfico, rótulos em caixa alta |

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-leading-tight` | 1.15 | Títulos e valores |
| `--ds-leading-normal` | 1.5 | Texto corrido |

| Peso | Uso |
| --- | --- |
| 400 | Descrições, subtítulos, textos de apoio e detalhes |
| 500 | Valores numéricos, nomes de itens, botões e títulos compactos |
| 600 | Títulos de seção e rótulos de indicadores |
| 650 | Título de página |
| 700 | Ênfase pontual (ex.: eyebrow da celebração); não usar como peso geral |

O CSS global aplica 700 aos `h1`–`h6`: declare o peso no componente para que a
tag semântica não deixe a tela pesada. Evite 800/900 em indicadores e rótulos.
Títulos usam `text-wrap: balance`. Valores que mudam ou se alinham em coluna
usam `font-variant-numeric: tabular-nums`. Preserve a quebra de nomes longos.

Referências: [FinanceSummaryCard](../../src/components/financeiro/FinanceSummaryCard.vue),
[Resumo financeiro](../../src/views/pages/financeiro/FinanceiroResumoView.vue) e
[Resumo do estoque](../../src/views/pages/estoque/EstoqueDashboardView.vue).

## Ícones

Biblioteca: Lucide (`lucide-vue-next` e [AppIcon](../../src/components/global/AppIcon.vue)).

| Token | Tamanho | Uso |
| --- | --- | --- |
| `--ds-icon-sm` | 14px | Badges, ajuda, mensagem de erro |
| `--ds-icon-md` | 16px | Botões, inputs, itens de menu, submenu da sidebar |
| `--ds-icon-lg` | 20px | Links da sidebar, bloco de ícone |
| `--ds-icon-xl` | 24px | Destaques e cabeçalhos de estado vazio |

- Traço `--ds-icon-stroke` 1.8, cantos arredondados; a cor herda do texto ao lado.
- Ícone sozinho em botão precisa de `aria-label`; ícone decorativo usa `aria-hidden="true"`.
- Bloco de ícone: 32–40px, raio `--ds-radius-sm`, fundo claro do mesmo tom do
  ícone. Azul para marca e informação; verde, âmbar, vermelho e cinza só para estados.

## Ilustrações

Estados vazios seguem [Estados vazios](../estados-vazios.md): SVG em
arquivo, azuis suaves da marca e conjunto centralizado na área útil. A
animação de sucesso usa o Lottie `check.json`; veja [Animações](animacoes.md).
