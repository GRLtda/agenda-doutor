import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StyledSelect from '@/components/global/StyledSelect.vue'

const options = [{ value: 'a', label: 'Modelo A' }]

function button(error) {
  const props = { options, modelValue: null }
  if (error !== undefined) props.error = error
  return mount(StyledSelect, { props, global: { stubs: { Teleport: true } } }).find('.select-button')
}

describe('StyledSelect: estado de erro', () => {
  it('não fica vermelho com erro vazio', () => {
    expect(button('').classes()).not.toContain('has-error')
    expect(button(undefined).classes()).not.toContain('has-error')
    expect(button(false).classes()).not.toContain('has-error')
  })

  it('fica vermelho e mostra a mensagem quando há erro', () => {
    const wrapper = mount(StyledSelect, { props: { options, modelValue: null, error: 'Escolha um modelo.' } })
    expect(wrapper.find('.select-button').classes()).toContain('has-error')
    expect(wrapper.text()).toContain('Escolha um modelo.')
    expect(button(true).classes()).toContain('has-error')
  })
})
