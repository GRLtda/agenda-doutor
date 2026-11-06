import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as api from '@/api/consent-terms'
import { useConsentTermsStore } from '@/stores/consent-terms'
const mocks = vi.hoisted(() => ({ client: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }, toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/api/index', () => ({ default: mocks.client }))
vi.mock('vue-toastification', () => ({ useToast: () => mocks.toast }))
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })

it('requisições públicas ignoram autenticação do CRM', async () => {
  await api.getPublicConsentTerm('token')
  await api.submitConsentTermSignature('token', { signatureData: 'image' })
  expect(mocks.client.get).toHaveBeenCalledWith('/consent-terms/public/token', { skipAuth: true })
  expect(mocks.client.put).toHaveBeenCalledWith('/consent-terms/public/token', { signatureData: 'image' }, { skipAuth: true })
})
it('store propaga causa padronizada sem toast e libera carregamento', async () => {
  mocks.client.put.mockRejectedValue({ response: { status: 403, data: { error: { message: 'Link expirado' } } } })
  const store = useConsentTermsStore()
  const result = await store.submitSignature('token', {})
  expect(result.success).toBe(false)
  expect(result.message).toBe('Link expirado')
  expect(store.isLoading).toBe(false)
  expect(mocks.toast.error).not.toHaveBeenCalled()
})
it('store mantém carregamento até concluir envio e retorna sucesso', async () => {
  let resolve
  mocks.client.put.mockReturnValue(new Promise(done => { resolve = done }))
  const store = useConsentTermsStore()
  const pending = store.submitSignature('token', {})
  expect(store.isLoading).toBe(true)
  resolve({ data: { message: 'Assinado' } })
  expect(await pending).toEqual({ success: true })
  expect(store.isLoading).toBe(false)
})
