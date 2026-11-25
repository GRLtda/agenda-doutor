# Modelos de WhatsApp: ação de confirmar consulta

No editor de modelos do Marketing, ative **Botões na mensagem**, escolha
**Resposta** e, em **Ao clicar**, selecione **Confirmar consulta**. O texto do
botão continua editável, com limite de 20 caracteres; se estiver vazio, será
preenchido com “Confirmar consulta”. A prévia usa o mesmo rótulo.

Salve o modelo e selecione-o nas configurações já existentes do lembrete de
consulta, como 24 horas ou 2 horas antes. Ele também pode ser usado por um
workflow vinculado a um atendimento. Ajuste o conteúdo para orientar o paciente
a tocar no botão. A configuração não altera automaticamente modelos anteriores.

O clique confirma somente o atendimento associado à mensagem, atualiza o status
persistido para Confirmado e registra histórico/auditoria. Consultas passadas,
canceladas, realizadas ou remarcadas não são confirmadas por uma mensagem antiga.
Não é necessário informar um ID interno para a ação clínica: a API faz o vínculo
no envio. **Enviar resposta** preserva o comportamento anterior e seu ID livre;
links e telefones continuam com seus campos próprios.

Envios de teste são simulações e não alteram consultas. Envios reais sem um
atendimento associado são recusados com uma explicação; a API não escolhe a
próxima consulta pelo telefone. A agenda mostra o status atualizado quando faz
sua consulta normal; não foi acrescentado um canal de tempo real nesta mudança.

O editor reutiliza `AppButton`, `FormInput` e `StyledSelect`. A configuração é
individual por botão de resposta, permanece ao reabrir o modelo e é removida do
contrato quando o botão é convertido em link/telefone. Os controles base não
foram alterados. A documentação completa do servidor está em
[Confirmação pelo WhatsApp](../../api-agendadoutor/docs/CRM_CONFIRMACAO_WHATSAPP.md).

Verificação: `npm.cmd run test:whatsapp`, `npm.cmd run build` e
`npm.cmd run test:appointment-confirmation:browser` no checkout vizinho da API.
A fixture `tests/fixtures/whatsapp-template-actions-preview.html` exige o servidor
isolado do teste de navegador (`--serve`), que substitui as stores por dados
fictícios e mantém o salvamento em memória. Não abrir essa fixture no servidor
normal do produto para avaliar isolamento de serviços.

A ação está implementada e validada localmente, com publicação pendente.
