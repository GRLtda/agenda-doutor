# Editor de workflows

`/workflows/:id` usa Vue Flow para editar o rascunho. O editor ocupa a área útil
do layout sem rolagem externa. Regras de execução, clínica autenticada, catálogo
e contratos da API v2 permanecem existentes; esta mudança não altera o motor.

## Interface

O seletor de mensagens usa `MessageTemplateSelect`: menu com largura mínima de
400 px, limitado à janela com margem de 8 px, e ação centralizada “Criar novo modelo”
no rodapé, com contorno/fundo/raio iguais ao cadastro de paciente no novo agendamento.
A criação mantém a navegação existente para Marketing → Modelos e aguarda salvar
o rascunho pelo bloqueio de saída do editor.

Ao escolher um modelo, `WorkflowMessageVariableWarning` lista as variáveis sem
preenchimento garantido para os inícios conectados à mensagem. Considera texto e
componentes interativos, múltiplos inícios e ausência de ligação, sem toast nem
bloqueio de publicação. Alterar modelo, início ou ligações recalcula o aviso.
A relação vem de `messageVariableSupport` do catálogo backend; não há catálogo
paralelo no frontend. Informa que variáveis sem dados serão substituídas por texto
vazio no envio. Relação completa: [Guia da API](../../api-clinic/docs/WORKFLOWS_GUIDE.md#relação-de-variáveis-por-início).
Teste: `node --test tests/workflowMessageVariables.test.js tests/workflowEditor.test.js`.
Revisão isolada com componentes reais e dados fictícios confirmou menu de 400 px
no desktop e de 374 px em janela de 390 px (margens de 8 px), ação no rodapé,
fechamento por Escape e atualização do aviso ao trocar procedimento por agendamento,
sem erros de console. O build de produção passou. A revisão não enviou mensagens reais.

- Barra superior flutuante: voltar, nome/status, estado de salvamento, Salvar e
  Publicar. Publicado indica a existência da versão publicada, não que qualquer
  edição local já esteja publicada. Publicar salva o grafo e chama o endpoint
  existente de publicação após confirmação; não há interruptor de desativação.
- Lista flutuante de etapas com busca, instruções em linguagem simples e opção
  de recolher. Pode adicionar por clique/teclado ou arrastar até o canvas.
  A etapa de pedir foto permanece fora da lista, como na interface anterior.
- Blocos de início, ação, espera, condição e controle usam o mesmo cartão com
  cabeçalho discreto e resumo, sem faixas laterais/gradientes. O bloco de início
  também mostra o evento escolhido. Saídas de condição preservam Sim/Não;
  espera por evento preserva resposta/prazo. Encerrar não oferece nova saída.
- Ao clicar em bloco, abre painel flutuante à direita, mantendo o canvas visível.
  Campos arredondados, explicações e rótulos substituem IDs/tipos no cabeçalho.
  No celular, o painel fica na parte inferior com conteúdo rolável e ações fixas.
  A lista de etapas pode ser recolhida para liberar a tela; adição por clique
  permite uso sem arrastar no celular.
- Zoom, redução e enquadramento ficam na barra inferior; enquadramento inicial
  é limitado a zoom 1. Posições existentes são preservadas; layout automático
  só é aplicado quando todas as posições estão em zero, com grafo Dagre novo.

## Edição e persistência

O formulário recebe cópia profunda da configuração e aplica alterações automaticamente
ao canvas. O botão Aplicar etapa foi removido. Alterar um campo, fechar o painel,
clicar no canvas ou em outra etapa preserva a edição sem pedir descarte. Configurações
incompletas podem ficar no rascunho; erros de modelo aparecem no campo/painel e a
prévia orienta completar antes da publicação. A gravação continua agrupada após
700 ms de pausa. Salvar esvazia o lote; sair para outra rota aguarda a gravação,
sem caixa de descarte. Se houver falha, mantém a tela e a edição para repetir.

Durante requisições, o canvas e o formulário continuam editáveis. Há uma única
gravação em andamento; se houver novas alterações, o próximo envio contém o grafo
mais recente completo. Respostas antigas atualizam a definição retornada na store,
mas não substituem os nós locais (`preserveLocal`). Inclusões usam os defaults da
store com `persist: false`, sem aguardar API por etapa. O frontend verifica chaves
únicas, tipos e referências das ligações antes do envio; o backend continua validando
o contrato e o grafo. Não há rollback visual de edições recentes: falhas mantêm o
canvas pendente, mostram erro e permitem repetir Salvar. Não há resolução de edições
simultâneas feitas em navegadores diferentes. Desfazer mantém histórico local de
até 50 alterações; não há refazer.

A lista usa botões com contorno, ícones coloridos e títulos escuros. O início tem
borda laranja e cada família possui uma cor reconhecível. O canvas usa pontos pretos.
O painel de configuração usa cabeçalho e resumo na cor da família, seções brancas
sobre fundo suave e maior separação entre campos. Os selects reutilizam o suporte
nativo a ícones do StyledSelect: calendário para agendamento, mensagem para WhatsApp,
clique para botão, procedimento, prazo e documento conforme a opção. O ícone aparece
na seleção e na lista aberta, sem substituir o rótulo textual. Na condição, dois
cartões explicam os resultados e correspondem às saídas verde/vermelha do bloco.
Verificação isolada confirma ícones na seleção e no menu, fechamento do select por
Escape preservando o painel, cartões de resultado e ausência de overflow no celular.
Exemplos longos ficam recolhidos em “Ver exemplo”. Condições usam “Sim, atende” e
“Não atende”, com instrução para ligar cada resultado ao próximo passo.

As conexões recusam auto-ligação, duplicação da mesma saída e ciclos de arestas.
Recomeçar continua disponível pela etapa de controle própria, sem criar ciclo
manual. A validação distingue aresta existente de nova conexão para não remover
ligações ao carregar o fluxo. IDs dos handles são preservados no grafo salvo.
Arraste externo inválido é ignorado com feedback, sem lançar erro de JSON.

## Início, prévia e organização

O início separa categoria (Agendamento, Procedimento, WhatsApp, Anamnese, Termo,
Manual) do acontecimento. Agendamento oferece criado, atualizado, confirmado,
realizado, cancelado e remarcado, preservando os eventTypes existentes. Não há
evento de exclusão disponível no contrato atual. O cartão resume quando começa.
A lista de procedimentos de início e reinício tem busca sem distinguir acentos,
seleção múltipla e opção Todos; pesquisar não apaga os selecionados.

Play ao lado do zoom abre uma prévia local de todos os caminhos, sem executar
API de automações, enviar WhatsApp ou alterar pacientes. Lista o que cada etapa
faz e aponta falta de início, configuração incompleta, caminhos de condição/resposta
sem saída, finais implícitos, etapas soltas, ligações inválidas e ciclos. Clicar no
aviso enquadra a etapa. O painel usa cabeçalho, progresso e uma lista de etapas com
estados aguardando/verificando/verificada/precisa corrigir. Percorre uma etapa a cada
850 ms, com transição de câmera e destaque azul; erros ficam vermelhos no painel e
no próprio nó, acompanhados de texto/ícone. Pular para o resultado encerra a animação
e mostra todas as verificações, inclusive etapas soltas. Fechar/Escape/desmontar
cancela o timer e remove os destaques. Preferência de movimento reduzido mostra o
resultado imediatamente. Editar o grafo durante a prévia interrompe a animação e
recalcula o resultado; destaques não fazem parte do grafo salvo.
É uma simulação estrutural: não avalia dados reais de pacientes, disponibilidade
de templates/serviços ou regras do motor. A prévia orienta a revisão;
a publicação mantém a validação obrigatória do backend.

Clique direito no nó oferece Copiar etapa (cópia independente da configuração,
sem copiar ligações) e Excluir etapa (confirmação, remove nó e ligações incidentes).
Excluir pelo menu também integra o histórico Desfazer. No canvas oferece Adicionar etapa, Reorganizar e Simular.
Reorganizar usa Dagre de cima para baixo e mantém Sim/Resposta recebida à esquerda,
Não/Prazo encerrado à direita, movendo os descendentes exclusivos juntos e mantendo
pontos de união compartilhados. Considera cartões compactos de 248 px, altura medida e distância
entre linhas/colunas. Preserva ligações/configurações, enquadra e salva em lote.
Cards preservam padding de 12 px e têm títulos de 16 px, subtítulos de 13 px e não repetem “Clique para configurar”. O menu é limitado à janela e fecha ao clicar fora
ou pressionar Escape. Clique esquerdo continua selecionando/arrastando nós.

## Proteções de saída

- Navegar aguarda salvamento e bloqueia somente se não conseguir salvar.
- Atualizar/fechar usa beforeunload quando há gravação/edição pendente.
- Escape fecha painel; em selects fecha apenas as opções. Ctrl/Command+S salva.
- Listeners/timers são removidos ao desmontar. Trocar ID aguarda a gravação anterior.
- A requisição antiga não substitui edições locais mais recentes.

## Verificação

`node --test tests/workflowEditor.test.js` cobre ciclos, duplicações, saídas de
condição, comparação do grafo sem estados visuais e simulação: ambos os ramos,
condição incompleta, mensagem sem modelo, etapa solta, falta de início e ciclos.
Também cobre organização de ambos os tipos de ramificação, ordem independente das
arestas, descendentes, ponto de união e preservação do grafo. Revisão no navegador
com API simulada confirma cards compactos de 248 px, ordem Sim/Não, avanço animado, Pular,
vermelho nos nós, ausência de gravações por destaque visual, limpeza ao fechar,
movimento reduzido e ausência de overflow no celular.
Revisão isolada com API simulada confirma edição automática ao trocar de etapa
sem diálogo, busca de procedimentos sem acentos, categoria de agendamento,
resultados da simulação, cópia independente, reorganização e layout no celular. `npm run build` valida Vue
e o bundle de produção. Revisão isolada em 1440×900 e 390×844, com API simulada:
edição sem mutação antecipada, troca de etapa sem descarte, salvar com sucesso, falha
recuperável, painel flutuante e ausência de overflow horizontal no celular.
A revisão do envio em lotes usa API simulada com 900 ms de latência: três inclusões
rápidas resultam em um envio, outra inclusão durante a requisição permanece editável
e chega no lote seguinte sem rollback. Falha preserva todos os blocos e Salvar
repete o envio com sucesso. O canvas não é substituído por respostas antigas.

Antes de publicar fluxos reais, conferir em sessão autenticada: arrastar/adicionar,
ligar/desligar, configurar cada tipo de etapa, falha de rede, repetir salvamento,
voltar/atualizar com pendências e publicar com confirmação. Testes isolados não
executam automações nem substituem essas checagens com dados descartáveis.

Documentos relacionados: [Listagem](listagem-workflows.md),
[Layout](regras-layout.md), [Guia do módulo](../../api-clinic/docs/WORKFLOWS_GUIDE.md).

## Adicionar na saída

Saídas livres exibem uma linha cinza tracejada e um botão +. Clicar abre a lista
para escolher a próxima etapa e conecta a nova etapa ao nó/saída correspondente.
Condições e espera por evento têm + em cada ramo ainda sem ligação. Encerrar não
exibe +. A lista exclui outro início enquanto conecta uma saída. Cancelar a escolha
não cria etapa/ligação. Conexão e nó são salvos no mesmo lote; conectores visuais
não fazem parte do grafo. [Catálogo de modelos](catalogo-workflows.md).

## Inserir na ligação, desconectar e desfazer

Passar sobre uma ligação mostra + no centro. Clicar abre a lista; escolher uma
etapa substitui a ligação por origem → nova etapa → destino, em um lote de gravação.
Preserva o handle/resultado da origem e o handle de entrada do destino. Condição
inserida continua por Sim; espera por evento continua por Resposta recebida; os
outros ramos ficam livres para configurar. Início, Encerrar e Recomeçar este fluxo
não são oferecidos no meio. Etapas seguintes descem para dar espaço. Cancelar
não altera o grafo.

Clique direito na linha oferece Desconectar ligação (mantém nós) e Excluir etapa
de destino (remove esse nó e todas as ligações de entrada/saída dele). Cada ação
pede uma confirmação explicando o alcance; as outras etapas são preservadas.

Desfazer no topo restaura nós, configurações, posições e ligações da última ação,
inclusive exclusão, desconexão, inserção e reorganização; Ctrl/Command+Z fora de
inputs/editores faz o mesmo. Histórico de 50 snapshots só nesta sessão, limpo ao
carregar outro fluxo. Desfazer também salva automaticamente e funciona com uma
requisição anterior em andamento. Não desfaz publicação nem ações reais de pacientes.

Verificação isolada com API simulada: hover real na curva, inserção preservando
ramo Sim e substituindo uma ligação por duas, restauração por Desfazer, cancelar
confirmação, desconectar mantendo nós, excluir destino e restaurar seus nós/arestas.

## Carregamento e modelos de mensagem

O editor começa em estado local de carregamento, com skeleton de árvore e texto
“Carregando workflow / Preparando as etapas e conexões…”. A árvore monta por baixo
do overlay e só libera a interface após nodesInitialized/enquadramento; fluxo vazio
também conclui. Há fallback de enquadramento e limpeza do timer. Carregamentos de
catálogo técnico, procedimentos e mensagens ocorrem em paralelo e não bloqueiam a
exibição da árvore. Falha da definição oferece nova tentativa. Trocar de fluxo ou
sair ignora respostas antigas: a store tem sequência de fetch e o editor tem geração
de carregamento, evitando substituir a árvore atual por uma resposta atrasada.

Enviar WhatsApp, pedir mídia e qualquer campo dinâmico template-select usam
MessageTemplateSelect. Todos oferecem Criar novo modelo fixo no dropdown, inclusive
sem mensagens cadastradas, com ícone no placeholder. Navega a Marketing → Modelos
com novo=1, abrindo o editor de criação. A proteção de saída salva o workflow antes
de navegar. O mesmo seletor é usado no catálogo e nas configurações de mensagens.

Verificação isolada com API simulada lenta: skeleton no primeiro frame, árvore
liberada antes das mensagens auxiliares, troca de rota ignorando resposta antiga,
falha/retry e botão Criar novo nos três tipos de campo (WhatsApp, mídia e dinâmico),
com navegação para a tela Novo modelo.
