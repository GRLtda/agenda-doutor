import axios from 'axios'
import apiClient from './index'

export async function consumeLiaStream(body, onEvent, signal) {
  const reader = body?.getReader?.()
  if (!reader) throw new Error('Streaming indisponível neste navegador.')
  const decoder = new TextDecoder()
  const abortReader = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', abortReader, { once: true })
  let buffer = '', bytes = 0, result = null
  try {
    while (true) {
      if (signal?.aborted) throw new axios.CanceledError('Envio interrompido.')
      const { value, done } = await reader.read()
      if (signal?.aborted) throw new axios.CanceledError('Envio interrompido.')
      if (done) break
      bytes += value.byteLength
      if (bytes > 524288) throw new Error('A resposta excedeu o limite permitido.')
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
        const type = frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim()
        const raw = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
        if (!raw) continue
        if (result) throw new Error('Evento recebido depois da conclusão.')
        const data = JSON.parse(raw)
        if (type === 'error') throw Object.assign(new Error(data.message || 'Falha no streaming.'), { response: { status: data.status || 502, data } })
        if (type === 'complete') {
          if (!data.message?.id || data.message.role !== 'assistant' || typeof data.message.content !== 'string' || !data.userMessage?.id) throw new Error('Resposta final inválida.')
          result = { data }
        } else if (type === 'text') {
          if (typeof data.content !== 'string' || data.content.length > 16000) throw new Error('Trecho inválido.')
          onEvent?.({ type, content: data.content })
        } else if (type === 'status') {
          if (typeof data.label !== 'string' || data.label.length > 180) throw new Error('Estado inválido.')
          onEvent?.({ type, phase: data.phase, label: data.label })
        }
      }
      if (buffer.length > 262144) throw new Error('Evento excedeu o limite permitido.')
    }
    buffer += decoder.decode()
    if (!result || buffer.trim()) throw new Error('A conexão terminou antes de concluir a resposta. Tente novamente.')
    return result
  } finally { signal?.removeEventListener('abort', abortReader); await reader.cancel().catch(() => {}); reader.releaseLock() }
}

// Preserve the existing token refresh/session/subscription interceptors. Decode HTTP
// errors before those interceptors run; a streaming error body is not a JSON object.
export async function streamAdapter(config) {
  try { return await axios.getAdapter('fetch')(config) }
  catch (error) {
    const reader = error.response?.data?.getReader?.()
    if (reader) {
      try {
        let bytes = 0, text = ''; const decoder = new TextDecoder()
        while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 8192) break; text += decoder.decode(value, { stream: true }) }
        error.response.data = JSON.parse(text + decoder.decode())
      } catch { error.response.data = { message: 'Não foi possível iniciar a resposta.' } }
      finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
    }
    throw error
  }
}

export async function sendLiaMessageStream(conversationId, message, options = {}, { onEvent, signal } = {}) {
  const response = await apiClient.post(`/lia/conversations/${conversationId}/messages`, { message, ...options }, {
    adapter: streamAdapter, responseType: 'stream', headers: { Accept: 'text/event-stream' }, timeout: 100000, signal,
  })
  if (!(response.headers['content-type'] || '').includes('text/event-stream')) {
    await response.data?.cancel?.()
    throw new Error('O servidor ainda não disponibilizou o streaming da Lia.')
  }
  return consumeLiaStream(response.data, onEvent, signal)
}
