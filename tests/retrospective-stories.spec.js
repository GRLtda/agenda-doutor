// Renderização de cada kind do design 2026-v1 com dados de exemplo e de borda.
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Story from '@/features/retrospective/designs/2026-v1/Story.vue'
import ShareCard from '@/features/retrospective/designs/2026-v1/card/ShareCard.vue'
import { fullRetrospective, reducedRetrospective } from './fixtures/retrospective'

const render = (story, extra = {}) => mount(Story, {
  props: { story, theme: 'dark', clinicName: 'Clínica Aurora', logoUrl: null, year: 2026, copyVariant: 1, inProgressMonth: 11, index: 1, count: 10, animate: false, ...extra },
})
const byKey = (retro, key) => retro.stories.find((s) => s.key === key)

describe('stories do design 2026-v1', () => {
  it.each(fullRetrospective().stories.map((s) => [s.kind, s]))('renderiza %s sem erro', (_kind, story) => {
    const w = render(story)
    expect(w.attributes('data-kind')).toBe(story.kind)
    expect(w.text().length).toBeGreaterThan(10)
    expect(w.find('button.share').exists()).toBe(true)
    expect(w.findAll('.pb')).toHaveLength(10)
  })

  it('total usa número formatado em pt-BR no número e no texto', () => {
    const w = render(byKey(fullRetrospective(), 'total'))
    expect(w.text()).toContain('1.248')
    expect(w.text()).toContain('Foram 1.248 sorrisos')
    expect(w.text()).toContain('Em 2026, a agenda não parou.')
  })

  it('mes: campeão vem do payload, mês em andamento tracejado e texto alternativo', () => {
    const w = render(byKey(fullRetrospective(), 'mes'))
    expect(w.text()).toContain('Outubro')
    expect(w.text()).toContain('Novembro · em andamento')
    expect(w.findAll('.prog')).toHaveLength(1)
    expect(w.find('[role="img"]').attributes('aria-label')).toContain('Mês campeão: Outubro')
  })

  it('procedimento com 3 itens e nomes longos', () => {
    const story = { key: 'procedimento', kind: 'procedimento', data: { items: [
      { name: 'Bioestimulador de colágeno com ácido polilático', count: 96 }, { name: 'Preenchimento labial com ácido hialurônico', count: 71 }, { name: 'Botox', count: 40 },
    ] } }
    const w = render(story)
    expect(w.findAll('.row')).toHaveLength(2)
    expect(w.text()).toContain('Bioestimulador de colágeno com ácido polilático')
  })

  it('proc-simples com 1 item, sem lista', () => {
    const w = render(byKey(reducedRetrospective(), 'procedimento'))
    expect(w.findAll('.row')).toHaveLength(0)
    expect(w.text()).toContain('Limpeza de pele')
    expect(w.text()).toContain('O procedimento estrela de 2026 foi…')
  })

  it('financeiro mostra só percentual e mês de pico', () => {
    const w = render(byKey(fullRetrospective(), 'financeiro'))
    expect(w.text()).toContain('38%')
    expect(w.text()).toContain('Out')
    expect(w.text()).not.toMatch(/R\$/)
  })

  it('rosto usa as regiões do payload', () => {
    const w = render(byKey(fullRetrospective(), 'rosto'), { copyVariant: 2 })
    expect(w.text()).toContain('Pés de galinha')
    expect(w.text()).toContain('A testa ficou com o primeiro lugar.')
  })

  it('resumo: reduzida com 3 itens e mês pelo nome', () => {
    const w = render(byKey(reducedRetrospective(), 'resumo'), { theme: 'blue', copyVariant: 3 })
    expect(w.findAll('.cell')).toHaveLength(3)
    expect(w.text()).toContain('Que venha 2027.')
    const full = render(byKey(fullRetrospective(), 'resumo'), { theme: 'blue' })
    expect(full.text()).toContain('Outubro')
    expect(full.text()).toContain('67%')
  })

  it('clínica sem logo usa a inicial; com logo usa a imagem', () => {
    const w = render(byKey(fullRetrospective(), 'abertura'))
    expect(w.find('.mark span').text()).toBe('A')
    const withLogo = render(byKey(fullRetrospective(), 'abertura'), { logoUrl: 'https://cdn.example/logo.png' })
    expect(withLogo.find('.mark img').attributes('src')).toBe('https://cdn.example/logo.png')
  })

  it('nome de clínica longo reduz a fonte da abertura', () => {
    const w = render(byKey(fullRetrospective(), 'abertura'), { clinicName: reducedRetrospective().clinic.name })
    expect(w.html()).toContain('font-size: 28px')
  })

  it('modo cartão: sem barras e botões, com cabeçalho e selo; abertura sem cabeçalho', () => {
    const card = mount(ShareCard, { props: { story: byKey(fullRetrospective(), 'total'), theme: 'light', clinicName: 'Clínica Aurora', year: 2026 } })
    expect(card.find('button').exists()).toBe(false)
    expect(card.find('.progress').exists()).toBe(false)
    expect(card.find('.card-header').exists()).toBe(true)
    expect(card.find('.card-seal').text()).toContain('Retrospectiva 2026')
    expect(card.attributes('style')).toContain('height: 694px')
    const opening = mount(ShareCard, { props: { story: byKey(fullRetrospective(), 'abertura'), theme: 'dark', clinicName: 'Clínica Aurora', year: 2026 } })
    expect(opening.find('.card-header').exists()).toBe(false)
  })
})
