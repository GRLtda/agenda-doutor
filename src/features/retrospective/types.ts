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

export interface RetrospectiveClinic { name: string; logoUrl: string | null }

/** Resumo que vem no GET /auth/me (só para o dono, só se houver publicada). Os stories são pedidos ao abrir. */
export interface RetrospectiveSummary { id: string; year: number; designKey: string; viewed: boolean; clinic: RetrospectiveClinic }

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
  /** Nome e logo vêm do /auth/me (store de autenticação), não deste payload. */
  clinic?: RetrospectiveClinic
  viewed: boolean
}
