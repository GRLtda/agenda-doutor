import test from 'node:test'
import assert from 'node:assert/strict'
import { getWeeklyHours, workingTimeOptions } from '../src/utils/workingHours.js'

test('contabiliza meia hora sem tratar os minutos como casas decimais', () => {
  assert.equal(getWeeklyHours([{ isOpen: true, startTime: '09:30', endTime: '10:00' }]), 0.5)
})

test('soma dias abertos e ignora dias fechados e intervalos invertidos', () => {
  assert.equal(
    getWeeklyHours([
      { isOpen: true, startTime: '09:00', endTime: '18:00' },
      { isOpen: true, startTime: '08:30', endTime: '12:00' },
      { isOpen: false, startTime: '09:00', endTime: '18:00' },
      { isOpen: true, startTime: '18:00', endTime: '09:00' },
    ]),
    12.5,
  )
  assert.equal(getWeeklyHours([]), 0)
})

test('oferece horários de meia em meia hora sem mudar o valor HH:mm salvo', () => {
  assert.equal(workingTimeOptions.length, 48)
  assert.deepEqual(workingTimeOptions[0], { value: '00:00', label: '00:00' })
  assert.deepEqual(workingTimeOptions.at(-1), { value: '23:30', label: '23:30' })
  assert.equal(new Set(workingTimeOptions.map((option) => option.value)).size, 48)
})
