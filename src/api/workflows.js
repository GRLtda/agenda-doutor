import apiClient from './index'

export default {
    getWorkflows(params = {}) {
        return apiClient.get('/v2/workflows/definitions', { params })
    },

    getNodeTypes() {
        return apiClient.get('/v2/workflows/catalog')
    },

    createFromCatalog(templateKey, templateId) {
        return apiClient.post(`/v2/workflows/catalog/${encodeURIComponent(templateKey)}/instantiate`, { templateId })
    },

    getWorkflowById(id) {
        return apiClient.get(`/v2/workflows/definitions/${id}`)
    },

    createWorkflow(data) {
        return apiClient.post('/v2/workflows/definitions', data)
    },

    updateWorkflow(id, data) {
        return apiClient.patch(`/v2/workflows/definitions/${id}/draft`, data)
    },

    activateWorkflow(id) {
        return apiClient.post(`/v2/workflows/definitions/${id}/publish`)
    },

    deactivateWorkflow(id, deactivationMode = 'cancel_all') {
        return apiClient.post(`/v2/workflows/definitions/${id}/deactivate`, { deactivationMode })
    },

    setWorkflowActive(id) { return apiClient.post(`/v2/workflows/definitions/${id}/activate`) },
    bulkAction(ids, action, options = {}) { return apiClient.post('/v2/workflows/definitions/bulk', { ids, action, ...options }) },
    cancelDefinitionRuns(id) { return apiClient.post(`/v2/workflows/definitions/${id}/runs/cancel`) },
    deleteWorkflow(id) {
        return apiClient.delete(`/v2/workflows/definitions/${id}`)
    },

    // Nodes
    createNode(workflowId, data) {
        return apiClient.patch(`/v2/workflows/definitions/${workflowId}/draft`, data)
    },

    updateNode(nodeId, data) {
        return apiClient.patch(`/v2/workflows/definitions/${nodeId}/draft`, data)
    },

    updateNodePosition(nodeId, position) {
        return Promise.resolve({ data: { nodeId, position } })
    },

    deleteNode(nodeId) {
        return Promise.resolve({ data: { nodeId } })
    },

    // Edges
    createEdge(workflowId, data) {
        return apiClient.patch(`/v2/workflows/definitions/${workflowId}/draft`, data)
    },

    deleteEdge(edgeId) {
        return Promise.resolve({ data: { edgeId } })
    },

    // Runs
    getRuns(params = {}) {
        return apiClient.get('/v2/workflows/runs', { params })
    },

    getRunById(runId) {
        return apiClient.get(`/v2/workflows/runs/${runId}`)
    },

    getRunLogs(runId) {
        return apiClient.get(`/workflows/runs/${runId}/logs`)
    },

    cancelRun(runId) {
        return apiClient.post(`/v2/workflows/runs/${runId}/cancel`)
    },

    triggerWorkflow(data) {
        return apiClient.post('/v2/workflows/events', data)
    }
}
