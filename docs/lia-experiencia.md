# Experiência da Lia

## Orientações e navegação do produto

O backend fornece orientações verificadas e destinos em `metadata.navigation`,
com `{ id, label, to }`. O chat reutiliza `AppButton` para abrir esses destinos
pelo roteador. A validação aceita somente páginas conhecidas e parâmetros das
seções de configurações/perfil ou do formulário de bloqueio. A navegação recolhe
o chat no desktop e fecha a janela no celular, preservando a conversa.

Os tutoriais de termos, anamneses, endereços, procedimentos e agendamento também
oferecem um botão para abrir o formulário existente. Os destinos de criação usam
`create=1` apenas nas páginas/seções verificadas. `useCreateFromQuery` abre o
rascunho após a montagem, respeita a permissão/carga do endereço e consome o
parâmetro para permitir fechar e reabrir pelo mesmo link. Salvar é uma ação do
usuário no formulário.

Nas listagens de atendimentos, a data/hora abre `/atendimentos?appointment=ID`.
O ID da linha identifica a consulta, inclusive quando o paciente tem várias.
A página consulta o registro pela API autenticada e abre `AppointmentDetailsModal`
com carga, erro e nova tentativa. Filtros são preservados ao fechar o painel.
Trocar de registro/identidade ou desmontar cancela e ignora respostas atrasadas.
O painel permite usar as ações existentes de continuar ou finalizar o atendimento.
O nome do paciente continua abrindo o perfil. Cards antigos de atendimentos que
já possuem `rowId` também recebem o link na data, mesmo com coluna de texto.
O link de atendimento tem área de toque ampliada no celular e foco por teclado.
`LiaPatientReport` emite `navigate-appointment` com o ID da consulta e
`LiaAnalyticsCard` propaga esse evento até o chat. O evento `navigate` continua
identificando o paciente.

Links de texto do modelo seguem o renderer Markdown existente. Os botões de
navegação usam a estrutura fornecida pelas ferramentas do backend. Permissões e
confirmações são verificadas pelos fluxos normais de cada tela.

### Busca global com a Lia

A busca do top bar (`TopBar.vue`) abre um painel com Ações, Contatos e, para
usuários com o piloto disponível, o item **Buscar com a Lia**.

- **Aurora azul:** o painel aberto e vazio não tem aurora. Ela acende ao digitar
  (quando aparece Buscar com a Lia), acelera enquanto a Lia pensa e continua na
  resposta. Respeita `prefers-reduced-motion`.
- **Enviar:** Enter sem ação ou contato correspondente, ou clicar em Buscar com a
  Lia, chama `liaStore.startNewConversation()` e `liaStore.sendMessage()`. A
  conversa é criada e gravada pelo fluxo normal, então aparece no histórico da
  Lia como qualquer outra. A pergunta não vira mais rascunho no chat.
- **Fases do painel:** `idle` (lista normal), `thinking` (mascote pensando e a
  pergunta), `result` (resposta em Markdown, botões Ir para e Continuar na
  conversa com a Lia) e `error` (mensagem do backend com Tentar novamente).
- **Mesmos componentes do chat:** a resposta lê a mensagem do store e mostra os
  cartões de confirmação (confirmar e cancelar chamam `liaStore.confirmAction` e
  `cancelAction` sem abrir o chat), relatórios (`LiaAnalyticsCard`), seletor de
  paciente, horários alternativos e sugestões de continuação. Escolhas e
  sugestões continuam a mesma conversa e enviam `pageContext` quando há ficha de
  paciente aberta. Com decisão pendente, Enter não navega sozinho. Confirmações
  em processamento são conferidas a cada 5 s, como no chat.
- **Botões filtrados:** vêm de `metadata.navigation` da resposta, validados por
  `safeProductNavigation`. Cada botão mostra como etiquetas os filtros do destino
  (`navigationFilters`), tanto na busca quanto nos botões do chat da Lia (rótulo
  curto mais etiquetas, sem texto longo quebrado). Clicar, ou Enter com a seleção por ↑ ↓, abre a página
  já com os filtros.
- **Fechar durante a resposta:** ESC ou fechar não cancela a Lia. A resposta
  chega em segundo plano e o botão da Lia mostra Resposta pronta. Quando a
  resposta é exibida no painel, o aviso do botão é limpo.
- Troca de identidade e piloto indisponível seguem as regras do store; sem o
  piloto, o painel mantém só Ações e Contatos.

#### Filtros aceitos em destinos

`/atendimentos` aceita `from` e `to` (datas `YYYY-MM-DD` válidas, juntas e com
`from <= to`) e `view=list`. Não há filtro de situação por URL nessa tela, então
a situação consultada não é enviada. Qualquer outro parâmetro é recusado.

Os cenários Orientações do sistema e Atendimentos em aberto na prévia local
permitem conferir os botões e links com dados fictícios. Na revisão de
15/11/2026, o navegador integrado estava indisponível. A tentativa no navegador
nativo foi interrompida pela ferramenta por não conseguir validar a URL com
segurança. A inspeção visual ficou pendente. Os 144 testes DOM e o build
passaram, incluindo navegação, formulários e rascunhos.

As quatro entradas iniciais agora são Agenda do dia, Acompanhar pacientes, Resultados da clínica (ou Movimento da clínica conforme permissões) e Horários disponíveis. Os prompts são genéricos para a clínica e pedem esclarecimentos quando faltarem procedimento, período ou profissional. As sugestões abaixo da resposta vêm da própria Lia e são salvas na mensagem; clicar preenche o campo sem enviar. Não há “Outro assunto” ou substituição por sugestões fixas em caso de falha do modelo. O título é atualizado pelo assunto da conversa, preservando renomeações manuais.

Ao abrir outra conversa, um skeleton substitui o conteúdo durante o carregamento. Os ícones das entradas usam uma coluna fixa e o texto ocupa o espaço restante nos dois modos. Markdown tem hierarquia de títulos, negrito, itálico, listas/níveis, citações, separadores, tabelas, tachado e formatação de código quando presente. HTML livre, imagens e links arbitrários do modelo continuam bloqueados; links de pacientes são produzidos pelos dados estruturados autorizados.

Listagens por procedimento, aniversariantes e rankings financeiros têm pacientes clicáveis e páginas de dez linhas. Ao abrir um perfil, a Lia se recolhe no desktop e fecha no celular, mantendo a conversa. A página é buscada por referência ao relatório autorizado; filtros e corte temporal não vêm do cliente. Erros mantêm a página anterior, requisições são canceladas ao desmontar o card e respostas de outra conversa/identidade são ignoradas. Cada relatório possui colunas tipadas para uma futura exportação, sem implementar planilhas agora. Dados são relidos ao navegar e podem mudar com correções da clínica. Cards históricos sem o novo descritor não ganham paginação retroativa: basta pedir novamente o relatório.

O microfone fica à direita, ao lado de enviar, e grava até 60 s após permissão do navegador. Durante a gravação, o campo dá lugar a uma barra com pausa à esquerda, ondas do nível real do microfone, tempo em `m:ss`, cancelar e enviar. O analisador não conecta o microfone aos alto-falantes. Pausar encerra a gravação, transcreve e preenche o campo com foco para revisar, sem enviar. Clicar em enviar enquanto grava encerra, transcreve e envia o texto pelo chat normal. O limite automático de 60 s usa o modo de revisão. A transcrição bloqueia novos cliques para evitar duplicação; cancelar descarta qualquer resultado atrasado. Não há resposta por áudio.

Há estados visíveis e erro recuperável. Ao fechar, trocar de conversa/identidade ou sair da aba durante gravação, o microfone é desligado e o analisador e seus quadros são encerrados. Um rascunho digitado deve ser enviado/apagado antes de gravar. O Google recebe áudio temporário para transcrever pelo modelo econômico configurado no servidor; detalhes de custo e retenção estão na documentação da API. Navegadores sem MediaRecorder/Web Audio mantêm a digitação disponível. A prévia usa transcrição fictícia, sem chamada real ao fornecedor.

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

O relatório de atendimentos reutiliza `LiaPatientReport`, com colunas de paciente,
data e horário, profissional e situação. `report.entityLabel` e `entityPlural`
ajustam os textos para atendimentos. Os padrões continuam sendo paciente e
pacientes. `item.rowId` identifica cada consulta, inclusive várias consultas do
mesmo paciente. `item.id` mantém o link para o perfil do paciente. A paginação
consulta dez registros por vez e preserva o período e os filtros no backend.
Há um cenário de atendimentos em aberto na prévia local, com dados fictícios.

## Prévia local

Execute `npm run dev:lia` e abra `http://127.0.0.1:5182`. A configuração própria usa apenas estado fictício em `tests/lia-preview`, não inicializa autenticação nem clientes da API real e não faz parte do build de produção. O seletor permite testar entrada, conversa, gráfico, ranking, confirmação, histórico vazio e indisponibilidade. O tema claro/escuro afeta apenas a página de prévia.

O sistema principal continua usando a autorização do servidor antes de exibir a Lia. A restrição do piloto não foi ampliada por esta mudança.

## Validação

- `npm run test:lia`: regressões anteriores e interações novas de modos, histórico, rascunho, teclado, permissões, gráficos, animação e foco do modal.
- `npm run test:auth`: isolamento e autenticação do frontend.
- `npm run build`: verificação de tipos e build Vite.

A revisão visual automatizada não pôde ser concluída nesta sessão: a ferramenta de computer use informou que o host de acesso ao navegador está indisponível. Os testes DOM não substituem essa inspeção visual.
