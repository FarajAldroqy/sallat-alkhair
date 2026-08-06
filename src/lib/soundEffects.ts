// Pure JavaScript/TypeScript Web Audio API Sound Effects Utility
// Zero external dependencies, high performance, zero latency.

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Ascending upbeat chime: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
 */
export function playDepositSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99]
  const noteDuration = 0.09

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + idx * noteDuration)

    gain.gain.setValueAtTime(0.25, now + idx * noteDuration)
    gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * noteDuration + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * noteDuration)
    osc.stop(now + (idx + 1) * noteDuration + 0.06)
  })
}

/**
 * Double-tone descending chime: G4 (392.00Hz) -> C4 (261.63Hz)
 */
export function playWithdrawalSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [392.00, 261.63]
  const noteDuration = 0.11

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + idx * noteDuration)

    gain.gain.setValueAtTime(0.2, now + idx * noteDuration)
    gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * noteDuration + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * noteDuration)
    osc.stop(now + (idx + 1) * noteDuration + 0.1)
  })
}

/**
 * Low subtle warning tone: 150Hz decaying pulse for delete/archive
 */
export function playDeleteSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(150, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.2)

  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.23)
}

/**
 * Short crisp pop (10ms click)
 */
export function playClickSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.015)

  gain.gain.setValueAtTime(0.1, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.02)
}

/**
 * Soft welcome fanfare chime during WelcomeSplash
 */
export function playLoginSuccessSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [440, 554.37, 659.25, 880] // A4 -> C#5 -> E5 -> A5
  const times = [0, 0.12, 0.24, 0.38]

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + times[idx])

    gain.gain.setValueAtTime(0.22, now + times[idx])
    gain.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + times[idx])
    osc.stop(now + times[idx] + 0.38)
  })
}
