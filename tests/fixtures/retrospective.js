// Payload de exemplo de GET /retrospectives/current (completa) e variações de borda.
export const fullRetrospective = () => ({
  id: '6a0000000000000000000001',
  year: 2026,
  designKey: '2026-v1',
  schemaVersion: 1,
  reduced: false,
  copyVariant: 1,
  period: { start: '2026-01-01T03:00:00.000Z', end: '2026-11-16T15:00:00.000Z', timezone: 'America/Sao_Paulo' },
  inProgressMonth: 11,
  clinic: { name: 'Clínica Aurora', logoUrl: null },
  viewed: false,
  stories: [
    { key: 'abertura', kind: 'abertura', variant: 'default', data: {} },
    { key: 'total', kind: 'total', variant: 'default', data: { total: 1248 } },
    { key: 'mes', kind: 'mes', variant: 'default', data: { monthly: [71, 84, 92, 98, 105, 110, 119, 127, 141, 168, 0, 0], championMonth: 10, championValue: 168 } },
    { key: 'procedimento', kind: 'procedimento', variant: 'default', data: { items: [{ name: 'Botox', count: 312 }, { name: 'Preenchimento', count: 248 }, { name: 'Limpeza de pele', count: 201 }, { name: 'Bioestimulador', count: 164 }, { name: 'Peeling', count: 129 }] } },
    { key: 'financeiro', kind: 'financeiro', variant: 'default', data: { pct: 38, bestMonth: 10, monthlyIndex: [0.78, 0.82, 0.86, 0.9, 0.95, 0.98, 1.02, 1.05, 1.12, 1.38, null, null] } },
    { key: 'pacientes', kind: 'pacientes', variant: 'default', data: { newPatients: 214, returnPct: 67 } },
    { key: 'rosto', kind: 'rosto', variant: 'default', data: { regions: [{ key: 'testa', label: 'Testa', count: 80 }, { key: 'glabela', label: 'Glabela', count: 50 }, { key: 'periocular', label: 'Pés de galinha', count: 30 }] } },
    { key: 'mensagens', kind: 'mensagens', variant: 'default', data: { count: 3420, hoursSaved: 57 } },
    { key: 'comparecimento', kind: 'comparecimento', variant: 'default', data: { pct: 91 } },
    { key: 'resumo', kind: 'resumo', variant: 'default', data: { items: [{ key: 'at', value: 1248 }, { key: 'mes', value: 10 }, { key: 'ret', value: 67 }, { key: 'proc', value: 'Botox' }, { key: 'msg', value: 3420 }] } },
  ],
})

export const reducedRetrospective = () => ({
  ...fullRetrospective(),
  reduced: true,
  copyVariant: 3,
  inProgressMonth: null,
  clinic: { name: 'Clínica Integrada de Estética Avançada Dra. Fernanda Albuquerque', logoUrl: null },
  stories: [
    { key: 'abertura', kind: 'abertura', variant: 'default', data: {} },
    { key: 'total', kind: 'total-leve', variant: 'leve', data: { total: 38 } },
    { key: 'procedimento', kind: 'proc-simples', variant: 'simples', data: { items: [{ name: 'Limpeza de pele', count: 14 }] } },
    { key: 'resumo', kind: 'resumo', variant: 'default', data: { items: [{ key: 'at', value: 38 }, { key: 'proc', value: 'Limpeza de pele' }, { key: 'msg', value: 112 }] } },
  ],
})
