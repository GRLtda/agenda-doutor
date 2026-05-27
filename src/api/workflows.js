import apiClient from './index'

const draftGraphs = new Map()
let activeWorkflowId = null

function unwrap(response) {
  return response.data?.data ?? response.data
}

function saveDraftGraph(workflowId, graph) {
  draftGraphs.set(workflowId, JSON.parse(JSON.stringify(graph)))
}

function loadDraftGraph(workflowId) {
  const draft = draftGraphs.get(workflowId)
  return {
    nodes: Array.isArray(draft?.nodes) ? draft.nodes : [],
    edges: Array.isArray(draft?.edges) ? draft.edges : [],
  }
}

function mapWorkflow(workflow) {
  return {
    _id: workflow.id,
    id: workflow.id,
    name: workflow.name,
    description: workflow.category,
    category: workflow.category,
    isActive: workflow.status === 'ACTIVE',
    status: workflow.status,
    currentVersionId: workflow.currentVersionId,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  }
}

function mapV2NodeToLegacy(node, index) {
  const position = { x: 120 + index * 260, y: 120 }
  if (node.type === 'TRIGGER') {
    return {
      _id: node.id,
      type: 'event',
      subtype: 'event_trigger',
      config: {
        eventType: 'appointment_created',
      },
      position,
    }
  }

  if (node.type === 'SEND_TEMPLATE_MESSAGE') {
    return {
      _id: node.id,
      type: 'action',
      subtype: 'send_message',
      config: {
        templateId: node.config.templateId,
        templateVersionId: node.config.templateVersionId,
        providerInstanceId: node.config.providerInstanceId,
      },
      position,
    }
  }

  if (node.type === 'DELAY') {
    return {
      _id: node.id,
      type: 'wait',
      subtype: 'wait_days',
      config: {
        [node.config.unit === 'days' ? 'days' : node.config.unit === 'hours' ? 'hours' : 'minutes']: node.config.amount,
      },
      position,
    }
  }

  if (node.type === 'CONDITION') {
    return {
      _id: node.id,
      type: 'condition',
      subtype: 'check_variable',
      config: node.config,
      position,
    }
  }

  return {
    _id: node.id,
    type: 'action',
    subtype: 'end',
    config: {},
    position,
  }
}

function mapV2GraphToLegacy(graphDefinition) {
  return {
    nodes: (graphDefinition?.nodes || [])
      .filter((node) => node.type !== 'END')
      .map(mapV2NodeToLegacy),
    edges: (graphDefinition?.edges || [])
      .filter((edge) => edge.to !== 'end')
      .map((edge) => ({
        _id: `${edge.from}-${edge.to}`,
        sourceNodeId: edge.from,
        targetNodeId: edge.to,
        conditionKey: edge.condition,
      })),
  }
}

function toNodeType(type, subtype) {
  if (type === 'event' || subtype === 'event_trigger') return 'TRIGGER'
  if (type === 'wait' || subtype === 'wait_days') return 'DELAY'
  if (type === 'condition' || subtype === 'check_variable') return 'CONDITION'
  if (subtype === 'end') return 'END'
  return 'SEND_TEMPLATE_MESSAGE'
}

async function getPrimaryProviderInstanceId() {
  const response = await apiClient.get('/v2/messaging/providers/instances')
  const instances = unwrap(response) || []
  const connected = instances.find((instance) => instance.status === 'CONNECTED')
  return (connected || instances[0])?.providerInstanceId
}

async function getTemplateVersionId(templateId, fallbackVersionId) {
  if (fallbackVersionId) return fallbackVersionId
  const response = await apiClient.get(`/v2/content/templates/${templateId}`)
  return unwrap(response)?.currentVersionId
}

async function getTemplateVariables(templateId, versionId) {
  if (!templateId || !versionId) return {}
  try {
    const response = await apiClient.get(`/v2/content/templates/${templateId}/versions/${versionId}`)
    return unwrap(response)?.variableSchema || {}
  } catch {
    return {}
  }
}

function conditionFromLegacy(config = {}) {
  if (config.condition) return config.condition
  if (config.variable) {
    return {
      left: config.variable,
      op: config.operator || 'EQ',
      right: config.value,
    }
  }
  return {
    left: 'patient.id',
    op: 'EXISTS',
  }
}

async function legacyNodeToV2(node) {
  const nodeType = toNodeType(node.type, node.subtype)
  if (nodeType === 'TRIGGER') {
    return {
      id: node._id,
      type: 'TRIGGER',
      config: { triggerType: 'EVENT' },
    }
  }

  if (nodeType === 'DELAY') {
    const amount = Number(node.config?.days || node.config?.hours || node.config?.minutes || 1)
    const unit = node.config?.days ? 'days' : node.config?.hours ? 'hours' : 'minutes'
    return {
      id: node._id,
      type: 'DELAY',
      config: { amount, unit },
    }
  }

  if (nodeType === 'CONDITION') {
    return {
      id: node._id,
      type: 'CONDITION',
      config: { condition: conditionFromLegacy(node.config) },
    }
  }

  if (nodeType === 'END') {
    return {
      id: node._id,
      type: 'END',
      config: {},
    }
  }

  const templateId = node.config?.templateId
  const templateVersionId = await getTemplateVersionId(templateId, node.config?.templateVersionId)
  const providerInstanceId = node.config?.providerInstanceId || await getPrimaryProviderInstanceId()
  if (!templateId || !templateVersionId || !providerInstanceId) {
    throw new Error('Configure modelo e conexão WhatsApp antes de ativar o workflow.')
  }

  const variableSchema = await getTemplateVariables(templateId, templateVersionId)
  const variablesMapping = Object.fromEntries(Object.keys(variableSchema).map((key) => [key, key]))
  return {
    id: node._id,
    type: 'SEND_TEMPLATE_MESSAGE',
    config: {
      templateId,
      templateVersionId,
      providerInstanceId,
      recipientPhonePath: node.config?.recipientPhonePath || 'patient.phone',
      variablesMapping,
    },
  }
}

async function draftToV2Graph(workflowId) {
  const draft = loadDraftGraph(workflowId)
  const nodes = await Promise.all(draft.nodes.map(legacyNodeToV2))
  const edges = draft.edges.map((edge) => ({
    from: edge.sourceNodeId || edge.source,
    to: edge.targetNodeId || edge.target,
    condition: edge.conditionKey || undefined,
  }))

  if (!nodes.some((node) => node.type === 'TRIGGER')) {
    throw new Error('Workflow V2 precisa de um gatilho.')
  }

  const edgeSources = new Set(edges.map((edge) => edge.from))
  const sinkNodes = nodes.filter((node) => node.type !== 'END' && !edgeSources.has(node.id))
  if (!nodes.some((node) => node.type === 'END')) {
    nodes.push({ id: 'end', type: 'END', config: {} })
  }
  for (const node of sinkNodes) {
    edges.push({ from: node.id, to: 'end' })
  }

  return { nodes, edges }
}

function createNodeId(type, subtype) {
  return `${type}-${subtype}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultNodeConfig(subtype) {
  if (subtype === 'event_trigger') return { eventType: 'appointment_created' }
  if (subtype === 'wait_days') return { minutes: 5 }
  if (subtype === 'check_variable') return { variable: 'patient.phone', operator: 'EXISTS', value: '' }
  return {}
}

export default {
  async getWorkflows(params = {}) {
    const response = await apiClient.get('/v2/workflows', { params })
    return { data: { workflows: (unwrap(response) || []).map(mapWorkflow) } }
  },

  async getNodeTypes() {
    return {
      data: {
        types: [
          { type: 'event', subtypes: [{ subtype: 'event_trigger', configSchema: [] }] },
          { type: 'action', subtypes: [{ subtype: 'send_message', configSchema: [] }] },
          { type: 'wait', subtypes: [{ subtype: 'wait_days', configSchema: [] }] },
          { type: 'condition', subtypes: [{ subtype: 'check_variable', configSchema: [] }] },
        ],
      },
    }
  },

  async getWorkflowById(id) {
    activeWorkflowId = id
    const workflowResponse = await apiClient.get(`/v2/workflows/${id}`)
    const workflow = mapWorkflow(unwrap(workflowResponse))
    const draft = loadDraftGraph(id)
    if (draft.nodes.length > 0) {
      return { data: { workflow: { ...workflow, nodes: draft.nodes, edges: draft.edges } } }
    }

    if (!workflow.currentVersionId) {
      return { data: { workflow: { ...workflow, nodes: [], edges: [] } } }
    }

    const versionResponse = await apiClient.get(`/v2/workflows/${id}/versions`)
    const currentVersion = (unwrap(versionResponse) || []).find((version) => version.id === workflow.currentVersionId)
    const graph = mapV2GraphToLegacy(currentVersion?.graphDefinition)
    saveDraftGraph(id, graph)
    return { data: { workflow: { ...workflow, ...graph } } }
  },

  async createWorkflow(data) {
    const response = await apiClient.post('/v2/workflows', {
      key: `workflow.${String(data.name || 'novo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}.${Date.now()}`,
      name: data.name,
      category: data.description || 'CUSTOM',
    })
    const workflow = mapWorkflow(unwrap(response).workflow)
    activeWorkflowId = workflow._id
    saveDraftGraph(workflow._id, { nodes: [], edges: [] })
    return { data: { workflow } }
  },

  async updateWorkflow(id, data) {
    const response = await apiClient.patch(`/v2/workflows/${id}`, {
      name: data.name,
      category: data.description,
    })
    return { data: { workflow: mapWorkflow(unwrap(response)) } }
  },

  async activateWorkflow(id) {
    const graphDefinition = await draftToV2Graph(id)
    const triggerNode = graphDefinition.nodes.find((node) => node.type === 'TRIGGER')
    const draft = loadDraftGraph(id)
    const legacyTrigger = draft.nodes.find((node) => node._id === triggerNode?.id)
    const source = legacyTrigger?.config?.eventType || 'appointment_created'

    const versionResponse = await apiClient.post(`/v2/workflows/${id}/versions`, {
      graphDefinition,
      triggerDefinition: {
        type: 'EVENT',
        source,
      },
    })
    const version = unwrap(versionResponse)
    await apiClient.post(`/v2/workflows/${id}/versions/${version.id}/publish`)
    const workflowResponse = await apiClient.get(`/v2/workflows/${id}`)
    return { data: { workflow: mapWorkflow(unwrap(workflowResponse)) } }
  },

  async deactivateWorkflow(id) {
    const response = await apiClient.post(`/v2/workflows/${id}/pause`)
    return { data: { workflow: mapWorkflow(unwrap(response)) } }
  },

  async deleteWorkflow(id) {
    draftGraphs.delete(id)
    await apiClient.patch(`/v2/workflows/${id}`, { status: 'ARCHIVED' })
    return { data: { success: true } }
  },

  async createNode(workflowId, data) {
    const draft = loadDraftGraph(workflowId)
    const node = {
      _id: createNodeId(data.type, data.subtype),
      type: data.type,
      subtype: data.subtype,
      config: defaultNodeConfig(data.subtype),
      position: data.position || { x: 0, y: 0 },
    }
    draft.nodes.push(node)
    saveDraftGraph(workflowId, draft)
    return { data: { node } }
  },

  async updateNode(nodeId, data) {
    const workflowId = activeWorkflowId
    const draft = loadDraftGraph(workflowId)
    const index = draft.nodes.findIndex((node) => node._id === nodeId)
    if (index !== -1) {
      draft.nodes[index] = { ...draft.nodes[index], ...data }
      saveDraftGraph(workflowId, draft)
      return { data: { node: draft.nodes[index] } }
    }
    return { data: { node: data } }
  },

  async updateNodePosition(nodeId, position) {
    const workflowId = activeWorkflowId
    const draft = loadDraftGraph(workflowId)
    const node = draft.nodes.find((entry) => entry._id === nodeId)
    if (node) {
      node.position = position
      saveDraftGraph(workflowId, draft)
    }
    return { data: { success: true } }
  },

  async deleteNode(nodeId) {
    const workflowId = activeWorkflowId
    const draft = loadDraftGraph(workflowId)
    draft.nodes = draft.nodes.filter((node) => node._id !== nodeId)
    draft.edges = draft.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId)
    saveDraftGraph(workflowId, draft)
    return { data: { success: true } }
  },

  async createEdge(workflowId, data) {
    const draft = loadDraftGraph(workflowId)
    const edge = {
      _id: `${data.sourceNodeId}-${data.targetNodeId}`,
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      conditionKey: data.conditionKey,
    }
    draft.edges.push(edge)
    saveDraftGraph(workflowId, draft)
    return { data: { edge } }
  },

  async deleteEdge(edgeId) {
    const workflowId = activeWorkflowId
    const draft = loadDraftGraph(workflowId)
    draft.edges = draft.edges.filter((edge) => edge._id !== edgeId && `${edge.sourceNodeId}-${edge.targetNodeId}` !== edgeId)
    saveDraftGraph(workflowId, draft)
    return { data: { success: true } }
  },

  async getRuns(params = {}) {
    return apiClient.get('/v2/workflows/ops/dlq', { params })
  },

  async getRunById(runId) {
    return apiClient.get(`/v2/workflow-runs/${runId}`)
  },

  async getRunLogs() {
    return { data: { logs: [] } }
  },

  async cancelRun(runId) {
    return apiClient.post(`/v2/workflow-runs/${runId}/cancel`)
  },

  async triggerWorkflow(data) {
    return apiClient.post(`/v2/workflows/${data.workflowId}/trigger/manual`, {
      sourceEventId: data.sourceEventId || `manual:${Date.now()}`,
      context: data.context || {},
      metadata: data.metadata || {},
    })
  },
}
