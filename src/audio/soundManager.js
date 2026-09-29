/**
 * Procedural Web Audio API Sound Engine & Cockpit Voice Synthesizer
 * Generates dynamic turbofan engine rumble, sonic whooshes, hydraulics, explosions, and voice alerts
 */
export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Jet Engine Nodes
    this.engineGain = null;
    this.bassOsc = null;
    this.midOsc = null;
    this.whineOsc = null;
    this.noiseNode = null;
    this.noiseFilter = null;

    // Cockpit Speech Synthesizer
    this.speechSynth = window.speechSynthesis || null;
    this.lastVoiceAlertTime = 0;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      // Master Volume
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Create continuous jet turbofan engine sound graph
      this.setupJetEngine();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or user gesture required', e);
    }
  }

  setupJetEngine() {
    if (!this.audioCtx) return;

    this.engineGain = this.audioCtx.createGain();
    this.engineGain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    this.engineGain.connect(this.masterGain);

    // 1. Low frequency rumble (Turbine core)
    this.bassOsc = this.audioCtx.createOscillator();
    this.bassOsc.type = 'sawtooth';
    this.bassOsc.frequency.setValueAtTime(42, this.audioCtx.currentTime);

    const bassFilter = this.audioCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(140, this.audioCtx.currentTime);
    this.bassOsc.connect(bassFilter);
    bassFilter.connect(this.engineGain);
    this.bassOsc.start();

    // 2. High frequency compressor blade whine
    this.whineOsc = this.audioCtx.createOscillator();
    this.whineOsc.type = 'sine';
    this.whineOsc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);

    const whineGain = this.audioCtx.createGain();
    whineGain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
    this.whineOsc.connect(whineGain);
    whineGain.connect(this.engineGain);
    this.whineOsc.start();

    // 3. Airflow hiss (Pink / White noise generator)
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.audioCtx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.audioCtx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    this.noiseFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(noiseGain);
    noiseGain.connect(this.engineGain);
    this.noiseNode.start();
  }

  updateEngine(throttle, speed, mach) {
    if (!this.audioCtx || this.isMuted || !this.isInitialized) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const t = THREE_LERP_OR_VAL(throttle, 0.5);
    const now = this.audioCtx.currentTime;

    // Pitch rises with throttle
    if (this.bassOsc) {
      this.bassOsc.frequency.setTargetAtTime(38 + t * 45, now, 0.1);
    }
    if (this.whineOsc) {
      this.whineOsc.frequency.setTargetAtTime(850 + t * 1400, now, 0.1);
    }
    if (this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(500 + (speed / 300) * 1200, now, 0.1);
    }
  }

  playSonicFlyby() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 1.2); // Doppler drop

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  playHydraulicServo() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.6);
    osc.frequency.linearRampToValueAtTime(200, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.4);
  }

  playWeaponRelease() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    // Pneumatic clunk + hiss
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);

    this.playCockpitVoice('Weapon released');
  }

  playExplosion() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    // Deep sub-bass impact boom
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 1.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(50, now + 1.8);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  playWarningBeep() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1040, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCockpitVoice(text) {
    if (this.isMuted || !this.speechSynth) return;
    const now = performance.now();
    if (now - this.lastVoiceAlertTime < 2500) return; // Prevent overlapping speech spam

    this.lastVoiceAlertTime = now;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.15;
      utter.pitch = 0.9;
      utter.volume = 0.8;
      this.speechSynth.speak(utter);
    } catch (e) {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.audioCtx.currentTime);
    }
    return this.isMuted;
  }
}

function THREE_LERP_OR_VAL(val, fallback) {
  return typeof val === 'number' ? val : fallback;
}
