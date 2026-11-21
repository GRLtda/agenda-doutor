import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordRefinementReview from '@/components/pages/appointments/RecordRefinementReview.vue'
import RecordRefineButton from '@/components/pages/appointments/RecordRefineButton.vue'
import { markChangedWords, sanitizeRecordHtml } from '@/utils/recordHtml'

const original = '<p>Aplicado 2 ml de toxina na regiao frontal, sem intercorrencias.</p>'
const refined = '<p>Aplicados 2 ml de toxina na região frontal, sem intercorrências.</p>'
let wrapper
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

it('destaca somente as palavras ajustadas e preserva as tags', () => {
  const result = markChangedWords(original, refined)
  expect(result.changed).toBe(3)
  expect(result.html).toContain('<mark>Aplicados</mark>')
  expect(result.html).toContain('<mark>região</mark>')
  expect(result.html).not.toContain('<mark>2</mark>')
  expect(result.html).toMatch(/^<p>.*<\/p>$/)
})

it('remove scripts, atributos e eventos do texto exibido na revisão', () => {
  const html = sanitizeRecordHtml('<p onclick="x()" style="color:red">Oi <script>alert(1)</script><img src=x onerror=alert(1)><strong>forte</strong></p>')
  expect(html).toBe('<p>Oi <strong>forte</strong></p>')
})

const mountReview = (props = {}) => mount(RecordRefinementReview, {
  props: { originalContent: original, refinedContent: refined, ...props },
  attachTo: document.body,
  global: { stubs: { LiaAvatar: true, Teleport: true } },
})

it('mostra o texto original ao lado da sugestão e permite aceitar ou manter', async () => {
  wrapper = mountReview()
  expect(wrapper.text()).toContain('Seu texto')
  expect(wrapper.text()).toContain('Sugestão da Lia')
  expect(wrapper.text()).toContain('3 palavras ajustadas')
  expect(wrapper.text()).toContain('sem nome, CPF, telefone ou e-mail')
  const buttons = wrapper.findAll('button')
  await buttons.find(item => item.text() === 'Aceitar melhoria').trigger('click')
  expect(wrapper.emitted('accept')).toHaveLength(1)
  await buttons.find(item => item.text() === 'Manter meu texto').trigger('click')
  expect(wrapper.emitted('reject')).toHaveLength(1)
})

it('Esc e clique fora recusam a sugestão, mas não enquanto está aceitando', async () => {
  wrapper = mountReview()
  await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
  await wrapper.get('.review-overlay').trigger('click')
  expect(wrapper.emitted('reject')).toHaveLength(2)
  await wrapper.setProps({ accepting: true })
  await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
  expect(wrapper.emitted('reject')).toHaveLength(2)
})

it('o diálogo é acessível e nunca interpreta HTML do prontuário', () => {
  wrapper = mountReview({ originalContent: '<p>Texto <img src=x onerror=alert(1)></p>', refinedContent: '<p>Texto <script>alert(1)</script></p>' })
  expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.find('script').exists()).toBe(false)
})

it('o botão mostra o estado de trabalho e não dispara enquanto a Lia refina', async () => {
  const button = mount(RecordRefineButton, { props: { loading: false, disabled: false }, global: { stubs: { AppButton: { template: '<button><slot /></button>' } } } })
  expect(button.text()).toContain('Refinar com IA')
  await button.get('button').trigger('click')
  expect(button.emitted('click')).toHaveLength(1)
  await button.setProps({ loading: true })
  expect(button.text()).toContain('Lia está refinando')
  expect(button.classes()).toContain('is-loading')
  button.unmount()
})

it('mostra a organização em títulos e listas sem contar o título como palavra ajustada', () => {
  const organized = '<h2>Procedimento realizado</h2><p>Aplicados 2 ml de toxina na região frontal.</p><h2>Orientações</h2><ul><li>Não tocar na região.</li><li>Evitar exercício.</li></ul>'
  const result = markChangedWords('<p>Aplicado 2 ml de toxina na regiao frontal. Nao tocar na regiao. Evitar exercicio.</p>', organized)
  expect(result.html).toContain('<h2>Procedimento realizado</h2>')
  expect(result.html).toContain('<ul><li>')
  expect(result.html).not.toContain('<mark>Procedimento')
  expect(result.changed).toBe(5)
  wrapper = mountReview({ originalContent: '<p>Texto original simples.</p>', refinedContent: organized })
  expect(wrapper.find('.is-suggestion h2').exists()).toBe(true)
  expect(wrapper.findAll('.is-suggestion li')).toHaveLength(2)
})

it('o botão fica fixo ao lado da barra de formatação, fora da área que rola', async () => {
  const { default: EditorToolbar } = await import('@/components/shared/EditorToolbar.vue')
  const editor = { isActive: () => false, chain: () => ({ focus: () => ({}) }) }
  const withButton = mount(EditorToolbar, { props: { editor }, slots: { actions: '<button class="slot-button">Refinar</button>' } })
  expect(withButton.find('.editor-toolbar-shell.has-actions').exists()).toBe(true)
  expect(withButton.find('.toolbar-actions .slot-button').exists()).toBe(true)
  expect(withButton.find('.editor-toolbar .slot-button').exists()).toBe(false)
  const plain = mount(EditorToolbar, { props: { editor } })
  expect(plain.find('.toolbar-actions').exists()).toBe(false)
  withButton.unmount(); plain.unmount()
})

it('o botão mantém um nome acessível quando só o ícone aparece no celular', () => {
  const button = mount(RecordRefineButton, { props: { loading: false, disabled: false }, global: { stubs: { AppButton: { template: '<button><slot /></button>' } } } })
  expect(button.get('.refine-label').text()).toBe('Refinar com IA')
  button.unmount()
})
