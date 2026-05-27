export function getApiErrorMessage(error, fallback = 'Não foi possível concluir a operação.') {
  const payload = error?.response?.data
  const message = payload?.error?.message || payload?.message || error?.message

  if (!message) return fallback

  if (String(message).includes('timeout')) {
    return 'A operação demorou mais que o esperado. Tente novamente em alguns segundos.'
  }

  const status = error?.response?.status
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.'
  if (status === 403) return 'Você não tem permissão para executar esta ação.'
  if (status === 404) return 'O recurso solicitado não foi encontrado.'
  if (status === 409) return 'Esta ação conflitou com outro processamento em andamento.'
  if (status === 422 || status === 400) return message
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.'
  if (status >= 500) return 'Serviço indisponível no momento. Tente novamente em instantes.'

  return message
}
