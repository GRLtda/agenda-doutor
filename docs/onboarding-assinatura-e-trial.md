# Onboarding, teste gratuito e assinatura

Este documento descreve o fluxo de acesso financeiro aplicado ao onboarding da clínica no frontend.

## Teste gratuito sem cartão

O período de teste é definido no convite administrativo por meio de `trialDays`. Ao criar a clínica, a API grava `isTrialAccount` e `trialEndsAt`.

Quando o onboarding termina, o frontend atualiza os dados autenticados antes de decidir o próximo passo:

- se `isTrialAccount` estiver ativo e `trialEndsAt` estiver no futuro, o usuário entra diretamente no painel, sem abrir o checkout da Stripe e sem cadastrar cartão;
- os status de assinatura `active`, `trialing`, `lifetime` e `past_due` também são tratados como acesso ativo, respeitando as validações financeiras da API;
- se não houver teste ou assinatura válidos, o usuário vê a seleção de planos e segue para o checkout da Stripe.

## Fim do teste

As rotas autenticadas recalculam o acesso usando a data atual. Depois de `trialEndsAt`, uma clínica sem assinatura válida é redirecionada para `/onboarding/clinic`, que apresenta a seleção de planos. A API também bloqueia rotas protegidas com o código `SUBSCRIPTION_REQUIRED`.

O teste não cria cliente, sessão ou assinatura na Stripe. Enquanto ele estiver ativo, a própria API recusa tentativas de checkout com `409` e o código `TRIAL_ACTIVE`. Depois do vencimento, esses recursos só são criados quando o usuário escolhe um plano; a assinatura Stripe começa sem um novo período de teste.

## Como verificar

1. Gere um convite administrativo com um período de teste maior que zero.
2. Cadastre o usuário e conclua os dados e horários da clínica.
3. Confirme que o botão **Ir para painel** abre o dashboard sem passar pela Stripe.
4. Altere `trialEndsAt` para uma data passada em um ambiente de teste e faça um novo acesso.
5. Confirme o redirecionamento para a seleção de planos e, ao escolher um plano, para o checkout da Stripe.

Convites com `trialDays` igual a zero continuam exigindo assinatura antes de liberar o painel.

## Cabeçalho da seleção de planos

A etapa de seleção de planos usa um cabeçalho compacto com a marca Agenda Doutor, ação para voltar
à configuração anterior e o avatar do usuário autenticado. Quando não houver foto de perfil válida,
o avatar exibe a inicial do nome como fallback.

Ao acionar o avatar, a tela reutiliza o componente `UserDropdown` empregado no TopBar do sistema,
com a variante de onboarding limitada às ações:

- **Suporte pelo WhatsApp**, que abre uma nova aba para o número oficial `+55 11 92192-3978` com
  uma mensagem de ajuda sobre a escolha do plano;
- **Sair**, que invalida a sessão atual no backend quando possível, limpa os dados locais de
  autenticação e redireciona para o login.

O menu fecha ao clicar fora dele ou ao pressionar `Esc`. Em telas estreitas, os controles do
cabeçalho preservam apenas seus ícones para manter a área de planos utilizável.
