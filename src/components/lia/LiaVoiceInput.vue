<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LoaderCircle, Mic, Square, X } from 'lucide-vue-next'
import { transcribeLiaAudio } from '@/api/lia'
import { recordingToWav } from './liaAudio'
const props = defineProps({ disabled: Boolean, active: Boolean, contextKey: String })
const emit = defineEmits(['transcript', 'busy'])
const state = ref('idle'), error = ref(''), seconds = ref(0)
const supported = computed(() => !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder === 'function' && !!(window.AudioContext || window.webkitAudioContext) && !!(window.OfflineAudioContext || window.webkitOfflineAudioContext))
const label = computed(() => state.value === 'recording' ? 'Parar gravação e enviar texto' : state.value === 'requesting' ? 'Aguardando microfone' : state.value === 'transcribing' ? 'Transcrevendo fala' : 'Gravar mensagem por voz')
let recorder, stream, timer, controller, chunks = [], bytes = 0, version = 0
function release() { clearInterval(timer); stream?.getTracks().forEach(track => track.stop()); stream = null }
function cancel() {
  version++; controller?.abort(); controller = null
  if (recorder?.state === 'recording') recorder.stop()
  recorder = null; chunks = []; bytes = 0; release(); state.value = 'idle'; emit('busy', false)
}
async function finish(ticket) {
  if (ticket !== version) return
  release()
  state.value = 'transcribing'
  const blob = new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' }); chunks = []; recorder = null
  try {
    const wav = await recordingToWav(blob)
    if (ticket !== version) return
    controller = new AbortController()
    const { data } = await transcribeLiaAudio(wav, controller.signal)
    if (ticket !== version) return
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 4000) throw new Error('Fala não identificada.')
    state.value = 'idle'; emit('busy', false); emit('transcript', data.text.trim())
  } catch (failure) {
    if (ticket === version) error.value = failure.response?.data?.message || 'Não consegui transcrever. Tente novamente ou digite a mensagem.'
  } finally { if (ticket === version) { controller = null; state.value = 'idle'; emit('busy', false) } }
}
async function start() {
  if (props.disabled || !props.active || !supported.value || state.value !== 'idle') return
  const ticket = ++version
  state.value = 'requesting'; error.value = ''; seconds.value = 0; emit('busy', true)
  try {
    const requested = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false })
    if (ticket !== version) { requested.getTracks().forEach(track => track.stop()); return }
    stream = requested
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported?.(type))
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunks = []; bytes = 0
    recorder.ondataavailable = event => {
      if (ticket !== version || !event.data?.size) return
      bytes += event.data.size
      if (bytes > 4 * 1024 * 1024) { cancel(); error.value = 'A gravação ficou grande demais. Grave uma mensagem mais curta.'; return }
      chunks.push(event.data)
    }
    recorder.onerror = () => { if (ticket === version) { cancel(); error.value = 'Não consegui gravar. Verifique o microfone e tente novamente.' } }
    recorder.onstop = () => { void finish(ticket) }
    recorder.start(500); state.value = 'recording'
    const started = Date.now()
    timer = setInterval(() => { seconds.value = Math.min(60, Math.floor((Date.now() - started) / 1000)); if (seconds.value >= 60 && recorder?.state === 'recording') recorder.stop() }, 250)
  } catch (failure) {
    if (ticket !== version) return
    cancel(); error.value = failure.name === 'NotAllowedError' ? 'Permita o acesso ao microfone para gravar, ou digite sua mensagem.' : 'O microfone não está disponível. Você pode digitar a mensagem.'
  }
}
function toggle() { if (state.value === 'recording') recorder?.stop(); else void start() }
watch(() => [props.active, props.contextKey], () => { cancel(); error.value = '' })
watch(() => props.disabled, disabled => { if (disabled && state.value !== 'idle') cancel() })
function onVisibility() { if (document.visibilityState === 'hidden' && state.value === 'recording') cancel() }
onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVisibility); cancel() })
</script>
<template>
  <div class="voice-input" :class="{ working: state !== 'idle' }">
    <button type="button" class="microphone" :class="{ recording: state === 'recording' }" :disabled="!supported || state === 'transcribing' || state === 'requesting' || props.disabled && state === 'idle'" :aria-label="label" :title="!supported ? 'Gravação indisponível neste navegador' : state === 'idle' ? 'Gravar até 60 s. Ao parar, o Google transcreve a fala e o texto é enviado à Lia.' : label" @click="toggle"><Square v-if="state === 'recording'" :size="15" /><LoaderCircle v-else-if="state === 'transcribing' || state === 'requesting'" :size="17" class="spin" /><Mic v-else :size="18" /></button>
    <span v-if="state !== 'idle'" role="status">{{ state === 'recording' ? `Gravando ${seconds}s / 60s` : state === 'transcribing' ? 'Transcrevendo…' : 'Aguardando permissão…' }}</span>
    <button v-if="state !== 'idle'" type="button" class="cancel-voice" aria-label="Cancelar gravação ou transcrição" title="Cancelar" @click="cancel"><X :size="15" /></button>
    <p v-if="error" class="voice-error" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.voice-input { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }.voice-input button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 10px; color: var(--lia-muted); background: transparent; cursor: pointer; }.voice-input button:hover:not(:disabled) { color: var(--lia-blue); background: var(--lia-tint); }.voice-input button.recording { color: #c43d51; background: #c43d5110; }.voice-input button:disabled { opacity: .4; cursor: default; }.voice-input button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.voice-input>span { color: var(--lia-muted); font-size: 10px; }.voice-error { flex-basis: 100%; margin: 5px 0 0; color: #c43d51; font-size: 11px; line-height: 1.6; }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion:reduce) { .spin { animation: none; } }
</style>
