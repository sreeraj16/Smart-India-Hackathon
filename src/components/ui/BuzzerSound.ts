export function playBuzzerSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const playChime = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      // Professional volume envelope (smooth attack, exponential decay)
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Play a professional dual-chime chord: E5 (660Hz) and A5 (880Hz)
    playChime(660, ctx.currentTime, 0.4);
    playChime(880, ctx.currentTime + 0.12, 0.6);

  } catch (err) {
    console.error('Audio Buzzer Error:', err);
  }
}
