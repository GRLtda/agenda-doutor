# Tipografia

## Fontes

As fontes são importadas em [global.css](../../src/assets/css/global.css).

| Token | Família | Situação |
| --- | --- | --- |
| `--fonte-principal` | DM Sans, com fallback para fontes do sistema. | Corpo da interface, inputs, botões, rótulos e valores. |
| `--fonte-titulo` | DM Sans, com o mesmo fallback. | Títulos de página, seção e componentes. |
| `--fonte-mono` | DM Mono, com fallback para SF Mono, Consolas e monospace. | Conteúdo técnico que precise de alinhamento monoespaçado. |

Não introduza uma fonte diferente para um módulo. Fontes de sistema
continuam permitindo a leitura se a fonte remota não carregar.

## Pesos e hierarquia

| Peso | Uso recomendado no padrão do Resumo financeiro |
| --- | --- |
| `400` | Descrições, subtítulos, textos de apoio e detalhes. |
| `500` | Valores numéricos, nomes de itens, botões e títulos compactos. |
| `600` | Títulos de seção e rótulos de indicadores. |
| `650` | Título de página no padrão do Financeiro. |
| `700` | Ênfase pontual ou componente existente que a declare; não usar como peso geral de cards e descrições. |

O CSS global aplica peso 700 a `h1`–`h6`. As páginas do Resumo financeiro e
do estoque declaram pesos locais mais leves. Ao compor uma tela nesse padrão,
declare a hierarquia do componente; a tag semântica não deve tornar toda a
tela pesada. Evite pesos 800/900 para indicadores e rótulos.

## Escala de referência

| Elemento | Tamanho e tratamento existentes |
| --- | --- |
| Título de página | `clamp(1.45rem, 1.3vw + 1rem, 2rem)`, peso 650, entrelinha 1.12. |
| Subtítulo da página | `0.92rem`, peso 400. |
| Título de seção | Cerca de `0.98rem`, peso 600–650. |
| Valor de indicador | `clamp(1.28rem, 1.15vw + 0.9rem, 1.62rem)`, peso 500. |
| Rótulo de indicador | `0.78rem`, peso 600; caixa alta somente onde adotada pelo componente. |
| Nome em lista / categoria | 13px, peso 400–500. |
| Descrição compacta | 12px ou `0.78rem`, peso 400 e entrelinha de aproximadamente 1.4–1.5. |

Use `font-variant-numeric: tabular-nums` em valores que variam durante
atualização. Preserve a quebra de nomes longos e uma largura útil no celular.
Texto de apoio deve ter contraste suficiente: consulte [Cores](cores.md).

Referências: [FinanceSummaryCard](../../src/components/financeiro/FinanceSummaryCard.vue),
[Resumo financeiro](../../src/views/pages/financeiro/FinanceiroResumoView.vue) e
[Resumo do estoque](../../src/views/pages/estoque/EstoqueDashboardView.vue).
