// Only supplied buckets are plotted. Missing dates and values are never synthesized.
export function buildLiaChart(items = [], unit) {
  const valid = items.filter(item => typeof item.value === 'number' && Number.isFinite(item.value))
  const isDate = name => {
    if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(String(name))) return false
    const date = new Date(name.length === 7 ? name + '-01T00:00:00Z' : name + 'T00:00:00Z')
    return Number.isFinite(date.getTime()) && date.toISOString().startsWith(name)
  }
  const temporal = unit !== 'BRL_CENTS' && valid.length > 1 && valid.every(item => isDate(item.name))
  const ordered = temporal ? [...valid].sort((a, b) => a.name.localeCompare(b.name)) : valid
  const maximum = Math.max(0, ...ordered.map(item => item.value))
  const minimum = Math.min(0, ...ordered.map(item => item.value))
  const magnitude = Math.max(1, maximum, Math.abs(minimum))
  const points = ordered.map((item, index) => ({ ...item,
    x: 10 + index / Math.max(1, ordered.length - 1) * 460,
    y: 130 - (item.value - minimum) / Math.max(1, maximum - minimum) * 112,
    width: Math.abs(item.value) / magnitude * 100,
  }))
  const baseline = 130 - (0 - minimum) / Math.max(1, maximum - minimum) * 112
  return { temporal, points, line: points.map(point => `${point.x},${point.y}`).join(' '), area: points.length ? `M${points[0].x},${baseline} L${points.map(point => `${point.x},${point.y}`).join(' L')} L${points.at(-1).x},${baseline} Z` : '' }
}
