# Gráficos e indicadores

Exemplo visual na seção Gráficos da [vitrine](vitrine.html#graficos).

## Cores de série

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-chart-1` | `var(--azul-principal)` | Série principal (realizado, receita) |
| `--ds-chart-2` | `#7EA6FF` | Comparação (agendado, período anterior) |
| `--ds-chart-3` | `#10B981` | Positivo (recebido, pago) |
| `--ds-chart-4` | `#F59E0B` | Atenção (pendente, parcial) |
| `--ds-chart-5` | `#94A3B8` | Outros, sem categoria |
| `--ds-chart-grid` | `#EEF1F5` | Linhas de grade horizontais |
| `--ds-chart-axis` | `#64748B` | Texto dos eixos e da legenda |

Use as cores nessa ordem. Mais de cinco séries viram "Outros" ou um gráfico
diferente. Chart.js desenha em canvas e não aceita `var(...)`: leia o valor com
`getComputedStyle(document.documentElement).getPropertyValue('--ds-chart-1')`,
como já é feito com `--azul-principal` no estoque ([Cores](cores.md)).

## Marcas

- Barras com raio de 4px no topo, largura constante e espaço entre os grupos.
- Linha de 2px com área preenchida em gradiente do azul (18% → 0%) e ponto final destacado.
- Grade só na horizontal; sem borda no gráfico, que fica dentro de um card.
- Eixos em 11px, valores em reais (`R$ 4.380,00`) e datas no formato `dd/mm`.
- A legenda fica no cabeçalho do card, com quadrados de 10px.

## Indicadores (KPI)

Card com rótulo (`--ds-font-xs`/13px, peso 600, `--ds-text-muted`), ícone em
bloco de 32px, valor `--ds-font-kpi` peso 500 com `tabular-nums` e uma linha de
variação ("+3 em relação a ontem"). A variação positiva usa `#047857` e é
escrita em texto, não só em cor. Valores podem usar
[AnimatedNumber](../../src/components/global/AnimatedNumber.vue) ao carregar.
