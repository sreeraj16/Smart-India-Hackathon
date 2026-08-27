export function playBuzzerSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const playBeep = (startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, startTime); // B5 note (987.77Hz) for a clean, sharp alarm beep
      
      // Professional volume envelope (smooth attack, exponential decay)
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Clean, sharp double beep alarm: "Beep-Beep" (lasts 0.4s total)
    playBeep(ctx.currentTime, 0.12);
    playBeep(ctx.currentTime + 0.18, 0.15);

  } catch (err) {
    console.error('Audio Buzzer Error:', err);
  }
}
