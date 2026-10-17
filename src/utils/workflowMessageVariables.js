export function templateVariables(template) {
  const variables = new Set()
  function visit(value) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\{\s*([a-zA-Z_][a-zA-Z_0-9]*)\s*\}/g)) variables.add(match[1])
    } else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(template?.content)
  visit(template?.interactive)
  return [...variables]
}

// Usa somente os inícios que podem alcançar a mensagem, incluindo múltiplos caminhos.
export function messageSourceEvents(nodes, edges, nodeId) {
  const pending = [nodeId], visited = new Set(), events = new Set()
  while (pending.length) {
    const id = pending.pop()
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodes.find(item => (item.id || item.key || item._id) === id)
    const data = node?.data || node
    if (data?.subtype === 'event_trigger' || data?.family === 'trigger') {
      events.add((data.config?.eventType || data.v2Type || '').replace('_', '.'))
    }
    for (const edge of edges) if (edge.target === id) pending.push(edge.source)
  }
  return [...events]
}

export function unsupportedMessageVariables(template, events, support) {
  if (!support) return []
  const common = new Set(support.common || [])
  return templateVariables(template).filter(key => !common.has(key) &&
    (!events.length || !events.every(event => support.byEvent?.[event]?.includes(key))))
}
