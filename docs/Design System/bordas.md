# Bordas

## Níveis e situações

Os níveis abaixo organizam os tratamentos existentes; não são novos tokens CSS.

| Nível | Tratamento | Quando usar |
| --- | --- | --- |
| 0 — Sem contorno | Sem borda visível ou borda transparente. | Conteúdo dentro de uma seção e ações `ghost`. Não contornar cada texto ou agrupamento. |
| 1 — Separação | `1px solid #edf2f7` ou `#f1f5f9`. | Divisórias de cabeçalhos, linhas e listas dentro de um painel. |
| 2 — Superfície | `1px solid #e8edf4` ou `#e9edf3`. | Painéis e indicadores do Resumo financeiro e do estoque. Contorno discreto, sem destacar o card estático no hover. |
| 3 — Controle | `1px solid #e5e7eb`; `#d1d5db` nos seletores. | Inputs, botões outline, dropdowns e tabelas. Preserve o valor do componente compartilhado. |
| 4 — Foco | Azul `var(--azul-principal)`; outline de `2px` ou halo de foco do componente. | Controle em foco pelo teclado ou campo ativo. Deve continuar perceptível sem deslocar o layout. |
| Erro de campo | Borda `#ef4444` e mensagem junto ao campo. | Validação em `FormInput` e `StyledSelect`. Cor não substitui a explicação do erro. |

Hover segue o próprio componente. `AppButton` outline pode alterar fundo e
borda; `FinanceSummaryCard` não acrescenta um contorno azul ao passar o mouse.
Não confundir hover com foco. Evite mudar a espessura da borda na interação;
use outline ou box-shadow quando o componente já os adotar.

## Arredondamento

Valores em pixels consideram a raiz padrão de 16px.

| Raio | Situação existente |
| --- | --- |
| `6px` | Elementos compactos, como tooltip de campo e pequenos badges. |
| `8px` / `0.5rem` | `AppButton` padrão, itens de dropdown e `AppSkeleton` padrão. |
| `12px` / `0.75rem` | `FormInput`, `StyledSelect`, dropdowns e `FinanceSummaryCard`. |
| `0.85rem` ≈ `13.6px` | Painéis do Resumo financeiro e do estoque. Reutilize esse padrão na tela equivalente. |
| `16px` / `1rem` | Contêiner desktop de `AppTableList`. |
| `18px` | `SideDrawer` no desktop; no celular, o componente pode remover o raio para ocupar a tela. |
| `999px` ou `9999px` | Pills e barras de progresso. |
| `50%` | Avatares e controles realmente circulares. |

Controles lado a lado devem ter altura e raio compatíveis. No cabeçalho do
estoque, seletor e Atualizar usam 44px de altura e 12px de raio; o ajuste é
local e não muda o padrão global do `AppButton`.

## Tokens do conjunto UI

O conjunto em `components/ui` também usa a escala de `global.css`:

| Token | Valor atual |
| --- | --- |
| `--radius` | `0.625rem` / 10px |
| `--radius-sm` | `calc(var(--radius) - 4px)` / 6px |
| `--radius-md` | `calc(var(--radius) - 2px)` / 8px |
| `--radius-lg` | `var(--radius)` / 10px |
| `--radius-xl` | `calc(var(--radius) + 4px)` / 14px |

Essa escala convive com os raios dos componentes globais. Use o contrato do
componente escolhido; não altere `--radius` para corrigir apenas um botão.

Fontes de implementação: [FormInput](../../src/components/global/FormInput.vue),
[StyledSelect](../../src/components/global/StyledSelect.vue),
[AppButton](../../src/components/global/AppButton.vue),
[AppTableList](../../src/components/global/AppTableList.vue),
[SideDrawer](../../src/components/global/SideDrawer.vue) e
[FinanceSummaryCard](../../src/components/financeiro/FinanceSummaryCard.vue).
