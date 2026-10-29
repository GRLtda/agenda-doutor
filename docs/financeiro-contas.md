# Contas a receber e a pagar

A listagem usa `FinanceiroContasView.vue` para os dois tipos de conta. O menu
de ações (três pontos) oferece as mesmas opções na tabela do desktop e nos
cards do celular: Baixar quando houver saldo e a conta não estiver cancelada,
Editar e Excluir.

Excluir permanece visível. Quando `paidAmountCents` é maior que zero, a ação
fica desabilitada com a indicação “Estorne as baixas”. Abra o resumo da conta
e estorne as baixas antes de excluí-la. Contas sem baixas, inclusive canceladas,
podem ser excluídas; saldo pago ausente é tratado como zero. A API continua
responsável pela validação final. Durante uma operação financeira, a exclusão
fica bloqueada para evitar solicitações repetidas.

A exclusão exige confirmação, chama a operação existente
`DELETE /contas/:id` do módulo financeiro v2 e recarrega a listagem em caso de
sucesso. A API mantém o registro com `status=CANCELED`, `canceledAt` e
`deletedAt`; não há remoção física. A rota exige autenticação, assinatura e
plano premium e restringe a consulta à clínica autenticada. Contas com baixas
retornam `409 FINANCIAL_ACCOUNT_HAS_SETTLEMENTS`. Falhas gerais são exibidas
por toast, sem anunciar sucesso nem remover a conta localmente.

## Verificação

Execute `npm run test:financeiro` para os testes de exclusão nos dois layouts
e `npm run build` para validar a compilação. A revisão visual deve cobrir:

- No desktop e no celular, abrir o menu de uma conta aberta sem baixas e
  conferir Baixar, Editar e Excluir; cancelar a confirmação não deve chamar a API.
- Confirmar a exclusão e verificar a mensagem de sucesso e a atualização da lista.
- Conferir Excluir para uma conta cancelada sem baixas e para uma conta sem
  `paidAmountCents` informado.
- Em contas pagas ou parciais, conferir a ação desabilitada e a indicação de
  estornar as baixas. Depois do estorno e da atualização da lista, conferir a
  liberação da ação.
- Simular falha da API e conferir que a mensagem de erro aparece sem sucesso.

Padrões visuais: [Regras de layout](regras-layout.md) e
[Componentes compartilhados](componentes-compartilhados.md).
