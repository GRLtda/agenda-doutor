# Componentes

## Sidebar

Estrutura atual, conforme [Sidebar.vue](../../src/components/layout/Sidebar.vue):

- Largura 240px expandida e 72px recolhida; fundo branco; `border-top-right-radius: 1rem`.
- Cabeçalho com logo da clínica (32px), nome e menu de opções.
- Seções sem título (Resumo, Calendário, Atendimentos) e com título em caixa
  alta de 11px (Gestão, Marketing…); recolhida, o título vira divisória.
- Link: 14px peso 500, cor `#525866`, raio 8px; hover `#F0F2F5` com texto azul
  e deslocamento de 2px; ativo `#EEF2FF`, azul, peso 600.
- Indicador deslizante azul de 3px à esquerda do item ativo.
- Submenu com linha guia vertical e item ativo com borda esquerda azul.
- Rodapé com a marca Agenda Doutor e a versão.

Quando o conteúdo usar o canvas `--ds-canvas`, a sidebar ganha
`border-right: 1px solid var(--ds-border)` para manter um limite nítido.

## Botões

**Visual atual do componente, sem alterações.** Use sempre o
[AppButton](../../src/components/global/AppButton.vue); não crie botão com
estilo local.

| Variante | Visual | Uso |
| --- | --- | --- |
| `primary` | Gradiente `#5B8BF7` → `--azul-principal`, texto branco, sombra leve; hover clareia e sobe 1px | Ação principal da tela ou do drawer |
| `secondary` | Verde `#10B981`; hover `#059669` e sobe 1px | Confirmar, concluir |
| `outline` | Branco, borda `#E5E7EB`, sombra mínima; hover `#F9FAFB` e borda `#D1D5DB` | Ações secundárias com destaque (Editar, Exportar) |
| `default` | Cinza `#F3F4F6`, borda `#E5E7EB`, texto `#374151` | Cancelar, Voltar |
| `ghost` | Transparente, texto azul; hover `#EFF6FF` | Ação discreta, link de ação |
| `warning` | Âmbar `#F59E0B`; hover `#D97706` | Ação que exige atenção |
| `dangerous` | Vermelho `#EF4444`; hover `#DC2626` | Excluir, cancelar atendimento |

| Propriedade | Valor |
| --- | --- |
| Raio | 8px (`--ds-radius-sm`) |
| Altura sm / md / lg | 32 / 38 / 48px |
| Fonte | peso 500; 14px / 15.2px / 16px |
| Foco | `outline: 2px solid var(--azul-principal)` com `outline-offset: 2px` |
| Carregamento | `loading`: spinner central, conteúdo invisível, clique bloqueado |
| Desabilitado | opacidade 0.6, `cursor: not-allowed` |
| Link | `to` transforma o botão em `router-link` com o mesmo visual |

## Cards

Fundo `--ds-surface`, borda `--ds-border`, raio `--ds-radius-lg`, sombra
`--ds-shadow-xs`. Cabeçalho com 16px × 20px e divisória
`--ds-border-subtle`; corpo com 20px. Sem sombra extra no hover se o card não
for clicável inteiro.

Indicador: rótulo 12.5px peso 600 em `--ds-text-muted`, ícone de 32px em
`--ds-surface-brand` com raio `--ds-radius-sm`, valor com `tabular-nums`.

## Tabelas e listas

**Visual atual**, no padrão da listagem de
[Pacientes](../../src/views/pages/pacientes/PatientsListView.vue). Use
sempre [AppTableList](../../src/components/global/AppTableList.vue) como
estrutura (veja [Regras de layout](../regras-layout.md)).

| Parte | Visual |
| --- | --- |
| Contêiner | Branco, borda `1px solid #E5E7EB`, raio 16px, `overflow: hidden`; filtros no topo com fundo branco e padding `1rem 1.25rem`. |
| Cabeçalho | Fixo (`sticky`), 44px de altura, fundo `#F5F6F8`, texto 12px peso 500 `#64748B`. |
| Linhas | Padding `1rem 1.25rem`, divisória `#E5E7EB`, texto 14px; hover e selecionada `#F0F4FC`. |
| Pessoa | Avatar circular de 40px com a inicial em `--azul-principal` peso 600 sobre fundo azul claro `#EEF2FF` (ou a foto). Ao lado, o nome em peso 600 `--preto` e a linha secundária em `--cinza-texto`. Profissional usa avatar de 30px. |
| Valor ausente | Pill cinza `#F3F4F6`, raio 6px, texto 13px ("Sem atendimento"). |
| Ações | Última coluna, alinhada à direita, 70px. |
| Seleção | [Checkbox](../../src/components/ui/checkbox/Checkbox.vue) na primeira coluna, 48px. |

Em telas estreitas, a tabela rola dentro do contêiner; no celular, a
listagem vira cards (como `PatientListCard`).

## Status do atendimento

Pill de 24px, `--ds-radius-full`, texto 12px peso 500, ponto de 6px, fundo
claro e borda do mesmo tom:

| Status | Texto | Fundo | Borda |
| --- | --- | --- | --- |
| Pendente | `#B45309` | `#FFFBEB` | `#FDE68A` |
| Confirmado | `#1D4ED8` | `#EFF6FF` | `#BFDBFE` |
| Em atendimento | `#15803D` | `#F0FDF4` | `#BBF7D0` + pulso `pulse-live` |
| Realizado | `#047857` | `#ECFDF5` | `#A7F3D0` |
| Não compareceu | `#B91C1C` | `#FEF2F2` | `#FECACA` |
| Cancelado | `#64748B` | `#F1F5F9` | `#E2E8F0` |

O texto sempre nomeia o status; a cor só reforça.

## Camadas flutuantes

| Camada | Tratamento |
| --- | --- |
| Dropdown / menu | `--ds-surface`, borda `--ds-border`, raio `--ds-radius-md`, `--ds-shadow-md`, padding 4px; itens com raio `--ds-radius-sm` e hover `--ds-surface-muted`; ação destrutiva em `--ds-text-danger`. |
| Tooltip | Fundo `#0F172A`, texto branco 12px, raio `--ds-radius-xs`. |
| Toast | Borda `--ds-border`, raio `--ds-radius-md`, `--ds-shadow-lg`. |
| Drawer | Raio `--ds-radius-xl` no desktop, `--ds-shadow-lg`. |
| Modal | Raio `--ds-radius-xl`, `--ds-shadow-xl`, sem borda, sobre `--ds-overlay`; rodapé em `--ds-surface-subtle` com as ações à direita. |
