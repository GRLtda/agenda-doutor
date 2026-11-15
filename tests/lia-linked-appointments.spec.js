import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { reactive } from 'vue'
import AppointmentsView from '@/views/pages/atendimentos/AppointmentsView.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), store: null }))
vi.mock('@/api/appointments', () => ({ getAppointmentById: mocks.get }))
vi.mock('@/stores/appointments', () => ({ useAppointmentsStore: () => mocks.store }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { role: 'medico' } }) }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
const id = number => String(number).padStart(24, '0')
const appointment = number => ({ _id: id(number), patient: { _id: id(100), name: 'Paciente QA' }, status: 'Agendado', startTime: '2026-11-01T12:00:00Z', endTime: '2026-11-01T12:30:00Z' })
let wrapper, router
beforeEach(() => {
  mocks.get.mockReset()
  mocks.store = reactive({ appointments: [], isLoading: false, fetchAppointmentsByDate: vi.fn().mockResolvedValue(), updateAppointmentStatus: vi.fn() })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { wrapper?.unmount(); wrapper = null; vi.unstubAllGlobals() })
async function open(query) {
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/atendimentos', name: 'atendimentos', component: AppointmentsView }] })
  await router.push({ name: 'atendimentos', query })
  await router.isReady()
  wrapper = shallowMount(AppointmentsView, { global: { plugins: [router] } })
  await flushPromises()
}

it('abre o atendimento pelo ID mesmo fora do filtro atual, usando apenas leitura', async () => {
  mocks.get.mockResolvedValue({ data: appointment(1) })
  await open({ appointment: id(1), from: '2026-11-20', to: '2026-11-20' })
  expect(mocks.get).toHaveBeenCalledWith(id(1), { signal: expect.any(AbortSignal) })
  expect(wrapper.getComponent(AppointmentDetailsModal).props('event').originalEvent._id).toBe(id(1))
  expect(mocks.store.updateAppointmentStatus).not.toHaveBeenCalled()
  await wrapper.getComponent(AppointmentDetailsModal).vm.$emit('close')
  await flushPromises()
  expect(router.currentRoute.value.query.appointment).toBeUndefined()
  expect(router.currentRoute.value.query.from).toBe('2026-11-20')
})

it('mostra o estado de carga e ignora resposta de outro atendimento', async () => {
  let first
  mocks.get.mockImplementationOnce(() => new Promise(resolve => { first = resolve })).mockResolvedValueOnce({ data: appointment(2) })
  await open({ appointment: id(1) })
  expect(wrapper.getComponent(AppointmentDetailsModal).props('loading')).toBe(true)
  const signal = mocks.get.mock.calls[0][1].signal
  await router.push({ query: { appointment: id(2) } })
  await flushPromises()
  expect(signal.aborted).toBe(true)
  first({ data: appointment(1) })
  await flushPromises()
  expect(wrapper.getComponent(AppointmentDetailsModal).props('event').originalEvent._id).toBe(id(2))
})

it('link removido ou sem acesso exibe erro no painel e permite tentar novamente', async () => {
  mocks.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: appointment(1) })
  await open({ appointment: id(1) })
  expect(wrapper.getComponent(AppointmentDetailsModal).props('error')).toContain('não está disponível para sua clínica')
  expect(wrapper.getComponent(AppointmentDetailsModal).props('event')).toBeNull()
  await wrapper.getComponent(AppointmentDetailsModal).vm.$emit('retry')
  await flushPromises()
  expect(wrapper.getComponent(AppointmentDetailsModal).props('event').originalEvent._id).toBe(id(1))
})

it('identificador inválido não gera consulta', async () => {
  await open({ appointment: 'invalid' })
  expect(mocks.get).not.toHaveBeenCalled()
  expect(wrapper.getComponent(AppointmentDetailsModal).props('error')).toContain('incompleto')
})
