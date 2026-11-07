# Assinatura no perfil

Aba **Assinatura** do perfil do usuário (`/app/assinatura` redireciona para `?profile=1&profileTab=subscription`). Implementada em `src/views/pages/assinatura/SubscriptionView.vue`. O contrato da API está em [api-clinic/docs/ASSINATURA_E_TRIAL.md](../../api-clinic/docs/ASSINATURA_E_TRIAL.md).

## Conteúdo

- **Aviso de acesso** (topo): vem de `accessWarning`. Pagamento em atraso mostra quantos dias restam até a suspensão (botão para regularizar no portal Stripe); teste gratuito mostra o fim do teste; cancelamento agendado mostra a data final e permite reativar.
- **Barra de status**: situação da assinatura (status, "Assinante desde"), "Gerenciar assinatura" (portal, `actions.canManageBilling`) e "Falar com o suporte". Não há card separado do plano atual; o plano vigente é indicado nos cards de planos.
- **Planos**: cards no mesmo formato da escolha de plano do cadastro (Equipe, Essencial em destaque, Clínica), vindos de `plans[]`. O plano atual recebe a etiqueta "Plano atual". Com `actions.canCheckout` o botão é "Escolher plano" e abre o checkout; caso contrário "Fazer upgrade" / "Fazer downgrade" aparecem **desabilitados** (troca de plano ainda não implementada).
- **Últimos pagamentos**: `GET /subscriptions/payments`, carregado separadamente com estados de carregamento, vazio e erro; link para o comprovante hospedado.
- **Forma de pagamento**: cartão vinculado ou estado vazio. Este card e o de pagamentos têm a mesma altura (`align-items: stretch`).

## Observações

- Nenhum preço, benefício ou prazo é fixo no frontend. Plano vitalício mostra "Vitalício" no lugar do preço.
- Falhas gerais (portal, checkout) usam toast; a tela não possui campos de formulário.
- O banner global de pagamento (`PaymentErrorBanner`) continua usando `paymentError` do mesmo endpoint.
