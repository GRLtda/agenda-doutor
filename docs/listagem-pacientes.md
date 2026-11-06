# Tabela de pacientes

`/pacientes` usa `AppTableList`, tabela no desktop e cards no celular. Mantém
busca, paginação, acesso ao paciente e menu de três pontos com confirmação de exclusão.

## Filtros

A faixa acima das colunas usa o slot `filters` do `AppTableList`. A busca foi
movida do cabeçalho da página para essa faixa e agora filtra a listagem por
nome, CPF, telefone ou e-mail, em vez de navegar ao escolher um paciente.
Aceita CPF e telefone com ou sem máscara, inclusive `+55 (15) 98765-4321`;
nome ignora acentos e e-mail aceita pontos, `+` e números literalmente, sem
distinguir maiúsculas. A normalização acontece na API, preservando o texto digitado.
Usa `FormInput`, `StyledSelect` e `AppButton` existentes, mantendo o visual do
projeto. Profissional exibe foto quando disponível. Limpar restaura todos os
filtros e a primeira página; fica desabilitado sem filtros ativos.
Limpar mantém largura de 88px, inclusive sem seletor de profissional. Busca usa
a mesma borda `#d1d5db`, sombra discreta e foco azul do `StyledSelect`.
O seletor Profissional aparece somente com mais de um médico disponível, usando
a mesma contagem da coluna Profissional. Quando deixa de aparecer, limpa o filtro.
Seletores usam o slot `prefix` do `StyledSelect`, com Profissional:,
Agendamento: e Atendimento: dentro do controle, seguindo o Financeiro. Não
exibem rótulos acima. O espaço entre descrição da página e tabela é de 1rem.
Cada prefixo tem ícone (profissional, calendário e histórico), como Configurações.
A busca tem lupa à esquerda e botão X próprio com rótulo Limpar busca. O botão
nativo de limpeza do navegador é oculto; limpar a busca preserva os outros filtros.
Prefixos e espaçamento conferidos em 1440×900 e 390×844, sem rolagem da página.

Filtros: profissional (atendimentos realizados ou próximos com ele), próximo
agendamento (todos/com/sem) e último atendimento (todos/nunca atendidos/últimos
30 dias/há mais de 90 dias). Não há status de paciente nem novos cards de métricas.
Profissional filtrado não implica responsabilidade fixa e pode diferir daquele
exibido na linha, que segue o próximo/último atendimento.

Alterações aplicam após 300ms, voltam à página 1 e limpam a seleção. Paginação,
nova tentativa e atualização após exclusão preservam os filtros. Respostas
antigas da listagem não sobrescrevem uma consulta mais recente. Filtros se
aplicam na API a toda a clínica, antes da paginação, nunca só à página visível.
Vazio com filtros explica a ausência de resultados e orienta usar Limpar.
No celular, busca e botão Filtros ficam visíveis; este expande/recolhe os demais
controles em uma coluna, preservando espaço para os cards.
Expansão/recolhimento anima altura e opacidade em 200ms, respeitando movimento
reduzido. Controles recolhidos ficam inertes para teclado e leitores de tela.

## Tabela

A página ocupa a altura útil do layout e a tabela preenche o espaço restante
abaixo do cabeçalho, mantendo a mesma altura com poucos ou muitos pacientes.
A quantidade de linhas não aumenta a página: quando necessário, a rolagem fica
somente dentro da tabela, com cabeçalho fixo e paginação fora dessa rolagem.
O tamanho acompanha a janela, inclusive no celular, sem altura mínima em `vh`.
Até 768px, `PatientListCard` substitui a tabela: identidade, contato, último
atendimento, próximo agendamento e profissional ficam legíveis sem rolagem
horizontal. Seleção individual e selecionar página continuam disponíveis.
A área de cards rola internamente com altura limitada ao espaço útil; a paginação
fica fora dessa rolagem, sempre acessível quando há mais de uma página.
No celular, container, filtros, lista e paginação têm fundo transparente e
usam o espaçamento natural da página. A lista reserva espaço para a barra de
rolagem (`scrollbar-gutter: stable`) e uma folga mínima junto aos cards.
Selecionar página fica fora da área rolável, com espaço para o contorno de foco.
Cards têm fundo branco, borda completa, cantos de 12px e espaçamento de .75rem
entre itens. Seleção aplica fundo azul suave e borda azul em todo o card, sem
mudar suas dimensões. Nome e e-mail permanecem em uma linha com reticências. O botão
direto de editar foi removido; Editar paciente continua no menu de três pontos.
Adicionar paciente mostra ícone e texto no desktop; no celular, somente ícone
com rótulo acessível.
Paginação móvel mostra apenas anterior, página atual/total e próxima, sem resumo
de resultados ou atalhos para primeira/última página.
O número da página é editável no indicador anterior, sem botão Ir: confirme com
Enter ou ao sair do campo. Aceita apenas dígitos; valores acima do total vão à
última página, zero vai à primeira e campo vazio restaura a página atual.
O cabeçalho usa fundo cinza suave, tipografia discreta e altura constante de
44px. O indicador do checkbox não participa do fluxo, evitando salto ao
selecionar uma linha, todas ou entrar no estado parcial. Paginação usa o
[componente compartilhado](componentes-compartilhados.md), com navegação até
primeira/última página, página ativa azul e distribuição responsiva.

Colunas: seletor; Paciente (avatar, nome e e-mail abaixo); Contato (WhatsApp com
DDI e bandeira); Último atendimento; Próximo agendamento (data e horário abaixo);
Profissional (avatar e nome), somente com mais de um profissional; Ações.
Datas usam dia, mês abreviado em português e ano, no fuso `America/Sao_Paulo`.
Sem dados, exibe Sem e-mail, Sem contato, Sem atendimento, Sem agendamento ou
Sem profissional. Fotos ausentes ou com erro usam as iniciais dos dois primeiros
nomes (`Maria Costa` → `MC`); nomes únicos usam uma letra (`Maria` → `M`).
Espaços repetidos são ignorados. O cadastro atual não armazena foto do paciente.

A API fornece o resumo da agenda e a contagem de profissionais, incluindo o
proprietário e médicos ativos. Profissional vem do próximo agendamento ou do
último atendimento quando não há próximo; não representa responsabilidade fixa.
Contrato e critérios: [API](../../api-clinic/docs/LISTAGEM_PACIENTES.md).

Seletores marcam linhas localmente, com estado parcial no cabeçalho e seleção de
todos os pacientes da página. Trocar/recarregar os registros limpa a seleção.
Clicar no seletor não abre o paciente. Não existem ações em lote nem persistência
da seleção; essas funções serão implementadas posteriormente.

Checkboxes usam contorno cinza visível e preenchimento animado no azul principal
do projeto, com ícone branco e traço no estado parcial. A preferência de movimento
reduzido desativa a animação, e o foco por teclado mantém contorno perceptível.

Carregamento inicial usa `AppSkeleton` alinhado às colunas. Falha mostra mensagem
e Tentar novamente. Consulta concluída sem pacientes usa `AppEmptyState` e o SVG
`patients-empty.svg`, sem repetir o botão de cadastro do cabeçalho.

## Agendamento e ações

Na tabela desktop, clicar em e-mail/telefone copia o valor com `CopyContact` e
mostra popover E-mail copiado/Telefone copiado por 1,8s, sem abrir o paciente.
Telefone é copiado com `+`, DDI e número sem máscara; e-mail preserva o cadastro.
Falha de clipboard mostra Não foi possível copiar no mesmo popover. Valores
ausentes não são botões. Cards mobile continuam somente exibindo os contatos,
sem cópia por toque. O componente também bloqueia cópia até 768px.

Próximo agendamento é um botão com calendário azul, data e horário. Consulta
`GET /appointments/:id` e abre `AppointmentDetailsModal` (SideDrawer) na lista,
sem redirecionar ao calendário. Abre imediatamente o mesmo drawer e exibe
skeleton de identidade, motivo e informações enquanto a consulta carrega.
O skeleton usa apenas o padding natural do corpo do SideDrawer, sem margem
interna adicional, ficando alinhado ao conteúdo carregado.
Falha aparece dentro do drawer com Tentar novamente; fechar invalida respostas
pendentes, que não reabrem o painel. Hover usa container azul suave com borda,
sem sublinhado nem cursor de espera. Ao fechar, atualiza a
listagem preservando filtros/página. Remarcar e retorno abrem o formulário existente.

`PatientListActions` é compartilhado entre linha e card: Ver paciente, Ver
agendamento (quando existe), Criar atendimento, Editar paciente e Excluir
paciente. A opção de criação abre
`CreateAppointmentModal` com paciente preenchido e exigem preenchimento/salvamento
normal do fluxo; o clique no menu não executa escrita nem inicia atendimento.
O formulário inclui o paciente inicial nas opções mesmo que ele não esteja
entre os três primeiros pacientes usados como sugestões.
Ao salvar, atualiza o resumo. Permissões, unidades e disponibilidade continuam
validadas pelo fluxo existente e pelo backend. Excluir mantém confirmação.

## Verificação

- Conferidos Limpar com 88px antes/depois de ocultar Profissional, bordas iguais
  entre busca/select e cópia de e-mail/telefone com clipboard simulado e popover,
  sem navegação da linha. No mobile, cards não têm controles de cópia.
- Salto direto verificado em desktop/celular por Enter, com limite automático
  na última página. Nome longo mantém
  uma linha com reticências no card.
- Revisão dos cards em 390×844: borda completa nos estados normal/selecionado,
  fundo azul suave ao marcar, altura preservada e ausência do botão direto de
  edição. Skeleton conferido sem padding adicional e alinhado ao corpo do drawer.
- Revisão da simplificação: resposta atrasada confirmou abertura imediata com
  skeleton no mesmo drawer; falha/nova tentativa e fechar antes da resposta
  não reabriram o painel. Em 390×844, conferidos fundo integrado, ausência de
  padding extra, e-mail com reticências, filtros animados e paginação compacta.
- Revisão isolada com respostas simuladas: lupa e limpeza personalizada,
  abertura dos detalhes sem mudança de URL, cards em 390×844 e paginação com
  posição constante durante rolagem dos cards; filtros expandidos sem rolagem
  da página. Fluxos autenticados de salvamento devem usar dados de teste.
- Combinar busca e filtros, paginar, limpar e simular respostas fora de ordem.
  Conferir profissional com foto, filtro sem resultado, nomes únicos/compostos.
  Revisão isolada em 1440×900 e 390×844 confirmou busca, profissional, Limpar,
  estado sem resultados, iniciais e ausência de rolagem da página. Testes da API
  cobrem combinações de agenda/histórico e isolamento entre clínicas.
- Windows/macOS e celular: nome/e-mail longos, fotos, ausência de cada dado,
  rolagem horizontal no desktop quando necessário, cards no celular, acesso ao
  perfil e menu de ações.
- Clínicas com um e vários profissionais: visibilidade da coluna e alinhamento
  de cabeçalho, skeleton e colspan de estados.
- Seleção individual, seleção parcial, selecionar todos, desmarcar e trocar de
  página. Conferir uso por teclado e ausência de navegação ao marcar.
- Último atendimento realizado e próximo confirmado/agendado; cancelamentos e
  faltas excluídos do resumo. Conferir data/horário no fuso de São Paulo.
- Carregamento, falha/nova tentativa, lista vazia e paginação. `npm run build`.

Validação desta entrega: build aprovado; revisão visual isolada com dados
simulados em 1440×900 e 390×844. Conferidos seleção individual/todos/estado
parcial, coluna condicional, rolagem interna no celular, skeleton, falha e vazio.
Na revisão de altura/seletores, conferidos 3 e 10 pacientes em desktop e celular:
mesma altura do painel, ausência de rolagem na página, paginação acessível,
contorno visível, preenchimento azul e estado parcial com traço.
Na revisão do cabeçalho/paginação, comparadas as posições e dimensões do
cabeçalho, primeira linha e rodapé antes/depois de seleção individual e total:
sem deslocamento em 1440×900 e 390×844. Conferidos primeira/última página,
limites desabilitados, ausência de nova consulta ao clicar na página atual e
manutenção da página sem rolagem vertical.
Essa revisão não substitui o fluxo autenticado com dados reais da clínica.
