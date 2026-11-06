export function consentSignatureError(error) {
  const data = error.response?.data
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.error?.message === 'string') return data.error.message
  if (error.response?.status === 413) return 'A imagem da assinatura é muito grande. Use uma imagem menor ou desenhe sua assinatura.'
  if (!error.response) return 'Não foi possível conectar ao servidor para enviar a assinatura. Verifique sua conexão e tente novamente.'
  return `Não foi possível enviar a assinatura (erro ${error.response.status}). Tente novamente; se persistir, avise a clínica.`
}
