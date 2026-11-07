<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowUp, LoaderCircle, Mic, Pause, X } from 'lucide-vue-next'
import { transcribeLiaAudio } from '@/api/lia'
import { attachVoiceMeter, recordingToWav } from './liaAudio'
const props = defineProps({ disabled: Boolean, active: Boolean, contextKey: String, canSend: Boolean })
const emit = defineEmits(['transcript', 'busy', 'submit'])
const state = ref('idle'), error = ref(''), seconds = ref(0)
const levels = ref(Array(32).fill(3))
const supported = computed(() => !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder === 'function' && !!(window.AudioContext || window.webkitAudioContext) && !!(window.OfflineAudioContext || window.webkitOfflineAudioContext))
const elapsed = computed(() => `${Math.floor(seconds.value / 60)}:${String(seconds.value % 60).padStart(2, '0')}`)
const sendEnabled = computed(() => state.value === 'recording' ? props.active && !props.disabled : state.value === 'idle' && props.canSend)
let recorder, stream, timer, controller, meterContext, stopMeter, chunks = [], bytes = 0, version = 0, sendAfterTranscription = false
function releaseMeter() {
  stopMeter?.(); stopMeter = null
  const closing = meterContext?.close?.(); closing?.catch?.(() => {}); meterContext = null
}
function release() { clearInterval(timer); releaseMeter(); stream?.getTracks().forEach(track => track.stop()); stream = null }
function cancel() {
  version++; controller?.abort(); controller = null
  if (recorder?.state === 'recording') recorder.stop()
  recorder = null; chunks = []; bytes = 0; release(); state.value = 'idle'; emit('busy', false)
}
function stopRecording(send = false) {
  if (state.value !== 'recording' || recorder?.state !== 'recording') return
  sendAfterTranscription = send; state.value = 'transcribing'; clearInterval(timer); releaseMeter()
  recorder.stop()
}
async function finish(ticket) {
  if (ticket !== version) return
  release(); state.value = 'transcribing'
  const shouldSend = sendAfterTranscription
  const blob = new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' }); chunks = []; recorder = null
  try {
    const wav = await recordingToWav(blob)
    if (ticket !== version) return
    controller = new AbortController()
    const { data } = await transcribeLiaAudio(wav, controller.signal)
    if (ticket !== version) return
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 4000) throw new Error('Fala não identificada.')
    state.value = 'idle'; emit('busy', false); emit('transcript', data.text.trim(), { send: shouldSend })
  } catch (failure) {
    if (ticket === version) error.value = failure.response?.data?.message || 'Não consegui transcrever. Tente novamente ou digite a mensagem.'
  } finally { if (ticket === version) { controller = null; state.value = 'idle'; emit('busy', false) } }
}
async function start() {
  if (props.disabled || !props.active || !supported.value || state.value !== 'idle') return
  const ticket = ++version
  state.value = 'requesting'; error.value = ''; seconds.value = 0; levels.value = Array(32).fill(3); sendAfterTranscription = false; emit('busy', true)
  try {
    // Resume from the click gesture so metering also works in Safari.
    try {
      const Audio = window.AudioContext || window.webkitAudioContext
      meterContext = new Audio(); Promise.resolve(meterContext.resume?.()).catch(() => {})
    } catch { meterContext = null }
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
    if (meterContext) stopMeter = attachVoiceMeter(meterContext, stream, level => {
      if (ticket === version && state.value === 'recording') levels.value = [...levels.value.slice(1), 3 + level * 27]
    })
    const started = Date.now()
    timer = setInterval(() => { seconds.value = Math.min(60, Math.floor((Date.now() - started) / 1000)); if (seconds.value >= 60) stopRecording(false) }, 250)
  } catch (failure) {
    if (ticket !== version) return
    cancel(); error.value = failure.name === 'NotAllowedError' ? 'Permita o acesso ao microfone para gravar, ou digite sua mensagem.' : 'O microfone não está disponível. Você pode digitar a mensagem.'
  }
}
function send() {
  if (!sendEnabled.value) return
  if (state.value === 'recording') stopRecording(true)
  else emit('submit')
}
watch(() => [props.active, props.contextKey], () => { cancel(); error.value = '' })
watch(() => props.disabled, disabled => { if (disabled && state.value !== 'idle') cancel() })
function onVisibility() { if (document.visibilityState === 'hidden' && state.value === 'recording') cancel() }
onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVisibility); cancel() })
</script>

<template>
  <div class="voice-input" :class="{ working: state !== 'idle' }">
    <div class="voice-control-bar">
      <template v-if="state === 'idle'"><div class="composer-context"><slot /></div><button type="button" class="microphone" :disabled="!supported || disabled || !active" aria-label="Gravar mensagem por voz" :title="!supported ? 'Gravação indisponível neste navegador' : 'Gravar até 60 s. Pause para revisar o texto ou envie enquanto grava.'" @click="start"><Mic :size="19" /></button></template>
      <template v-else>
        <button type="button" class="pause-recording" :disabled="state !== 'recording'" aria-label="Pausar e transcrever para revisar" title="Transcrever para o campo de mensagem" @click="stopRecording(false)"><Pause v-if="state === 'recording'" :size="17" /><LoaderCircle v-else :size="17" class="spin" /></button>
        <svg class="voice-waveform" :class="{ muted: state !== 'recording' }" viewBox="0 0 160 34" preserveAspectRatio="none" aria-hidden="true"><rect v-for="(height, index) in levels" :key="index" :x="index * 5 + 1" :y="(34 - height) / 2" width="2.5" :height="height" rx="1.25" /></svg>
        <time class="recording-time" :datetime="`PT${seconds}S`">{{ elapsed }}</time>
        <span class="sr-only" role="status">{{ state === 'recording' ? 'Gravando. Pause para revisar ou envie a mensagem.' : state === 'transcribing' ? 'Transcrevendo sua fala…' : 'Aguardando permissão para o microfone…' }}</span>
        <button type="button" class="cancel-voice" aria-label="Cancelar gravação ou transcrição" title="Descartar gravação" @click="cancel"><X :size="16" /></button>
      </template>
      <button type="button" class="send-message" :disabled="!sendEnabled" aria-label="Enviar mensagem" :title="state === 'recording' ? 'Parar, transcrever e enviar' : 'Enviar mensagem'" @click="send"><ArrowUp :size="19" :stroke-width="2.3" /></button>
    </div>
    <p v-if="state === 'transcribing' || state === 'requesting'" class="voice-progress" aria-hidden="true">{{ state === 'transcribing' ? 'Transcrevendo sua fala…' : 'Aguardando permissão para o microfone…' }}</p>
    <p v-if="error" class="voice-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.voice-input { flex: 1; min-width: 0; width: 100%; }.voice-control-bar { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 34px; }.composer-context { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 1; min-width: 0; }
button { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 11px; color: var(--lia-muted); background: transparent; cursor: pointer; }button:hover:not(:disabled) { color: var(--lia-blue); background: var(--lia-tint); }button:disabled { opacity: .4; cursor: default; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.pause-recording { color: var(--lia-blue); background: var(--lia-tint); border-radius: 50%; }.cancel-voice { flex-basis: 25px; width: 25px; height: 30px; }
.voice-waveform { display: block; flex: 1; min-width: 24px; height: 34px; color: var(--lia-blue); fill: currentColor; }.voice-waveform rect { transition: height .07s linear, y .07s linear; }.voice-waveform.muted { opacity: .45; }.recording-time { flex: 0 0 auto; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--lia-text); }
.send-message { border: 1px solid color-mix(in srgb,var(--lia-blue) 80%,white); color: white; background: linear-gradient(145deg,#4a94ff,var(--lia-blue)); box-shadow: inset 0 1px 1px #ffffff60,0 3px 8px #0057ff22; }.send-message:hover:not(:disabled) { color: white; background: var(--lia-blue); }.send-message:disabled { opacity: .7; border-color: var(--lia-line); color: var(--lia-muted); background: var(--lia-soft); box-shadow: none; }
.voice-progress { margin: 5px 0 0; color: var(--lia-muted); font-size: 10px; text-align: center; }.voice-error { margin: 7px 0 0; color: #c43d51; font-size: 11px; line-height: 1.6; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion:reduce) { .spin { animation: none; }.voice-waveform rect { transition: none; } }
@media(max-width:760px) { .voice-control-bar { min-height: 42px; }.voice-control-bar button { flex-basis: 42px; width: 42px; height: 42px; }.voice-control-bar .cancel-voice { flex-basis: 42px; height: 42px; }.voice-waveform { height: 42px; } }
</style>

