# Refinar prontuário com IA

No atendimento em andamento (aba **Prontuário**), o botão **Refinar com IA** pede à Lia uma versão
com a escrita melhorada e organizada em Markdown (parágrafos, listas, negrito e títulos permitidos). API, travas de segurança e avaliação de LGPD:
[Refinamento de prontuário](../../api-clinic/docs/REFINAMENTO_PRONTUARIO.md).

## Comportamento

- **Quando aparece:** só para quem tem a Lia liberada (`liaStore.isAvailable`) e com o atendimento
  em andamento. Em modo de visualização (atendimento realizado) o botão não existe.
- **Quando habilita:** com pelo menos 15 caracteres de texto.
- **Posição:** o botão fica na mesma linha da barra de formatação do editor (negrito, listas etc.),
  fixo à direita, pelo slot `actions` de `EditorToolbar.vue`. Só os botões de formatação rolam na
  horizontal; o botão não sai da tela. Não existe no teclado flutuante do celular nem no fim da página.
- **Celular (até 640px):** o botão mostra apenas o ícone, em um quadrado de 40px. O texto continua
  disponível para leitores de tela (`aria-label`), e a explicação da Lia aparece como dica (`title`).
- **Aurora azul:** o botão (`RecordRefineButton.vue`) acende ao passar o mouse ou focar e fica mais
  rápido enquanto a Lia trabalha. Respeita `prefers-reduced-motion`.
- **Ao clicar:** o texto da tela é salvo antes, para a Lia ler o que está no servidor. O editor fica
  bloqueado durante o pedido. Se o salvamento falhar, nada é enviado.
- **Revisão:** `RecordRefinementReview.vue` mostra Seu texto e Sugestão da Lia lado a lado, com as
  palavras ajustadas em destaque (os títulos que a Lia acrescenta não contam como ajuste), o aviso de privacidade e os botões **Manter meu texto** (também Esc e
  clique fora) e **Aceitar melhoria**. O HTML exibido é reconstruído com tags permitidas e sem atributos
  (`utils/recordHtml.js`). Títulos, listas e negrito aparecem formatados nos dois lados.
- **Aceitar:** o servidor aplica a sugestão já convertida de Markdown para o formato do editor, então o prontuário passa a exibir os títulos e listas. O servidor aplica a sugestão e guarda a versão anterior de forma oculta. O editor recebe
  o texto novo sem disparar um novo salvamento. A versão anterior **não** aparece na tela.
- **Manter:** o prontuário não muda e a sugestão é descartada.
- **Sem sugestão:** se o texto já está bom, aparece um aviso. Se a IA tentou alterar dados clínicos,
  a sugestão é descartada e a mensagem explica que o prontuário ficou como estava.
- **Prontuário alterado ou sugestão expirada (30 min):** o servidor recusa o aceite e pede um novo
  refinamento; o texto atual nunca é sobrescrito.

## Arquivos

- `src/views/pages/atendimentos/InProgressAppointmentView.vue`: fluxo (`refineWithLia`, `acceptRefinement`, `rejectRefinement`).
- `src/components/pages/appointments/RecordRefineButton.vue` e `RecordRefinementReview.vue`.
- `src/stores/records.js` e `src/api/records.js`: chamadas à API.

## Testes

`npm run test:lia` (`tests/lia-record-refinement.spec.js`): destaque das palavras, limpeza de HTML,
diálogo de revisão, teclado e estados do botão.
