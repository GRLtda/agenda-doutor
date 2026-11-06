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
