# Calendário

## Cliques em dias e horários

`src/views/pages/calendario.vue` usa VueCal 4.10.2. Na integração dessa versão,
`cell-click` tem formatos diferentes conforme a origem:

| Origem | Payload | Tratamento |
| --- | --- | --- |
| Célula de horário | `Date` | Abre o formulário de agendamento se a data for válida e não estiver no passado. |
| Célula com coluna/split | `{ date: Date, split }` | Extrai `date` e aplica a mesma validação. |
| Cabeçalho nativo de dia | `{ date: Date, split: MouseEvent }` | Ignora a criação de agendamento. O evento do mouse não é uma coluna nem uma data. |

O cabeçalho personalizado usa `@click.stop` para acionar somente
`handleDayHeaderClick`, sem propagar para o cabeçalho nativo. No desktop,
essa ação mantém a navegação de semana para dia e de mês para semana.
Datas inválidas não alteram a seleção. No celular, o cabeçalho mantém o
comportamento anterior, sem essa navegação adicional.

`utils/calendarCellClick.js` valida o payload antes de qualquer formatação:
aceita somente `Date` válido, diretamente ou em `payload.date`; rejeita
`null`, strings, objetos incompletos, datas inválidas e horários passados.
Quando recebe o evento DOM em `split`, retorna sem abrir o modal. Datas
aceitas são copiadas e o horário é formatado em `HH:mm` local, preservando
o contrato `{ date, startTime }` do formulário. Não há mudança de timezone,
API, permissões ou regras de confirmação e salvamento do agendamento.

## Diagnóstico do erro P1

O evento Sentry `7891470da9b54a369f1c7dfe82c684ac`, de 16/10/2026 às
19:54:30 no horário de Brasília, registrou `RangeError: Invalid time value`
na rota `/calendario`, após clique em `.weekday-label`. A pilha passa por
`VueCal.selectCell`, pelo handler local e pela formatação `HH:mm`.

O handler anterior esperava sempre uma data. No clique do cabeçalho,
recebia `{ date, split: MouseEvent }`. A comparação desse objeto com
`new Date()` não o rejeitava, e a formatação do objeto provocava a exceção.
O código instalado do VueCal confirma a emissão desse formato, e os testes
reproduzem o clique no componente real.

O histórico também registra uma falha de rede no primeiro login, seguida de
login bem-sucedido. As consultas de agendamentos e bloqueios próximas ao erro
retornaram HTTP 200. Essa falha anterior não explica a exceção de formatação.
O relatório não demonstra perda de dados ou falha de salvamento: o caminho
que falhou preparava a abertura do formulário, antes de qualquer escrita.
Não copiar dados pessoais do relatório bruto para exemplos ou testes.

## Verificação

Execute `npm run test:calendar`. A suíte usa o VueCal real para confirmar o
payload do cabeçalho e a navegação isolada; também testa células simples,
splits, preservação do horário local, datas passadas e entradas inválidas.
Mocks não substituem o componente VueCal nesses testes de integração.

No aplicativo autenticado, navegue para uma semana futura e clique no nome
e no número do dia: deve abrir a visão diária, sem abrir o formulário e sem
exceção. Clique também no espaço do cabeçalho nativo. Depois clique em uma
célula futura: o formulário deve abrir com a data e o horário corretos.
Repita em uma célula passada, nas visões de dia/semana/mês e no celular;
cliques em agendamentos existentes continuam abrindo seus detalhes.
