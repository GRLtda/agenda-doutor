# Secretaria IA - Base de conhecimento: dados mockados e pendencias

Esta tela ja consome `GET /v2/ai-secretary/knowledge`, mas alguns dados do layout ainda nao existem de forma confiavel na API atual e foram derivados ou simulados no frontend.

## Dados derivados ou mockados

- `category`: usa `item.category` quando vier da API. Se nao vier, a tela tenta inferir por titulo, tipo e tags.
- `status`: usa `item.status`, `item.reviewStatus` ou `item.needsReview`. Se nada vier, considera ativo; itens com mais de 120 dias entram como revisao.
- `updatedBy`: usa `updatedBy.name`, `author.name` ou `metadata.updatedBy`. Se nao vier, mostra `Equipe`.
- `usage30d`: usa `item.usage30d` ou `item.analytics.usage30d`. Se nao vier, gera um numero estavel local apenas para preencher o card.
- `successRate30d`: usa `item.successRate30d` ou `item.analytics.successRate30d`. Se nao vier, gera percentual local.
- `positiveFeedback30d`: usa `item.positiveFeedback30d` ou `item.analytics.positiveFeedback30d`. Se nao vier, gera numero local.
- Paginacao da tabela: esta visual/client-side. A store hoje trata a resposta de conhecimento como array simples.
- Acoes `Editar`, `Duplicar`, `Mais` e `Ver item completo`: ainda estao visuais na tela de detalhe.

## Campos recomendados para integrar

- `id` ou `_id`
- `title`
- `content`
- `type`
- `category`
- `status`
- `tags`
- `updatedAt`
- `updatedBy`
- `analytics.usage30d`
- `analytics.successRate30d`
- `analytics.positiveFeedback30d`

## Melhorias de API recomendadas

- Retornar paginacao em `GET /v2/ai-secretary/knowledge`: `items`, `total`, `page`, `limit`, `pages`.
- Permitir filtros server-side por busca, categoria, tipo e status.
- Criar endpoint de duplicacao de item.
- Criar endpoint de historico/auditoria do item.
- Expor websocket ou SSE para atualizar a base em tempo real quando outro usuario criar, editar ou remover conhecimento.
