export function isCanceledApiError(error) {
  return error?.code === 'ERR_CANCELED' || error?.__CANCEL__ === true
}

export function isTemporaryApiError(error) {
  if (isCanceledApiError(error)) return false
  const status = error?.response?.status
  if (status === 408 || status === 429 || (status >= 500 && status < 600)) return true
  return !error?.response && Boolean(
    error?.request || error?.isAxiosError ||
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code),
  )
}

export function isInvalidSessionError(error) {
  if (isTemporaryApiError(error) || isCanceledApiError(error)) return false
  const code = error?.response?.data?.error?.code || error?.response?.data?.code
  return error?.response?.status === 401 ||
    (error?.response?.status === 403 && code === 'USER_INACTIVE')
}
