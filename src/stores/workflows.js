import { defineStore } from 'pinia'
import workflowsApi from '@/api/workflows'
import { useToast } from 'vue-toastification'

const toast = useToast()
let draftSaveQueue = Promise.resolve()
let draftSaveSequence = 0

function responseData(response) {
    return response?.data?.data || response?.data || {}
}

function mapDefinition(definition) {
    if (!definition) return null
    return {
        ...definition,
        isActive: definition.status === 'active',
        nodes: definition.draftGraph?.nodes || [],
        edges: definition.draftGraph?.edges || [],
    }
}

function toUiEventType(type) {
    const map = {
        'appointment.created': 'appointment_created',
        'appointment.updated': 'appointment_updated',
        'appointment.confirmed': 'appointment_confirmed',
        'appointment.completed': 'appointment_completed',
        'appointment.canceled': 'appointment_canceled',
        'appointment.rescheduled': 'appointment_rescheduled',
        'procedure.completed': 'procedure_completed',
        'whatsapp.inbound': 'whatsapp_inbound',
        'whatsapp.button.clicked': 'whatsapp_button_clicked',
        'whatsapp.list.selected': 'whatsapp_list_selected',
        'anamnesis.completed': 'anamnesis_completed',
        'consent.signed': 'consent_signed',
        'manual.started': 'manual_started',
    }
    return map[type] || type
}

function toV2EventType(type) {
    const map = {
        appointment_created: 'appointment.created',
        appointment_updated: 'appointment.updated',
        appointment_confirmed: 'appointment.confirmed',
        appointment_completed: 'appointment.completed',
        appointment_canceled: 'appointment.canceled',
        appointment_rescheduled: 'appointment.rescheduled',
        procedure_completed: 'procedure.completed',
        whatsapp_inbound: 'whatsapp.inbound',
        whatsapp_button_clicked: 'whatsapp.button.clicked',
        whatsapp_list_selected: 'whatsapp.list.selected',
        anamnesis_completed: 'anamnesis.completed',
        consent_signed: 'consent.signed',
        manual_started: 'manual.started',
    }
    return map[type] || type
}

function uiSubtypeFromV2(node) {
    if (node.family === 'trigger') return 'event_trigger'
    if (node.family === 'action' && node.type === 'send.whatsapp_template') return 'send_message'
    if (node.family === 'action' && node.type === 'request.media') return 'request_media'
    if (node.family === 'wait' && node.type === 'duration') return 'wait_days'
    if (node.family === 'wait' && node.type === 'for_event') return 'wait_event'
    if (node.family === 'condition') return 'condition_rules'
    if (node.family === 'control' && node.type === 'restart') return 'restart_flow'
    if (node.family === 'control' && node.type === 'restart_on_event') return 'restart_on_event'
    if (node.family === 'control' && node.type === 'end') return 'end_flow'
    return node.type
}

function uiTypeFromFamily(family) {
    if (family === 'trigger') return 'event'
    return family
}

function configFromV2(node) {
    const config = { ...(node.config || {}) }

    if (node.family === 'trigger') {
        config.eventType = toUiEventType(node.type)
        config.procedure_codes = config.procedureIds || []
    }

    if (node.family === 'control' && node.type === 'restart_on_event') {
        config.eventType = toUiEventType(String(config.eventType || 'procedure.completed'))
        config.procedure_codes = config.procedureIds || []
    }

    if (node.family === 'wait' && node.type === 'duration') {
        const amount = Number(config.amount || 1)
        if (config.unit === 'minutes') config.minutes = amount
        else if (config.unit === 'hours') config.hours = amount
        else if (config.unit === 'months') config.months = amount
        else config.days = amount
    }

    return config
}

function nodeFromV2(node) {
    return {
        _id: node.key,
        key: node.key,
        type: uiTypeFromFamily(node.family),
        family: node.family,
        subtype: uiSubtypeFromV2(node),
        v2Type: node.type,
        name: node.label,
        label: node.label,
        config: configFromV2(node),
        position: node.position || { x: 0, y: 0 },
    }
}

function edgeFromV2(edge) {
    return {
        _id: edge.key || `e-${edge.source}-${edge.target}`,
        id: edge.key || `e-${edge.source}-${edge.target}`,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        conditionKey: edge.sourceHandle,
        sourceHandle: edge.sourceHandle,
    }
}

function defaultConfigForSubtype(subtype) {
    if (subtype === 'event_trigger') return { eventType: 'procedure_completed', procedure_codes: [] }
    if (subtype === 'send_message') return { templateId: '' }
    if (subtype === 'request_media') return { templateId: '', timeoutAmount: 3, timeoutUnit: 'days' }
    if (subtype === 'wait_days') return { days: 1 }
    if (subtype === 'wait_event') return { eventType: 'whatsapp_inbound', timeoutAmount: 3, timeoutUnit: 'days' }
    if (subtype === 'restart_on_event') return { eventType: 'procedure_completed', procedure_codes: [] }
    if (subtype === 'condition_rules') {
        return {
            preset: 'appointment_status',
            logic: 'AND',
            conditions: [{ field: 'event.data.status', operator: 'equals', value: 'Realizado' }],
        }
    }
    return {}
}

function nodeToV2(node) {
    const subtype = node.subtype
    const config = { ...(node.config || {}) }
    const key = node.key || node._id

    if (subtype === 'event_trigger') {
        return {
            key,
            family: 'trigger',
            type: toV2EventType(config.eventType || 'manual_started'),
            label: node.label || node.name || 'Gatilho',
            config: {
                ...config,
                procedureIds: config.procedure_codes || config.procedureIds || [],
            },
            position: node.position,
        }
    }

    if (subtype === 'send_message') {
        return {
            key,
            family: 'action',
            type: 'send.whatsapp_template',
            label: node.label || node.name || 'Enviar WhatsApp',
            config,
            position: node.position,
        }
    }

    if (subtype === 'request_media') {
        return {
            key,
            family: 'action',
            type: 'request.media',
            label: node.label || node.name || 'Pedir foto',
            config,
            position: node.position,
        }
    }

    if (subtype === 'wait_days') {
        const amount = Number(config.months || config.days || config.hours || config.minutes || config.amount || 1)
        const unit = config.months ? 'months' : config.hours ? 'hours' : config.minutes ? 'minutes' : (config.unit || 'days')
        return {
            key,
            family: 'wait',
            type: 'duration',
            label: node.label || node.name || 'Esperar tempo',
            config: { ...config, amount, unit },
            position: node.position,
        }
    }

    if (subtype === 'wait_event') {
        return {
            key,
            family: 'wait',
            type: 'for_event',
            label: node.label || node.name || 'Esperar evento',
            config: {
                ...config,
                eventType: toV2EventType(config.eventType || 'whatsapp_inbound'),
            },
            position: node.position,
        }
    }

    if (subtype === 'condition_rules') {
        return {
            key,
            family: 'condition',
            type: 'rules.match',
            label: node.label || node.name || 'Filtro',
            config,
            position: node.position,
        }
    }

    if (subtype === 'restart_flow') {
        return { key, family: 'control', type: 'restart', label: node.label || 'Recomecar fluxo', config, position: node.position }
    }

    if (subtype === 'restart_on_event') {
        return {
            key,
            family: 'control',
            type: 'restart_on_event',
            label: node.label || 'Reiniciar se acontecer',
            config: {
                ...config,
                eventType: toV2EventType(config.eventType || 'procedure_completed'),
                procedureIds: config.procedure_codes || config.procedureIds || [],
            },
            position: node.position,
        }
    }

    if (subtype === 'end_flow') {
        return { key, family: 'control', type: 'end', label: node.label || 'Finalizar fluxo', config, position: node.position }
    }

    return {
        key,
        family: node.family || node.type || 'action',
        type: node.v2Type || subtype,
        label: node.label || node.name,
        config,
        position: node.position,
    }
}

function edgeToV2(edge) {
    return {
        key: edge.id || edge._id || `${edge.source}-${edge.sourceHandle || 'default'}-${edge.target}`,
        source: edge.source || edge.sourceNodeId,
        target: edge.target || edge.targetNodeId,
        sourceHandle: edge.sourceHandle || edge.conditionKey,
    }
}

function makeNodeKey(subtype) {
    return `${subtype}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const useWorkflowsStore = defineStore('workflows', {
    state: () => ({
        workflows: [],
        currentWorkflow: null,
        loading: false,
        error: null,
        nodes: [],
        edges: [],
        nodeTypes: [],
        catalog: null,
    }),

    actions: {
        buildDraftGraph() {
            return {
                nodes: this.nodes.map(nodeToV2),
                edges: this.edges.map(edgeToV2).filter(edge => edge.source && edge.target),
            }
        },

        async saveDraftGraph() {
            if (!this.currentWorkflow?._id) return
            const graph = this.buildDraftGraph()
            const workflowId = this.currentWorkflow._id
            const sequence = ++draftSaveSequence

            const save = async () => {
                const response = await workflowsApi.updateWorkflow(workflowId, { graph })
                const definition = mapDefinition(responseData(response).definition)
                if (definition && sequence === draftSaveSequence) {
                    this.currentWorkflow = definition
                    this.nodes = (definition.draftGraph?.nodes || []).map(nodeFromV2)
                    this.edges = (definition.draftGraph?.edges || []).map(edgeFromV2)
                }
                return definition
            }

            draftSaveQueue = draftSaveQueue.catch(() => {}).then(save)
            return draftSaveQueue
        },

        async fetchWorkflows(params = {}) {
            this.loading = true
            try {
                const response = await workflowsApi.getWorkflows(params)
                const data = responseData(response)
                this.workflows = (data.definitions || data.workflows || []).map(mapDefinition)
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
                const definition = mapDefinition(responseData(response).definition || responseData(response).workflow)
                this.currentWorkflow = definition
                this.nodes = (definition?.draftGraph?.nodes || []).map(nodeFromV2)
                this.edges = (definition?.draftGraph?.edges || []).map(edgeFromV2)
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
                const response = await workflowsApi.createWorkflow({
                    name: data.name,
                    description: data.description,
                    graph: data.graph || { nodes: [], edges: [] },
                    runPolicy: data.runPolicy || {
                        singleActivePerSubject: 'allow_parallel',
                        interruptOn: [],
                    },
                })
                const workflow = mapDefinition(responseData(response).definition)
                this.workflows.push(workflow)
                toast.success('Workflow criado com sucesso')
                return workflow
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
                const workflow = mapDefinition(responseData(response).definition || responseData(response).workflow)
                const index = this.workflows.findIndex(w => w._id === id)
                if (index !== -1 && workflow) this.workflows[index] = { ...this.workflows[index], ...workflow }
                if (this.currentWorkflow && this.currentWorkflow._id === id && workflow) {
                    this.currentWorkflow = { ...this.currentWorkflow, ...workflow }
                }
                toast.success('Workflow atualizado')
            } catch (err) {
                toast.error('Erro ao atualizar workflow')
                throw err
            }
        },

        async activateWorkflow(id) {
            try {
                const response = await workflowsApi.activateWorkflow(id)
                const definition = mapDefinition(responseData(response).definition)
                if (this.currentWorkflow && this.currentWorkflow._id === id) {
                    this.currentWorkflow = { ...this.currentWorkflow, ...(definition || {}), isActive: true, status: 'active' }
                }
                const index = this.workflows.findIndex(w => w._id === id)
                if (index !== -1) this.workflows[index] = { ...this.workflows[index], ...(definition || {}), isActive: true, status: 'active' }
                toast.success('Workflow publicado')
            } catch (err) {
                toast.error('Erro ao publicar workflow')
                throw err
            }
        },

        async deactivateWorkflow(id) {
            toast.info('No v2, edite o rascunho e publique uma nova versao quando estiver pronto.')
            return this.fetchWorkflowById(id)
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

        async addNode(nodeData) {
            const key = makeNodeKey(nodeData.subtype)
            const node = {
                _id: key,
                key,
                type: nodeData.type,
                family: nodeData.type === 'event' ? 'trigger' : nodeData.type,
                subtype: nodeData.subtype,
                config: { ...defaultConfigForSubtype(nodeData.subtype), ...(nodeData.config || {}) },
                position: nodeData.position,
                label: nodeData.label,
            }

            this.nodes.push(node)
            try {
                await this.saveDraftGraph()
                return node
            } catch (err) {
                this.nodes = this.nodes.filter(n => n._id !== key)
                toast.error('Erro ao adicionar no')
                throw err
            }
        },

        async updateNodePosition(nodeId, position) {
            const node = this.nodes.find(n => n._id === nodeId)
            if (!node) return
            node.position = position
            try {
                await this.saveDraftGraph()
            } catch (err) {
                console.error('Failed to save node position', err)
            }
        },

        async updateNode(nodeId, data) {
            const index = this.nodes.findIndex(n => n._id === nodeId)
            if (index === -1) return null
            this.nodes[index] = { ...this.nodes[index], ...data }
            try {
                await this.saveDraftGraph()
                toast.success('No atualizado com sucesso')
                return this.nodes[index]
            } catch (err) {
                toast.error('Erro ao atualizar no')
                throw err
            }
        },

        async deleteNode(nodeId) {
            const oldNodes = [...this.nodes]
            const oldEdges = [...this.edges]
            this.nodes = this.nodes.filter(n => n._id !== nodeId)
            this.edges = this.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId && e.source !== nodeId && e.target !== nodeId)
            try {
                await this.saveDraftGraph()
                toast.success('No removido com sucesso')
            } catch (err) {
                this.nodes = oldNodes
                this.edges = oldEdges
                toast.error('Erro ao remover no')
                throw err
            }
        },

        async addEdge(edge) {
            const newEdge = {
                ...edge,
                _id: edge.id,
                sourceNodeId: edge.source,
                targetNodeId: edge.target,
                conditionKey: edge.sourceHandle,
            }
            this.edges.push(newEdge)
            try {
                await this.saveDraftGraph()
            } catch (err) {
                this.edges = this.edges.filter(e => e.id !== edge.id)
                toast.error('Erro ao conectar nos')
            }
        },

        async removeEdge(edgeId) {
            const oldEdges = [...this.edges]
            this.edges = this.edges.filter(e => e.id !== edgeId && e._id !== edgeId)
            try {
                await this.saveDraftGraph()
            } catch (err) {
                this.edges = oldEdges
                toast.error('Erro ao remover conexao')
            }
        },

        async fetchNodeTypes() {
            try {
                const response = await workflowsApi.getNodeTypes()
                const catalog = responseData(response)
                this.catalog = catalog
                this.nodeTypes = catalog
            } catch (err) {
                console.error('Failed to fetch node types', err)
            }
        }
    }
})
