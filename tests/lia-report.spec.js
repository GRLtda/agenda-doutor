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

it('reutiliza o relatório para atendimentos e mantém consultas repetidas do mesmo paciente', async () => {
  const appointments = {
    ...card(), type: 'appointment_list', title: 'Atendimentos em aberto',
    items: [1, 2].map(index => ({ id: id(1), rowId: id(200 + index), name: 'Paciente exemplo', startLabel: `0${index}/11/2026 09:00`, status: 'Agendado' })),
    report: { ...card().report, total: 12, entityLabel: 'atendimento', entityPlural: 'atendimentos', columns: [{ key: 'name', label: 'Paciente', type: 'patient' }, { key: 'startLabel', label: 'Data e horário', type: 'text' }, { key: 'status', label: 'Situação', type: 'text' }] },
  }
  const loadPage = vi.fn().mockResolvedValue({ ...appointments, items: [], report: { ...appointments.report, page: 2 } })
  const wrapper = mount(LiaPatientReport, { props: { card: appointments, conversationId: 'thread', loadPage } }); wrappers.push(wrapper)
  expect(wrapper.text()).toContain('12 atendimentos encontrados')
  expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  expect(wrapper.findAll('tbody a').map(link => link.attributes('href'))).toEqual([`/pacientes/${id(1)}`, `/atendimentos?appointment=${id(201)}`, `/pacientes/${id(1)}`, `/atendimentos?appointment=${id(202)}`])
  await wrapper.get(`[href="/atendimentos?appointment=${id(202)}"]`).trigger('click')
  expect(wrapper.emitted('navigate-appointment')).toEqual([[id(202)]])
  expect(wrapper.emitted('navigate')).toBeUndefined()
  await wrapper.get('[aria-label="Próxima página de atendimentos"]').trigger('click'); await flushPromises()
  expect(loadPage).toHaveBeenCalledWith('thread', id(100), 2, expect.any(AbortSignal))
  expect(wrapper.text()).toContain('Nenhum atendimento nesta página.')
})
