import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { toast as sonner } from 'vue-sonner'
import AppToaster from '@/components/global/AppToaster.vue'
import { useToast } from '@/lib/sonnerToastification'

let wrapper
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  wrapper = mount(AppToaster, { attachTo: document.body })
})
afterEach(() => {
  sonner.dismiss()
  wrapper.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
  await nextTick()
}

it.each(['success', 'error'])('toast nativo de %s expira após concluir um upload longo', async (status) => {
  const upload = useToast().upload({ title: 'Subindo arquivo' })
  await settle(100)
  expect(document.querySelector('[data-sonner-toast]').dataset.styled).toBe('true')
  await settle(20000)
  expect(document.querySelector('[data-sonner-toast]')).not.toBeNull()
  upload[status]('Imagem anexada', 'Arquivo enviado com sucesso.')
  await settle()
  const finalToast = document.querySelector(`[data-type="${status}"]`)
  expect(finalToast.querySelector('[data-title]').textContent).toBe('Imagem anexada')
  expect(finalToast.querySelector('[data-description]').textContent).toBe('Arquivo enviado com sucesso.')
  expect(finalToast.querySelector('.upload-toast-track')).toBeNull()
  await settle(3999)
  expect(finalToast.dataset.removed).toBe('false')
  await settle(1000)
  expect(document.querySelector('[data-sonner-toast]')).toBeNull()
})
