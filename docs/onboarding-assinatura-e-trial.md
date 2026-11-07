# Onboarding, teste gratuito e assinatura

Este documento descreve o fluxo de acesso financeiro aplicado ao onboarding da clínica no frontend.

Falha de conexão na consulta da conta preserva a sessão e não presume que a
clínica está ausente. Sem perfil em cache, a aplicação aguarda recuperação
antes de decidir onboarding ou plano. As validações financeiras abaixo
continuam ativas. Consulte [Autenticação e indisponibilidade](autenticacao.md).

Na etapa Horário de Funcionamento, os campos e o cálculo semanal são compartilhados
com Configurações por `WorkingHoursFields` e `utils/workingHours.js`. Dias usam
`Switch`; horários usam `StyledSelect`. O total considera minutos, de modo que
`09:30–10:00` corresponde a `0,5h`. O salvamento e o avanço permanecem na etapa.
Contrato e checklist: [Componentes compartilhados](componentes-compartilhados.md).

## Teste gratuito sem cartão

Esta seção trata do teste do convite administrativo. O teste da feira, com
cartão, está em [Campanha da feira](#campanha-da-feira-teste-com-cartão).

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

## Campanha da feira: teste com cartão

A landing page do evento (`agendadoutor.com/evento/<código>`) leva para
`/register?campanha=<código>`. As campanhas são criadas no admin. É um fluxo diferente do teste do convite: o cartão
é obrigatório e o teste fica na Stripe.

- Erros de validação da API (`AUTH_VALIDATION_ERROR` com `details.fields`) aparecem
  no input de nome, e-mail, telefone ou senha e somem ao editar o campo. E-mail já
  cadastrado aparece no campo e-mail. Testes: `npm run test:signup`
  ([detalhes](../../api-clinic/docs/TESTES_FLUXO_CADASTRO_CHECKOUT.md)).
- `RegisterView` lê `?campanha=`, guarda o código em `sessionStorage`
  (`signupCampaignCode`, para sobreviver a um recarregamento), consulta
  `GET /api/auth/signup-campaigns/:code` e, se a campanha for válida, mostra a
  faixa "30 dias grátis · {nome da feira}". O código vai no cadastro como
  `campaignCode`, só quando não há convite. Campanha inválida ou expirada é
  ignorada sem mensagem e o cadastro segue normal.
- Em `StepSubscription`, quando `/v2/auth/me` traz `signupCampaignOffer`
  (`{ label, trialDays }`), a tela mostra a faixa do teste, os botões
  "Começar 30 dias grátis", **Total hoje R$ 0,00**, a **Taxa de instalação**
  (só o valor, sem data) e "Primeira cobrança em {data}" com o valor da
  primeira cobrança (mensalidade + taxa de instalação, se pendente).
- O checkout da Stripe cria a assinatura em `trialing`, que já libera o painel.
  `signupCampaignOffer` volta `null` depois que o teste é resgatado.

## Tela de retorno do pagamento

`/onboarding/clinic?payment=success` mostra `components/pages/onboarding/PaymentSuccess.vue`
(etapa 5 do `ClinicWizardView`). É o `success_url` do checkout de onboarding,
montado pela API com `FRONTEND_URL`. A guarda global do router manda
`/onboarding/clinic` para o painel quando a assinatura já está ativa, **exceto**
com `payment=success`, para a tela de sucesso aparecer mesmo depois que o webhook
já confirmou.

Em desenvolvimento, a confirmação depende do webhook da Stripe chegar na API
local (por exemplo `stripe listen --forward-to localhost:3001/subscriptions/webhook`).
Sem ele, a tela fica em "Confirmando" e depois oferece **Verificar novamente**.

- **Confirmando:** enquanto o webhook da Stripe não atualiza a clínica, mostra as
  etapas "Recebemos seu retorno", "Confirmando com a Stripe" e "Liberando sua
  clínica". A cada 3 s pede `refreshPaymentStatus` (só `fetchUser`, sem voltar ao
  skeleton), até 10 vezes. Depois oferece **Verificar novamente**.
- **Confirmado** (`active`, `trialing`, `lifetime` ou `past_due`): o check é desenhado, há
  confete nas cores da marca e o título usa o primeiro nome. Com o teste da
  campanha (`/v2/auth/me` → `signupCampaignTrial: { label, trialDays, startedAt, endsAt }`),
  mostra "Fulano, seu 1 mês grátis está ativo!", "Use o Agenda Doutor à vontade até
  {data}. Nada foi cobrado hoje." e o selo da campanha. A data é aproximada
  (resgate + dias); a data exata fica na Stripe. Sem campanha, mostra a
  confirmação da assinatura.
- **Aproveite agora:** atalhos para o calendário (`calendario`), novo paciente
  (`novo-paciente`) e conexão do WhatsApp (`marketing-conexao`), disponíveis em
  todos os planos, e o botão **Ir para o painel**.
- Com movimento reduzido, não há confete nem animações.

Regras da API, taxa de instalação e auditoria:
[Assinatura e teste gratuito](../../api-clinic/docs/ASSINATURA_E_TRIAL.md#campanha-de-autocadastro-com-teste-na-stripe).

Para verificar: criar uma campanha no admin, abrir `/register?campanha=<código>`, conferir a faixa, cadastrar,
concluir a clínica e conferir na seleção de planos o total de hoje zerado e a
data da primeira cobrança. Pagar com o cartão de teste `4242 4242 4242 4242` e
confirmar a entrada no painel. `/register` sem parâmetro não mostra nada disso.

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

## Validação do cadastro

A etapa Dados da Clínica exige nome, responsável e endereço completo. Erros locais
e os fields da API aparecem no FormInput correspondente, são limpos ao editar e
o primeiro campo inválido recebe foco. Falhas gerais ficam no formulário e
permitem repetir o envio; os campos e o botão ficam bloqueados durante salvamento.
A API retorna a clínica com o endereço Principal já vinculado. Em falha recuperável,
repetir o envio retoma o cadastro; não libera clínica pendente para uso. Contrato e
testes: [Cadastro de clínicas](../../api-clinic/docs/CADASTRO_CLINICAS.md).

Verificar obrigatórios, CEP/UF inválidos retornados pela API, CNPJ duplicado,
limpeza de erros ao editar, foco e nova tentativa após HTTP 503.
