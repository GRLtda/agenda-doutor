import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRecordsStore } from '@/stores/records'
const client = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/api/index', () => ({ default: client }))
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })

it('encaminha progresso ao Axios sem enviar callback nos metadados e aguarda persistência', async () => {
  let resolve
  client.post.mockReturnValue(new Promise(done => { resolve = done }))
  const progress = vi.fn()
  const store = useRecordsStore()
  const pending = store.uploadAttachmentImage('record', new File(['image'], 'foto.png'), {}, { onUploadProgress: progress, tags: ['antes'] })
  const [url, form, config] = client.post.mock.calls[0]
  expect(url).toBe('/records/record/attachments/image')
  expect(config.onUploadProgress).toBe(progress)
  expect(Array.from(form.keys())).toEqual(['image', 'tags'])
  config.onUploadProgress({ loaded: 60, total: 100 })
  expect(progress).toHaveBeenCalledWith({ loaded: 60, total: 100 })
  expect(store.currentRecord).toBeNull()
  resolve({ data: { record: { _id: 'record', attachments: [{ _id: 'image' }] } } })
  expect((await pending).success).toBe(true)
  expect(store.currentRecord.attachments).toHaveLength(1)
})

it('encaminha a pasta no upload do atendimento', async () => {
  client.post.mockResolvedValue({ data: { record: { _id: 'record', attachments: [] } } })
  await useRecordsStore().uploadAttachmentImage('record', new File(['image'], 'foto.png'), {}, { galleryFolder: 'folder' })
  expect(client.post.mock.calls[0][1].get('galleryFolder')).toBe('folder')
})

it('reutiliza fotos por ID e cria o prontuário apenas quando necessário', async () => {
  client.post.mockResolvedValueOnce({ data: { _id: 'new-record', attachments: [] } }).mockResolvedValueOnce({ data: { _id: 'new-record', attachments: [{ _id: 'photo' }] } })
  const store = useRecordsStore()
  expect((await store.attachGalleryPhotos(null, ['photo'], { patientId: 'patient', appointmentId: 'appointment' })).success).toBe(true)
  expect(client.post.mock.calls[0][0]).toBe('/records')
  expect(client.post.mock.calls[1]).toEqual(['/records/new-record/attachments', { uploadIds: ['photo'] }])
  expect(store.currentRecord.attachments).toHaveLength(1)
})

it('resposta atrasada de upload não sobrescreve outro prontuário aberto', async () => {
  let resolve
  client.post.mockReturnValue(new Promise(done => { resolve = done }))
  const store = useRecordsStore()
  store.currentRecord = { _id: 'old', attachments: [] }
  const pending = store.uploadAttachmentImage('old', new File(['image'], 'foto.png'), {})
  store.currentRecord = { _id: 'new', attachments: [] }
  resolve({ data: { record: { _id: 'old', attachments: [{ _id: 'photo' }] } } })
  await pending
  expect(store.currentRecord._id).toBe('new')
})
