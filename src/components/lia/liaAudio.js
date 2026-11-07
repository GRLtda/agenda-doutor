export function encodeMonoWav(samples, sampleRate = 16000) {
  if (sampleRate !== 16000 || !samples.length || samples.length > sampleRate * 60) throw new Error('Áudio fora do limite permitido.')
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer)
  const write = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)) }
  write(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); write(8, 'WAVE'); write(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) { const value = Math.max(-1, Math.min(1, samples[i] || 0)); view.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true) }
  return new Blob([buffer], { type: 'audio/wav' })
}

export async function recordingToWav(blob) {
  const Audio = window.AudioContext || window.webkitAudioContext
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const context = new Audio()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    if (decoded.duration < .1) throw new Error('A gravação está muito curta.')
    const offline = new Offline(1, Math.floor(Math.min(decoded.duration, 60) * 16000), 16000)
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start()
    const mono = await offline.startRendering()
    return encodeMonoWav(mono.getChannelData(0))
  } finally { await context.close().catch(() => {}) }
}

// Read microphone levels without routing audio to the speakers.
export function attachVoiceMeter(context, stream, onLevel) {
  let source, analyser, frame, stopped = false, last = 0
  const stop = () => { stopped = true; window.cancelAnimationFrame?.(frame); source?.disconnect(); analyser?.disconnect() }
  try {
    source = context.createMediaStreamSource(stream)
    analyser = context.createAnalyser(); analyser.fftSize = 256
    source.connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    const tick = now => {
      if (stopped) return
      if (now - last >= 70) {
        analyser.getByteTimeDomainData(samples)
        const power = samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length
        onLevel(Math.min(1, Math.sqrt(power) * 7)); last = now
      }
      if (!stopped) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return stop
  } catch { stop(); return () => {} }
}
