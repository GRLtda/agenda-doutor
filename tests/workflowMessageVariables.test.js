import { test } from 'node:test'
import assert from 'node:assert/strict'
import { messageSourceEvents, unsupportedMessageVariables } from '../src/utils/workflowMessageVariables.js'
const support = { common: ['paciente', 'clinica'], byEvent: { 'appointment.completed': ['data_consulta', 'nome_medico'] } }
const template = { content: '{paciente} { data_consulta } {nome_medico} {link_termos}', interactive: { footer: '{desconhecida}' } }
test('avisa sobre variáveis condicionais e desconhecidas inclusive em componentes interativos', () => {
  assert.deepEqual(unsupportedMessageVariables(template, ['appointment.completed'], support), ['link_termos', 'desconhecida'])
  assert.deepEqual(unsupportedMessageVariables(template, ['procedure.completed'], support), ['data_consulta', 'nome_medico', 'link_termos', 'desconhecida'])
  assert.deepEqual(unsupportedMessageVariables(template, ['appointment.completed', 'manual.started'], support), ['data_consulta', 'nome_medico', 'link_termos', 'desconhecida'])
})
test('considera somente inícios conectados, sem travar em ciclos', () => {
  const nodes = [{ id: 'start', data: { subtype: 'event_trigger', config: { eventType: 'appointment_completed' } } },
    { id: 'other', data: { subtype: 'event_trigger', config: { eventType: 'manual_started' } } }, { id: 'message' }]
  assert.deepEqual(messageSourceEvents(nodes, [{ source: 'start', target: 'message' }, { source: 'message', target: 'start' }], 'message'), ['appointment.completed'])
})
