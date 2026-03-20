export function useStatusBadge(status) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-')

  const configs = {
    // ✅ Realizado - Cinza/Slate (finalizado, passado)
    realizado: {
      class: 'realizado',
      style: {
        backgroundColor: '#f1f5f9',
        color: '#2670d7ff',
      },
    },
    // 📅 Agendado - Azul (agendado, futuro)
    agendado: {
      class: 'agendado',
      style: {
        backgroundColor: '#eff6ff',
        color: '#2563eb',
      },
    },
    confirmado: {
      class: 'confirmado',
      style: {
        backgroundColor: '#fefce8',
        color: '#ca8a04',
      },
    },
    cancelado: {
      class: 'cancelado',
      style: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
      },
    },
    'não-compareceu': {
      class: 'não-compareceu',
      style: {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
      },
    },
    // 🔄 Em Atendimento - Roxo
    'em-atendimento': {
      class: 'em-atendimento',
      style: {
        backgroundColor: '#f3e8ff',
        color: '#7e22ce',
      },
    },
    // 🟣 Iniciado - Roxo (em atendimento)
    iniciado: {
      class: 'iniciado',
      style: {
        backgroundColor: '#f5f3ff',
        color: '#8b5cf6',
      },
    },
    // V-- Alteração aqui --V
    beta: {
      class: 'beta',
      style: {
        backgroundColor: '#eff6ff', // Azul claro (estilo "info")
        color: '#2563eb', // Azul (estilo "info")
      },
    },
    // ^-- Fim da alteração --^
  }

  // Não é mais 'computed'
  const statusConfig =
    configs[normalizedStatus] || {
      class: 'default',
      style: {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
      },
    }

  // Não é mais 'computed'
  const badgeClass = `status-badge ${statusConfig.class}`
  // Não é mais 'computed'
  const badgeStyle = statusConfig.style
  // Não é mais 'computed' e acessa a string 'status' diretamente
  const displayText = status || ''

  return {
    badgeClass,
    badgeStyle,
    displayText,
  }
}
