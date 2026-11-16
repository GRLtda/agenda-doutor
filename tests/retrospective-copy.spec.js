import { describe, expect, it } from 'vitest'
import { COPY, pickCopy } from '@/features/retrospective/designs/2026-v1/copy'

describe('textos (copyVariant)', () => {
  it('tem 3 variações para cada kind do design', () => {
    const kinds = ['abertura', 'total', 'total-leve', 'mes', 'procedimento', 'proc-simples', 'financeiro', 'pacientes', 'rosto', 'mensagens', 'comparecimento', 'resumo']
    for (const kind of kinds) expect(COPY[kind]).toHaveLength(3)
  })

  it('escolhe pela variação e preenche placeholders', () => {
    expect(pickCopy('total', 1, { ano: 2026, n: '1.248' })).toEqual({ p: 'Em 2026, a agenda não parou.', c: 'Foram 1.248 sorrisos. A agenda nem teve tempo de respirar.', x: '' })
    expect(pickCopy('total', 2, { n: '1.248' }).c).toBe('1.248 vezes alguém saiu daí se sentindo melhor.')
    expect(pickCopy('resumo', 3, { proximoAno: 2027 }).c).toBe('Obrigado pela confiança. Que venha 2027.')
    expect(pickCopy('financeiro', 1, { mes: 'Outubro' }).c).toBe('Outubro foi o mês de brilhar.')
    expect(pickCopy('rosto', 2, { regiao1: 'testa' }).c).toBe('A testa ficou com o primeiro lugar.')
    expect(pickCopy('mensagens', 3, {}).x).toBe('de volta para a equipe. Tempo é ouro.')
  })

  it('variação fora do intervalo cai na 1; kind desconhecido não quebra', () => {
    expect(pickCopy('abertura', 9, {}).p).toBe(pickCopy('abertura', 1, {}).p)
    expect(pickCopy('abertura', 0, {}).p).toBe(pickCopy('abertura', 1, {}).p)
    expect(pickCopy('nao-existe', 1, {})).toEqual({ p: '', c: '', x: '' })
  })
})
