export const workflowSteps = [
  { type: 'event', subtype: 'event_trigger', category: 'Começar', title: 'Quando começar', description: 'Escolha o que inicia esta automação.' },
  { type: 'action', subtype: 'send_message', category: 'Fazer', title: 'Enviar WhatsApp', description: 'Envie um modelo de mensagem ao paciente.' },
  { type: 'wait', subtype: 'wait_days', category: 'Esperar', title: 'Esperar um período', description: 'Defina quanto tempo esperar antes de continuar.' },
  { type: 'wait', subtype: 'wait_event', category: 'Esperar', title: 'Esperar uma resposta', description: 'Espere uma mensagem ou outra ação do paciente.' },
  { type: 'condition', subtype: 'condition_rules', category: 'Decidir', title: 'Verificar uma condição', description: 'Siga caminhos diferentes para Sim e Não.' },
  { type: 'control', subtype: 'restart_on_event', category: 'Organizar', title: 'Recomeçar quando acontecer', description: 'Reinicie a jornada quando o evento se repetir.' },
  { type: 'control', subtype: 'restart_flow', category: 'Organizar', title: 'Recomeçar este fluxo', description: 'Volte ao início desta automação.' },
  { type: 'control', subtype: 'end_flow', category: 'Organizar', title: 'Encerrar', description: 'Termine a jornada neste ponto.' },
]
export const stepTitle = subtype => workflowSteps.find(step => step.subtype === subtype)?.title || (subtype === 'request_media' ? 'Solicitar uma foto' : 'Configurar etapa')
export function graphSnapshot(nodes, edges) {
  return JSON.stringify({ nodes: nodes.map(node => ({ id: node.id, position: node.position, data: node.data })),
    edges: edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle || null, targetHandle: edge.targetHandle || null })) })
}
export function canConnectSteps(connection, edges) {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  if (edges.some(edge => edge.source === connection.source && edge.target === connection.target && (edge.sourceHandle || null) === (connection.sourceHandle || null))) return false
  const visit = [connection.target], seen = new Set()
  while (visit.length) {
    const current = visit.pop()
    if (current === connection.source) return false
    if (seen.has(current)) continue
    seen.add(current)
    edges.filter(edge => edge.source === current).forEach(edge => visit.push(edge.target))
  }
  return true
}

// Safe rehearsal: explores all branches without sending messages or running actions.
export function simulateWorkflow(nodes, edges) {
  const issues = [], steps = [], visited = new Set(), active = new Set()
  const byId = new Map(nodes.map(node => [node.id, node]))
  const report = (node, message) => issues.push({ nodeId: node?.id, title: node ? stepTitle(node.data.subtype) : 'Fluxo', message })
  const starts = nodes.filter(node => node.data.subtype === 'event_trigger')
  if (!starts.length) report(null, 'Adicione uma etapa “Quando começar”.')
  for (const edge of edges) if (!byId.has(edge.source) || !byId.has(edge.target)) report(null, 'Há uma ligação sem etapa. Remova e conecte novamente.')
  function walk(node) {
    if (active.has(node.id)) { report(node, 'Este caminho volta para uma etapa anterior e pode repetir sem parar.'); return }
    if (visited.has(node.id)) return
    visited.add(node.id); active.add(node.id)
    const { subtype, config = {} } = node.data
    const outgoing = edges.filter(edge => edge.source === node.id).sort((a,b) => (['false','timeout'].includes(a.sourceHandle) ? 1 : 0) - (['false','timeout'].includes(b.sourceHandle) ? 1 : 0))
    let description = 'Continua para a próxima etapa.'
    if (subtype === 'event_trigger') { description = 'A jornada começa quando o evento escolhido acontece.'; if (!config.eventType) report(node, 'Escolha quando esta jornada deve começar.') }
    if (['send_message', 'request_media'].includes(subtype)) { description = 'Envia o modelo de WhatsApp ao paciente.'; if (!config.templateId) report(node, 'Escolha um modelo de mensagem.') }
    if (subtype === 'wait_days') { description = 'Aguarda o período configurado.'; const values = ['months','days','hours','minutes'].map(key => Number(config[key] || 0)); if (values.some(value => !Number.isFinite(value) || value < 0) || !values.some(value => value > 0)) report(node, 'Informe um tempo de espera maior que zero.') }
    if (subtype === 'condition_rules') {
      description = 'Verifica a condição e segue por “Sim, atende” ou “Não atende”.'
      if (!config.conditions?.length || config.conditions.some(condition => !condition.field || !condition.operator || condition.value == null || condition.value === '')) report(node, 'Complete a condição que será verificada.')
      for (const [handle, name] of [['true','Sim, atende'],['false','Não atende']]) if (!outgoing.some(edge => edge.sourceHandle === handle)) report(node, `O caminho “${name}” está sem próxima etapa.`)
    }
    if (subtype === 'wait_event') {
      description = 'Espera uma resposta; se o prazo terminar, segue pelo outro caminho.'
      if (!config.eventType || !(Number(config.timeoutAmount) > 0)) report(node, 'Escolha a resposta esperada e um prazo maior que zero.')
      for (const [handle,name] of [['received','Resposta recebida'],['timeout','Prazo encerrado']]) if (!outgoing.some(edge => edge.sourceHandle === handle)) report(node, `O caminho “${name}” está sem próxima etapa.`)
    }
    if (subtype === 'restart_on_event' && !config.eventType) report(node, 'Escolha o evento que reinicia a jornada.')
    if (subtype === 'end_flow') { description = 'Encerra a jornada.'; if (outgoing.length) report(node, 'Uma etapa de encerrar não deve ter saída.') }
    if (subtype === 'restart_flow') description = 'Volta ao início da jornada.'
    if (!outgoing.length && !['end_flow','restart_flow'].includes(subtype)) report(node, 'O caminho acaba aqui. Conecte outra etapa ou adicione “Encerrar”.')
    if (outgoing.some(edge => byId.get(edge.target)?.data.subtype === 'event_trigger')) report(node, 'O início não deve receber ligações. Use “Recomeçar este fluxo”.')
    steps.push({ nodeId: node.id, title: stepTitle(subtype), description })
    outgoing.forEach(edge => { const next = byId.get(edge.target); if (next) walk(next) })
    active.delete(node.id)
  }
  starts.forEach(walk)
  nodes.filter(node => !visited.has(node.id)).forEach(node => report(node, 'Esta etapa está solta: conecte-a a um caminho que parte do início.'))
  return { issues, steps }
}
