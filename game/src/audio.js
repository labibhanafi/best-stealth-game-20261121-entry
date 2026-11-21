// Lantern Heist — tiny synthesized sound effects (WebAudio, no audio files).
// Every sound is an oscillator blip shaped in code, so the game ships
// zero audio assets and makes zero network requests.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let stepFlip = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    try {
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    footstep(sneak) {
      stepFlip = !stepFlip;
      tone(stepFlip ? 150 : 120, 0.05, 'sine', sneak ? 0.02 : 0.045);
    },
    gem() { tone(880, 0.12, 'sine', 0.08, 1320); },
    pebble() { tone(320, 0.07, 'triangle', 0.06, 180); },
    suspicious() { tone(440, 0.18, 'square', 0.045, 554); },
    alarm() {
      tone(196, 0.32, 'sawtooth', 0.07, 392);
      setTimeout(() => tone(196, 0.32, 'sawtooth', 0.07, 392), 340);
    },
    caught() {
      tone(330, 0.5, 'sawtooth', 0.08, 82);
      setTimeout(() => tone(165, 0.6, 'sawtooth', 0.07, 55), 200);
    },
    levelClear() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.07), i * 110));
    },
    win() {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.07), i * 130));
    },
  };
}
