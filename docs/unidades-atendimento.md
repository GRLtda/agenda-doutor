# Unidades de atendimento

Em **Configurações → Endereços**, a tabela mostra nome, endereço e
indicação do padrão. Proprietários e médicos podem adicionar, editar e definir
o padrão. Outros usuários autenticados da clínica podem consultar os locais e
selecioná-los ao agendar, respeitando o acesso existente ao agendamento.

A identidade reúne logo, nome e CNPJ em um único container com fundo cinza claro,
borda e arredondamento iguais ao bloco de endereços, sem cartão separado para o logo.
Dentro dele, usa uma grade com logo e dados principais, seguida do atalho para
unidades e das ações de salvamento. Em telas estreitas, os blocos ficam empilhados.
A tabela de unidades reutiliza `AppTableList`; ações usam `AppButton` e a seleção
do padrão usa `Switch`. Não há botões nativos sem estilo ou edição concorrente de endereço.

O formulário usa `FormInput`, com mensagens de validação junto aos campos,
limpeza ao editar e foco no primeiro erro. Nome duplicado aparece no nome; CEP e
UF inválidos aparecem nos respectivos campos. Falhas gerais ficam no formulário;
falhas na listagem oferecem **Tentar novamente**. Toast informa sucesso.

O endereço deixou de ser editado na seção Identidade da Clínica, que apresenta
um botão de navegação para a tabela de unidades. Identidade da Clínica é a primeira
seção do menu; Endereços vem em seguida. A ação Excluir usa exclusão lógica.

No formulário de atendimento, o seletor usa `StyledSelect` e mostra nome e endereço completo.
Durante o carregamento, usa `AppSkeleton`; em caso de falha, o seletor fica indisponível
até a nova tentativa. Erros aparecem no componente e são limpos ao selecionar. Novos
agendamentos começam com o padrão; atendimentos existentes carregam sua unidade.
Criação e remarcação enviam `unitId`; a API de edição também aceita o campo.
Erros da API associados a paciente, médico, horários, motivo ou unidade aparecem
nos controles correspondentes e retornam à etapa afetada quando necessário.
Erros gerais e campos sem controle correspondente aparecem no formulário.
Falha ao carregar unidades ou o atendimento original bloqueia o envio até uma
nova tentativa. Os detalhes do atendimento mostram o local e seu endereço atual.

Editar o endereço de uma unidade altera os próximos envios de WhatsApp dos
atendimentos vinculados. O padrão só pré-seleciona novos agendamentos e atende
registros antigos sem unidade; não troca vínculos existentes.

Contrato, permissões, migração e limitações são definidos no documento canônico
[Unidades de atendimento](../../api-clinic/docs/UNIDADES_ATENDIMENTO.md).

Antes de disponibilizar esta interface, executar a migração no backend com o
certificado TLS do MongoDB. Os pré-requisitos, as variáveis e o comando ficam em
[Preparação e certificado do banco](../../api-clinic/docs/UNIDADES_ATENDIMENTO.md#preparação-e-certificado-do-banco).

## Verificação

- Em `crm-clinica`, executar `npm run build`.
- Cadastrar dois endereços; tentar nome duplicado, campos vazios, CEP e UF
  inválidos. Conferir destaque, mensagem, foco e limpeza ao corrigir.
- Definir um padrão e abrir novo atendimento; selecionar o outro local e salvar.
  Conferir os detalhes, remarcar e verificar a preservação da unidade.
- Simular falha de carregamento e de salvamento: formulário permanece aberto,
  mostra o erro e permite nova tentativa; não envia para outro endereço.
- Em conta sem permissão de gestão, conferir ausência de ações de cadastro e
  edição. Validar a tabela e o formulário em tela estreita.

- Conferir identidade como primeira opção, campos ocupando a largura disponível,
  navegação para unidades e alinhamento de ações em desktop e celular.

## Padrão visual e consulta de CEP

Seguir as [regras de layout](regras-layout.md). A ação Adicionar endereço usa o azul
principal à direita do header. O carregamento usa AppSkeleton. Editar e Definir
padrão usam botões outline com ícones, e a opção de padrão usa Switch.
Ao completar oito dígitos no CEP, a integração BrasilAPI existente preenche rua,
bairro, cidade e UF. Número e complemento continuam manuais. Falha de consulta
exibe mensagem e Consultar novamente, permitindo preenchimento manual. Respostas
antigas e campos alterados durante a consulta não são aplicados.

- Verificar consulta de CEP válida, falha, nova tentativa, troca rápida de CEP e
  edição manual durante uma consulta; conferir skeleton e ação no header.

Durante a consulta de CEP, rua, bairro, cidade e UF exibem AppSkeleton no lugar
dos inputs, mantendo os rótulos. Não exibir texto de carregamento separado. CEP,
número e complemento permanecem editáveis. Ao concluir, os inputs retornam; em
caso de falha, a mensagem e a ação de nova tentativa ficam visíveis.

## Nomenclatura e etapa do agendamento

A aba da clínica é **Endereços**. No agendamento, o campo **Endereço de atendimento**
aparece somente na etapa **Agendamento**, junto da data e dos horários.
A seleção é preservada ao navegar entre etapas; erros de endereço retornam a essa
etapa. O carregamento dos endereços não bloqueia a etapa de paciente, mas continua
bloqueando o avanço da etapa de horário e o envio enquanto não estiver concluído.
Nomes técnicos (unitId, /v2/units e a query tab=unidades) são preservados.

- Conferir que o seletor não aparece nas demais etapas e mantém o valor ao voltar.

O rótulo do endereço usa o mesmo estilo e ícone de 16px dos campos de data e
horário (MapPin). O seletor não adiciona margens ao espaçamento entre os campos.

## Apresentação do seletor de endereço

Nome em destaque, selo Padrão e endereço discreto aparecem na mesma linha,
tanto no valor selecionado quanto nas opções. Endereços maiores que o espaço
disponível são truncados com reticências e título contendo o texto completo. StyledSelect oferece slots opcionais selected-label (option, label) e
option-label (option); consumidores sem slots mantêm a apresentação anterior.

Conferir nomes e endereços longos, unidade padrão, troca de seleção e tela estreita.

## Clínica com um único endereço

Após carregar os endereços, o agendamento exibe o seletor somente quando existem
dois ou mais. Com um único endereço, mantém sua seleção automática (padrão) no
payload, sem exibir o campo. Remarcações preservam o vínculo existente. Falhas de
carregamento continuam visíveis e bloqueiam o envio até nova tentativa.
Nos detalhes, o bloco de endereço também fica oculto com zero ou um endereço;
com múltiplos, usa cartão discreto, ícone de localização, nome em destaque e
endereço secundário. Falhas de consulta permanecem visíveis com botão de repetição.

- Conferir clínicas com zero, um e dois endereços, criação, remarcação e falha de
  carregamento; verificar seleção automática e preservação do endereço vinculado.

## Exclusão e textos longos

Excluir solicita confirmação e preserva atendimentos vinculados. O padrão exige
definir outro antes de excluir; o erro é mostrado na seção com nova tentativa.
Endereços excluídos saem das novas opções e permanecem consultáveis para histórico.
Na tabela, nomes têm limite visual de 32 caracteres e endereços de 80, com ...
e title contendo o texto completo; a largura também é limitada com ellipsis CSS.
O conteúdo salvo não é truncado. Conferir exclusão, cancelamento, erro de padrão
e textos longos em desktop e celular.
