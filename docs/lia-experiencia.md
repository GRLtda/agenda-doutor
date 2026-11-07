# Experiência da Lia

O chat agora consome SSE pelo mesmo endpoint de mensagens, mantendo os interceptores de autenticação, renovação do token e assinatura. A mensagem em geração é transitória e só recebe controles de copiar/avaliar/denunciar após o evento final persistido. Falha ou EOF incompleto descartam os trechos, consultam o estado salvo e mantêm a opção de repetir com o mesmo identificador. Troca de conversa ou identidade aborta a conexão e ignora eventos atrasados.

O indicador de atividade mostra a etapa real informada pelo servidor, sem os três pontinhos finais e sem revelar raciocínio interno do modelo. Os prefixos são exibidos somente após validação no backend. Os cards aparecem completos no fim.

Cada resposta final tem Gostei, Não gostei e Denunciar, além de Copiar. A avaliação é opcional; abrir ou cancelar o formulário não envia nada. A avaliação negativa oferece quatro motivos e Outro, que exige comentário. A denúncia é uma submissão separada. O texto de pergunta/resposta não é anexado por padrão: o usuário deve escolher compartilhá-lo para análise administrativa. Erros de envio preservam o comentário. Uma avaliação e uma denúncia por resposta são mantidas no servidor e reaparecem no histórico. Feedbacks não são incluídos no contexto enviado ao modelo.

A prévia isolada continua usando somente dados fictícios e simula o envio de feedback, sem inicializar o cliente real da API. O painel administrativo está no repositório próprio `GRLtda/crm-clinic-admin`.

A interface tem dois modos que compartilham a mesma conversa: janela compacta flutuante e modal central expandido. Expandir, recolher, consultar o histórico e fechar/reabrir preservam o rascunho da sessão. Selecionar outra conversa ou iniciar uma nova limpa o campo para evitar enviar um pedido para o contexto anterior.

O histórico tem busca local nos itens carregados, grupos por data, paginação, confirmação de exclusão e estados de carregamento, busca vazia e primeira conversa. No modo expandido de desktop, ele aparece como painel lateral. No celular, ocupa o painel com uma ação para voltar ao chat.

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

A revisão visual automatizada não pôde ser concluída nesta sessão: a ferramenta de computer use interrompeu o acesso ao navegador porque não conseguiu identificar a URL com segurança. Os testes DOM não substituem essa inspeção visual.
