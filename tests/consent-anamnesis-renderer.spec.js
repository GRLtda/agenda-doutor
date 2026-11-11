import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnamnesisQuestionsRenderer from '@/views/public/AnamnesisQuestionsRenderer.vue'

const questions = [
  {
    qId: 'q1',
    title: 'Faz uso de medicamentos?',
    type: 'text',
    conditionalQuestions: [
      {
        showWhenAnswerIs: 'Sim',
        questions: [{ qId: 'q1a', title: 'Quais medicamentos?', type: 'text' }],
      },
    ],
  },
]

function render(answer) {
  return mount(AnamnesisQuestionsRenderer, {
    props: {
      questions,
      answers: { q1: { answer }, q1a: { answer: '' } },
    },
  })
}

describe('perguntas condicionais da anamnese pública', () => {
  it.each([['Sim'], [true], ['true'], ['sim']])('mostra a sub-pergunta quando a resposta é %s', (answer) => {
    expect(render(answer).text()).toContain('Quais medicamentos?')
  })

  it.each([['Não'], [false], ['false'], ['nao']])('esconde a sub-pergunta quando a resposta é %s', (answer) => {
    expect(render(answer).text()).not.toContain('Quais medicamentos?')
  })
})
