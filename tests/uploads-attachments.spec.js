import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RecordAttachments from '@/components/pages/appointments/RecordAttachments.vue'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(), start: vi.fn(), update: vi.fn(), success: vi.fn(), error: vi.fn(),
}))
vi.mock('@/stores/records', () => ({ useRecordsStore: () => ({ uploadAttachmentImage: mocks.upload }) }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ upload: mocks.start }) }))
vi.mock('@/components/pages/appointments/MontageEditor.vue', () => ({ default: { name: 'MontageEditor', emits: ['save'], template: '<div />' } }))
vi.mock('@/components/pages/appointments/PhotoViewerUpload.vue', () => ({ default: {
  props: ['visible'], emits: ['upload'], template: '<div class="photo-viewer" :data-visible="visible" />',
} }))

const wrappers = []
beforeEach(() => {
  vi.resetAllMocks()
  mocks.start.mockReturnValue({ update: mocks.update, success: mocks.success, error: mocks.error })
  mocks.upload.mockResolvedValue({ success: true })
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
function render(props = {}) {
  const wrapper = mount(RecordAttachments, {
    props: { patientId: 'patient', appointmentId: 'appointment', record: { _id: 'record', attachments: [] }, ...props },
  })
  wrappers.push(wrapper)
  return wrapper
}
const image = (name = 'foto.png') => new File(['image'], name, { type: 'image/png' })
const drop = (wrapper, files) => wrapper.get('.attachments-container').trigger('drop', { dataTransfer: { files } })

it('soltar imagens envia direto, sem abrir preparação, com progresso real e espera pelo servidor', async () => {
  let resolve
  mocks.upload.mockImplementation((id, file, draft, options) => {
    options.onUploadProgress({ loaded: 60, total: 100 })
    options.onUploadProgress({ loaded: 100, total: 100 })
    return new Promise(done => { resolve = done })
  })
  const wrapper = render()
  await drop(wrapper, [image()])
  expect(mocks.upload).toHaveBeenCalledTimes(1)
  expect(wrapper.get('.photo-viewer').attributes('data-visible')).toBe('false')
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ progress: 60 }))
  expect(mocks.update).toHaveBeenCalledWith({ progress: 99, description: 'Salvando arquivo…' })
  expect(mocks.success).not.toHaveBeenCalled()
  await drop(wrapper, [image('outra.png')])
  expect(mocks.upload).toHaveBeenCalledTimes(1)
  resolve({ success: true })
  await flushPromises()
  expect(mocks.success).toHaveBeenCalledOnce()
})

it('somente leitura e limite impedem upload; arquivo inválido exibe erro no container', async () => {
  const readonly = render({ disabled: true })
  await drop(readonly, [image()])
  const limited = render({ record: { _id: 'record', attachments: Array.from({ length: 40 }, (_, i) => ({ _id: String(i) })) } })
  await drop(limited, [image()])
  expect(limited.get('[role="alert"]').text()).toContain('40')
  const wrapper = render()
  await drop(wrapper, [new File(['text'], 'texto.txt', { type: 'text/plain' })])
  expect(wrapper.get('[role="alert"]').text()).toContain('apenas arquivos de imagem')
  expect(mocks.upload).not.toHaveBeenCalled()
  await drop(wrapper, [image()])
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('lote continua após falha, informa sucesso parcial e libera novo envio', async () => {
  mocks.upload.mockResolvedValueOnce({ success: false, error: 'Espaço insuficiente' }).mockResolvedValue({ success: true })
  const wrapper = render()
  await drop(wrapper, [image(), image('segunda.png')])
  await flushPromises()
  expect(mocks.upload).toHaveBeenCalledTimes(2)
  expect(mocks.start).toHaveBeenCalledOnce()
  expect(mocks.error).toHaveBeenCalledWith('Falha no envio', '1 enviada(s), 1 com falha. Espaço insuficiente')
  await drop(wrapper, [image()])
  await flushPromises()
  expect(mocks.upload).toHaveBeenCalledTimes(3)
})

it('exceção encerra progresso e libera o container; seleção por input ainda abre preparação', async () => {
  mocks.upload.mockRejectedValueOnce(new Error('Sem conexão'))
  const wrapper = render()
  await drop(wrapper, [image()])
  await flushPromises()
  expect(mocks.error).toHaveBeenCalledWith('Falha ao enviar imagem', 'Sem conexão')
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [image()] })
  await input.trigger('change')
  expect(wrapper.get('.photo-viewer').attributes('data-visible')).toBe('true')
})

it('destaque de arraste termina ao sair ou soltar, sem aparecer em somente leitura', async () => {
  const wrapper = render()
  await wrapper.get('.attachments-container').trigger('dragenter', { dataTransfer: { types: ['Files'] } })
  expect(wrapper.get('[role="status"]').text()).toContain('Solte as imagens')
  await wrapper.get('.attachments-container').trigger('dragleave')
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
  await wrapper.setProps({ disabled: true })
  await wrapper.get('.attachments-container').trigger('dragenter', { dataTransfer: { types: ['Files'] } })
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
})

it('lote sem prontuário reaproveita somente o registro criado pelo próprio envio', async () => {
  mocks.upload.mockResolvedValue({ success: true, data: { record: { _id: 'created-record' } } })
  const wrapper = render({ record: null })
  await drop(wrapper, [image(), image('segunda.png')])
  await flushPromises()
  expect(mocks.upload.mock.calls[0][0]).toBeUndefined()
  expect(mocks.upload.mock.calls[1][0]).toBe('created-record')
})

it('fotos preparadas preservam metadados e montagens usam o mesmo progresso', async () => {
  const wrapper = render()
  wrapper.getComponent('.photo-viewer').vm.$emit('upload', [{ file: image(), description: 'Evolução', tags: ['antes'] }])
  await flushPromises()
  expect(mocks.upload.mock.calls[0][3]).toMatchObject({ description: 'Evolução', tags: ['antes'], isMontage: false })
  wrapper.getComponent({ name: 'MontageEditor' }).vm.$emit('save', image('montagem.png'))
  await flushPromises()
  expect(mocks.upload.mock.calls[1][3]).toMatchObject({ isMontage: true, onUploadProgress: expect.any(Function) })
  expect(mocks.start).toHaveBeenCalledTimes(2)
})
