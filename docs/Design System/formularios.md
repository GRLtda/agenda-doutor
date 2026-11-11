# Formulários

Os campos seguem o visual atual dos componentes compartilhados. Este documento registra esse visual
como padrão do Design System e define as regras de uso. Exemplo na seção
Formulários da [vitrine](vitrine.html#formularios).

A regra de exibição de erros por campo do [AGENTS.md](../../AGENTS.md)
continua valendo: o erro que o usuário pode corrigir fica no input, nunca em toast.

## Regra obrigatória: use os componentes que já existem

Nenhum campo de formulário pode ser um `<input>`, `<select>` ou `<textarea>`
nativo sem estilo. Use sempre o componente compartilhado correspondente:

| Necessidade | Componente |
| --- | --- |
| Texto, e-mail, número, CPF, CNPJ, CEP, telefone simples | [FormInput](../../src/components/global/FormInput.vue) (`cpfMask`, `cnpjMask`, `cepMask`, `phoneMask`) |
| Senha | [PasswordInput](../../src/components/global/PasswordInput.vue) |
| Valor em reais | [CurrencyInput](../../src/components/global/CurrencyInput.vue) |
| Telefone com país (DDI) | [PhoneInputWithDDI](../../src/components/global/PhoneInputWithDDI.vue) |
| Seleção simples | [StyledSelect](../../src/components/global/StyledSelect.vue) |
| Seleção com busca | [SearchableSelect](../../src/components/global/SearchableSelect.vue) |
| Seleção múltipla | [StyledMultiSelect](../../src/components/global/StyledMultiSelect.vue) |
| Modelo de mensagem | [MessageTemplateSelect](../../src/components/global/MessageTemplateSelect.vue) |
| Período de datas | [AppDateRangePicker](../../src/components/global/AppDateRangePicker.vue) |
| Checkbox | `FormInput type="checkbox"` ou [Checkbox](../../src/components/ui/checkbox/Checkbox.vue) em tabelas |
| Opção ligar/desligar | [Switch](../../src/components/global/Switch.vue) |

Antes de criar um campo novo, procure o componente em `src/components/global`
e em [Componentes compartilhados](../componentes-compartilhados.md). Se
nenhum servir, estenda o componente existente com uma prop em vez de escrever
estilo local.

## Campo de texto (FormInput)

| Propriedade | Valor |
| --- | --- |
| Rótulo | 14px (`0.875rem`), peso 500, 8px acima do campo |
| Padding | `0.75rem 1rem` (altura de cerca de 50px) |
| Fonte do valor | 16px (`1rem`), o que também evita o zoom do iOS |
| Raio | 12px (`0.75rem`) = `--ds-radius-md` |
| Borda | `1px solid #E5E7EB` = `--ds-border-control` |
| Fundo | branco |
| Espaço abaixo do grupo | 20px (`1.25rem`) |

### Estados

| Estado | Tratamento |
| --- | --- |
| Default / preenchido | Borda `#E5E7EB`, fundo branco. |
| Focus | Borda `--azul-principal` + halo `0 0 0 3px rgba(59, 130, 246, 0.3)` (`--ds-ring`). |
| Disabled | Fundo `#F3F4F6`, texto `#9CA3AF`, `cursor: not-allowed`; `disabledHelp` explica o motivo. |
| Error | Borda `#EF4444`; em foco, halo `rgba(239, 68, 68, 0.2)` (`--ds-ring-danger`); mensagem 12px peso 500 em `#EF4444`, 6px abaixo. |
| Obrigatório | Asterisco `#EF4444` após o rótulo (`required`). |

A mensagem de erro explica como corrigir ("Informe um telefone com DDD e 9
dígitos"). Limpe o erro quando o usuário voltar a editar o campo.

## Textos longos (textarea)

Observações, anotações, descrições e mensagens usam textarea com o visual do
FormInput e **crescem sozinhas** conforme o texto:

- `resize: none`: o usuário nunca redimensiona o campo manualmente.
- Altura inicial de 3 linhas; ao digitar ou colar, a altura acompanha o
  conteúdo (`field-sizing: content` com fallback em JS:
  `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'`).
- Limite de altura de cerca de 240px; depois disso, rola dentro do campo.
- Ajuste a altura também ao carregar um valor existente (edição).

Ainda não existe um componente compartilhado de textarea. Telas como
[ProcedureForm](../../src/views/pages/procedimentos/ProcedureForm.vue) e
[AppointmentDetailsModal](../../src/components/pages/dashboard/AppointmentDetailsModal.vue)
já fazem o crescimento automático localmente. Algumas telas ainda têm
`resize: vertical` e ficam fora do padrão até serem ajustadas.

## Select (StyledSelect)

Botão com padding horizontal de 14px, borda `#D1D5DB`, raio 12px e sombra
`0 1px 2px rgba(15, 23, 42, 0.04)`. Em foco, borda azul com halo
`rgba(59, 131, 246, 0.1)`; em erro, borda `#EF4444`. A lista abre com borda
`#E5E7EB`, raio 12px, sombra `0 10px 24px rgba(15, 23, 42, 0.12)` e itens com
raio 8px.

A prop `error` aceita texto (mostra a mensagem sob o campo e a borda vermelha) ou
`true` (só a borda). Vazio (`''`) ou `false` não mostra erro. O tipo da prop é
`[String, Boolean]` nessa ordem: com `Boolean` primeiro o Vue converte `''` em `true`
e o campo ficava vermelho sem erro (`tests/consent-styled-select-error.spec.js`).

## Checkbox (FormInput)

Caixa de 20px (`1.25rem`), borda 2px `#E5E7EB`, raio 6px. No hover, a borda
fica azul. Marcado: fundo e borda `--azul-principal`, e o check entra com
`scale-in` em mola (200ms). Desabilitado: fundo `#F3F4F6`. Texto 14px peso
500 `#374151`.

## Switch

Trilho de 56×32px, `#D1D5DB` desligado e `--azul-principal` ligado.
Polegar branco de 24px com sombra leve, deslizando 24px em 200ms. Rótulo 14px
`#374151`, alinhado ao topo em textos de várias linhas.
