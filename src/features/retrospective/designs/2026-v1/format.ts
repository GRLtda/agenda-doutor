export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
export const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const fmt = (n: number | string) => Number(n || 0).toLocaleString('pt-BR')
export const monthName = (m?: number | null) => (m && m >= 1 && m <= 12 ? MONTHS[m - 1] : '')

/** Inicial do nome da clínica (sem o prefixo "Clínica"), usada quando não há logo. */
export const initialOf = (name: string) => (name || '').replace(/^Cl[ií]nica\s+/i, '').trim().charAt(0).toUpperCase() || 'A'
