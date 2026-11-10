# Grid, layout e espaçamento

Exemplo visual nas seções Grid e Espaçamento da [vitrine](vitrine.html#grid).
Tokens em [tokens.css](../../src/assets/css/tokens.css).

## Estrutura da página

| Elemento | Valor |
| --- | --- |
| Sidebar | `--ds-sidebar-width` 240px; recolhida `--ds-sidebar-width-collapsed` 72px. Ao lado do conteúdo, fundo branco. |
| Canvas | `--ds-canvas` atrás do conteúdo. |
| Padding da página | `--ds-page-padding` 24px; `--ds-page-padding-mobile` 16px a partir de 1024px. Bate com o `main-content` de [DefaultLayout](../../src/layouts/DefaultLayout.vue). |
| Entre seções | `--ds-section-gap` 32px. |

## Grid de 12 colunas

`display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--ds-grid-gap)`.
O gap é de 16px, ou `--ds-grid-gap-mobile` 12px no celular.

| Composição | Colunas |
| --- | --- |
| KPIs | 3 + 3 + 3 + 3 a partir de 1280px. Com até 1024px, 2 por linha. Com até 520px, 1 por linha. |
| Agenda ou lista + resumo lateral | 8 + 4; empilha com até 1024px. |
| Dois gráficos | 6 + 6; empilha com até 768px. |
| Formulário em duas colunas | 6 + 6 dentro do contêiner de 720px; 1 coluna com até 520px. |

Para cards de tamanho livre, prefira `repeat(auto-fit, minmax(<mín>, 1fr))`.
Use sempre `gap`, nunca margens em cada filho.

## Contêiner por tipo de tela

O conteúdo fica alinhado à esquerda. A largura máxima depende do tipo de tela:

| Tipo | Largura | Telas |
| --- | --- | --- |
| Fluido | 100% | Calendário, Atendimentos, Pacientes, Resumo, Financeiro, listagens |
| Detalhe | `--ds-container-detail` 960px | Detalhe do paciente, prontuário, atendimento em andamento |
| Formulário | `--ds-container-form` 720px | Formulários de página, Configurações |
| Drawer | 480px (md) | Fluxos laterais, conforme [SideDrawer](../../src/components/global/SideDrawer.vue) |

## Breakpoints

Variáveis CSS não funcionam em `@media`; use os valores literais.

| Consulta | Comportamento |
| --- | --- |
| `max-width: 520px` | Celular: 1 coluna, inputs de 44px, rodapé de drawer empilhado. |
| `max-width: 768px` | Tablet: 2 colunas; Lia acima da barra flutuante ([Regras de layout](../regras-layout.md#barra-flutuante-e-botão-da-lia-mobile)). |
| `max-width: 1024px` | Sidebar vira menu; padding da página de 16px. |
| `min-width: 1280px` | Desktop largo: 4 colunas de KPI, colunas extras em tabelas. |

## Espaçamento (base 4px)

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-space-1` | 4px | Ícone e texto, ponto e rótulo de badge |
| `--ds-space-2` | 8px | Itens de um grupo, botões lado a lado, rótulo e campo |
| `--ds-space-3` | 12px | Campos lado a lado, gap no celular |
| `--ds-space-4` | 16px | Gap entre cards e entre campos de um formulário |
| `--ds-space-5` | 20px | Padding interno de card |
| `--ds-space-6` | 24px | Padding da página, de drawer e de modal |
| `--ds-space-8` | 32px | Entre seções da página |
| `--ds-space-10` | 40px | Respiro de estado vazio |
| `--ds-space-12` | 48px | Topo de página de autenticação |
| `--ds-space-16` | 64px | Grandes blocos em telas largas |

Espaço maior separa grupos diferentes; espaço menor une itens do mesmo grupo.
Não use valores fora da escala sem registrar o motivo em
[Referências](referencias.md#decisões).
