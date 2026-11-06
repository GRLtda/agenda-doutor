import { beforeEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppUploadToast from '@/components/global/AppUploadToast.vue'
import { useToast } from '@/lib/sonnerToastification'

const sonner = vi.hoisted(() => ({ loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: sonner }))
beforeEach(() => { vi.clearAllMocks(); sonner.loading.mockReturnValue('upload-1') })

it('atualiza progresso e conclui com novo toast nativo, reiniciando altura e duração', () => {
  const toast = useToast()
  const upload = toast.upload({ title: 'Subindo foto.png' })
  const initial = sonner.loading.mock.calls[0][1]
  expect(initial.duration).toBe(4000)
  upload.update({ progress: 60 })
  expect(initial.componentProps.upload.progress).toBe(60)
  toast.success('Outra notificação')
  expect(sonner.success).toHaveBeenCalled()
  upload.success('Imagem salva')
  expect(sonner.dismiss).toHaveBeenCalledWith('upload-1')
  expect(sonner.success.mock.lastCall).toEqual(['Imagem salva', { description: '', class: 'app-upload-toast', duration: 4000 }])
})

it('fechar a notificação não a recria durante o envio ou na conclusão', () => {
  const upload = useToast().upload()
  sonner.loading.mock.calls[0][1].onDismiss()
  upload.update({ progress: 80 })
  upload.error('Falha', 'Sem conexão')
  expect(sonner.loading).toHaveBeenCalledTimes(1)
  expect(sonner.error).not.toHaveBeenCalled()
})

it('mostra título, subtítulo, percentual acessível e espera sem total', async () => {
  const close = vi.fn()
  const wrapper = mount(AppUploadToast, { props: {
    upload: { title: 'Subindo arquivo', fileName: 'foto.png', progress: 60, description: 'Enviando', onClose: close },
  } })
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('60')
  expect(wrapper.get('.upload-toast-fill').attributes('style')).toContain('60%')
  expect(wrapper.get('.upload-toast-title').text()).toBe('Subindo arquivo')
  expect(wrapper.get('.upload-toast-description').text()).toBe('foto.png')
  await wrapper.setProps({ upload: { title: 'Comprimindo', progress: null, onClose: close } })
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
  expect(wrapper.text()).toContain('Aguarde')
  await wrapper.get('button').trigger('click')
  expect(close).toHaveBeenCalledOnce()
})
