import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import SignConsentTermView from '@/views/public/SignConsentTermView.vue'

const mocks = vi.hoisted(() => ({ store: null, confetti: vi.fn() }))
vi.mock('@/stores/consent-terms', () => ({ useConsentTermsStore: () => mocks.store }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { token: 'public-token' } }) }))
vi.mock('canvas-confetti', () => ({ default: mocks.confetti }))
let context
beforeEach(() => {
  mocks.store = reactive({
    isLoading: false,
    publicTerm: { renderedContent: 'Termo {assinatura}', template: { name: 'Consentimento' }, clinicInfo: { name: 'Clínica' }, patientInfo: { name: 'Ana', cpf: '123' } },
    fetchPublicTerm: vi.fn().mockResolvedValue({ success: true }),
    submitSignature: vi.fn().mockResolvedValue({ success: true }),
  })
  context = { scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), setTransform: vi.fn(), clearRect: vi.fn(), restore: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aGVsbG8=')
})
async function open() { const wrapper = mount(SignConsentTermView); await flushPromises(); return wrapper }
async function tab(wrapper, name) {
  await wrapper.findAll('.tab-btn').find(button => button.text().includes(name)).trigger('click')
}
async function confirm(wrapper) { for (const label of wrapper.findAll('.checkbox-item')) await label.trigger('click') }
async function typed(wrapper) { await tab(wrapper, 'Digitar'); await wrapper.find('.typed-signature-input').setValue('Ana Silva'); await confirm(wrapper) }
async function upload(wrapper, file) {
  await tab(wrapper, 'Carregar')
  const input = wrapper.find('input[type=file]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
  await input.trigger('change')
  await flushPromises()
}

describe('assinatura pública', () => {
  it('carrega pelo token e exige assinatura e confirmações', async () => {
    const wrapper = await open()
    expect(mocks.store.fetchPublicTerm).toHaveBeenCalledWith('public-token')
    expect(wrapper.find('.submit-button').element.disabled).toBe(true)
    await tab(wrapper, 'Digitar')
    await wrapper.find('.typed-signature-input').setValue('Ana')
    expect(wrapper.find('.submit-button').element.disabled).toBe(true)
    await confirm(wrapper)
    expect(wrapper.find('.submit-button').element.disabled).toBe(false)
  })
  it('envia nome digitado como imagem e mostra sucesso', async () => {
    const wrapper = await open()
    await typed(wrapper)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(mocks.store.submitSignature).toHaveBeenCalledWith('public-token', { signatureData: 'data:image/png;base64,aGVsbG8=', acceptedTerms: true, identityConfirmation: true, signatureMethod: 'type' })
    expect(wrapper.text()).toContain('Sua assinatura foi registrada com sucesso')
  })
  it('desenho funciona depois de trocar de aba e limpar desabilita envio', async () => {
    const wrapper = await open()
    await tab(wrapper, 'Digitar')
    await tab(wrapper, 'Desenhar')
    const canvas = wrapper.find('canvas')
    await canvas.trigger('mousedown', { clientX: 10, clientY: 10 })
    await canvas.trigger('mousemove', { clientX: 20, clientY: 20 })
    await canvas.trigger('mouseup')
    await confirm(wrapper)
    expect(wrapper.find('.submit-button').element.disabled).toBe(false)
    await wrapper.find('.clear-btn').trigger('click')
    expect(wrapper.find('.submit-button').element.disabled).toBe(true)
    expect(context.clearRect).toHaveBeenCalled()
  })
  it('imagem inválida e acima de 5 MB exibem erro no campo', async () => {
    const wrapper = await open()
    await upload(wrapper, new File(['texto'], 'test.txt', { type: 'text/plain' }))
    expect(wrapper.find('[role=alert]').text()).toContain('PNG, JPEG ou WebP')
    const large = new File(['x'], 'large.png', { type: 'image/png' })
    Object.defineProperty(large, 'size', { value: 5 * 1024 * 1024 + 1 })
    await upload(wrapper, large)
    expect(wrapper.find('[role=alert]').text()).toContain('5 MB')
    expect(wrapper.find('.signature-section').classes()).toContain('has-error')
    expect(mocks.store.submitSignature).not.toHaveBeenCalled()
  })
  it('upload válido envia imagem e método correto', async () => {
    const wrapper = await open()
    vi.stubGlobal('FileReader', class { readAsDataURL() { this.onload({ target: { result: 'data:image/png;base64,aGVsbG8=' } }) } })
    await upload(wrapper, new File(['image'], 'signature.png', { type: 'image/png' }))
    await confirm(wrapper)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(mocks.store.submitSignature.mock.calls[0][1].signatureMethod).toBe('upload')
    vi.unstubAllGlobals()
  })
  it('erro ao ler arquivo aparece junto à assinatura', async () => {
    const wrapper = await open()
    vi.stubGlobal('FileReader', class { readAsDataURL() { this.onerror() } })
    try {
      await upload(wrapper, new File(['image'], 'signature.png', { type: 'image/png' }))
      expect(wrapper.find('[role=alert]').text()).toContain('Não foi possível ler a imagem')
      expect(wrapper.find('.submit-button').element.disabled).toBe(true)
    } finally { vi.unstubAllGlobals() }
  })
  it('desenho por toque envia assinatura com método draw', async () => {
    const wrapper = await open()
    const canvas = wrapper.find('canvas')
    await canvas.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] })
    await canvas.trigger('touchmove', { touches: [{ clientX: 20, clientY: 20 }] })
    await canvas.trigger('touchend')
    await confirm(wrapper)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(mocks.store.submitSignature.mock.calls[0][1].signatureMethod).toBe('draw')
  })
  it('falha mantém assinatura e mensagem; editar limpa o erro e permite nova tentativa', async () => {
    mocks.store.submitSignature.mockResolvedValueOnce({ success: false, message: 'Armazenamento em verificação.', error: { response: { status: 503 } } })
    const wrapper = await open()
    await typed(wrapper)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role=alert]').text()).toBe('Armazenamento em verificação.')
    expect(wrapper.find('.typed-signature-input').element.value).toBe('Ana Silva')
    await wrapper.find('.typed-signature-input').setValue('Ana Silva Souza')
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(mocks.store.submitSignature).toHaveBeenCalledTimes(2)
  })
  it('erro da API associado à assinatura fica na área de assinatura', async () => {
    mocks.store.submitSignature.mockResolvedValue({ success: false, message: 'Imagem inválida', error: { response: { data: { field: 'signatureData' } } } })
    const wrapper = await open()
    await typed(wrapper)
    await wrapper.find('.submit-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.signature-section').classes()).toContain('has-error')
    expect(wrapper.find('[role=alert]').text()).toBe('Imagem inválida')
  })
  it('bloqueia envio durante requisição e mostra estado de carregamento', async () => {
    const wrapper = await open()
    await typed(wrapper)
    mocks.store.isLoading = true
    await flushPromises()
    expect(wrapper.find('.submit-button').element.disabled).toBe(true)
    expect(wrapper.find('.submit-button').text()).toContain('Enviando assinatura')
  })
  it('falha ao carregar não oferece formulário de assinatura', async () => {
    mocks.store.fetchPublicTerm.mockResolvedValue({ success: false })
    const wrapper = await open()
    expect(wrapper.find('.submit-button').exists()).toBe(false)
    expect(wrapper.find('canvas').exists()).toBe(false)
  })
})
