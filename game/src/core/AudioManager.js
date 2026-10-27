/**
 * GESTUREDRIVE X - Centralized State-Aware Procedural Audio Engine
 * Real-time synthesis of multi-oscillator engine RPM, tire skid, nitro roar, 
 * persistent non-overlapping menu soundtrack, and high-energy racing soundtrack.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.engineVolume = 0.7;

    // Audio State: 'STOPPED' | 'MENU' | 'RACING' | 'PAUSED'
    this.audioState = 'STOPPED';

    // Core Audio Nodes
    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.skidGain = null;
    this.skidFilter = null;
    this.nitroGain = null;

    // Menu Music State
    this.menuMusicTimer = null;
    this.menuStep = 0;
    this.isMenuMusicPlaying = false;
    this.menuGain = null;

    // Race Music State
    this.raceMusicTimer = null;
    this.raceStep = 0;
    this.isRaceMusicPlaying = false;
    this.raceGain = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0.0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      // Dedicated Music Sub-Buses
      this.menuGain = this.ctx.createGain();
      this.menuGain.gain.value = 0.55;
      this.menuGain.connect(this.masterGain);

      this.raceGain = this.ctx.createGain();
      this.raceGain.gain.value = 0.75;
      this.raceGain.connect(this.masterGain);

      this._setupEngineSynth();
      this._setupSkidSynth();
      this._setupNitroSynth();

      this.initialized = true;
      console.log('[AudioManager] Procedural audio synthesis initialized.');
    } catch (e) {
      console.warn('[AudioManager] Web Audio requires user gesture:', e.message);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- CAR ENGINE & DRIVING SFX ---

  _setupEngineSynth() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;

    // Lowpass filter simulates cylinder intake/exhaust resonance
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 350;
    this.engineFilter.Q.value = 4.0;

    // Oscillator 1: Main engine fundamental (Sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 55; // Idle ~55 Hz

    // Oscillator 2: Exhaust harmonic growl (Square)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 27.5; // Sub-octave

    // Distortion shaper for throaty roar
    const waveshaper = this.ctx.createWaveShaper();
    waveshaper.curve = this._makeDistortionCurve(20);

    this.engineOsc1.connect(waveshaper);
    this.engineOsc2.connect(waveshaper);
    waveshaper.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  _setupSkidSynth() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1100;
    this.skidFilter.Q.value = 5.0;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0.0;

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    whiteNoise.start();
  }

  _setupNitroSynth() {
    if (!this.ctx) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.value = 0.0;

    const nitroOsc = this.ctx.createOscillator();
    nitroOsc.type = 'sawtooth';
    nitroOsc.frequency.value = 120;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'bandpass';
    nitroFilter.frequency.value = 850;
    nitroFilter.Q.value = 2.0;

    nitroOsc.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    nitroOsc.start();
  }

  _makeDistortionCurve(amount) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  updateCarSound(speed, maxSpeed, rpm, gear, isBraking, isDrifting, isNitro) {
    if (!this.initialized || this.isMuted || this.audioState !== 'RACING') return;

    const now = this.ctx.currentTime;
    const ratio = Math.max(0.0, Math.min(1.0, speed / maxSpeed));

    // 1. Engine RPM frequency (Idle 45Hz -> Redline 280Hz)
    const baseFreq = 45 + (rpm / 8500) * 230;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);

    // Filter opens up with speed & throttle
    const filterFreq = 300 + ratio * 2800 + (isNitro ? 1200 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);

    // Engine volume
    const targetEngineVol = 0.25 + ratio * 0.45;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.05);

    // 2. Tire Skid / Screech
    const skidTarget = (isDrifting || (isBraking && speed > 20)) ? Math.min(0.5, ratio * 0.6) : 0.0;
    this.skidGain.gain.setTargetAtTime(skidTarget, now, 0.04);
    if (skidTarget > 0) {
      this.skidFilter.frequency.setTargetAtTime(900 + Math.random() * 400, now, 0.02);
    }

    // 3. Nitro Roar
    const nitroTarget = isNitro ? 0.45 : 0.0;
    this.nitroGain.gain.setTargetAtTime(nitroTarget, now, 0.08);
  }

  silenceCarSounds() {
    if (!this.ctx || !this.initialized) return;
    const now = this.ctx.currentTime;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0.0, now, 0.03);
    if (this.skidGain) this.skidGain.gain.setTargetAtTime(0.0, now, 0.03);
    if (this.nitroGain) this.nitroGain.gain.setTargetAtTime(0.0, now, 0.03);
  }

  // --- MENU MUSIC (PERSISTENT & NON-DUPLICATING) ---

  startMenuMusic() {
    if (!this.initialized) this.init();
    if (this.isMuted) return;

    // Guard: Never duplicate or restart if already playing!
    if (this.isMenuMusicPlaying && this.menuMusicTimer) {
      return;
    }

    // Clean up any conflicting gameplay audio
    this.stopRaceMusic();
    this.silenceCarSounds();

    if (this.ctx && this.menuGain) {
      this.menuGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.menuGain.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.1);
    }

    this.isMenuMusicPlaying = true;
    this.audioState = 'MENU';

    // Ambient Cyberpunk Showroom Chords (Dm9 -> Bbmaj7 -> Fmaj7 -> C)
    const chordProgressions = [
      [146.83, 174.61, 220.00, 261.63], // Dm9 (D3, F3, A3, C4)
      [116.54, 174.61, 220.00, 293.66], // Bbmaj7 (Bb2, F3, A3, D4)
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [130.81, 164.81, 196.00, 261.63]  // C (C3, E3, G3, C4)
    ];

    const chordDuration = 2.4; // seconds per chord
    this._playMenuChord(chordProgressions[this.menuStep % chordProgressions.length], chordDuration);
    this.menuStep++;

    this.menuMusicTimer = setInterval(() => {
      if (!this.isMenuMusicPlaying || this.isMuted) return;
      const chord = chordProgressions[this.menuStep % chordProgressions.length];
      this._playMenuChord(chord, chordDuration);
      this.menuStep++;
    }, chordDuration * 1000);
  }

  stopMenuMusic() {
    this.isMenuMusicPlaying = false;
    if (this.menuMusicTimer) {
      clearInterval(this.menuMusicTimer);
      this.menuMusicTimer = null;
    }
    if (this.ctx && this.menuGain) {
      this.menuGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
  }

  _playMenuChord(frequencies, duration) {
    if (!this.ctx || !this.menuGain) return;
    const now = this.ctx.currentTime;

    frequencies.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.menuGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // --- RACING SOUNDTRACK (HIGH-ENERGY SYNTHWAVE) ---

  startRaceMusic() {
    if (!this.initialized) this.init();
    if (this.isMuted) return;

    // Guard: Never duplicate or restart if already playing!
    if (this.isRaceMusicPlaying && this.raceMusicTimer) {
      return;
    }

    // Stop menu music cleanly
    this.stopMenuMusic();

    if (this.ctx && this.raceGain) {
      this.raceGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.raceGain.gain.setTargetAtTime(0.75, this.ctx.currentTime, 0.1);
    }

    this.isRaceMusicPlaying = true;
    this.audioState = 'RACING';

    // Synthwave Arpeggio Bass Notes (D minor: D2, F2, G2, A2)
    const notes = [73.42, 87.31, 98.00, 110.00, 73.42, 87.31, 110.00, 98.00];
    const bpm = 128;
    const stepDuration = (60 / bpm) / 2; // 16th notes

    this.raceMusicTimer = setInterval(() => {
      if (!this.isRaceMusicPlaying || this.isMuted) return;
      const noteFreq = notes[this.raceStep % notes.length];
      this._playBassNote(noteFreq, stepDuration * 0.85);

      // Four-on-the-floor Kick on every 4th step
      if (this.raceStep % 4 === 0) {
        this._playKick();
      }
      // Hi-hat on offbeats
      if (this.raceStep % 2 === 1) {
        this._playHiHat();
      }

      this.raceStep++;
    }, stepDuration * 1000);
  }

  // Alias for backward compatibility
  startMusic() {
    this.startRaceMusic();
  }

  stopRaceMusic() {
    this.isRaceMusicPlaying = false;
    if (this.raceMusicTimer) {
      clearInterval(this.raceMusicTimer);
      this.raceMusicTimer = null;
    }
  }

  // Alias for backward compatibility
  stopMusic() {
    this.stopRaceMusic();
  }

  // --- STATE-AWARE TRANSITIONS ---

  resetForMenu() {
    this.audioState = 'MENU';
    this.stopRaceMusic();
    this.silenceCarSounds();
    this.startMenuMusic();
  }

  pauseRaceAudio() {
    this.audioState = 'PAUSED';
    if (this.ctx && this.raceGain) {
      this.raceGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05); // Duck race music
    }
    this.silenceCarSounds();
  }

  resumeRaceAudio() {
    this.audioState = 'RACING';
    if (this.ctx && this.raceGain && this.isRaceMusicPlaying && !this.isMuted) {
      this.raceGain.gain.setTargetAtTime(0.75, this.ctx.currentTime, 0.08); // Restore race music volume
    }
  }

  stopAll() {
    this.stopRaceMusic();
    this.stopMenuMusic();
    this.silenceCarSounds();
    this.audioState = 'STOPPED';
  }

  _playBassNote(freq, duration) {
    if (!this.ctx || !this.raceGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + duration);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.raceGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  _playKick() {
    if (!this.ctx || !this.raceGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.raceGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  _playHiHat() {
    if (!this.ctx || !this.raceGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, now);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.raceGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // --- SOUND EFFECTS (PRESERVED) ---

  playGearShift() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(140, now);
    popOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    popGain.gain.setValueAtTime(0.4, now);
    popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);
    popOsc.start(now);
    popOsc.stop(now + 0.09);
  }

  playCoinSound() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playNearMiss() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playCrash() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  playBeep(isHigh = false) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 880 : 440, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (isHigh ? 0.3 : 0.15));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isHigh ? 0.32 : 0.17));
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0.0 : this.masterVolume, this.ctx.currentTime);
    }
  }
}
