const FALLBACK_MESSAGES = {
  INVALID_JSON: 'Não foi possível interpretar os dados enviados.',
  ANAMNESIS_IDEMPOTENCY_KEY_REQUIRED: 'Não foi possível identificar este envio. Tente novamente.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para continuar.',
  AUTH_SESSION_REVOKED: 'Sua sessão foi encerrada. Entre novamente para continuar.',
  ANAMNESIS_FORBIDDEN: 'Seu perfil não tem permissão para acessar anamneses.',
  ANAMNESIS_CLINIC_REQUIRED: 'Nenhuma clínica está vinculada ao seu usuário.',
  SUBSCRIPTION_REQUIRED: 'Sua assinatura atual não inclui o acesso a anamneses.',
  ANAMNESIS_TEMPLATE_NOT_FOUND: 'Este modelo de anamnese não está mais disponível.',
  ANAMNESIS_PATIENT_NOT_FOUND: 'Este paciente não foi encontrado nesta clínica.',
  ANAMNESIS_RESPONSE_NOT_FOUND: 'Esta anamnese não foi encontrada para o paciente.',
  ANAMNESIS_RESPONSE_NOT_FOUND_OR_COMPLETED: 'A anamnese pendente não foi encontrada ou já foi concluída.',
  ANAMNESIS_PUBLIC_LINK_UNAVAILABLE: 'Este link de anamnese expirou, foi revogado ou não é válido.',
  ANAMNESIS_TEMPLATE_NAME_CONFLICT: 'Já existe um modelo ativo com este nome.',
  ANAMNESIS_TEMPLATE_VERSION_CONFLICT: 'Este modelo foi alterado por outra pessoa. Reabra-o antes de salvar novamente.',
  ANAMNESIS_TEMPLATE_IN_USE: 'Este modelo possui anamneses vinculadas e não pode ser arquivado.',
  ANAMNESIS_ALREADY_ANSWERED: 'Esta anamnese já foi respondida.',
  ANAMNESIS_IDEMPOTENCY_KEY_REUSED: 'Este envio foi alterado durante uma tentativa anterior. Revise as respostas e envie novamente.',
  ANAMNESIS_NOT_COMPLETED: 'O PDF só pode ser gerado depois que a anamnese for concluída.',
  ANAMNESIS_PAYLOAD_TOO_LARGE: 'O formulário ultrapassa o limite de tamanho permitido.',
  ANAMNESIS_DUPLICATE_QUESTION_ID: 'Existem perguntas duplicadas no modelo.',
  ANAMNESIS_QUESTION_NOT_ALLOWED: 'Uma pergunta mudou ou não está mais disponível. Recarregue o formulário.',
  ANAMNESIS_ANSWER_TYPE_INVALID: 'Uma resposta está em um formato inválido.',
  ANAMNESIS_ANSWER_OPTION_INVALID: 'Uma das opções selecionadas não é mais válida.',
  ANAMNESIS_ANSWER_TOO_LONG: 'Uma das respostas ultrapassa o limite permitido.',
  ANAMNESIS_RATE_LIMITED: 'Muitas tentativas foram realizadas. Aguarde antes de tentar novamente.',
}

function fieldForAnswerPath(field, answers) {
  const match = /^answers\.(\d+)(?:\.|$)/.exec(field || '')
  if (!match) return field
  return answers?.[Number(match[1])]?.qId || field
}

export function getAnamnesisError(error, answers = []) {
  const payload = error?.response?.data
  const apiError = payload?.error || {}
  const status = error?.response?.status || null
  const code = apiError.code || null
  const requestId = payload?.meta?.request_id || apiError.details?.error_id || null
  const details = apiError.details || {}
  const fields = Array.isArray(details.fields)
    ? details.fields.map((item) => ({
        field: fieldForAnswerPath(item.field, answers),
        message: item.message || 'Valor inválido.',
      }))
    : []

  if (details.qId) {
    fields.push({ field: details.qId, message: apiError.message || FALLBACK_MESSAGES[code] })
  }

  let message = apiError.message || FALLBACK_MESSAGES[code]

  if (!message && error?.code === 'ECONNABORTED') {
    message = 'O servidor demorou para responder. Tente novamente; seu envio pode já ter sido recebido.'
  } else if (!message && (!error?.response || error?.code === 'ERR_NETWORK')) {
    message = 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
  } else if (!message && status >= 500) {
    message = 'O servidor encontrou um erro ao processar a solicitação.'
  } else if (!message) {
    message = 'Não foi possível concluir esta solicitação.'
  }

  if ((code === 'INTERNAL_ERROR' || status >= 500) && requestId) {
    message = `${message} Código de atendimento: ${requestId}.`
  }

  return {
    code,
    status,
    message,
    fields,
    requestId,
    retryAfter: error?.response?.headers?.['retry-after'] || null,
    original: error,
  }
}

export async function getAnamnesisBlobError(error) {
  const data = error?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      return getAnamnesisError({ ...error, response: { ...error.response, data: parsed } })
    } catch {
      // A resposta não era um erro JSON; usa o tratamento por status.
    }
  }
  return getAnamnesisError(error)
}

export function fieldsToMap(fields = []) {
  return fields.reduce((result, item) => {
    if (item.field) result[item.field] = item.message
    return result
  }, {})
}
