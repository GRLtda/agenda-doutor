# Sentry e Microsoft Clarity

O Sentry em src/main.ts e o Clarity em src/services/clarity.js ficam desativados quando import.meta.env.DEV e verdadeiro ou MODE e dev, development ou test. Isso inclui o servidor Vite de desenvolvimento mesmo com um modo personalizado. Nenhum cliente Sentry, tracing, replay, script ou fila Clarity e inicializado. Eventos Clarity tambem sao ignorados nesses ambientes, inclusive se window.clarity ja existir.

Nos demais ambientes, Sentry usa VITE_SENTRY_DSN e MODE; Clarity usa VITE_CLARITY_PROJECT_ID com o ID padrao existente.

Validacao: iniciar npm run dev e conferir ausencia de requisicoes para Sentry e clarity.ms, inclusive ao provocar erro ou clicar em acoes rastreadas. Em build de producao, as integracoes mantem o comportamento anterior.

Diagnóstico e regressão do `RangeError: Invalid time value` em clique no
cabeçalho do VueCal: [Calendário](calendario.md#diagnóstico-do-erro-p1).

Falhas de rede/timeout e HTTP 408/429/5xx ativam o aviso global sem apagar a
sessão. O interceptor continua encaminhando falhas ao Sentry; cancelamentos
intencionais não geram esse aviso nem captura nesse interceptor. Contrato,
limitações e testes: [Autenticação e indisponibilidade](autenticacao.md).
