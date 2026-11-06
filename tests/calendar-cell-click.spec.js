import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import VueCal from 'vue-cal'
import { format } from 'date-fns'
import { getCalendarCellAppointmentData } from '@/utils/calendarCellClick'

const now = new Date(2026, 9, 16, 16, 0)
const future = new Date(2026, 10, 3, 14, 30)
const wrappers = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

it('aceita célula futura e payload de coluna, preservando data e horário local', () => {
  for (const payload of [future, { date: future, split: 1 }, { date: future, split: 'professional' }]) {
    const result = getCalendarCellAppointmentData(payload, now)
    expect(result).toEqual({ date: future, startTime: '14:30' })
    expect(result.date).not.toBe(future)
  }
})

it.each([undefined, null, {}, '2026-11-03', new Date(NaN), { date: new Date(NaN) }, { date: '2026-11-03' }, new Date(2026, 9, 15)])('ignora payload inválido ou passado: %s', payload => {
  expect(() => getCalendarCellAppointmentData(payload, now)).not.toThrow()
  expect(getCalendarCellAppointmentData(payload, now)).toBeNull()
})

it('reproduz o payload do relatório e impede formatação do objeto como Date', () => {
  const payload = { date: future, split: new MouseEvent('click') }
  expect(() => format(payload, 'HH:mm')).toThrow(RangeError)
  expect(getCalendarCellAppointmentData(payload, now)).toBeNull()
})

it('cabeçalho real do VueCal emite MouseEvent no split sem abrir agendamento', async () => {
  const handler = vi.fn(payload => getCalendarCellAppointmentData(payload, now))
  const wrapper = mount(VueCal, {
    props: { selectedDate: future, activeView: 'week', disableViews: ['years', 'year'], locale: 'pt-br', onCellClick: handler },
  })
  wrappers.push(wrapper)
  await flushPromises()
  await wrapper.get('.weekday-label').trigger('click')
  expect(handler).toHaveBeenCalledOnce()
  const payload = handler.mock.calls[0][0]
  expect(payload.date).toBeInstanceOf(Date)
  expect(payload.split).toBeInstanceOf(MouseEvent)
  expect(handler.mock.results[0].value).toBeNull()
})

it('cabeçalho personalizado navega para o dia sem propagar clique de criação', async () => {
  const cellClick = vi.fn()
  const navigate = vi.fn()
  const Harness = defineComponent({
    setup() {
      const activeView = ref('week')
      return () => h(VueCal, {
        selectedDate: future, activeView: activeView.value, locale: 'pt-br',
        onCellClick: cellClick,
      }, {
        'weekday-heading': ({ heading }) => h('div', {
          class: 'custom-weekday-heading',
          onClick: event => {
            event.stopPropagation()
            navigate(heading.date)
            activeView.value = 'day'
          },
        }, heading.label),
      })
    },
  })
  const wrapper = mount(Harness)
  wrappers.push(wrapper)
  await flushPromises()
  await wrapper.get('.custom-weekday-heading').trigger('click')
  expect(navigate).toHaveBeenCalledOnce()
  expect(navigate.mock.calls[0][0]).toBeInstanceOf(Date)
  expect(wrapper.findComponent(VueCal).props('activeView')).toBe('day')
  expect(cellClick).not.toHaveBeenCalled()
})
