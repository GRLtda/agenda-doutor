import apiClient from './index'

export default {
    // Workflows
    getWorkflows(params = {}) {
        return apiClient.get('/workflows', { params })
    },

    getNodeTypes() {
        return apiClient.get('/workflows/node-types')
    },

    getWorkflowById(id) {
        return apiClient.get(`/workflows/${id}`)
    },

    createWorkflow(data) {
        return apiClient.post('/workflows', data)
    },

    updateWorkflow(id, data) {
        return apiClient.patch(`/workflows/${id}`, data)
    },

    activateWorkflow(id) {
        return apiClient.post(`/workflows/${id}/activate`)
    },

    deactivateWorkflow(id) {
        return apiClient.post(`/workflows/${id}/deactivate`)
    },

    deleteWorkflow(id) {
        return apiClient.delete(`/workflows/${id}`)
    },

    // Nodes
    createNode(workflowId, data) {
        return apiClient.post(`/workflows/${workflowId}/nodes`, data)
    },

    updateNode(nodeId, data) {
        return apiClient.patch(`/workflows/nodes/${nodeId}`, data)
    },

    updateNodePosition(nodeId, position) {
        return apiClient.patch(`/workflows/nodes/${nodeId}/position`, position)
    },

    deleteNode(nodeId) {
        return apiClient.delete(`/workflows/nodes/${nodeId}`)
    },

    // Edges
    createEdge(workflowId, data) {
        return apiClient.post(`/workflows/${workflowId}/edges`, data)
    },

    deleteEdge(edgeId) {
        return apiClient.delete(`/workflows/edges/${edgeId}`)
    },

    // Runs
    getRuns(params = {}) {
        return apiClient.get('/workflows/runs', { params })
    },

    getRunById(runId) {
        return apiClient.get(`/workflows/runs/${runId}`)
    },

    getRunLogs(runId) {
        return apiClient.get(`/workflows/runs/${runId}/logs`)
    },

    cancelRun(runId) {
        return apiClient.post(`/workflows/runs/${runId}/cancel`)
    },

    // Triggers
    triggerWorkflow(data) {
        return apiClient.post('/workflows/trigger', data)
    }
}
