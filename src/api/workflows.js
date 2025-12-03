import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://26.206.226.86:3001',
})

// Interceptor para adicionar token (se necessário, assumindo padrão do projeto)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default {
    // Workflows
    getWorkflows(params = {}) {
        return api.get('/workflows', { params })
    },

    getNodeTypes() {
        return api.get('/workflows/node-types')
    },

    getWorkflowById(id) {
        return api.get(`/workflows/${id}`)
    },

    createWorkflow(data) {
        return api.post('/workflows', data)
    },

    updateWorkflow(id, data) {
        return api.patch(`/workflows/${id}`, data)
    },

    activateWorkflow(id) {
        return api.post(`/workflows/${id}/activate`)
    },

    deactivateWorkflow(id) {
        return api.post(`/workflows/${id}/deactivate`)
    },

    deleteWorkflow(id) {
        return api.delete(`/workflows/${id}`)
    },

    // Nodes
    createNode(workflowId, data) {
        return api.post(`/workflows/${workflowId}/nodes`, data)
    },

    updateNode(nodeId, data) {
        return api.patch(`/workflows/nodes/${nodeId}`, data)
    },

    updateNodePosition(nodeId, position) {
        return api.patch(`/workflows/nodes/${nodeId}/position`, position)
    },

    deleteNode(nodeId) {
        return api.delete(`/workflows/nodes/${nodeId}`)
    },

    // Edges
    createEdge(workflowId, data) {
        return api.post(`/workflows/${workflowId}/edges`, data)
    },

    deleteEdge(edgeId) {
        return api.delete(`/workflows/edges/${edgeId}`)
    },

    // Runs
    getRuns(params = {}) {
        return api.get('/workflows/runs', { params })
    },

    getRunById(runId) {
        return api.get(`/workflows/runs/${runId}`)
    },

    getRunLogs(runId) {
        return api.get(`/workflows/runs/${runId}/logs`)
    },

    cancelRun(runId) {
        return api.post(`/workflows/runs/${runId}/cancel`)
    },

    // Triggers
    triggerWorkflow(data) {
        return api.post('/workflows/trigger', data)
    }
}
