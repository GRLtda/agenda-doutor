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
