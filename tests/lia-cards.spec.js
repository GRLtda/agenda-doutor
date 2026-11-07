import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LiaAnalyticsCard from '@/components/lia/LiaAnalyticsCard.vue'
import LiaActionConfirmationCard from '@/components/lia/LiaActionConfirmationCard.vue'

it('ranking monetário converte centavos e mostra total do período separadamente', () => {
  const wrapper = mount(LiaAnalyticsCard, { props: { card: { type: 'ranking', title: 'Recebido', unit: 'BRL_CENTS', period: { label: 'all_time' }, total: 250000, items: [{ id: 'one', name: 'Paciente fictício', value: 123456 }] } } })
  expect(wrapper.text()).toContain('1.234,56'); expect(wrapper.text()).toContain('2.500,00'); expect(wrapper.text()).toContain('Todo o histórico')
})
it('coorte mostra a última realização, total e indicação de mais resultados', () => {
  const wrapper = mount(LiaAnalyticsCard, { props: { card: { type: 'patient_list', title: 'Botox', value: 21, hasMore: true, items: [{ id: 'one', name: 'Paciente fictício', lastProcedureAt: '2026-06-01T15:00:00Z' }] } } })
  expect(wrapper.text()).toContain('01/06/2026'); expect(wrapper.text()).toContain('21 pacientes'); expect(wrapper.text()).toContain('Mostrando 1 de 21')
})
it.each([['processing', 'processamento'], ['failed', 'Não foi possível concluir'], ['cancelled', 'Ação cancelada']])('card distingue estado %s', (status, label) => {
  const wrapper = mount(LiaActionConfirmationCard, { props: { confirmation: { status } } })
  expect(wrapper.text()).toContain(label)
  if (status !== 'cancelled') expect(wrapper.text()).not.toContain('Ação cancelada')
})
it('card usa o fuso da clínica, e não o do navegador', () => {
  const wrapper = mount(LiaActionConfirmationCard, { props: { confirmation: { type: 'create_appointment', status: 'pending', startAt: '2030-01-15T17:00:00Z', timezone: 'America/Sao_Paulo' } } })
  expect(wrapper.text()).toContain('14:00'); expect(wrapper.text()).toContain('America/Sao_Paulo')
})
it('permite verificar uma ação cujo processamento expirou', async () => {
  const wrapper = mount(LiaActionConfirmationCard, { props: { confirmation: { status: 'processing', recoverable: true } } })
  await wrapper.get('button').trigger('click'); expect(wrapper.emitted('confirm')).toHaveLength(1)
})

it('gráfico permite explorar valores por teclado e mantém lista acessível dos pontos reais', async () => {
  const wrapper = mount(LiaAnalyticsCard, { props: { card: { type: 'ranking', title: 'Atendimentos', total: 30, items: [{ name: '2026-11-04', value: 20 }, { name: '2026-11-01', value: 10 }] } } })
  const points = wrapper.findAll('svg g[tabindex="0"]')
  expect(points).toHaveLength(2)
  expect(points[0].attributes('aria-label')).toBe('2026-11-01: 10')
  await points[0].trigger('focus')
  expect(wrapper.get('.chart-highlight').text()).toContain('2026-11-01')
  expect(wrapper.get('.chart-highlight').text()).toContain('10')
  expect(wrapper.findAll('.chart-details li')).toHaveLength(2)
  wrapper.unmount()
})

it('diferença monetária da comparação também converte centavos para reais', () => {
  const wrapper = mount(LiaAnalyticsCard, { props: { card: { type: 'metric', title: 'Recebimentos', unit: 'BRL_CENTS', comparison: { current: 250000, previous: 200000, absoluteChange: 50000, percentChange: 25 } } } })
  expect(wrapper.get('.change').text()).toContain('500,00 a mais')
  expect(wrapper.get('.comparison-plot').text()).toContain('2.000,00')
  expect(wrapper.get('.metric-value').text()).toContain('2.500,00')
  wrapper.unmount()
})

it('cancelamento de atendimento continua exigindo confirmação explícita e usa rótulo correto', async () => {
  const wrapper = mount(LiaActionConfirmationCard, { props: { confirmation: { type: 'cancel_appointment', status: 'pending' } } })
  expect(wrapper.emitted('confirm')).toBeUndefined()
  const button = wrapper.get('.actions button')
  expect(button.text()).toBe('Confirmar cancelamento')
  expect(button.classes()).toContain('danger')
  await button.trigger('click'); expect(wrapper.emitted('confirm')).toHaveLength(1)
  wrapper.unmount()
})
