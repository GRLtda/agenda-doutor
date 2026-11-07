import { expect, it } from 'vitest'
import { renderLiaMarkdown } from '@/utils/liaMarkdown'

it.each([
  '<img src=x onerror=alert(1)>',
  '![<img src=x onerror=alert(1)>](https://example.invalid)',
  '[link](javascript:alert(1))',
  '<svg onload=alert(1)>',
])('não produz elementos executáveis nem links a partir de %s', content => {
  const element = document.createElement('div'); element.innerHTML = renderLiaMarkdown(content)
  expect(element.querySelector('img,svg,script,iframe,a,[onerror],[onload]')).toBeNull()
})
it('preserva tabelas e formatação de texto úteis para resultados', () => {
  expect(renderLiaMarkdown('**Resultado**')).toContain('<strong>Resultado</strong>')
})
it('renderiza títulos, listas aninhadas, citação, tachado e tabelas sem HTML livre', () => {
  const element = document.createElement('div')
  element.innerHTML = renderLiaMarkdown('## Agenda\n\n**Confirmados** e *pendentes*\n\n1. Hoje\n   - Primeiro\n   - Segundo\n\n> Confira os dados\n\n~~Cancelado~~\n\n| Paciente | Horário |\n| --- | --- |\n| Exemplo | 10h |')
  for (const tag of ['h2', 'strong', 'em', 'ol', 'ul', 'blockquote', 'del', 'table', 'th', 'td']) expect(element.querySelector(tag)).not.toBeNull()
})
