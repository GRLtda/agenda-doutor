# Abertura do atendimento

`InProgressAppointmentView` consulta uma vez `GET /appointments/:id/attendance`
para obter agendamento, paciente, prontuário (ou null), anamneses ativas e catálogo
de procedimentos. O paciente da URL deve corresponder ao paciente retornado.
Os stores são preenchidos a partir dessa resposta, sem repetir as cinco consultas.
O contrato canônico está em [Agendamentos](../../api-clinic/docs/APPOINTMENT_UPDATES.md).

Iniciar continua sendo uma escrita separada na rota auditada `PUT /appointments/:id`,
somente quando ainda não iniciado nem realizado. Não recarrega agenda/dashboard.
Uma falha na consulta ou na escrita bloqueia a tela com opção de tentar novamente.
O layout e a sidebar real permanecem montados desde a abertura, inclusive em erro.
AppSkeleton aparece apenas no card do paciente e no container principal (duas
colunas no desktop, uma no celular). O menu mantém rótulos e ícones visíveis;
suas ações ficam desabilitadas até carregar. Voltar continua disponível, assim
como abrir/fechar a sidebar móvel. Ações de finalizar/reabrir, relógio e salvamento
não aparecem durante carregamento ou erro. O erro e a nova tentativa ficam no
container principal. Abas posteriores só montam após concluir o carregamento.
O editor não agenda salvamento automático enquanto inicializa ou exibe erro.

O card lateral mostra a imagem/inicial à esquerda, nome (com acesso ao perfil)
ao lado e telefone abaixo do nome quando informado. Inclui idade e convênio quando
cadastrados, além de status (exceto o badge Iniciado), data, horário, tipo e indicação
de retorno do atendimento. O primeiro atendimento e valores vazios de idade/convênio
não ocupam espaço no card. O bloco `header-left` foi removido; o topo mantém somente
cronômetro centralizado, salvamento e ações à direita, além do botão independente
de abrir o menu no celular. O cronômetro fica no centro também em telas estreitas;
atendimentos realizados continuam sem contagem ativa.
O skeleton do card acompanha a nova quantidade de informações, sem novas consultas.
Verificar nomes/convênios longos, telefone internacional, ausência de dados opcionais,
status realizado, retorno e acesso ao menu em tela estreita.

Verificar com rede lenta em desktop/celular: skeleton, sucesso, falha e nova tentativa;
na aba Network, uma consulta attendance e, se necessário, um PUT de status.
Conferir menu/Voltar visíveis durante rede lenta e erro; no celular abrir a sidebar
durante o carregamento e verificar skeleton somente no card. Não mostrar dados
antigos do paciente nem ações de escrita enquanto aguarda a resposta.
Conferir prontuário ausente, anexos, anamneses, atendimento realizado somente leitura
e rejeição de URL com paciente diferente. A consulta mantém a primeira página de
até 20 anamneses ativas, conforme a rota existente. Não há cache de dados clínicos.

## Imagens e anexos sem fotos

Quando não há anexos, Imagens e montagem usa `AppEmptyState` com a ilustração vetorial em `src/assets/illustrations/attachments-empty.svg`, exibida por `AttachmentsEmptyIllustration`: pasta e cartões de fotografia sobrepostos, composição centralizada e margens generosas em `viewBox="0 0 240 180"`. O SVG é decorativo, responsivo e usa as variáveis CSS `--empty-paper`, `--empty-backdrop`, `--empty-layer`, `--empty-shadow` e `--empty-accent`, com padrões branco e azuis suaves da marca. A profundidade usa camadas e transparências, sem contornos escuros.

O título informa ausência de imagens. Em edição, o texto orienta adicionar fotos ou criar montagem, usando os controles existentes acima. Em somente leitura, descreve a ausência sem sugerir escrita. O vazio não aparece durante envio/compressão, quando já existem anexos ou quando filtros não encontram resultados entre anexos existentes.

Verifique atendimento sem prontuário, prontuário sem anexos, somente leitura, envio/compressão e retorno após excluir a última foto. Confira desktop e celular, variáveis de tema, primeira foto salva e filtros sem resultados.

O conjunto de ilustração, título e texto fica centralizado horizontal e verticalmente no espaço restante da aba. Em edição, os controles de adicionar foto e montagem permanecem acima; em somente leitura, a grade vazia não ocupa espaço. O SVG é importado como conteúdo estático local (`?raw`), preservando a herança das variáveis CSS do tema; nunca injete SVG vindo de usuários nesse componente. Verifique o alinhamento em atendimento realizado e editável, desktop e celular.

## Upload de imagens

O container inteiro de **Imagens e Anexos** aceita imagens arrastadas do
computador. Ao soltar, inicia o envio diretamente, com descrição e tags vazias.
O destaque de arraste informa onde soltar. Selecionar pelo botão Adicionar Foto
continua abrindo a preparação com descrição e tags antes do envio; montagens
usam o mesmo fluxo de upload com seu marcador `isMontage`.

Somente imagens são aceitas. O lote não pode exceder o limite de 40 anexos
do atendimento: arquivos incompatíveis ou excesso de quantidade mostram erro
no próprio container, limpo na próxima seleção/soltura. Somente leitura,
envio em andamento e editores abertos impedem um novo upload por arraste.
Imagens maiores que 10 MB passam pela compressão existente; se continuarem
maiores que 10 MB, o arquivo não é enviado. O backend mantém a validação final
de formato, autorização, quantidade e armazenamento; as rotas não mudaram.

O envio usa o [toast de upload compartilhado](componentes-compartilhados.md#contratos-de-reutilização),
na mesma pilha das notificações. Exibe o nome do arquivo, a posição no lote
e o percentual calculado por `onUploadProgress` do Axios, encaminhado pelo
store `uploadAttachmentImage` nas opções. O callback não integra o FormData.
Compressão ou envio sem tamanho conhecido mostram espera indeterminada.
Após transmitir os bytes, informa “Salvando arquivo…” e limita o progresso
a 99% até a resposta do servidor. O lote é sequencial; a barra considera a
posição e a fração transmitida do arquivo atual, com peso igual por arquivo.
Sucesso só aparece após persistência: o progresso sai e uma notificação nativa
mostra título “Imagem anexada” (ou “Imagens anexadas”) e subtítulo de confirmação,
com fechamento automático em quatro segundos, pausado durante interação/aba oculta.
O envio mantém título curto, nome do arquivo como subtítulo e largura padrão
mesmo para nomes curtos. Moldura, empilhamento e animações seguem o Sonner.
Em falha parcial, informa quantas imagens foram salvas, quantas falharam e a
última causa. Exceções encerram a notificação e liberam o container. Fechar
a notificação não cancela o upload. Não há cancelamento nem retentativa automática.

Execute `npm run test:uploads`. A suíte verifica arraste direto, progresso,
espera pela persistência, bloqueios, validação local, falha parcial, exceção,
preparação pelo input, toast compartilhado e encaminhamento do callback.
Para verificar visualmente em desktop e celular, envie por seleção, arraste e
montagem; use rede lenta, desconecte durante envio, teste limite, arquivo inválido
e atendimento somente leitura. Gere outra notificação enquanto o envio ocorre
e confira o empilhamento, fechamento, nomes longos e ausência de overflow.

## Execuções no detalhe do agendamento

O AppointmentDetailsModal possui painel secundário à esquerda, acoplado e deslizante, para execuções ligadas exatamente ao atendimento. Consulte [Execuções de workflows](execucoes-workflows.md).
