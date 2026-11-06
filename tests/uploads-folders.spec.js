import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GalleryFolderSelect from '@/components/pages/patients/GalleryFolderSelect.vue'

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }))
vi.mock('@/api/gallery', () => ({
  listGalleryFolders: api.list,
  createGalleryFolder: api.create,
  galleryError: (error) => error.message,
}))
let wrappers = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0))
  api.list.mockResolvedValue([
    { _id: 'test', name: 'Teste' },
    { _id: 'before', name: 'Antes e depois' },
  ])
})
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers = []
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})
function render(props = {}, target = document.body) {
  const wrapper = mount(GalleryFolderSelect, {
    props: { patientId: 'patient', modelValue: 'test', ...props },
    attachTo: target,
  })
  wrappers.push(wrapper)
  return wrapper
}

it('abre a lista de outras pastas sem desabilitar o controle durante atualização', async () => {
  const wrapper = render()
  await flushPromises()
  let resolve
  api.list.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  await wrapper.get('[role="combobox"]').trigger('click')
  expect(wrapper.get('[role="combobox"]').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
  const options = [...document.querySelectorAll('[role="option"]')]
  expect(options.map((option) => option.textContent.trim())).toEqual([
    'Sem pasta',
    'Teste',
    'Antes e depois',
  ])
  options[2].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toEqual([['before']])
  resolve([
    { _id: 'test', name: 'Teste' },
    { _id: 'before', name: 'Antes e depois' },
  ])
  await flushPromises()
  expect(api.list).toHaveBeenCalledTimes(2)
})

it('aplica aparência escura também ao menu de pastas', async () => {
  const wrapper = render({ dark: true })
  await flushPromises()
  expect(wrapper.get('.folder-select').classes()).toContain('dark')
  expect(wrapper.get('.form-group').classes()).toContain('is-dark')
  await wrapper.get('[role="combobox"]').trigger('click')
  expect(document.querySelector('[role="listbox"]').classList.contains('is-dark')).toBe(true)
  expect(wrapper.find('select').exists()).toBe(false)
})

it('menu fica dentro do diálogo para não sumir atrás da camada modal', async () => {
  const dialog = document.createElement('dialog')
  document.body.appendChild(dialog)
  const wrapper = render({}, dialog)
  await flushPromises()
  await wrapper.get('[role="combobox"]').trigger('click')
  expect(dialog.querySelector('[role="listbox"]')).not.toBeNull()
})

it('escolher outra pasta não dispara recarregamentos e respeita bloqueio explícito', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.setProps({ modelValue: 'before' })
  expect(api.list).toHaveBeenCalledTimes(1)
  expect(wrapper.get('[role="combobox"]').text()).toContain('Antes e depois')
  await wrapper.setProps({ disabled: true })
  expect(wrapper.get('[role="combobox"]').attributes('disabled')).toBeDefined()
})
