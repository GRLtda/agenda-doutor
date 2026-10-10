export const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export const workingTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`
  return { value, label: value }
})

export function getWeeklyHours(days) {
  return days
    .filter((day) => day.isOpen)
    .reduce((total, day) => {
      const toMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }
      return total + Math.max(0, toMinutes(day.endTime) - toMinutes(day.startTime)) / 60
    }, 0)
}
