import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canConnectSteps, graphSnapshot, simulateWorkflow } from '../src/utils/workflowEditor.js'

test('Ligações recusam ciclos, repetições e ligação na própria etapa', () => {
  const edges = [{ id: 'ab', source: 'a', target: 'b', sourceHandle: 'true' }, { id: 'bc', source: 'b', target: 'c' }]
  assert.equal(canConnectSteps({ source: 'c', target: 'a' }, edges), false)
  assert.equal(canConnectSteps({ source: 'a', target: 'a' }, edges), false)
  assert.equal(canConnectSteps({ source: 'a', target: 'b', sourceHandle: 'true' }, edges), false)
  assert.equal(canConnectSteps({ source: 'a', target: 'b', sourceHandle: 'false' }, edges), true)
  assert.equal(canConnectSteps({ source: 'a', target: 'c' }, edges), true)
})
test('Comparação ignora seleção visual, mas detecta movimento, configuração e ramificação', () => {
  const nodes = [{ id: 'a', position: { x: 5, y: 10 }, data: { config: { days: 3 } } }]
  const edges = [{ id: 'ab', source: 'a', target: 'b', sourceHandle: 'true' }]
  const baseline = graphSnapshot(nodes, edges)
  assert.equal(graphSnapshot(nodes.map(n => ({ ...n, selected: true })), edges), baseline)
  assert.notEqual(graphSnapshot(nodes.map(n => ({ ...n, position: { x: 6, y: 10 } })), edges), baseline)
  assert.notEqual(graphSnapshot(nodes.map(n => ({ ...n, data: { config: { days: 4 } } })), edges), baseline)
  assert.notEqual(graphSnapshot(nodes, edges.map(e => ({ ...e, sourceHandle: 'false' }))), baseline)
})

const node = (id, subtype, config = {}) => ({ id, data: { subtype, config } })
const edge = (source, target, sourceHandle) => ({ source, target, sourceHandle })
test('Simulação percorre os dois resultados e aceita término explícito sem efeitos', () => {
  const nodes = [node('s','event_trigger',{eventType:'appointment_completed'}),node('c','condition_rules',{conditions:[{field:'status',operator:'equals',value:'Realizado'}]}),node('yes','end_flow'),node('no','end_flow')]
  const edges = [edge('s','c'),edge('c','yes','true'),edge('c','no','false')]
  const before = JSON.stringify({nodes,edges})
  const result = simulateWorkflow(nodes,edges)
  assert.equal(result.issues.length,0)
  assert.equal(result.steps.length,4)
  assert.equal(JSON.stringify({nodes,edges}),before)
})
test('Simulação aponta condição incompleta, caminho ausente, mensagem sem modelo e etapa solta', () => {
  const result = simulateWorkflow([node('s','event_trigger',{eventType:'appointment_created'}),node('c','condition_rules'),node('m','send_message'),node('loose','end_flow')],[edge('s','c'),edge('c','m','true')])
  assert(result.issues.some(i=>i.message.includes('Complete a condição')))
  assert(result.issues.some(i=>i.message.includes('Não atende')))
  assert(result.issues.some(i=>i.message.includes('modelo')))
  assert(result.issues.some(i=>i.message.includes('acaba aqui')))
  assert(result.issues.some(i=>i.nodeId==='loose'))
})
test('Simulação termina em ciclos, ligações inválidas e falta de início', () => {
  const result = simulateWorkflow([node('s','event_trigger',{eventType:'manual_started'}),node('w','wait_days',{days:0})],[edge('s','w'),edge('w','s'),edge('w','missing')])
  assert(result.issues.some(i=>i.message.includes('repetir sem parar')))
  assert(result.issues.some(i=>i.message.includes('sem etapa')))
  assert(result.issues.some(i=>i.message.includes('maior que zero')))
  assert(simulateWorkflow([],[]).issues.length)
})

import { layoutWorkflow } from '../src/utils/workflowLayout.js'

test('Reorganização mantém Sim à esquerda, Não à direita e descendentes em seus caminhos', () => {
  const nodes = ['c','no','yes','ne','ye'].map(id=>({...node(id,id==='c'?'condition_rules':'end_flow'),position:{x:0,y:0}}))
  const edges = [edge('c','no','false'),edge('c','yes','true'),edge('no','ne'),edge('yes','ye')]
  const original = JSON.stringify({nodes,edges})
  const result = layoutWorkflow(nodes,edges)
  const pos = id=>result.nodes.find(node=>node.id===id).position
  assert(pos('yes').x < pos('no').x)
  assert(pos('ye').x < pos('ne').x)
  assert(pos('ye').y > pos('yes').y)
  assert.equal(JSON.stringify({nodes,edges}),original)
  assert.deepEqual(layoutWorkflow(nodes,[...edges].reverse()).nodes.map(n=>n.position),result.nodes.map(n=>n.position))
})
test('Reorganização mantém resposta à esquerda e prazo à direita sem duplicar ponto de união', () => {
  const nodes = ['w','t','r','end'].map(id=>({...node(id,'wait_event'),position:{x:0,y:0}}))
  const edges = [edge('w','t','timeout'),edge('w','r','received'),edge('r','end'),edge('t','end')]
  const result = layoutWorkflow(nodes,edges)
  assert(result.nodes.find(n=>n.id==='r').position.x<result.nodes.find(n=>n.id==='t').position.x)
  assert.equal(result.nodes.length,4)
  assert.equal(result.edges,edges)
})
