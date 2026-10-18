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
