# Documentação da API de Workflows

Esta documentação detalha os endpoints disponíveis no módulo de Workflows, incluindo parâmetros de requisição e formatos de resposta.

**Base URL**: `/workflows` (prefixo geral, verifique a montagem das rotas no `app.js`)

---

## 1. Workflows

Gerenciamento dos fluxos de automação.

### Criar Workflow
Cria um novo workflow vazio.

*   **Método**: `POST`
*   **Rota**: `/`
*   **Body**:
    ```json
    {
      "name": "Nome do Workflow",
      "description": "Descrição opcional"
    }
    ```
*   **Resposta (201)**:
    ```json
    {
      "success": true,
      "workflow": { ... }
    }
    ```

### Listar Workflows
Lista os workflows da clínica.

*   **Método**: `GET`
*   **Rota**: `/`
*   **Query Params**:
    *   `isActive`: `true` ou `false` (opcional)
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "workflows": [ ... ]
    }
    ```

### Buscar Workflow por ID
Retorna os detalhes de um workflow, incluindo seus Nodes e Edges (se implementado no service).

*   **Método**: `GET`
*   **Rota**: `/:id`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "workflow": { ... }
    }
    ```

### Atualizar Workflow
Atualiza nome ou descrição.

*   **Método**: `PATCH`
*   **Rota**: `/:id`
*   **Body**:
    ```json
    {
      "name": "Novo Nome",
      "description": "Nova Descrição"
    }
    ```
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "workflow": { ... }
    }
    ```

### Ativar Workflow
Torna o workflow ativo para receber disparos.

*   **Método**: `POST`
*   **Rota**: `/:id/activate`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "workflow": { ..., "isActive": true }
    }
    ```

### Desativar Workflow
Pausa o workflow.

*   **Método**: `POST`
*   **Rota**: `/:id/deactivate`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "workflow": { ..., "isActive": false }
    }
    ```

### Deletar Workflow
Remove um workflow (soft delete ou hard delete dependendo da implementação).

*   **Método**: `DELETE`
*   **Rota**: `/:id`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "message": "Workflow deletado"
    }
    ```

---

## 2. Nodes (Nós)

Gerenciamento dos passos do workflow.

### Criar Node
Adiciona um novo nó ao workflow.

*   **Método**: `POST`
*   **Rota**: `/:workflowId/nodes`
*   **Body**:
    ```json
    {
      "type": "event" | "action" | "condition" | "wait",
      "subtype": "ex: send_message, wait_days",
      "config": { ... }, // Objeto de configuração específico do tipo
      "position": { "x": 100, "y": 200 }
    }
    ```
*   **Resposta (201)**:
    ```json
    {
      "success": true,
      "node": { ... }
    }
    ```

### Atualizar Node
Atualiza configurações de um nó.

*   **Método**: `PATCH`
*   **Rota**: `/nodes/:nodeId`
*   **Body**:
    ```json
    {
      "config": { ... },
      "subtype": "..."
    }
    ```
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "node": { ... }
    }
    ```

### Atualizar Posição do Node
Usado pelo editor visual para salvar a posição (drag & drop).

*   **Método**: `PATCH`
*   **Rota**: `/nodes/:nodeId/position`
*   **Body**:
    ```json
    {
      "x": 150,
      "y": 300
    }
    ```
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "node": { ... }
    }
    ```

### Deletar Node
Remove um nó do workflow.

*   **Método**: `DELETE`
*   **Rota**: `/nodes/:nodeId`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "message": "Node deletado"
    }
    ```

---

## 3. Edges (Conexões)

Gerenciamento das ligações entre os nós.

### Criar Edge
Conecta dois nós.

*   **Método**: `POST`
*   **Rota**: `/:workflowId/edges`
*   **Body**:
    ```json
    {
      "sourceNodeId": "ID_DO_NO_ORIGEM",
      "targetNodeId": "ID_DO_NO_DESTINO",
      "conditionKey": "true" | "false" // Opcional, usado para saídas de condições
    }
    ```
*   **Resposta (201)**:
    ```json
    {
      "success": true,
      "edge": { ... }
    }
    ```

### Deletar Edge
Remove uma conexão.

*   **Método**: `DELETE`
*   **Rota**: `/edges/:edgeId`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "message": "Edge deletada"
    }
    ```

---

## 4. Runs (Execuções)

Monitoramento e histórico de execuções.

### Listar Runs
Lista execuções com filtros.

*   **Método**: `GET`
*   **Rota**: `/runs`
*   **Query Params**:
    *   `workflowId`: ID do workflow
    *   `patientId`: ID do paciente
    *   `status`: `pending`, `running`, `completed`, `failed`
    *   `limit`: Limite de registros (padrão 50)
    *   `skip`: Paginação
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "runs": [ ... ]
    }
    ```

### Buscar Run por ID
Detalhes de uma execução específica, incluindo o status de cada nó (NodeRuns).

*   **Método**: `GET`
*   **Rota**: `/runs/:runId`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "run": { ... },
      "nodeRuns": [ ... ] // Lista de execuções dos nós (status, resultado, erro)
    }
    ```

### Buscar Logs de um Run
Logs detalhados de execução.

*   **Método**: `GET`
*   **Rota**: `/runs/:runId/logs`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "logs": [ ... ]
    }
    ```

### Cancelar Run
Interrompe uma execução em andamento.

*   **Método**: `POST`
*   **Rota**: `/runs/:runId/cancel`
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "message": "Run cancelado"
    }
    ```

---

## 5. Triggers (Disparos)

### Disparar Workflow Manualmente
Simula um evento para iniciar workflows.

*   **Método**: `POST`
*   **Rota**: `/trigger`
*   **Body**:
    ```json
    {
      "eventType": "procedure_completed",
      "eventData": { "procedure_code": "BOTOX" },
      "patientId": "ID_DO_PACIENTE",
      "correlation": { "someId": "123" }
    }
    ```
*   **Resposta (200)**:
    ```json
    {
      "success": true,
      "triggered": 1, // Quantidade de workflows iniciados
      "runs": [ ... ]
    }
    ```
