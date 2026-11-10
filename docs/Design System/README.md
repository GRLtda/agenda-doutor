# Design System

Design System do `crm-clinica` (Agenda Doutor): interface com cara de sistema
clínico, com neutros frios, bordas finas, sombras contidas e estados de
formulário explícitos. Consulte antes de criar ou ajustar interfaces.

**Vitrine visual:** [vitrine.html](vitrine.html). Abra no navegador para ver
fundações, grid, tipografia, ícones, botões, campos, tabela, status,
composições, gráficos, animações interativas e acessibilidade.

## Regras obrigatórias

1. **Use sempre componentes que já existem.** Antes de escrever HTML ou CSS,
   procure em `src/components/global`, `src/components/ui` e em
   [Componentes compartilhados](../componentes-compartilhados.md). Se nenhum
   servir, estenda o existente com uma prop em vez de criar outro.
2. **Nenhum campo é input nativo.** Use `FormInput`, `StyledSelect`,
   `SearchableSelect` e os demais listados em
   [Formulários](formularios.md#regra-obrigatória-use-os-componentes-que-já-existem).
3. **Textos longos crescem sozinhos.** Textarea com `resize: none` e altura
   automática; o usuário nunca redimensiona o campo.
4. **Preserve os componentes base.** Sidebar, `AppButton`, `FormInput`,
   `StyledSelect`, `Switch` e a tabela de `AppTableList` têm o visual
   documentado aqui; não os restilize sem pedido explícito.
5. **Erros explicam o motivo.** Siga [Mensagens de erro](acessibilidade.md#mensagens-de-erro):
   mensagem amigável, sem termos técnicos nem textos genéricos.

## Documentos

| Documento | Conteúdo |
| --- | --- |
| [Fundações](fundacoes.md) | Superfícies, bordas, raios, sombras, foco e texto. |
| [Cores](cores.md) | Paleta da marca, neutros e estados semânticos. |
| [Layout](layout.md) | Grid de 12 colunas, contêineres por tipo de tela, breakpoints e espaçamento. |
| [Tipografia e ícones](tipografia-e-icones.md) | Fontes, escala, pesos, ícones Lucide e ilustrações. |
| [Formulários](formularios.md) | Componentes obrigatórios, `FormInput`, textarea automática, select, checkbox e switch. |
| [Componentes](componentes.md) | Sidebar, botões, cards, tabelas, status do atendimento e camadas flutuantes. |
| [Carregamento](carregamento.md) | Skeleton e transição para sucesso, vazio ou erro. |
| [Gráficos](graficos.md) | Cores de série, marcas e indicadores. |
| [Animações](animacoes.md) | Ritmo, celebração de conclusão, camadas, listas e feedback. |
| [Acessibilidade e microcopy](acessibilidade.md) | Contraste, alvos, leitor de tela, tom e mensagens de erro. |
| [Referências](referencias.md) | Inspirações e decisões tomadas. |

As regras de composição continuam em [Regras de layout](../regras-layout.md),
os contratos em [Componentes compartilhados](../componentes-compartilhados.md)
e as ilustrações sem dados em [Estados vazios](../estados-vazios.md).

## Tokens e classes

- [tokens.css](../../src/assets/css/tokens.css): tokens `--ds-*` (superfícies,
  bordas, raios, sombras, espaçamento, layout, tipografia, ícones, gráficos e
  movimento).
- [motion.css](../../src/assets/css/motion.css): classes `.ds-celebrate`,
  `.ds-enter`, `.ds-press`, `.ds-pop-in`, `.ds-shake` e transições Vue
  `ds-step`, `ds-pop`, `ds-modal`, `ds-drawer`, `ds-fade`.
- [global.css](../../src/assets/css/global.css): paleta da marca, fontes e
  tokens do conjunto `components/ui`; importa os dois arquivos acima.

Os tokens `--ds-*` e as classes de animação não alteram nenhum componente
sozinhos. Use-os em telas e superfícies novas.

## Estado da adoção

| Item | Situação |
| --- | --- |
| Tokens `--ds-*` e classes de animação disponíveis globalmente | Feito |
| Sidebar, botões, campos e tabela | Os componentes atuais já seguem o Design System |
| Drawers de anamnese e termo | Mantêm os keyframes locais `success-*`, com o mesmo efeito de `.ds-celebrate` |
| Canvas `#F6F8FB`, cards, drawers e modais com tokens `--ds-*` | Aplicar em telas novas ou quando o produto pedir |

## Como manter

Ao alterar uma fundação ou componente, atualize na mesma entrega o documento
correspondente, os tokens, a [vitrine](vitrine.html) e a tabela de
[decisões](referencias.md#decisões). Confira o componente real em desktop e
celular, incluindo foco, carregamento, erro e textos longos.
