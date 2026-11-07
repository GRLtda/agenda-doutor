# Experiência da Lia

A mascote usa a arte e o motor v3 enviados em `lia-animada-v3`, com intro por peças, halo reduzido e novas coreografias. No chat, o mouse é acompanhado em toda a `.lia-window`, calculando a direção a partir do centro da mascote; sair da janela centraliza o olhar. Não há monitoramento do cursor fora do chat. Pensando acompanha a espera, Respondendo acompanha o stream, Erro acompanha falhas, Sucesso acompanha confirmações concluídas e Surpresa acompanha uma escolha entre pacientes. Reações curtas voltam ao estado atento. O modo automático da demonstração não é acionado no produto. Animações pausam com a aba oculta e respeitam redução de movimento, que usa poses estáticas sem loop.

O chat agora consome SSE pelo mesmo endpoint de mensagens, mantendo os interceptores de autenticação, renovação do token e assinatura. A mensagem em geração é transitória e só recebe controles de copiar/avaliar/denunciar após o evento final persistido. Falha ou EOF incompleto descartam os trechos, consultam o estado salvo e mantêm a opção de repetir com o mesmo identificador. Troca de conversa ou identidade aborta a conexão e ignora eventos atrasados.

O indicador de atividade mostra a etapa real informada pelo servidor, sem os três pontinhos finais e sem revelar raciocínio interno do modelo. Os prefixos são exibidos somente após validação no backend. Os cards aparecem completos no fim.

Cada resposta final tem Gostei, Não gostei e Denunciar, além de Copiar. A avaliação é opcional; abrir ou cancelar o formulário não envia nada. A avaliação negativa oferece quatro motivos e Outro, que exige comentário. A denúncia é uma submissão separada. O texto de pergunta/resposta não é anexado por padrão: o usuário deve escolher compartilhá-lo para análise administrativa. Erros de envio preservam o comentário. Uma avaliação e uma denúncia por resposta são mantidas no servidor e reaparecem no histórico. Feedbacks não são incluídos no contexto enviado ao modelo.

A prévia isolada continua usando somente dados fictícios e simula o envio de feedback, sem inicializar o cliente real da API. O painel administrativo está no repositório próprio `GRLtda/crm-clinic-admin`.

A interface tem dois modos no desktop que compartilham a mesma conversa: janela compacta flutuante e modal central expandido. No celular (até 760 px), a Lia sempre ocupa a tela inteira, sem controle para reduzir, e acompanha a altura disponível ao abrir o teclado. Os campos dentro da Lia usam no mínimo 16 px para evitar zoom automático de foco no iPhone, preservando o zoom manual. Expandir, recolher, consultar o histórico e fechar/reabrir preservam o rascunho da sessão. Selecionar outra conversa ou iniciar uma nova limpa o campo para evitar enviar um pedido para o contexto anterior.

O histórico tem seções de Fixadas e Recentes (recolhível). Os atalhos nomeados ficam acima da lista e desaparecem junto com toda a lateral ao fechar. Cada conversa mostra apenas o título; os três pontos abrem Renomear, Fixar/Desafixar e Excluir. Nomes e fixação persistem no servidor por usuário e clínica, e as fixadas aparecem primeiro. Chat e lateral compartilham a mesma cor de fundo. No modo compacto, o histórico ocupa o espaço do chat e pode ser fechado sem perder o rascunho. O cabeçalho mostra o botão de abrir a lateral, o título e os controles de tamanho (desktop) e fechar.

Buscar conversas e Conversas recentes abrem uma janela central com pesquisa e lista de títulos. A busca consulta todo o histórico no servidor, tolera acentos, permite carregar mais resultados e cancela consultas substituídas ou fechadas. Respostas atrasadas de outra busca, usuário ou clínica são ignoradas.

A exclusão exige um diálogo modal com Cancelar em foco, isolamento do teclado, Escape e devolução do foco. Durante a exclusão, os controles ficam bloqueados; falha mantém o diálogo para tentar novamente. A exclusão continua lógica no servidor.

O botão flutuante acompanha os estados reais de espera e streaming. Se uma resposta finalizar com a janela fechada, mostra “Resposta pronta”, um marcador e um aviso acessível. Falhas mostram um aviso distinto. Não há som, notificação do navegador nem conteúdo de pacientes no botão. O aviso existe apenas na sessão atual, é limpo ao abrir a Lia, trocar de conversa, usuário ou clínica e só indica conclusão após resposta final ou recuperação de uma resposta persistida.

A arte enviada em `lia-animada-final` foi integrada em `LiaAvatar.vue`, `liaAnimation.js` e `src/assets/lia/lia-animated.svg`. Cada instância tem IDs próprios no SVG. O estado pensando acompanha o envio real; não alterna automaticamente para fingir atividade. A animação pausa quando a aba fica oculta ou a instância está inativa e respeita redução de movimento. Eventos e quadros de animação são removidos ao desmontar.

As sugestões preenchem o campo e podem ser editadas antes do envio. A sugestão financeira respeita as permissões disponíveis no usuário. Enter envia; Shift+Enter cria uma linha; Enter durante composição de teclado não envia. Confirmações, seleção de paciente, horários completos, repetição após falha e paginação continuam usando o contrato existente do backend.

Rankings usam barras proporcionais aos valores retornados. Quando todos os rótulos são datas válidas e há ao menos dois pontos, o card pode apresentar um gráfico em ordem cronológica. Somente os pontos fornecidos são exibidos: a consulta atual pode retornar apenas parte das datas. Não são preenchidas datas ausentes e não há seletor de período fictício. Os valores do gráfico também podem ser explorados por teclado e em uma lista. Valores financeiros continuam em centavos no contrato e são convertidos para reais na apresentação.

Os cards de ações diferenciam preparação, confirmação e conclusão usando o estado recebido do servidor; nenhuma ação é concluída por uma animação ou pelo simples envio da mensagem. Falhas, cancelamento e recuperação de processamento continuam distintos.

## Prévia local

Execute `npm run dev:lia` e abra `http://127.0.0.1:5182`. A configuração própria usa apenas estado fictício em `tests/lia-preview`, não inicializa autenticação nem clientes da API real e não faz parte do build de produção. O seletor permite testar entrada, conversa, gráfico, ranking, confirmação, histórico vazio e indisponibilidade. O tema claro/escuro afeta apenas a página de prévia.

O sistema principal continua usando a autorização do servidor antes de exibir a Lia. A restrição do piloto não foi ampliada por esta mudança.

## Validação

- `npm run test:lia`: regressões anteriores e interações novas de modos, histórico, rascunho, teclado, permissões, gráficos, animação e foco do modal.
- `npm run test:auth`: isolamento e autenticação do frontend.
- `npm run build`: verificação de tipos e build Vite.

A revisão visual automatizada não pôde ser concluída nesta sessão: a ferramenta de computer use informou que o host de acesso ao navegador está indisponível. Os testes DOM não substituem essa inspeção visual.
