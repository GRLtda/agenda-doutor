# Regras de layout

Contratos e checklist: [Componentes compartilhados](componentes-compartilhados.md).

- Reutilizar componentes globais e o padrão da tela equivalente antes de criar CSS próprio.
- Seleção de período usa `AppDateRangePicker`, com o padrão de Financeiro → A receber:
  botão com calendário e datas "início até fim", seleção de intervalo e aplicação
  após escolher as duas datas. Não recriar controles locais nem usar dois campos
  separados para datas de um período. Datas únicas e navegação da agenda por dia,
  semana ou mês mantêm seus controles específicos.
- Em Configurações, a ação principal fica à direita do header, via Teleport para #tab-actions, com AppButton variant="primary" e o azul principal do tema. Não repetir o título do header no conteúdo.
- Carregamento de listas deve usar AppSkeleton com distribuição semelhante às linhas finais, sem substituir a lista apenas por texto de carregamento.
- Listagens tabulares usam AppTableList como estrutura, cabeçalho discreto, linhas alinhadas e ações à direita. Não aplicar display:flex diretamente a td; usar um contêiner interno. Em telas estreitas, preservar acesso às colunas por rolagem horizontal.
- Editar e definir padrão usam AppButton com ícone e variante visível (outline); ações não podem aparecer como texto solto sem estilo.
- Opções booleanas, como Usar como unidade padrão, usam Switch, com rótulo, estado selecionado e estado desabilitado perceptíveis. Não usar checkbox nativo sem estilo.
- Formulários de endereço consultam CEP usando a integração existente em api/external.js. Exibir consulta em andamento, permitir nova tentativa e preenchimento manual em caso de falha. Não sobrescrever edições feitas enquanto a consulta estava em andamento nem aplicar respostas de um CEP anterior.
- Erros de validação ficam junto aos campos, são limpos ao editar e recebem foco no primeiro campo inválido. Falhas gerais aparecem no formulário.
- Verificar desktop e celular, incluindo carregamento, vazio, erro e salvamento. Build não substitui revisão visual.

Durante a consulta de CEP, rua, bairro, cidade e UF exibem AppSkeleton no lugar
dos inputs, mantendo os rótulos. Não exibir texto de carregamento separado. CEP,
número e complemento permanecem editáveis. Ao concluir, os inputs retornam; em
caso de falha, a mensagem e a ação de nova tentativa ficam visíveis.

- Seleções de opções usam os componentes compartilhados StyledSelect ou SearchableSelect,
  conforme o campo existente. Não introduzir select nativo em formulários padronizados.
