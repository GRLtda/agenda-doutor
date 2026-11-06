# Monitoramento HTTP do CRM

`GET /health` é público e retorna HTTP 200 com `Content-Type: application/json`
e `{ "success": true, "data": { "status": "ok", "service": "crm-clinica" } }`.
`HEAD /health` retorna os mesmos cabeçalhos, sem corpo. Não exige login,
cookies ou credenciais e não acessa dados de clínicas.

O arquivo `public/health.json` é copiado para `dist/health.json` pelo Vite.
Na Vercel, a reescrita de `/health` aparece antes do fallback da SPA, evitando
retornar `index.html`. Vite dev e preview aplicam a mesma reescrita.
`/health` e `/health.json` devem retornar `Cache-Control: no-store`.
Em outro provedor estático, configurar a mesma reescrita e os cabeçalhos;
alternativamente, monitorar `/health.json` com cache desativado no provedor.

Este endpoint verifica apenas a disponibilidade do arquivo na hospedagem.
Não executa o Vue, login ou chamadas de API e não valida banco de dados.
Monitorar a API e o Whatszu separadamente; ver
[monitoramento dos backends](../../api-clinic/docs/OBSERVABILIDADE.md#health-check-público).

## Better Stack e verificação

Monitor HTTP GET na URL de produção `/health`, status esperado 200,
timeout sugerido de 10 segundos e verificação TLS ativa. Não usar localhost
em um monitor externo. Se disponível no plano, validar também `status: ok`
no JSON para distinguir a resposta de uma página HTML do fallback.

Executar `npm run build`, conferir `dist/health.json` e testar `/health` com
`npm run dev` e `npm run preview`. Após publicar, executar
`curl -i https://<dominio-do-crm>/health` e conferir status, JSON e ausência
de cache. Testar também `curl -I` e uma rota normal da SPA.
