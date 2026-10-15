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

## Execuções no detalhe do agendamento

O AppointmentDetailsModal possui painel secundário à esquerda, acoplado e deslizante, para execuções ligadas exatamente ao atendimento. Consulte [Execuções de workflows](execucoes-workflows.md).
