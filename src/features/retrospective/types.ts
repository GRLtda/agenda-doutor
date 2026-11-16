// Contrato do payload de GET /retrospectives/current (dados neutros, sem layout).
export type StoryKind =
  | 'abertura' | 'total' | 'total-leve' | 'mes' | 'procedimento' | 'proc-simples'
  | 'financeiro' | 'pacientes' | 'rosto' | 'mensagens' | 'comparecimento' | 'resumo'

export interface RetrospectiveStory {
  key: string
  kind: StoryKind | string
  variant?: string
  data: Record<string, any>
}

export interface Retrospective {
  id: string
  year: number
  designKey: string
  schemaVersion: number
  reduced: boolean
  copyVariant: 1 | 2 | 3
  period: { start: string; end: string; timezone: string }
  inProgressMonth: number | null
  stories: RetrospectiveStory[]
  clinic: { name: string; logoUrl: string | null }
  viewed: boolean
}
