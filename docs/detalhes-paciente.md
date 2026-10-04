# Detalhes do paciente

No celular, a tela de detalhes do paciente usa a rolagem principal do `DefaultLayout`. O cartão da aba ativa e seu conteúdo crescem conforme os dados, sem criar uma segunda área vertical de rolagem. A navegação entre abas continua com rolagem horizontal para manter todas as opções acessíveis.

Na aba Detalhes, as seções aparecem em cartões separados no celular, tanto em leitura quanto em edição. O formulário de edição usa uma coluna, espaçamento uniforme entre campos e ações em um cartão ao final. Textos longos em modo de leitura, como e-mail, quebram dentro do cartão.

Em telas maiores, o cartão mantém a altura e a rolagem próprias já usadas no layout de duas colunas. A alteração não modifica dados, permissões ou ações do paciente.

No celular, os botões do cabeçalho se ajustam à largura disponível sem ultrapassar o cartão. O botão **Editar** muda para a aba **Detalhes** e ativa o formulário mesmo quando outra aba estiver aberta.

Ao abrir a edição a partir de outra aba, a navegação para Detalhes termina antes de ativar o formulário. Quando Detalhes já está aberto, não há navegação redundante. Cada abertura da edição repõe os campos a partir dos dados atuais do paciente, inclusive após cancelar uma edição anterior.

Enquanto o formulário está aberto, o botão do cabeçalho passa a **Cancelar** no mesmo lugar. Ele descarta as alterações locais e volta à visualização dos detalhes; o botão Cancelar no rodapé do formulário oferece a mesma ação.

Para verificar, abra um paciente com dados pessoais extensos em uma largura de celular e role do cabeçalho até o final da aba Detalhes; repita em outras abas e confira a navegação horizontal das abas. Confira os botões em uma largura estreita e clique em **Editar** a partir de outra aba. Repita a sequência **Editar → Cancelar → Editar** e confirme que o formulário reabre. Em desktop, confira a rolagem dentro do cartão.
