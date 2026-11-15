import { expect, it } from 'vitest'
import { safeProductNavigation } from '@/components/lia/liaNavigation'

it('aceita destinos de produto e seções reais de configurações', () => {
  const links = [{ id: 'addresses', label: 'Abrir Endereços', to: '/?settings=1&tab=unidades' }, { id: 'whatsapp', label: 'Abrir WhatsApp', to: '/marketing/conexao' }, { id: 'security', label: 'Abrir Segurança', to: '/?profile=1&profileTab=security' }]
  expect(safeProductNavigation(links)).toEqual(links)
})

it.each([
  'https://evil.invalid', '//evil.invalid', '/\\evil.invalid', 'javascript:alert(1)',
  '/login', '/admin', '/?settings=1&tab=inventado', '/?settings=1&settings=1&tab=unidades',
  '/marketing/conexao?send=true', '/calendario?delete=1', '/pacientes/novo#javascript',
])('não oferece navegação para destino não verificado %s', to => {
  expect(safeProductNavigation([{ id: 'forged', label: 'Abrir', to }])).toEqual([])
})
