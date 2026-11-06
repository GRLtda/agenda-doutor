import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PatientGalleryWorkspace from '@/views/pages/pacientes/components/PatientGalleryWorkspace.vue'

const mocks = vi.hoisted(() => ({
  files: vi.fn(),
  folders: vi.fn(),
  appointments: vi.fn(),
  tags: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  removeFolder: vi.fn(),
  move: vi.fn(),
  detail: vi.fn(),
  removeFile: vi.fn(),
  uploadPhoto: vi.fn(),
  start: vi.fn(),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/api/gallery', async (original) => ({
  ...(await original()),
  listGalleryFiles: mocks.files,
  listGalleryFolders: mocks.folders,
  listAppointmentFolders: mocks.appointments,
  listGalleryTags: mocks.tags,
  createGalleryFolder: mocks.create,
  renameGalleryFolder: mocks.rename,
  deleteGalleryFolder: mocks.removeFolder,
  moveGalleryFiles: mocks.move,
  getGalleryItem: mocks.detail,
  deleteGalleryFile: mocks.removeFile,
  uploadPatientPhoto: mocks.uploadPhoto,
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ upload: mocks.start, success: mocks.success, error: mocks.error }),
}))
vi.mock('@/components/pages/appointments/PhotoViewerUpload.vue', () => ({
  default: {
    name: 'PhotoViewerUpload',
    props: ['visible', 'files'],
    emits: ['close', 'upload'],
    template: '<div class="prepare-photos" :data-visible="visible" />',
  },
}))
vi.mock('@/views/pages/pacientes/components/MediaViewerModal.vue', () => ({
  default: {
    name: 'MediaViewerModal',
    props: ['show', 'file'],
    template: '<div class="viewer" :data-visible="show" />',
  },
}))
vi.mock('@/components/pages/patients/GalleryFolderSelect.vue', () => ({
  default: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select class="folder-destination" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">Sem pasta</option><option value="folder">Evolução</option></select>',
  },
}))

let wrappers = []
const sample = (id = 'photo') => ({
  _id: id,
  fileType: 'image',
  metadata: { originalName: `${id}.png`, tags: ['antes'] },
  createdAt: '2026-11-06T12:00:00Z',
  thumbnailUrl: '/thumb.png',
  originalUrl: '/original.png',
})
const result = (files = [sample()], page = 1, total = files.length) => ({
  files,
  pagination: { total, page, limit: 20, totalPages: Math.ceil(total / 20) || 1 },
})
const image = (name) => new File(['image'], name, { type: 'image/png' })
const findButton = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text() === text)
const render = (props = {}) => {
  const wrapper = mount(PatientGalleryWorkspace, {
    props: { patientId: 'patient-a', ...props },
    attachTo: document.body,
    global: { stubs: { Teleport: true, StyledMultiSelect: true } },
  })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.files.mockResolvedValue(result())
  mocks.folders.mockResolvedValue([{ _id: 'folder', name: 'Evolução', fileCount: 1 }])
  mocks.appointments.mockResolvedValue([])
  mocks.tags.mockResolvedValue([])
  mocks.create.mockResolvedValue({ _id: 'created', name: 'Antes' })
  mocks.move.mockResolvedValue({})
  mocks.removeFolder.mockResolvedValue({})
  mocks.detail.mockResolvedValue(sample())
  mocks.uploadPhoto.mockResolvedValue({})
  mocks.start.mockReturnValue({ update: mocks.update, success: mocks.success, error: mocks.error })
})
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers = []
  document.body.innerHTML = ''
})

it('busca e paginação vão para a API, encontrando fotos fora da página atual', async () => {
  mocks.files.mockResolvedValue(result([sample()], 1, 41))
  const wrapper = render()
  await flushPromises()
  await wrapper.get('input[aria-label="Buscar arquivos"]').setValue('evolução')
  await new Promise((resolve) => setTimeout(resolve, 300))
  await flushPromises()
  expect(mocks.files).toHaveBeenLastCalledWith(
    'patient-a',
    expect.objectContaining({ search: 'evolução', page: 1 }),
    expect.anything(),
  )
  wrapper.findComponent({ name: 'AppPagination' }).vm.$emit('page-change', 2)
  await flushPromises()
  expect(mocks.files).toHaveBeenLastCalledWith(
    'patient-a',
    expect.objectContaining({ search: 'evolução', page: 2 }),
    expect.anything(),
  )
})

it('troca de paciente ignora a resposta atrasada e limpa a seleção anterior', async () => {
  let resolveOld
  mocks.files
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    .mockResolvedValue(result([sample('novo')]))
  const wrapper = render()
  await wrapper.setProps({ patientId: 'patient-b' })
  await flushPromises()
  resolveOld(result([sample('antigo')]))
  await flushPromises()
  expect(wrapper.text()).toContain('novo.png')
  expect(wrapper.text()).not.toContain('antigo.png')
})

it('galeria vazia continua oferecendo upload e criação de pasta', async () => {
  mocks.files.mockResolvedValue(result([]))
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('Nenhum arquivo por aqui')
  expect(findButton(wrapper, 'Adicionar fotos').attributes('disabled')).toBeUndefined()
  await findButton(wrapper, 'Nova pasta').trigger('click')
  await wrapper.get('input[maxlength="80"]').setValue('Antes')
  await wrapper.get('form.gallery-form').trigger('submit')
  await flushPromises()
  expect(mocks.create).toHaveBeenCalledWith('patient-a', 'Antes')
})

it('mover fotos altera apenas a pasta sem excluir nem reenviar arquivos', async () => {
  const wrapper = render()
  await flushPromises()
  await findButton(wrapper, 'Selecionar').trigger('click')
  await wrapper.get('.media-open').trigger('click')
  await findButton(wrapper, 'Mover para pasta').trigger('click')
  await wrapper.get('.folder-destination').setValue('folder')
  await wrapper.get('form.gallery-form').trigger('submit')
  await flushPromises()
  expect(mocks.move).toHaveBeenCalledWith('patient-a', ['photo'], 'folder')
  expect(mocks.removeFile).not.toHaveBeenCalled()
  expect(mocks.uploadPhoto).not.toHaveBeenCalled()
})

it('excluir uma pasta preserva suas fotos na visualização Todas as fotos', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.findAll('.gallery-tabs button')[1].trigger('click')
  await wrapper.get('.folder-card').trigger('contextmenu', { clientX: 120, clientY: 100 })
  await flushPromises()
  await wrapper.get('button[aria-label="Excluir pasta Evolução"]').trigger('click')
  expect(wrapper.text()).toContain('Os arquivos continuarão disponíveis em Todas as fotos')
  await findButton(wrapper, 'Confirmar exclusão').trigger('click')
  await flushPromises()
  expect(mocks.removeFolder).toHaveBeenCalledWith('patient-a', 'folder')
  expect(mocks.removeFile).not.toHaveBeenCalled()
})

it('pastas usam o ícone antigo e mostram ações somente no clique direito', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.findAll('.gallery-tabs button')[1].trigger('click')
  await flushPromises()
  expect(wrapper.get('.folder-icon').attributes('src')).toContain('folder-icon-macos.webp')
  expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  expect(wrapper.find('.folder-menu').exists()).toBe(false)
  await wrapper.get('.folder-card').trigger('contextmenu', { clientX: 120, clientY: 100 })
  await flushPromises()
  expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(2)
  await wrapper.get('button[aria-label="Renomear Evolução"]').trigger('click')
  await flushPromises()
  expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  expect(wrapper.get('input[maxlength="80"]').element.value).toBe('Evolução')
})

it('menu das pastas abre pelo teclado e fecha com Escape ou clique fora', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.findAll('.gallery-tabs button')[1].trigger('click')
  await wrapper.get('.folder-open').trigger('keydown', { key: 'F10', shiftKey: true })
  await flushPromises()
  expect(wrapper.find('[role="menu"]').exists()).toBe(true)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await flushPromises()
  expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  await wrapper.get('.folder-card').trigger('contextmenu', { clientX: 120, clientY: 100 })
  await flushPromises()
  document.body.click()
  await flushPromises()
  expect(wrapper.find('[role="menu"]').exists()).toBe(false)
})

it('seletor respeita fotos já anexadas, limite e envia somente IDs', async () => {
  mocks.files.mockResolvedValue(result([sample('anexada'), sample('nova'), sample('extra')]))
  const wrapper = render({ picker: true, maxSelection: 1, excludedIds: ['anexada'] })
  await flushPromises()
  const cards = wrapper.findAll('.media-open')
  expect(cards[0].attributes('disabled')).toBeDefined()
  await cards[1].trigger('click')
  await cards[2].trigger('click')
  expect(wrapper.text()).toContain('Selecione até 1 foto(s)')
  await findButton(wrapper, 'Anexar 1 foto(s)').trigger('click')
  expect(wrapper.emitted('choose')).toEqual([[['nova']]])
  expect(mocks.uploadPhoto).not.toHaveBeenCalled()
})

it('arraste prepara fotos e falha parcial reenvia somente as fotos com falha', async () => {
  mocks.uploadPhoto.mockRejectedValueOnce(new Error('Sem espaço')).mockResolvedValue({})
  const wrapper = render()
  await flushPromises()
  const first = image('primeira.png'),
    second = image('segunda.png')
  await wrapper
    .get('.patient-gallery')
    .trigger('drop', { dataTransfer: { files: [first, second] } })
  expect(wrapper.get('.prepare-photos').attributes('data-visible')).toBe('true')
  wrapper.getComponent({ name: 'PhotoViewerUpload' }).vm.$emit('upload', [
    { file: first, tags: ['antes'], description: 'Antes' },
    { file: second, tags: [], description: '' },
  ])
  await flushPromises()
  expect(mocks.uploadPhoto).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('1 foto(s) não foram enviadas')
  await findButton(wrapper, 'Reenviar com falha').trigger('click')
  await flushPromises()
  expect(mocks.uploadPhoto).toHaveBeenCalledTimes(3)
  expect(mocks.uploadPhoto.mock.calls[2][1]).toMatchObject({
    file: first,
    description: 'Antes',
    tags: ['antes'],
  })
})

it('foto com vínculo clínico não desaparece quando a API bloqueia a exclusão', async () => {
  mocks.removeFile.mockRejectedValue(
    new Error('Desvincule o arquivo dos atendimentos antes de excluí-lo.'),
  )
  const wrapper = render()
  await flushPromises()
  await findButton(wrapper, 'Selecionar').trigger('click')
  await wrapper.get('.media-open').trigger('click')
  await findButton(wrapper, 'Excluir arquivos').trigger('click')
  await findButton(wrapper, 'Confirmar exclusão').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Desvincule o arquivo dos atendimentos')
  expect(wrapper.findAll('.media-card')).toHaveLength(1)
})

it('abre o visualizador com detalhes atualizados e permite renovar miniatura com falha', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.get('.media-open').trigger('click')
  await flushPromises()
  expect(mocks.detail).toHaveBeenCalledWith('photo')
  expect(wrapper.get('.viewer').attributes('data-visible')).toBe('true')
  const img = wrapper.get('.media-image img')
  await img.trigger('error')
  await img.trigger('error')
  expect(wrapper.text()).toContain('Recarregar imagem')
  await findButton(wrapper, 'Recarregar imagem').trigger('click')
  await flushPromises()
  expect(wrapper.find('.media-image img').exists()).toBe(true)
})

it('mostra apenas duas abas, sem repetir títulos nem paginar uma única página', async () => {
  const wrapper = render()
  await flushPromises()
  expect(wrapper.findAll('.gallery-tabs button').map((button) => button.text())).toEqual([
    'Todas as fotos',
    'Minhas pastas 1',
  ])
  expect(wrapper.find('.section-heading').exists()).toBe(false)
  expect(wrapper.find('[aria-label="Paginação"]').exists()).toBe(false)
  await wrapper.findAll('.gallery-tabs button')[1].trigger('click')
  await flushPromises()
  expect(wrapper.find('.section-heading').exists()).toBe(false)
  await wrapper.get('.folder-open').trigger('click')
  await flushPromises()
  expect(wrapper.get('.section-heading').text()).toContain('Evolução')
})

it('múltiplas páginas usam uma navegação sem campo de página duplicado', async () => {
  mocks.files.mockResolvedValue(result([sample()], 1, 41))
  const wrapper = render()
  await flushPromises()
  expect(wrapper.findAll('[aria-label="Paginação"]')).toHaveLength(1)
  expect(wrapper.find('[aria-label="Número da página"]').exists()).toBe(false)
  expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
})

it('filtros usam seletor e calendário compartilhados e enviam o período completo', async () => {
  const wrapper = render()
  await flushPromises()
  expect(wrapper.find('.gallery-filters select').exists()).toBe(false)
  expect(wrapper.find('input[type="date"]').exists()).toBe(false)
  expect(wrapper.findComponent({ name: 'StyledSelect' }).exists()).toBe(true)
  const picker = wrapper.getComponent({ name: 'AppDateRangePicker' })
  picker.vm.$emit('update:modelValue', [new Date(2026, 10, 1), new Date(2026, 10, 6)])
  await new Promise((resolve) => setTimeout(resolve, 300))
  await flushPromises()
  const params = mocks.files.mock.calls.at(-1)[1]
  expect(new Date(params.from)).toEqual(new Date(2026, 10, 1))
  expect(new Date(params.to)).toEqual(new Date(2026, 10, 7))
})
