# Detalhes do paciente

Enquanto o paciente é consultado e ainda não há dados, a tela usa `AppSkeleton`
no lugar do texto de carregamento: avatar, nome, contato, ações, navegação de abas
e campos das seções. O skeleton reutiliza o layout final, com navegação lateral em
desktop e abas horizontais/campos empilhados no celular. Os placeholders são
decorativos e o contêiner anuncia o estado de carregamento às tecnologias assistivas.
Ao concluir a consulta, o conteúdo ou o estado de erro existente substitui o skeleton.
Para verificar, limite a velocidade da rede e abra um paciente; repita ao navegar
entre pacientes, em desktop e celular, conferindo sucesso e falha da consulta.

Na aba Orçamentos, o menu de ações do celular reutiliza `AppDropdownActions`,
mantendo os bloqueios para importados e para WhatsApp indisponível. Na aba
Galeria, o filtro de tags reutiliza `StyledMultiSelect` e a navegação entre páginas
usa `AppPagination`. Contratos e verificação dessas abas e dos anexos do
atendimento: [Componentes compartilhados](componentes-compartilhados.md).

No celular, a tela de detalhes do paciente usa a rolagem principal do `DefaultLayout`. O cartão da aba ativa e seu conteúdo crescem conforme os dados, sem criar uma segunda área vertical de rolagem. A navegação entre abas continua com rolagem horizontal para manter todas as opções acessíveis.

Na aba Detalhes, as seções aparecem em cartões separados no celular, tanto em leitura quanto em edição. O formulário de edição usa uma coluna, espaçamento uniforme entre campos e ações em um cartão ao final. Textos longos em modo de leitura, como e-mail, quebram dentro do cartão.

Em telas maiores, o cartão mantém a altura e a rolagem próprias já usadas no layout de duas colunas. A alteração não modifica dados, permissões ou ações do paciente.

No celular, os botões do cabeçalho se ajustam à largura disponível sem ultrapassar o cartão. O botão **Editar** muda para a aba **Detalhes** e ativa o formulário mesmo quando outra aba estiver aberta.

Ao abrir a edição a partir de outra aba, a navegação para Detalhes termina antes de ativar o formulário. Quando Detalhes já está aberto, não há navegação redundante. Cada abertura da edição repõe os campos a partir dos dados atuais do paciente, inclusive após cancelar uma edição anterior.

Enquanto o formulário está aberto, o botão do cabeçalho passa a **Cancelar** no mesmo lugar. Ele descarta as alterações locais e volta à visualização dos detalhes; o botão Cancelar no rodapé do formulário oferece a mesma ação.

Para verificar, abra um paciente com dados pessoais extensos em uma largura de celular e role do cabeçalho até o final da aba Detalhes; repita em outras abas e confira a navegação horizontal das abas. Confira os botões em uma largura estreita e clique em **Editar** a partir de outra aba. Repita a sequência **Editar → Cancelar → Editar** e confirme que o formulário reabre. Em desktop, confira a rolagem dentro do cartão.

## Controles do planejador facial

Com zoom acima de 100%, inclusive em tela cheia, o clique esquerdo aplica pontos. Para mover a imagem, segure **Ctrl e arraste**, ou **arraste com o botão do meio do mouse (scroll)**. A orientação aparece abaixo do mapa com zoom. Ctrl ativa o cursor de movimento. A navegação também pode começar sobre pontos existentes, sem reposicioná-los. O limite de deslocamento continua em 180 pixels por eixo. Sem Ctrl, arrastar um ponto continua editando sua posição, respeitando as permissões existentes.

Verificação: em um planejamento editável, selecione um procedimento, entre em tela cheia e aplique pontos com clique comum. Mova com Ctrl e com o botão do meio, inclusive começando sobre um ponto, e confirme que os gestos não aplicam nem editam pontos. Solte Ctrl e aplique outro ponto. Repita fora de tela cheia com zoom e após alternar de janela. Em celular, confira aplicação por toque e legibilidade da orientação.

O sidebar **Novo planejamento facial** abre dentro do contêiner do planejador durante a tela cheia nativa do navegador. Fora dela, abre no `body`. O destino acompanha a entrada e a saída da tela cheia, mantendo o formulário aberto e seu nome digitado. Verifique abrir, cancelar e criar um planejamento em tela cheia; confira também sair com Escape enquanto digita, preservando o formulário e seu conteúdo.
