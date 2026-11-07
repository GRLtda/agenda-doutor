import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LiaPatientReport from '@/components/lia/LiaPatientReport.vue'
const id = index => String(index).padStart(24, '0')
const card = (page = 1) => ({ type: 'patient_list', title: 'Último procedimento', items: Array.from({ length: page === 3 ? 3 : 10 }, (_, index) => ({ id: id((page - 1) * 10 + index + 1), name: `Paciente ${(page - 1) * 10 + index + 1}`, lastProcedureAt: '2025-01-01T12:00:00Z' })), report: { id: id(100), page, pageSize: 10, total: 23, columns: [{ key: 'name', label: 'Paciente', type: 'patient' }, { key: 'lastProcedureAt', label: 'Realizado em', type: 'date' }] } })
const wrappers = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })
it('pagina dez pacientes por vez, mostra posição e preserva links dos perfis', async () => {
  const loadPage = vi.fn().mockResolvedValue(card(2))
  const wrapper = mount(LiaPatientReport, { props: { card: card(), conversationId: 'thread', loadPage } }); wrappers.push(wrapper)
  expect(wrapper.findAll('tbody tr')).toHaveLength(10)
  expect(wrapper.text()).toContain('Mostrando 1–10 de 23')
  expect(wrapper.get('a').attributes('href')).toBe(`/pacientes/${id(1)}`)
  await wrapper.get('[aria-label="Próxima página de pacientes"]').trigger('click'); await flushPromises()
  expect(loadPage).toHaveBeenCalledWith('thread', id(100), 2, expect.any(AbortSignal))
  expect(wrapper.text()).toContain('Mostrando 11–20 de 23')
  await wrapper.get('a').trigger('click'); expect(wrapper.emitted('navigate')).toEqual([[id(11)]])
})
it('falha de página mantém resultados anteriores e permite tentar novamente', async () => {
  const wrapper = mount(LiaPatientReport, { props: { card: card(), loadPage: vi.fn().mockRejectedValue(new Error('offline')) } }); wrappers.push(wrapper)
  await wrapper.get('[aria-label="Próxima página de pacientes"]').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Não foi possível carregar'); expect(wrapper.text()).toContain('Mostrando 1–10 de 23')
  expect(wrapper.findAll('tbody tr')).toHaveLength(10)
})
it('fechar o card cancela busca e ignora página atrasada', async () => {
  let finish
  const loadPage = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve }))
  const wrapper = mount(LiaPatientReport, { props: { card: card(), loadPage } }); wrappers.push(wrapper)
  await wrapper.get('[aria-label="Próxima página de pacientes"]').trigger('click')
  const signal = loadPage.mock.calls[0][3]; wrapper.unmount(); wrappers.pop()
  expect(signal.aborted).toBe(true); finish(card(2)); await flushPromises()
})
