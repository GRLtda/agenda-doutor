# Contas a receber e a pagar

A listagem usa `FinanceiroContasView.vue` para os dois tipos de conta. O menu
de ações (três pontos) oferece as mesmas opções na tabela do desktop e nos
cards do celular: Baixar quando houver saldo e a conta não estiver cancelada,
Editar e Excluir.

Excluir fica disponível também para contas pagas, parciais e canceladas.
A confirmação informa que todas as baixas vinculadas serão estornadas
automaticamente, ajustando o saldo financeiro. Não é necessário abrir o resumo
para estornar cada baixa. Essa operação registra estornos no sistema; não
solicita reembolso em banco, cartão ou serviço de pagamento.

O frontend faz uma única solicitação `DELETE /v2/financeiro/contas/:id`.
O backend identifica as baixas ainda não estornadas, registra seus estornos e
exclui logicamente a conta, preservando o histórico e o autor.
Permissões, configuração do MongoDB, resposta, idempotência e limitações estão
em [Exclusão de contas financeiras](../../api-clinic/docs/FINANCEIRO_CONTAS.md).

Durante uma operação financeira a exclusão fica bloqueada, evitando cliques
repetidos. Cancelar a confirmação não chama a API. Em caso de sucesso, a lista é
recarregada; em caso de falha, a conta permanece na lista e o erro é exibido por
toast. Nenhum estorno é solicitado separadamente pelo navegador.
No MongoDB standalone, se a API informar falha parcial, repetir Excluir conclui
somente os estornos pendentes; os já gravados permanecem no histórico e não são
duplicados. Nesse estado a conta não aceita novas baixas até finalizar a exclusão.

## Verificação

Execute `npm run test:financeiro` para os testes de exclusão nos dois layouts
e `npm run build` para validar a compilação. A revisão visual deve cobrir:

- No desktop e no celular, abrir o menu de uma conta aberta sem baixas e
  conferir Baixar, Editar e Excluir; cancelar a confirmação não deve chamar a API.
- Confirmar a exclusão e verificar a mensagem de sucesso e a atualização da lista.
- Conferir Excluir para uma conta cancelada sem baixas e para uma conta sem
  `paidAmountCents` informado.
- Em contas pagas ou parciais, conferir Excluir habilitado e a confirmação que
  explica o estorno automático. Confirmar deve excluir sem estorno manual prévio.
- Durante uma operação financeira, Excluir permanece desabilitado.
- Simular falha da API e conferir que a mensagem de erro aparece sem sucesso.

Padrões visuais: [Regras de layout](regras-layout.md) e
[Componentes compartilhados](componentes-compartilhados.md).
