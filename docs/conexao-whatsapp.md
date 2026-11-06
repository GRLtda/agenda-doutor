# Conexão WhatsApp

A aba de conexão do Marketing apresenta o estado retornado pela API e orienta o pareamento da conta da clínica. Implementação: [ConnectionTab.vue](../src/views/pages/marketing/pages/ConnectionTab.vue) e [store CRM](../src/stores/crm.js). Segue o [Design System](<Design System/README.md>) e as [regras de layout](regras-layout.md).

## Interface e estados

- A consulta inicial e o botão Atualizar status usam `getInitialStatus({ showToast: false })`, com skeleton e ação bloqueada durante a operação. Abrir ou atualizar a tela não dispara toast de conta já conectada.
- Sem conexão confirmada, a tela orienta gerar o QR Code. A lateral tem exatamente três cards, nessa ordem no DOM e na apresentação: **Como conectar**, **Não conseguiu conectar?** e **Sobre suas mensagens**. Instruções distinguem Android e iPhone e explicam Aparelhos conectados. O card Sem espelhamento do celular fica exclusivo do estado conectado, que mantém os quatro cards anteriores.
- Durante preparação e pareamento, mostra skeleton até receber a imagem real. O QR desaparece quando a conta conecta; não é retido para animações. A store mantém polling e expiração de 60 segundos; ao expirar, permite gerar novamente. Sair da aba interrompe o polling.
- Conectado: apresenta foto, nome, número formatado, tipo de conta e biografia. Nome prioriza `profile.verifiedName`, `pushName`, `name` e o nome da conexão. Foto usa `profile.profilePictureUrl`, com iniciais dos dois primeiros nomes quando ausente ou após falha de carregamento; uma nova URL permite nova tentativa. A imagem não envia o referer da página. A biografia vem de `profile.status.message`, preserva quebras de linha e é renderizada como texto, sem HTML; se ausente, mostra “Biografia não informada”. A descrição comercial não substitui a biografia.
- O número prioriza `profile.phoneNumber`, `phoneNumber` da conexão, `profile.jid` e `number` legado. A normalização remove o sufixo do dispositivo (`:56`) e o domínio de JIDs telefônicos (`s.whatsapp.net`/`c.us`), evitando o falso “Número não informado” para contas multidispositivo. JIDs `@lid` não são tratados como telefone. Números ausentes ou inválidos mantêm “Número não informado”.
- Tipo de conta: `profile.business` preenchido identifica “Conta comercial”. Flags booleanas explícitas `isBusiness` também são preservadas; somente `false` explícito identifica “Conta pessoal”. Perfil comercial nulo ou ausente mostra “Não informado pelo WhatsApp”, pois não confirma o tipo da conta.
- Desconectar utiliza o fluxo existente e informa que será necessário parear novamente. Os envios e automações continuam sujeitos às configurações da clínica.
- Falhas de consulta, incluindo rede e HTTP 5xx, usam `api_error` com nova tentativa de consulta, sem afirmar que houve desconexão e sem iniciar uma nova sessão. HTTP 404 mantém o contrato existente de conta não vinculada. Falha não comprova que o WhatsApp esteja desconectado; a integração deve ser consultada novamente. Não altera a autenticação da pessoa no CRM.

Foram removidos os logs fixos com horários simulados, versões de API de fallback, IDs técnicos, classificação pessoal inferida e promessas genéricas de automação e segurança. A aba não possui endpoint de histórico de conexões. O histórico de envios de mensagens continua em sua tela própria.

Usa `AppButton`, `AppSkeleton` e `AppEmptyState`, ilustração SVG local e azul da marca. A página ocupa toda a largura e pelo menos a altura útil do conteúdo. No desktop, a conta ocupa cerca de 69% do grid (2,2:1), com Desconectar no rodapé, e a lateral reúne cards compactos sobre mensagens, ausência de espelhamento, instruções e disponibilidade. Os cards laterais usam a altura natural, sem esticar individualmente para preencher vazios. Em larguras intermediárias a proporção é 1,7:1; até 760px, empilham em uma coluna. Dados extensos aumentam a página naturalmente; não há altura fixa que corte biografia ou ações. O pareamento e os dados da conta mantêm o contexto autenticado existente; nenhum identificador interno é exibido. Não há nova rota nem alteração nas permissões ou nas ações de pareamento/desconexão.

## Idade do vínculo e privacidade

`createdAt` de `GET /v2/whatsapp/connection` é normalizado como `linkedAt` e
exibido em **Vínculo com a clínica**, com data/hora em `America/Sao_Paulo` e
tempo decorrido em minutos, horas ou dias completos. A idade acompanha o
relógio a cada minuto. Datas inválidas, futuras ou ausentes mostram “Data não
informada”. É o cadastro desse vínculo na API da clínica, não a data de criação
da conta no WhatsApp nem a data de pareamento. A data de criação da conta no
WhatsApp não é exibida. O timestamp local da instância também não é usado como
idade da conta.

A lateral apresenta os seguintes cards informativos (o segundo somente com a conta conectada):

- **Sobre suas mensagens**: esta tela não exibe conversas; a integração recebe
  e armazena mensagens e processa seu conteúdo para os envios e as automações
  da clínica.
- **Sem espelhamento do celular**: a conexão não mostra a tela do aparelho nem
  outros aplicativos; o vínculo pode ser encerrado em Aparelhos conectados.

Esses textos descrevem capacidades verificadas no código, sem prometer que o
serviço não consegue ler mensagens. Em `whatszu/`, o handler de
`messages.upsert` chama `persistInboundMessage` e salva corpo e payload via
`upsertInboundMessage`; a API da clínica processa `message.received` para
workflows. A ausência de conversas nesta página não significa ausência de
acesso técnico ou de armazenamento no serviço.

O card de risco de suspensão, alertas, pausas e limites de envio foi removido
desta interface. As proteções e os dados de `sending` continuam no backend,
sem alteração de permissões ou processamento. Contrato:
[Whatszu local](../../api-clinic/docs/WHATSZU_LOCAL.md#datas-e-sinais-de-proteção-na-conexão-da-clínica).

O vazio de conexão usa `whatsapp-connect-empty.svg`: cartão com três marcadores
quadrados e módulos de QR Code, ao lado de um celular com alto-falante, tela e
linha de leitura. A ilustração é decorativa, não é um código de pareamento;
o QR funcional continua vindo da integração após Gerar QR Code. O SVG usa
somente vetores e variáveis `--empty-*`, sem imagens externas, scripts ou
animação, seguindo [Estados vazios](estados-vazios.md).

## Verificação

Execute `npm run test:whatsapp` e `npm run build`. A fixture [whatsapp-connection-preview.html](../tests/fixtures/whatsapp-connection-preview.html) permite revisar desconectado, preparação, QR, conectado, erro e carregamento, incluindo celular. Usa dados explicitamente fictícios e ações locais, sem consultar a API, enviar mensagens ou vincular contas reais. Para o teste integrado, consulte o [Whatszu local](../../api-clinic/docs/WHATSZU_LOCAL.md).

A suíte cobre o contrato v2 com JID multidispositivo, precedência do telefone,
foto, biografia, conta comercial confirmada, flag pessoal explícita e tipo
desconhecido, além de erro de foto e escape de HTML. Na prévia, conferir os
atalhos Dados ausentes, Biografia longa, Celular e Desktop: alinhamento da
base dos cards, quebra dos textos e acesso a Desconectar. A foto da prévia é
um arquivo local de demonstração; não depende de dados nem imagens da clínica.

Conferir os quatro cards no estado conectado e os três na ordem definida no
estado não conectado, em desktop e celular, além do SVG de QR e celular.
Os testes preservam a idade do vínculo e a data inválida, verificam
a remoção dos blocos de criação da conta e risco, e exigem a explicação do
processamento de mensagens, sem alegação de impossibilidade de leitura.
