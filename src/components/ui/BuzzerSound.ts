export function playBuzzerSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz tone
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.8); // Buzz frequency drop

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (err) {
    console.error('Audio Buzzer Error:', err);
  }
}
