// Web Audio API Synthesizer for High/Critical Security Sound Alerts
let audioCtx = null;
let lastAlertTime = 0;
const DEBOUNCE_INTERVAL_MS = 2500; // Prevent repetitive alarms within 2.5 seconds

export function playSecurityAlarm(severity = "CRITICAL", muted = false) {
  if (muted) return;

  const now = Date.now();
  if (now - lastAlertTime < DEBOUNCE_INTERVAL_MS) {
    return; // Debounce alarm trigger
  }
  lastAlertTime = now;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    const t = audioCtx.currentTime;

    if (severity === "CRITICAL") {
      // Dual-tone high frequency warbling siren (880Hz / 1200Hz)
      osc1.type = "sawtooth";
      osc2.type = "square";

      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.linearRampToValueAtTime(1200, t + 0.15);
      osc1.frequency.linearRampToValueAtTime(880, t + 0.3);
      osc1.frequency.linearRampToValueAtTime(1200, t + 0.45);

      osc2.frequency.setValueAtTime(440, t);
      osc2.frequency.linearRampToValueAtTime(600, t + 0.15);

      gainNode.gain.setValueAtTime(0.3, t);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.6);
      osc2.stop(t + 0.6);
    } else {
      // Moderate double ping for HIGH/MEDIUM
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(660, t);
      osc1.frequency.setValueAtTime(880, t + 0.15);

      gainNode.gain.setValueAtTime(0.2, t);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(t);
      osc1.stop(t + 0.35);
    }
  } catch (err) {
    console.warn("Audio alert failed:", err);
  }
}
