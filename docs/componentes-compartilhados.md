# Componentes compartilhados e verificação das telas

Este documento descreve a consolidação de menus, seletores, filtros, paginação
e campos de horários. As regras gerais continuam em [Regras de layout](regras-layout.md).

## Contratos de reutilização

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
- `StyledMultiSelect`: opções `{ value, label }` e `v-model` com array de valores.
  Os filtros de tags dos anexos e da galeria do paciente usam esse componente,
  com busca, seleção múltipla, remoção individual e limpeza pelo ícone X.
  Os itens também alternam por Enter ou espaço; Escape fecha o painel.
  A filtragem existente nas telas permanece local aos arquivos carregados:
  selecionar tags corresponde a qualquer uma das tags selecionadas.
- `AppPagination`: `currentPage`, `totalPages`, `totalItems`, `limit` e evento
  `page-change`. Os consumidores adaptam `pages` ou `totalPages` sem alterar a API.
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
| Procedimentos (`/procedimentos`) | Menu Editar/Excluir, fechamento após ação e confirmação de exclusão. |
| Estoque → Produtos (`/estoque/produtos`) | Menu Ver detalhes/Editar/Excluir nas duas representações. |
| Workflows (`/workflows`) | Menu editar/excluir sem abrir acidentalmente a linha; clique na linha abre o editor. |
| Editor de workflow (`/workflows/:id`) | Prazo/unidade, presets de condição, status, procedimento e seletores dinâmicos de modelo/procedimento; salvar e reabrir para conferir os valores. |
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
