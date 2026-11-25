import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import TemplateEditor from '@/components/pages/marketing/TemplateEditor.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const mocks = vi.hoisted(() => ({ store: null, toast: { error: vi.fn() } }))
vi.mock('@/stores/crmTemplates', () => ({ useCrmTemplatesStore: () => mocks.store }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: {} }) }))
vi.mock('@/stores/clinic', () => ({ useClinicStore: () => ({ currentClinic: { name: 'Clínica de teste' } }) }))
vi.mock('vue-toastification', () => ({ useToast: () => mocks.toast }))
let wrapper
const fixture = (button) => ({ name: 'Lembrete de amanhã', content: 'Olá, confirme sua consulta.',
  interactive: { enabled: true, type: 'buttons', buttons: [button] } })
async function open(button) {
  mocks.store.getTemplateById.mockResolvedValue({ success: true, data: fixture(button) })
  wrapper = mount(TemplateEditor, { props: { templateId: 'template' }, attachTo: document.body })
  await flushPromises()
}
async function save() {
  await wrapper.findAll('button').find(b => b.text().includes('Salvar modelo')).trigger('click')
  await flushPromises()
  return mocks.store.updateTemplate.mock.calls[0][1]
}
beforeEach(() => {
  mocks.store = reactive({ isLoading: false, availableVariables: [], fetchVariables: vi.fn(),
    getTemplateById: vi.fn(), updateTemplate: vi.fn().mockResolvedValue({ success: true }), createTemplate: vi.fn() })
})
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.clearAllMocks() })

it('permite escolher Confirmar consulta, preenche o texto e salva a ação no botão', async () => {
  await open({ type: 'reply', displayText: '', id: '' })
  wrapper.findComponent(StyledSelect).vm.$emit('update:modelValue', 'confirm_appointment')
  await flushPromises()
  expect(wrapper.get('input[aria-label="Texto do botão 1"]').element.value).toBe('Confirmar consulta')
  expect(wrapper.find('input[aria-label="ID interno do botão 1"]').exists()).toBe(false)
  expect(wrapper.text()).toContain('Envios de teste não alteram atendimentos')
  const payload = await save()
  expect(payload.interactive.buttons[0]).toMatchObject({ type: 'reply', action: 'confirm_appointment', displayText: 'Confirmar consulta' })
  expect(wrapper.emitted('save')).toHaveLength(1)
})

it('mantém a ação ao reabrir e preserva o texto personalizado', async () => {
  await open({ type: 'reply', displayText: 'Vou comparecer', action: 'confirm_appointment' })
  expect(wrapper.findComponent(StyledSelect).props('modelValue')).toBe('confirm_appointment')
  expect((await save()).interactive.buttons[0]).toMatchObject({ action: 'confirm_appointment', displayText: 'Vou comparecer' })
})

it('modelos antigos continuam como resposta comum e link não carrega ação clínica', async () => {
  await open({ type: 'reply', displayText: 'Mais informações', id: 'info' })
  expect(wrapper.findComponent(StyledSelect).props('modelValue')).toBe('none')
  expect((await save()).interactive.buttons[0]).toMatchObject({ action: 'none', id: 'info' })
  mocks.store.updateTemplate.mockClear()
  wrapper.findComponent(StyledSelect).vm.$emit('update:modelValue', 'confirm_appointment')
  await wrapper.findAll('.button-type-control button').find(b => b.text() === 'Link').trigger('click')
  await wrapper.get('input[aria-label="URL do botão 1"]').setValue('https://example.test')
  expect((await save()).interactive.buttons[0]).toMatchObject({ type: 'url', action: 'none' })
})
