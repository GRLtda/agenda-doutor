const paths = new Set([
  '/', '/perfil', '/ajuda', '/calendario', '/atendimentos', '/pacientes', '/pacientes/novo',
  '/procedimentos', '/anamneses', '/termos', '/galeria', '/aniversariantes',
  '/financeiro', '/financeiro/receber', '/financeiro/pagar', '/financeiro/caixa',
  '/marketing/conexao', '/marketing/mensagens', '/marketing/modelos', '/marketing/logs',
  '/workflows', '/workflows/execucoes', '/estoque', '/estoque/produtos', '/estoque/lotes',
  '/estoque/movimentacoes', '/estoque/kits',
])
const settingsTabs = new Set(['unidades', 'identidade', 'horario', 'configuracoes', 'funcionarios', 'auditoria', 'anamnese', 'termos'])
const profileTabs = new Set(['personal', 'security', 'devices', 'storage', 'subscription'])
const creationTabs = new Set(['termos', 'anamnese', 'unidades'])

export const appointmentDetailsPath = id => /^[a-f0-9]{24}$/i.test(String(id)) ? `/atendimentos?appointment=${id}` : null

const isoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value))
// /atendimentos aplica estes filtros pela URL: período (from/to) e visualização em lista.
function validAppointmentFilters(params) {
  const keys = [...params.keys()]
  if (!keys.every(key => ['from', 'to', 'view'].includes(key))) return false
  const from = params.get('from')
  const to = params.get('to')
  if (Boolean(from) !== Boolean(to) || (from && (!isoDate(from) || !isoDate(to) || from > to))) return false
  return !params.has('view') || params.get('view') === 'list'
}

export function navigationFilters(target) {
  try {
    const params = new URL(target.to, 'https://agenda.invalid').searchParams
    const filters = []
    const from = params.get('from')
    const to = params.get('to')
    const br = value => value.split('-').reverse().join('/')
    if (from && to) filters.push(from === to ? br(from) : `${br(from)} a ${br(to)}`)
    if (params.get('view') === 'list') filters.push('Em lista')
    return filters
  } catch { return [] }
}

export function safeProductNavigation(targets) {
  if (!Array.isArray(targets)) return []
  return targets.filter(target => {
    if (!target || typeof target.to !== 'string' || typeof target.label !== 'string' || !target.label.trim() || target.label.length > 80) return false
    if (!target.to.startsWith('/') || target.to.startsWith('//') || /[\\\u0000-\u001f]/.test(target.to)) return false
    let url
    try { url = new URL(target.to, 'https://agenda.invalid') } catch { return false }
    if (url.origin !== 'https://agenda.invalid' || !paths.has(url.pathname) || url.hash) return false
    const keys = [...url.searchParams.keys()]
    if (new Set(keys).size !== keys.length) return false
    if (!keys.length) return url.pathname !== '/'
    if (url.pathname === '/atendimentos') return validAppointmentFilters(url.searchParams)
    if (url.pathname === '/') {
      if (keys.length === 3) return url.searchParams.get('settings') === '1' && creationTabs.has(url.searchParams.get('tab')) && url.searchParams.get('create') === '1'
      if (keys.length !== 2) return false
      return url.searchParams.get('settings') === '1' && settingsTabs.has(url.searchParams.get('tab')) || url.searchParams.get('profile') === '1' && profileTabs.has(url.searchParams.get('profileTab'))
    }
    if (keys.length !== 1) return false
    if (['/calendario', '/procedimentos'].includes(url.pathname) && url.searchParams.get('create') === '1') return true
    return url.pathname === '/calendario' && url.searchParams.get('newBlock') === '1'
  }).slice(0, 5)
}
