import { expect, it } from 'vitest'
import { appointmentDetailsPath, safeProductNavigation } from '@/components/lia/liaNavigation'

it('aceita destinos de produto e seções reais de configurações', () => {
  const links = [{ id: 'addresses', label: 'Abrir Endereços', to: '/?settings=1&tab=unidades' }, { id: 'whatsapp', label: 'Abrir WhatsApp', to: '/marketing/conexao' }, { id: 'security', label: 'Abrir Segurança', to: '/?profile=1&profileTab=security' }]
  expect(safeProductNavigation(links)).toEqual(links)
})

it.each([
  'https://evil.invalid', '//evil.invalid', '/\\evil.invalid', 'javascript:alert(1)',
  '/login', '/admin', '/?settings=1&tab=inventado', '/?settings=1&settings=1&tab=unidades',
  '/marketing/conexao?send=true', '/calendario?delete=1', '/pacientes/novo#javascript',
  '/?settings=1&tab=funcionarios&create=1', '/?settings=1&tab=termos&create=2', '/?profile=1&profileTab=security&create=1',
  '/procedimentos?create=1&delete=1',
])('não oferece navegação para destino não verificado %s', to => {
  expect(safeProductNavigation([{ id: 'forged', label: 'Abrir', to }])).toEqual([])
})

it.each(['/?settings=1&tab=termos&create=1', '/?settings=1&tab=anamnese&create=1', '/?settings=1&tab=unidades&create=1', '/procedimentos?create=1', '/calendario?create=1'])('abre somente os formulários verificados %s', to => {
  const target = { id: 'form', label: 'Criar', to }
  expect(safeProductNavigation([target])).toEqual([target])
})

it('gera um link de atendimento somente com identificador válido', () => {
  expect(appointmentDetailsPath('1'.repeat(24))).toBe(`/atendimentos?appointment=${'1'.repeat(24)}`)
  expect(appointmentDetailsPath('../outro')).toBeNull()
})
