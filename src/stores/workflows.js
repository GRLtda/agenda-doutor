import { defineStore } from 'pinia'
import workflowsApi from '@/api/workflows'
import { useToast } from 'vue-toastification'

const toast = useToast()

export const useWorkflowsStore = defineStore('workflows', {
    state: () => ({
        workflows: [],
        currentWorkflow: null,
        loading: false,
        error: null,
        nodes: [],
        edges: [],
        nodeTypes: [],
    }),

    actions: {
        async fetchWorkflows(params = {}) {
            this.loading = true
            try {
                const response = await workflowsApi.getWorkflows(params)
                this.workflows = response.data.workflows
            } catch (err) {
                this.error = err.message
                toast.error('Erro ao carregar workflows')
            } finally {
                this.loading = false
            }
        },

        async fetchWorkflowById(id) {
            this.loading = true
            this.currentWorkflow = null
            this.nodes = []
            this.edges = []
            try {
                const response = await workflowsApi.getWorkflowById(id)
                this.currentWorkflow = response.data.workflow
                // Assumindo que o backend retorna nodes e edges dentro do workflow ou separadamente
                // Ajuste conforme a resposta real da API
                this.nodes = response.data.workflow.nodes || []
                this.edges = response.data.workflow.edges || []
            } catch (err) {
                this.error = err.message
                toast.error('Erro ao carregar detalhes do workflow')
            } finally {
                this.loading = false
            }
        },

        async createWorkflow(data) {
            this.loading = true
            try {
                const response = await workflowsApi.createWorkflow(data)
                this.workflows.push(response.data.workflow)
                toast.success('Workflow criado com sucesso')
                return response.data.workflow
            } catch (err) {
                toast.error('Erro ao criar workflow')
                throw err
            } finally {
                this.loading = false
            }
        },

        async updateWorkflow(id, data) {
            try {
                const response = await workflowsApi.updateWorkflow(id, data)
                const index = this.workflows.findIndex(w => w._id === id)
                if (index !== -1) {
                    this.workflows[index] = { ...this.workflows[index], ...response.data.workflow }
                }
                if (this.currentWorkflow && this.currentWorkflow._id === id) {
                    this.currentWorkflow = { ...this.currentWorkflow, ...response.data.workflow }
                }
                toast.success('Workflow atualizado')
            } catch (err) {
                toast.error('Erro ao atualizar workflow')
            }
        },

        async activateWorkflow(id) {
            try {
                const response = await workflowsApi.activateWorkflow(id)
                if (this.currentWorkflow && this.currentWorkflow._id === id) {
                    this.currentWorkflow.isActive = true
                }
                // Update in list as well
                const index = this.workflows.findIndex(w => w._id === id)
                if (index !== -1) {
                    this.workflows[index].isActive = true
                }
                toast.success('Workflow ativado')
            } catch (err) {
                toast.error('Erro ao ativar workflow')
            }
        },

        async deactivateWorkflow(id) {
            try {
                const response = await workflowsApi.deactivateWorkflow(id)
                if (this.currentWorkflow && this.currentWorkflow._id === id) {
                    this.currentWorkflow.isActive = false
                }
                // Update in list as well
                const index = this.workflows.findIndex(w => w._id === id)
                if (index !== -1) {
                    this.workflows[index].isActive = false
                }
                toast.success('Workflow desativado')
            } catch (err) {
                toast.error('Erro ao desativar workflow')
            }
        },

        async deleteWorkflow(id) {
            try {
                await workflowsApi.deleteWorkflow(id)
                this.workflows = this.workflows.filter(w => w._id !== id)
                toast.success('Workflow removido')
            } catch (err) {
                toast.error('Erro ao remover workflow')
            }
        },

        // Node Actions
        async addNode(nodeData) {
            try {
                const payload = {
                    type: nodeData.type,
                    subtype: nodeData.subtype,
                    config: nodeData.config || {},
                    position: nodeData.position
                }

                const response = await workflowsApi.createNode(this.currentWorkflow._id, payload)
                const realNode = response.data.node

                this.nodes.push(realNode)
                return realNode
            } catch (err) {
                console.error('Error creating node:', err)
                toast.error('Erro ao adicionar nó')
                throw err
            }
        },

        async updateNodePosition(nodeId, position) {
            // Find node and update locally
            const node = this.nodes.find(n => n.id === nodeId)
            if (node) {
                node.position = position
                try {
                    await workflowsApi.updateNodePosition(nodeId, position)
                } catch (err) {
                    console.error('Failed to save node position', err)
                }
            }
        },

        // Edge Actions
        async addEdge(edge) {
            this.edges.push(edge)
            try {
                await workflowsApi.createEdge(this.currentWorkflow._id, {
                    sourceNodeId: edge.source,
                    targetNodeId: edge.target
                })
            } catch (err) {
                this.edges = this.edges.filter(e => e.id !== edge.id)
                toast.error('Erro ao conectar nós')
            }
        },

        async removeEdge(edgeId) {
            this.edges = this.edges.filter(e => e.id !== edgeId)
            try {
                await workflowsApi.deleteEdge(edgeId)
            } catch (err) {
                toast.error('Erro ao remover conexão')
            }
        },

        async fetchNodeTypes() {
            try {
                const response = await workflowsApi.getNodeTypes()
                this.nodeTypes = response.data.types
            } catch (err) {
                console.error('Failed to fetch node types', err)
            }
        }
    }
})
