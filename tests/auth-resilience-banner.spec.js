import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Banner from '@/components/layout/ApiAvailabilityBanner.vue'
const wrappers = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

it('aviso único fica fora do layout, permanece durante falha e sai após recuperação', async () => {
  const wrapper = mount(Banner, { props: { visible: true, canRetry: true }, global: { stubs: { transition: false } } })
  wrappers.push(wrapper)
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1)
  expect(document.body.textContent).toContain('Sua sessão foi mantida')
  document.querySelector('.api-availability-banner button').click()
  expect(wrapper.emitted('retry')).toHaveLength(1)
  await wrapper.setProps({ loading: true })
  expect(document.querySelector('button').disabled).toBe(true)
  expect(document.body.textContent).toContain('Verificando')
  await wrapper.setProps({ visible: false })
  await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toBeNull())
})
