// Kinds com layout no design 2026-v1. Story com kind desconhecido é ignorado (nunca quebra a tela).
export const SUPPORTED_KINDS = [
  'abertura', 'total', 'total-leve', 'mes', 'procedimento', 'proc-simples',
  'financeiro', 'pacientes', 'rosto', 'mensagens', 'comparecimento', 'resumo',
] as const

export const isSupportedKind = (kind: string) => (SUPPORTED_KINDS as readonly string[]).includes(kind)
