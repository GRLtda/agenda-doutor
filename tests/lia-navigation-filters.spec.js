import { expect, it } from 'vitest'
import { navigationFilters, safeProductNavigation } from '@/components/lia/liaNavigation'

const target = to => ({ id: 'x', label: 'Abrir atendimentos', to })

it('aceita atendimentos com período e visualização em lista', () => {
  expect(safeProductNavigation([target('/atendimentos?from=2026-11-01&to=2026-11-30&view=list')])).toHaveLength(1)
  expect(safeProductNavigation([target('/atendimentos?from=2026-11-21&to=2026-11-21')])).toHaveLength(1)
  expect(safeProductNavigation([target('/atendimentos')])).toHaveLength(1)
})

it.each([
  '/atendimentos?from=2026-11-01',
  '/atendimentos?from=2026-11-30&to=2026-11-01',
  '/atendimentos?from=abc&to=def',
  '/atendimentos?from=2026-11-01&to=2026-11-30&view=kanban',
  '/atendimentos?from=2026-11-01&to=2026-11-30&q=Maria',
  '/atendimentos?from=2026-11-01&from=2026-11-02&to=2026-11-30',
  '/pacientes?from=2026-11-01&to=2026-11-30',
])('recusa filtros que a tela não aplica: %s', to => {
  expect(safeProductNavigation([target(to)])).toHaveLength(0)
})

it('descreve os filtros do destino em português', () => {
  expect(navigationFilters(target('/atendimentos?from=2026-11-01&to=2026-11-30&view=list'))).toEqual(['01/11/2026 a 30/11/2026', 'Em lista'])
  expect(navigationFilters(target('/atendimentos?from=2026-11-21&to=2026-11-21'))).toEqual(['21/11/2026'])
  expect(navigationFilters(target('/pacientes'))).toEqual([])
})
