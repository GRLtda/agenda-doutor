import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  galleryImageCandidates,
  objectUrlForMislabeledImage,
  preserveGalleryRecord,
  recoverGalleryImage,
  sniffImageMime,
} from '@/utils/galleryImage'
import MediaViewerModal from '@/views/pages/pacientes/components/MediaViewerModal.vue'
import PatientGalleryWorkspace from '@/views/pages/pacientes/components/PatientGalleryWorkspace.vue'

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  files: vi.fn(),
  folders: vi.fn(),
  appointments: vi.fn(),
  tags: vi.fn(),
  removeFile: vi.fn(),
}))

vi.mock('@/api/gallery', async (original) => ({
  ...(await original()),
  getGalleryItem: mocks.detail,
  listGalleryFiles: mocks.files,
  listGalleryFolders: mocks.folders,
  listAppointmentFolders: mocks.appointments,
  listGalleryTags: mocks.tags,
  deleteGalleryFile: mocks.removeFile,
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ upload: vi.fn(), success: vi.fn(), error: vi.fn() }),
}))
vi.mock('@/components/pages/appointments/PhotoViewerUpload.vue', () => ({
  default: { template: '<div />' },
}))

const jpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
const webp = () => {
  const bytes = new Uint8Array(16)
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  return bytes
}
const response = (bytes, status, type) =>
  new Response(bytes, { status, headers: { 'content-type': type } })

let wrappers = []
beforeEach(() => {
  vi.restoreAllMocks()
  mocks.detail.mockReset()
  mocks.files.mockReset()
  mocks.folders.mockReset()
  mocks.appointments.mockReset()
  mocks.tags.mockReset()
  mocks.removeFile.mockReset()
  mocks.folders.mockResolvedValue([])
  mocks.appointments.mockResolvedValue([])
  mocks.tags.mockResolvedValue([])
  mocks.removeFile.mockResolvedValue({})
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:synthetic'
    URL.revokeObjectURL = () => {}
  }
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
})

it('ordena endereços do mesmo arquivo e descarta destinos inseguros ou repetidos', () => {
  const file = {
    thumbnailUrl: ' /thumb.webp ',
    previewUrl: '/thumb.webp',
    signedUrl: 'https://cdn.example.test/signed.webp',
    originalUrl: 'https://cdn.example.test/original.webp',
    url: '/legacy.webp',
    extra: 'javascript:alert(1)',
    other: 'https://cdn.example.test/another-patient.webp',
  }
  expect(galleryImageCandidates(file, 'full')).toEqual([
    'https://cdn.example.test/original.webp',
    '/legacy.webp',
    'https://cdn.example.test/signed.webp',
    '/thumb.webp',
  ])
  expect(galleryImageCandidates(file, 'thumb')[0]).toBe('/thumb.webp')
  expect(galleryImageCandidates({ originalUrl: '//cdn.example.test/file.webp', signedUrl: 'data:text/html,hi' }, 'full')).toEqual([])
})

it('reconhece a assinatura real e só reapresenta quando o tipo declarado discorda', async () => {
  expect(sniffImageMime(jpeg())).toBe('image/jpeg')
  expect(sniffImageMime(webp())).toBe('image/webp')
  expect(sniffImageMime(new TextEncoder().encode('<html>indisponivel</html>'))).toBe('')

  const fetchImpl = vi.fn(async () => response(jpeg(), 200, 'image/webp'))
  const relabeled = await objectUrlForMislabeledImage('https://cdn.example.test/registro.webp', fetchImpl)
  expect(relabeled.startsWith('blob:')).toBe(true)
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://cdn.example.test/registro.webp',
    expect.objectContaining({ credentials: 'omit' }),
  )
  expect(fetchImpl.mock.calls[0][1].headers).toBeUndefined()

  const matching = vi.fn(async () => response(webp(), 200, 'image/webp; charset=binary'))
  expect(await objectUrlForMislabeledImage('https://cdn.example.test/ok.webp', matching)).toBe('')
  const html = vi.fn(async () => response(new TextEncoder().encode('<html>erro</html>'), 200, 'text/html'))
  expect(await objectUrlForMislabeledImage('https://cdn.example.test/erro.webp', html)).toBe('')
  const missing = vi.fn(async () => response(jpeg(), 404, 'image/jpeg'))
  expect(await objectUrlForMislabeledImage('https://cdn.example.test/ausente.webp', missing)).toBe('')
})

it('mantém a data histórica ao renovar e segue para um endereço ainda não tentado', async () => {
  const current = {
    _id: 'arquivo',
    createdAt: '2020-04-02T15:00:00.000Z',
    originalUrl: 'https://cdn.example.test/original.webp',
    patient: { _id: 'paciente-sintetico' },
  }
  const failed = new Set(['https://cdn.example.test/original.webp'])
  const result = await recoverGalleryImage({
    file: current,
    failed,
    refresh: async () => ({
      createdAt: '2026-11-06T12:00:00.000Z',
      originalUrl: current.originalUrl,
      signedUrl: 'https://cdn.example.test/signed.webp',
      patient: { _id: 'outro' },
    }),
  })
  expect(result.url).toBe('https://cdn.example.test/signed.webp')
  expect(result.file.createdAt).toBe(current.createdAt)
  expect(result.file.patient._id).toBe('paciente-sintetico')
  expect(preserveGalleryRecord(current, { createdAt: '2026-11-06T00:00:00.000Z' }).createdAt).toBe(current.createdAt)
})

async function renderViewer(file) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/atendimento/:appointmentId/:patientId',
        name: 'atendimento-em-andamento',
        component: { template: '<div />' },
      },
    ],
  })
  const wrapper = mount(MediaViewerModal, {
    props: { show: true, file },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

it('usa o endereço assinado quando miniatura e original migrados não renderizam', async () => {
  const file = {
    _id: 'migrado',
    fileType: 'image',
    createdAt: '2020-04-02T15:00:00.000Z',
    metadata: { originalName: 'registro.webp', sizeBytes: 120000, tags: ['migrado', 'cloudinary-legacy', 'antes'] },
    thumbnailUrl: '/thumb-indisponivel.webp',
    originalUrl: '/original-indisponivel.webp',
    signedUrl: '/assinado.webp',
  }
  const wrapper = await renderViewer(file)
  expect(wrapper.get('img').attributes('src')).toBe('/original-indisponivel.webp')
  await wrapper.get('img').trigger('error')
  await flushPromises()
  expect(wrapper.get('img').attributes('src')).toBe('/assinado.webp')
  expect(wrapper.text()).not.toContain('A imagem não está disponível')
  expect(wrapper.text()).toContain('antes')
  expect(wrapper.text()).not.toContain('cloudinary-legacy')
  expect(file.createdAt).toBe('2020-04-02T15:00:00.000Z')
  expect(mocks.detail).not.toHaveBeenCalled()
  expect(mocks.removeFile).not.toHaveBeenCalled()
})

it('reapresenta bytes JPEG rotulados como webp sem alterar a data exibida', async () => {
  const fetchImpl = vi.fn(async () => response(jpeg(), 200, 'image/webp'))
  vi.stubGlobal('fetch', fetchImpl)
  const file = {
    _id: 'rotulo',
    createdAt: '2020-04-02T15:00:00.000Z',
    metadata: { originalName: 'registro.webp', sizeBytes: 98000 },
    originalUrl: 'https://cdn.example.test/registro.webp',
  }
  mocks.detail.mockResolvedValue({ ...file, createdAt: '2026-11-06T12:00:00.000Z' })
  const wrapper = await renderViewer(file)
  await wrapper.get('img').trigger('error')
  await flushPromises()
  expect(wrapper.get('img').attributes('src')?.startsWith('blob:')).toBe(true)
  expect(wrapper.text()).not.toContain('Não foi possível carregar a imagem')
  expect(wrapper.text()).toContain('2020')
  expect(file.createdAt).toBe('2020-04-02T15:00:00.000Z')
  expect(mocks.removeFile).not.toHaveBeenCalled()
})

it('informa indisponibilidade estável quando não há outro endereço nem imagem reconhecível', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response(new TextEncoder().encode('<html>erro</html>'), 200, 'text/html')))
  const file = {
    _id: 'estavel',
    createdAt: '2020-04-02T15:00:00.000Z',
    originalUrl: 'https://cdn.example.test/estavel.webp',
  }
  mocks.detail.mockResolvedValue({ ...file })
  const wrapper = await renderViewer(file)
  await wrapper.get('img').trigger('error')
  await flushPromises()
  expect(wrapper.text()).toContain('A imagem não está disponível. Tente novamente mais tarde.')
  await wrapper.get('.viewer-error button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('A imagem não está disponível. Tente novamente mais tarde.')
  expect(mocks.detail).toHaveBeenCalledTimes(2)
})

it('a grade percorre miniatura, original e endereço assinado antes de desistir', async () => {
  const migrated = {
    _id: 'grade',
    fileType: 'image',
    createdAt: '2020-04-02T15:00:00.000Z',
    metadata: { originalName: 'registro.webp', tags: ['migrado'] },
    thumbnailUrl: '/thumb-indisponivel.webp',
    originalUrl: '/original-indisponivel.webp',
    signedUrl: '/assinado.webp',
  }
  mocks.files.mockResolvedValue({
    files: [migrated],
    pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
  })
  const wrapper = mount(PatientGalleryWorkspace, {
    props: { patientId: 'paciente-sintetico' },
    global: { stubs: { Teleport: true, StyledMultiSelect: true } },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.get('.media-image img').attributes('src')).toBe('/thumb-indisponivel.webp')
  await wrapper.get('.media-image img').trigger('error')
  await flushPromises()
  expect(wrapper.get('.media-image img').attributes('src')).toBe('/assinado.webp')
  expect(wrapper.text()).not.toContain('Imagem indisponível')
  expect(wrapper.text()).toContain('2020')
  expect(migrated.createdAt).toBe('2020-04-02T15:00:00.000Z')
  expect(mocks.removeFile).not.toHaveBeenCalled()
  expect(mocks.detail).not.toHaveBeenCalled()
})
