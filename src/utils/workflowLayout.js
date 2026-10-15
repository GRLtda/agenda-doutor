import dagre from 'dagre'

export const WORKFLOW_NODE_WIDTH = 248
export function layoutWorkflow(nodes, edges) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 90 })
  nodes.forEach(node => graph.setNode(node.id, { width: WORKFLOW_NODE_WIDTH, height: Math.max(150, node.dimensions?.height || 0) }))
  const ordered = [...edges].sort((a,b) => `${a.source}:${a.sourceHandle || ''}:${a.target}`.localeCompare(`${b.source}:${b.sourceHandle || ''}:${b.target}`))
  ordered.forEach(edge => { if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source,edge.target) })
  dagre.layout(graph)
  const positions = new Map(nodes.map(node => { const p = graph.node(node.id); return [node.id,{ x:p.x - WORKFLOW_NODE_WIDTH/2, y:p.y-p.height/2 }] }))
  function descendants(id) {
    const result = new Set(), queue = [id]
    while(queue.length) { const next = queue.pop(); if (result.has(next)) continue; result.add(next); edges.filter(edge=>edge.source===next).forEach(edge=>queue.push(edge.target)) }
    return result
  }
  // Move complete exclusive branches together, keeping merge points shared.
  for (const node of [...nodes].sort((a,b)=>positions.get(a.id).y-positions.get(b.id).y)) {
    const outgoing = edges.filter(edge=>edge.source===node.id)
    const left = outgoing.find(edge=>['true','received'].includes(edge.sourceHandle))
    const right = outgoing.find(edge=>['false','timeout'].includes(edge.sourceHandle))
    if (!left || !right || left.target===right.target || !positions.has(left.target) || !positions.has(right.target)) continue
    const lp = positions.get(left.target), rp = positions.get(right.target)
    if (lp.x <= rp.x) continue
    const delta = lp.x-rp.x, lset=descendants(left.target), rset=descendants(right.target)
    for (const id of lset) if (!rset.has(id) && positions.has(id)) positions.get(id).x -= delta
    for (const id of rset) if (!lset.has(id) && positions.has(id)) positions.get(id).x += delta
  }
  // Enforce horizontal clearance even around disconnected or merged branches.
  const rows = new Map()
  nodes.forEach(node=>{ const y=positions.get(node.id).y; if(!rows.has(y))rows.set(y,[]);rows.get(y).push(node.id) })
  for(const row of rows.values()) {
    row.sort((a,b)=>positions.get(a).x-positions.get(b).x)
    for(let i=1;i<row.length;i++) positions.get(row[i]).x=Math.max(positions.get(row[i]).x,positions.get(row[i-1]).x+WORKFLOW_NODE_WIDTH+80)
  }
  return { nodes:nodes.map(node=>({...node,position:positions.get(node.id),sourcePosition:'bottom',targetPosition:'top'})),edges }
}
