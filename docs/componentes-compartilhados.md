# Componentes compartilhados e verificação das telas

Este documento descreve a consolidação de menus, seletores, filtros, paginação
e campos de horários. As regras gerais continuam em [Regras de layout](regras-layout.md).
As fundações de bordas, cores, fontes e skeleton ficam no
[Design System](<Design System/README.md>).

## Contratos de reutilização

- `FinanceSummaryCard` é reutilizado pelo [Resumo do estoque](estoque.md)
  para os quatro indicadores, com `label`, `value`, `subtext` e `loading`.
  A navegação fica em um botão externo com foco visível. Não recebe séries
  fictícias de estoque; o gráfico de movimentações usa os dados reais da consulta.
  `StockDashboardEmpty` adapta `AppEmptyState` para os painéis compactos de
  estoque com uma ilustração local; veja [Estados vazios](estados-vazios.md).

- `AppToaster` mantém uma única pilha Sonner no canto inferior direito, com
  até quatro notificações visíveis. `useToast().upload({ title, description,
  progress })` usa um toast nativo Sonner de carregamento na mesma pilha,
  com `AppUploadToast` apenas como conteúdo: título curto com peso 500,
  subtítulo com peso 400, nome do arquivo, barra e percentual. A moldura,
  largura responsiva e animações são do Sonner. No carregamento, a nuvem
  tem 20px, usa `--azul-principal` e fica no topo, alinhada ao título.
  As notificações finais preservam seus ícones nativos. Novas notificações se sobrepõem
  conforme o empilhamento padrão, sem criar um container flutuante separado.
  Retorna `{ id, update, success, error, dismiss }`. `update({ progress,
  description, title })` atualiza o estado sem criar outro toast; `progress:
  null` mostra espera indeterminada. `success(titulo, descricao)` e
  `error(titulo, descricao)` dispensam o progresso e criam uma notificação
  nativa final com título e descrição, que expira em quatro segundos. Uma
  instância nova reinicia o temporizador e a altura medida, evitando altura
  antiga ao passar o mouse. O timer nativo pausa durante interação/aba oculta.
  A largura segue `--width` do Sonner mesmo para nomes curtos. Durante envio,
  o tipo `loading` pausa a duração finita; não se usa `duration: Infinity`
  seguida de troca de duração. Fechar apenas oculta a notificação:
  não cancela o envio nem recria o toast ao concluir. Conteúdo é texto escapado,
  e a barra expõe semântica de progresso e respeita movimento reduzido.
  Primeiro uso: [Upload no atendimento](atendimento.md#upload-de-imagens).
  Testes: `npm run test:uploads` (API compartilhada, componente, anexos, store
  e expiração real com Sonner montado e relógio simulado após upload longo).
  Prévia visual isolada: com `npm run dev`, abra
  `/tests/fixtures/uploads-preview.html`. Usa dados fictícios, sem enviar arquivos,
  e permite conferir nomes longos, largura estreita e empilhamento com outro toast.

- `CopyContact`: props `value`, `label` e `message`, conteúdo pelo slot padrão.
  Copia via Clipboard API somente acima de 768px e mostra feedback em popover
  Reka UI teleportado por 1,8s. Não propaga o clique à linha; erro permanece no
  popover. Cancela o timer ao desmontar e não mostra feedback de sucesso antes
  da confirmação de cópia. Primeiro uso: [Pacientes](listagem-pacientes.md).
  Usa o visual do tooltip de `FormInput`: fundo branco, borda cinza, raio de 6px,
  sombra e seta. O conteúdo é um `div` nativo via `as-child`, preservando CSS
  scoped após Teleport. Cursor padrão permanece sobre o contato.

- `AppointmentDetailsModal`: aceita `loading` e `error` opcionais; durante a
  carga, `event` pode ser nulo. O mesmo SideDrawer mostra skeleton no corpo,
  mantendo o título/fechamento e ocultando ações até existir o evento completo.
  Erro exibe nova tentativa via evento `retry`. Padrões antigos sem essas props
  mantêm o comportamento. Primeiro uso: [Pacientes](listagem-pacientes.md).

- `Checkbox` (`components/ui/checkbox`): contorno cinza de 1,5px, tamanho 18px,
  preenchimento com `--azul-principal` animado em 180ms, ícone branco e traço
  para seleção parcial. Mantém contratos do Reka UI e foco visível por teclado;
  respeita `prefers-reduced-motion` e estado desabilitado.
  A caixa tem alinhamento flex e indicador absoluto: montar/desmontar o ícone
  não altera a linha de base nem a altura do cabeçalho da tabela.

- `AppTableList`: seleção opcional com `selectable`, `items`, `itemKey` (padrão
  `_id`) e `v-model:selectedKeys`. O slot padrão recebe `isSelected(item)`,
  `selectRow(item, checked)`, `selectAll(checked)`, `allSelected`, `someSelected`
  e `selectable`. O consumidor renderiza os seletores e impede propagação do
  clique. Selecionar todos afeta apenas `items`; a seleção não chama API nem
  executa ações em lote. Desabilitado por padrão, preserva os consumidores
  existentes. Primeiro uso: [Tabela de pacientes](listagem-pacientes.md).

- `SideDrawer`: aceita `teleportTo` (seletor ou elemento DOM), com padrão `body`.
  Em tela cheia nativa, o consumidor pode passar o elemento em fullscreen para
  manter o drawer visível. O destino é reativo e preserva o estado do formulário.
  O planejador facial usa esse contrato no formulário de novo planejamento;
  confira abertura, fechamento e saída de fullscreen com o formulário aberto.
  Rodapés de fluxos por etapas usam `step-navigation-footer`.
  Contrato, telas e verificação: [SideDrawer com Stepper](side-drawer-stepper-pattern.md).

- `AppDateRangePicker`: padrão de Financeiro → A receber reutilizado em todas
  as seleções de intervalo. `modelValue` é `[Date, Date]` ou `null`; emite
  `update:modelValue` somente para um intervalo completo, inclusive um único dia
  selecionado como início e fim. O botão mostra calendário e `dd/MM/aaaa até
  dd/MM/aaaa`, com `Início`/`Fim` quando vazio. Calendário em português, sem hora,
  dois meses, aplicação automática e painel teleportado para `body`; no celular,
  os meses ficam empilhados. Props: `label`, `disabled`, `error` e `clearable`
  (padrão `false`). Quando habilitada, a ação **Limpar período** emite `null`.
  Erros são exibidos junto ao campo e associados ao botão para acessibilidade.
  O componente não acessa API nem converte as datas em parâmetros de consulta.

- `AppDropdownActions`: botão de ações, apenas um menu aberto entre suas instâncias,
  fechamento por clique externo ou Escape, com retorno de foco no Escape. O painel
  usa Teleport para `body`, acompanha rolagem e redimensionamento e abre acima
  quando falta espaço abaixo. Aceita `disabled` e `menuWidth` (padrão `180px`).
  O slot recebe `close`; cada ação deve chamá-lo explicitamente, inclusive links
  e handlers com `.stop`. As classes dos itens são `dropdown-item`, `delete`
  (ou `delete-item`), `success` e `primary`. As telas mantêm suas condições de
  visibilidade, permissões, confirmações e handlers de negócio.
- `StyledSelect`: seleção simples por `v-model`, com opções `{ value, label,
  image?, icon? }`. Usa o valor exato da opção, incluindo string vazia e zero.
  Suporta imagens, iniciais de fallback, estado de erro e direção do painel.
  O botão expõe combobox/listbox; setas percorrem opções, Enter ou espaço
  selecionam, Escape e Tab fecham. `SearchableSelect` continua específico para
  busca; `StyledMultiSelect` continua específico para múltiplos valores.
  `dropdownMinWidth` opcional (número em pixels, padrão 0) amplia o menu sem alterar
  o campo. Largura e posição ficam limitadas à janela com margem de 8 px.
  `MessageTemplateSelect` usa 400 px e rodapé com ação centralizada/contornada
  “Criar novo modelo”, seguindo o cadastro de paciente no novo agendamento.
- `StyledMultiSelect`: opções `{ value, label }` e `v-model` com array de valores.
  Os filtros de tags dos anexos e da galeria do paciente usam esse componente,
  com busca, seleção múltipla, remoção individual e limpeza pelo ícone X.
  Os itens também alternam por Enter ou espaço; Escape fecha o painel.
  A filtragem existente nas telas permanece local aos arquivos carregados:
  selecionar tags corresponde a qualquer uma das tags selecionadas.
- `AppPagination`: `currentPage`, `totalPages`, `totalItems`, `limit` e evento
  `page-change`. Os consumidores adaptam `pages` ou `totalPages` sem alterar a API.
  O campo Número da página permite salto direto em desktop/celular, via Enter
  ou saída do campo, sem botão Ir. Aceita dígitos, limita a 1 até `totalPages`
  e restaura a página atual quando vazio;
  acompanha mudanças de `currentPage` e não emite ao confirmar a página atual.
  Rodapé branco com borda superior, resumo de resultados, botões contornados de
  primeira/anterior/próxima/última página e página ativa azul. No desktop, mostra
  números com reticências e campo de salto; no celular, mantém o campo de salto
  entre as setas. A lista de pacientes oculta resumo e atalhos extremos no mobile.
  Outros consumidores mantêm o resumo acima. Botões têm
  rótulos acessíveis, foco visível e limites desabilitados; a página atual usa
  `aria-current`. Clicar na página atual não emite nova consulta. Não há seletor
  de quantidade por página: `limit` continua controlado pelo consumidor.
- `WorkingHoursFields`: recebe `v-model` com os dias e emite uma nova lista ao
  alterar `isOpen`, `startTime` ou `endTime`. Usa `Switch` e `StyledSelect`;
  horários mantêm o formato `HH:mm` e opções de 30 em 30 minutos. Onboarding
  e Configurações compartilham campos e o cálculo de `utils/workingHours.js`.
  O total soma minutos dos dias abertos e ignora intervalos iguais ou invertidos;
  não interpreta intervalos como turnos que atravessam a meia-noite. Por exemplo,
  `09:30–10:00` equivale a `0,5h`. Salvamento permanece nos componentes de tela,
  com os mesmos contratos e apenas os dias abertos enviados.

O seletor local de horários foi removido após migrar seus dois consumidores.
No calendário, o seletor compartilhado adapta os IDs para valores de opções,
mas continua emitindo o profissional completo ou `null` para todos.
No editor de workflows, todos os selects usam `StyledSelect`; o evento de
alteração de preset continua aplicando a configuração da condição selecionada.
Os IDs usados como valores internos não aparecem como rótulos.

## Checklist de verificação manual

Repetir em desktop e celular. Testar carregamento, vazio e falha de consulta nas
listagens; usar dados descartáveis para ações de edição, exclusão e confirmação.

| Tela / acesso | Conferir |
| --- | --- |
| Pacientes (`/pacientes`) | Menu Editar/Excluir nas representações desktop e celular; clique na linha continua abrindo o paciente. |
| Procedimentos (`/procedimentos`) | Menu Editar/Excluir, fechamento após ação e confirmação de exclusão. No sidebar de criação/edição, manter Cancelar/Voltar à esquerda e Próximo/Salvar à direita, com espaço entre os botões. A seta de Próximo é branca sobre o botão azul; os demais ícones preservam suas cores. Conferir as etapas em desktop e celular. |
| Estoque → Produtos (`/estoque/produtos`) | Menu Ver detalhes/Editar/Excluir nas duas representações. |
| Workflows (`/workflows`) | [Tabela e cards](listagem-workflows.md): filtros, seleção, altura fixa, paginação e menu editar/excluir sem abrir a linha; clique na linha abre o editor. |
| Editor de workflow (`/workflows/:id`) | [Editor flutuante](editor-workflows.md): clique/arraste de etapas, conexões, edição isolada, proteções de saída e publicação. Conferir prazo/unidade, presets e seletores; salvar/reabrir para validar. |
| Configurações → Membros da Equipe | Visibilidade por permissão; Alterar Cargo/Demitir; menu ausente para proprietário. Abrir pelo menu da clínica. |
| Atendimentos (`/atendimentos`) | Na lista: Confirmar/Atender/Detalhes conforme status; bloqueio enquanto atualização está pendente. |
| Paciente → Orçamentos (`/pacientes/:id/orcamentos`) | Menu no celular; PDF, editar, enviar WhatsApp e excluir; ações bloqueadas para importados ou WhatsApp desconectado; mensagem de indisponibilidade. |
| Calendário (`/calendario`) | Todos os profissionais, profissional com foto e sem foto; atualização dos atendimentos filtrados. |
| Paciente → Galeria (`/pacientes/:id/galeria`) | Abrir pasta, buscar/selecionar/limpar tags, navegar páginas e trocar de pasta (reinicia filtros). |
| Atendimento em andamento → Anexos | Buscar/selecionar/limpar tags; seleção de arquivos e ações existentes continuam disponíveis. |
| Anamneses (`/anamneses`) | Paginação com busca e status; primeira/última página e intervalo de resultados. |
| Termos (`/termos`) | Paginação com busca e status; primeira/última página e intervalo de resultados. |
| Resumo → Anamneses pendentes | Quando a listagem estiver disponível: paginação, primeira e última página. O componente não possui rota própria atualmente. |
| Galeria da clínica (`/galeria`) | Paginação junto dos filtros existentes; miniaturas e visualizador. |
| Configurações → Horário de Funcionamento | Dias abertos/fechados, horários, total semanal e salvar. Conferir `09:30–10:00 = 0,5h`. |
| Cadastro/onboarding → Horário de Funcionamento | Mesmos campos e cálculo; salvar e avançar. |
| Financeiro → A receber / A pagar (`/financeiro/receber`, `/financeiro/pagar`) | Regressão do menu compartilhado: baixa, edição e cancelamento conforme condições existentes, desktop e celular. |

Nos menus, conferir clique externo, Escape, alternância entre linhas, rolagem e
opções próximas da borda inferior da tela. Nos selects, conferir também teclado.

## Períodos: telas e comportamento

Todas as telas abaixo usam `AppDateRangePicker`, incluindo a tela que originou
o padrão. Escolher apenas a primeira data não altera o filtro aplicado.

| Tela | Aplicação do período |
| --- | --- |
| Financeiro → A receber e A pagar | Mantém `dueStart`/`dueEnd`, filtros na URL e recarregamento automático. Limpar filtros mantém o comportamento de retornar ao mês atual. |
| Financeiro → Caixa | Mantém `startDate`/`endDate` e filtros da URL. |
| Financeiro → Resumo | Atualiza resumo, gráficos e rankings com o intervalo completo. |
| Dashboard financeiro (`FinanceDashboardView`) | Período personalizado usa um intervalo único; atalhos Hoje/Semana/Mês/Ano e botão Aplicar permanecem. |
| Atendimentos | Mostra ambas as datas; preserva filtros da URL e recarrega a listagem. O período ocupa a largura do componente, sem espaço reservado adicional antes do seletor Kanban/Lista; ambos os botões exibem seus ícones. Verificar o espaçamento e a troca de visualização em desktop e celular. |
| Galeria da clínica | Mantém `from`/`to`, volta à primeira página; Limpar período remove as duas datas. |
| Estoque → Movimentações | Converte datas selecionadas para `dataInicio`/`dataFim` em `YYYY-MM-DD` sem conversão UTC, volta à primeira página e recarrega. Limpar período remove ambas. |
| Calendário → Criar/editar bloqueio | Um campo Período do bloqueio substitui as datas separadas. Horas de início/fim e Dia inteiro permanecem; erro de datas fica no período e erro de intervalo/horário no campo correspondente. Editar limpa o erro associado. |

Datas únicas (nascimento, vencimento, pagamento, validade) e a navegação da agenda
por dia/semana/mês continuam usando seus controles próprios. O dashboard
financeiro legado e a listagem de anamneses pendentes não têm rota ativa própria.

Verificar cada tela em desktop e celular: intervalo dentro do mês e entre meses,
mesmo dia como início/fim, seleção incompleta, reabertura, fechamento externo e
limpeza onde disponível. Nas telas com filtros na URL, recarregar a página para
confirmar que o intervalo foi preservado. Em bloqueios, conferir criação/edição,
Dia inteiro e horário final anterior ao inicial. A revisão visual isolada do
componente cobriu seleção completa, seleção incompleta e limpeza, com dados
simulados; os fluxos autenticados devem ser conferidos com dados de teste.

## Validação automatizada e limites

- `node --test tests/workingHours.test.js`: regressão de minutos, dias fechados,
  intervalos invertidos e opções de horário.
- `npm run build`: checagem TypeScript/Vue e compilação de produção.
- Revisão visual isolada dos componentes compartilhados em `1280×800` e
  `390×844`, com dados simulados, sem acesso autenticado nem escrita na API.
  Essa revisão não substitui o checklist das telas com dados reais.

## Ilustrações nos estados vazios

`AppEmptyState` aceita o slot `illustration` para substituir o ícone circular por um SVG contextual. O `icon` é opcional; consumidores existentes continuam com o mesmo visual. Título e texto permanecem obrigatórios. O estado vazio de anexos do atendimento usa esse slot; veja [Imagens e anexos sem fotos](atendimento.md#imagens-e-anexos-sem-fotos).

Regras visuais, arquivos SVG, posicionamento, comportamento e fila de adoção: [Estados vazios das telas](estados-vazios.md).

O slot footer de StyledSelect fica fixo no rodapé da lista rolável (sticky),
com fundo branco. O catálogo usa essa ação para Criar novo modelo de WhatsApp;
ver [catálogo](catalogo-workflows.md).

MessageTemplateSelect reutiliza StyledSelect, decora opções com ícones e padroniza
o rodapé fixo Criar novo modelo, inclusive com opções vazias. Preserva v-model,
labels/erros/required/placeholder e encaminha a marketing-modelos?novo=1. O evento
create permite ao catálogo fechar seu painel. Usado nos campos de mensagem de
workflows e Marketing → Mensagens; não cria templates automaticamente.
WorkflowLoading usa AppSkeleton e estado acessível para o carregamento do canvas.

## SideDrawer com painel secundário

Props secondaryOpen/secondaryLabel, slot secondary e evento close-secondary compõem dois painéis contíguos em um overlay. bodyClass permite aplicar o fundo de uma tela ao corpo sem alterar outros consumidores. ResizeObserver reposiciona o X externo; o fechamento pelo overlay anima o grupo inteiro. Contrato, responsividade e foco: [Execuções](execucoes-workflows.md).

WorkflowActionDialog reutiliza BottomSheet para confirmar ações de workflow, escolher o modo de inativação e aguardar três segundos antes de cancelamentos. Contrato: [Execuções](execucoes-workflows.md).
