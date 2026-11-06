import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StockTableList from '@/components/estoque/StockTableList.vue'

const props = { emptyTitle: 'Nenhum lote encontrado', emptyText: 'Registre uma entrada.', meta: { total: 60, totalPages: 3 }, page: 1, limit: 20 }
function render(overrides = {}) {
  return mount(StockTableList, {
    props: { ...props, ...overrides },
    slots: { filters: '<input aria-label="Buscar" />', default: '<table><tbody><tr><td>Produto de teste</td></tr></tbody></table>' },
  })
}
describe('Estrutura compartilhada das listagens do estoque', () => {
  it('preserva filtros e encaminha a paginação do componente global', async () => {
    const wrapper = render()
    expect(wrapper.find('.filters-header input').exists()).toBe(true)
    expect(wrapper.text()).toContain('Produto de teste')
    await wrapper.get('[aria-label="Próxima página"]').trigger('click')
    expect(wrapper.emitted('page-change')).toEqual([[2]])
  })
  it('mostra skeleton durante a consulta sem anunciar vazio nem dados antigos', () => {
    const wrapper = render({ loading: true, empty: true })
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Carregando registros')
    expect(wrapper.text()).not.toContain('Nenhum lote encontrado')
    expect(wrapper.find('table').exists()).toBe(false)
  })
  it('distingue erro de lista vazia e permite tentar novamente', async () => {
    const wrapper = render({ error: 'Falha ao consultar lotes', empty: true })
    expect(wrapper.get('[role="alert"]').text()).toContain('Falha ao consultar lotes')
    expect(wrapper.text()).not.toContain('Nenhum lote encontrado')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
  it('centraliza o vazio com ilustração local e mantém os filtros disponíveis', () => {
    const wrapper = render({ empty: true, meta: { total: 0, totalPages: 1 } })
    expect(wrapper.text()).toContain('Nenhum lote encontrado')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.filters-header input').exists()).toBe(true)
    expect(wrapper.find('.pagination-container').exists()).toBe(false)
  })
})
