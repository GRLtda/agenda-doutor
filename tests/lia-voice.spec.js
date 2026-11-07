import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LiaVoiceInput from '@/components/lia/LiaVoiceInput.vue'
import { encodeMonoWav } from '@/components/lia/liaAudio'
const mocks = vi.hoisted(() => ({ getUserMedia: vi.fn(), transcribe: vi.fn(), wav: vi.fn() }))
vi.mock('@/api/lia', () => ({ transcribeLiaAudio: mocks.transcribe }))
vi.mock('@/components/lia/liaAudio', async original => ({ ...await original(), recordingToWav: mocks.wav }))
let wrappers, stop
beforeEach(() => {
  wrappers = []; vi.resetAllMocks(); stop = vi.fn()
  mocks.getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] })
  mocks.wav.mockResolvedValue(new Blob(['wav'], { type: 'audio/wav' }))
  mocks.transcribe.mockResolvedValue({ data: { text: 'Ver minha agenda' } })
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: mocks.getUserMedia } })
  vi.stubGlobal('AudioContext', class {})
  vi.stubGlobal('OfflineAudioContext', class {})
  vi.stubGlobal('MediaRecorder', class {
    state = 'inactive'; mimeType = 'audio/webm'
    static isTypeSupported() { return true }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['synthetic']) }); this.onstop?.() }
  })
})
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const voice = () => { const wrapper = mount(LiaVoiceInput, { props: { active: true, contextKey: 'clinic:user:conversation' } }); wrappers.push(wrapper); return wrapper }
it('grava somente ao clicar, para o microfone antes da transcrição e emite só texto', async () => {
  const wrapper = voice()
  expect(mocks.getUserMedia).not.toHaveBeenCalled()
  await wrapper.get('.microphone').trigger('click'); await flushPromises()
  expect(mocks.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }))
  expect(mocks.transcribe).not.toHaveBeenCalled()
  await wrapper.get('.microphone').trigger('click'); await flushPromises()
  expect(stop).toHaveBeenCalledTimes(1)
  expect(mocks.transcribe).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('transcript')).toEqual([['Ver minha agenda']])
})
it('cancelar uma transcrição impede que o texto atrasado seja enviado', async () => {
  let finish
  mocks.transcribe.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const wrapper = voice(); await wrapper.get('.microphone').trigger('click'); await flushPromises()
  await wrapper.get('.microphone').trigger('click'); await flushPromises()
  const signal = mocks.transcribe.mock.calls[0][1]
  await wrapper.get('.cancel-voice').trigger('click')
  finish({ data: { text: 'Não enviar' } }); await flushPromises()
  expect(signal.aborted).toBe(true); expect(wrapper.emitted('transcript')).toBeUndefined()
})
it('fechar durante pedido de permissão descarta e desliga o microfone concedido depois', async () => {
  let grant
  mocks.getUserMedia.mockReturnValue(new Promise(resolve => { grant = resolve }))
  const wrapper = voice(); await wrapper.get('.microphone').trigger('click'); await wrapper.setProps({ active: false })
  grant({ getTracks: () => [{ stop }] }); await flushPromises()
  expect(stop).toHaveBeenCalledTimes(1); expect(mocks.transcribe).not.toHaveBeenCalled()
})
it('trocar de conversa ou identidade interrompe gravação sem envio', async () => {
  const wrapper = voice(); await wrapper.get('.microphone').trigger('click'); await flushPromises()
  await wrapper.setProps({ contextKey: 'other' }); await flushPromises()
  expect(stop).toHaveBeenCalledTimes(1); expect(mocks.transcribe).not.toHaveBeenCalled()
})
it('permissão negada mantém alternativa por texto e libera os controles', async () => {
  mocks.getUserMedia.mockRejectedValue({ name: 'NotAllowedError' })
  const wrapper = voice(); await wrapper.get('.microphone').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Permita o acesso ao microfone')
  expect(wrapper.emitted('busy').at(-1)).toEqual([false]); expect(mocks.transcribe).not.toHaveBeenCalled()
})
it('WAV padroniza duração, canais e amostras PCM e limita a gravação a 60 segundos', async () => {
  const blob = encodeMonoWav(new Float32Array([2, -2, 0]))
  const buffer = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsArrayBuffer(blob) })
  const view = new DataView(buffer)
  expect(view.getUint32(24, true)).toBe(16000); expect(view.getUint16(22, true)).toBe(1)
  expect(view.getInt16(44, true)).toBe(32767); expect(view.getInt16(46, true)).toBe(-32768)
  expect(() => encodeMonoWav(new Float32Array(16000 * 61))).toThrow()
})
