/**
 * GESTUREDRIVE X — Main Racing Game Coordinator
 * Integrates 3D Engine, Car Physics, Procedural Track, Traffic AI, Web Audio, Networking & Menus
 */

import { Engine } from './core/Engine.js';
import { AudioManager } from './core/AudioManager.js';
import { NetworkClient } from './core/NetworkClient.js';
import { Car } from './game/Car.js';
import { Track } from './game/Track.js';
import { TrafficManager } from './game/Traffic.js';
import { ParticleSystem } from './game/Particles.js';
import { HUD } from './ui/HUD.js';
import { Menus } from './ui/Menus.js';
import { WebcamGestureTracker } from './vision/WebcamGestureTracker.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-canvas-container');

    // Subsystems
    this.engine = new Engine(this.container);
    this.audio = new AudioManager();
    this.network = new NetworkClient();
    this.hud = new HUD();
    this.particles = new ParticleSystem(this.engine.scene);
    this.track = new Track(this.engine.scene);
    this.traffic = new TrafficManager(this.engine.scene);
    this.car = new Car(this.engine.scene, 0x00f0ff);

    // Laptop Webcam Hand Gesture Tracker
    const webcamVideo = document.getElementById('laptop-webcam');
    const webcamCanvas = document.getElementById('laptop-hand-canvas');
    this.webcamTracker = new WebcamGestureTracker(webcamVideo, webcamCanvas, {
      deadzone: 0.06,
      sensitivity: 1.4,
      smoothingFactor: 0.35
    });
    this.webcamEnabled = true;

    // Game State: 'MENU' | 'COUNTDOWN' | 'RACING' | 'PAUSED' | 'RESULTS'
    this.state = 'MENU';
    this.gameMode = 'endless';

    // Race Statistics
    this.score = 0;
    this.distance = 0;
    this.topSpeed = 0;
    this.nearMisses = 0;
    this.nearMissStreak = 0;
    this.coins = 0;
    this.highScore = parseInt(localStorage.getItem('GD_HIGHSCORE') || '0', 10);
    this.raceStartTime = 0;

    // Keyboard Fallback Input
    this.keys = {
      ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
      KeyA: false, KeyD: false, KeyW: false, KeyS: false,
      Space: false, ShiftLeft: false, ShiftRight: false
    };

    // Camera Modes
    this.cameraModes = ['chase', 'hood', 'orbit'];
    this.currentCamIndex = 0;

    // Attract Mode / Idle timer
    this.lastInteractionTime = performance.now();
    this.idleThreshold = 45000; // 45 seconds

    // Delta clock
    this.lastTime = performance.now();

    this._setupMenus();
    this._setupNetwork();
    this._setupKeyboard();
    this._setupWebcamControls();

    // Start in Showroom Orbit camera
    this.engine.cameraMode = 'orbit';

    // Begin Animation Loop
    requestAnimationFrame((t) => this._loop(t));
  }

  _setupMenus() {
    this.menus = new Menus({
      onStartRace: (mode) => this.startRace(mode),
      onResume: () => this.resumeRace(),
      onRestart: () => this.restartRace(),
      onQuit: () => this.returnToMenu(),
      onColorChange: (hex) => this.car.setColor(hex),
      onQualityChange: (quality) => this.engine.setQuality(quality),
      onCameraChange: (cam) => { this.engine.cameraMode = cam; },
      onMuteToggle: (unmuted) => this.audio.setMuted(!unmuted),
      onBeep: (isHigh) => this.audio.playBeep(isHigh)
    });

    this.menus.showStartScreen();
  }

  _setupNetwork() {
    this.network.onSessionCreated = (info) => {
      this.hud.setPairingInfo(info.sessionCode, info.qrCode);
      this.menus.setPairingInfo(info.sessionCode, info.controllerUrl, info.qrCode);
    };

    this.network.onControllerConnect = (device) => {
      this.menus.setPhoneConnected(true, device.deviceInfo);
    };

    this.network.onControllerDisconnect = () => {
      this.menus.setPhoneConnected(false);
    };

    this.network.onCommand = (action, val) => {
      if (action === 'TOGGLE_PAUSE') {
        if (this.state === 'RACING') this.pauseRace();
        else if (this.state === 'PAUSED') this.resumeRace();
      } else if (action === 'START_RACE') {
        if (this.state === 'MENU') this.startRace(this.gameMode);
      }
    };

    this.network.connect();
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.lastInteractionTime = performance.now();
      if (e.code in this.keys) {
        this.keys[e.code] = true;
      }
      if (e.code === 'Escape') {
        if (this.state === 'RACING') this.pauseRace();
        else if (this.state === 'PAUSED') this.resumeRace();
      }
      if (e.code === 'KeyC') {
        // Cycle camera mode
        this.currentCamIndex = (this.currentCamIndex + 1) % this.cameraModes.length;
        this.engine.cameraMode = this.cameraModes[this.currentCamIndex];
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }
    });

    // Audio context resume on first interaction
    window.addEventListener('pointerdown', () => {
      this.audio.init();
      this.audio.resume();
      if (this.state === 'MENU') {
        this.audio.startMenuMusic();
      }
      this.lastInteractionTime = performance.now();
    }, { once: true });
  }

  _setupWebcamControls() {
    const btnStartWebcamToggle = document.getElementById('btn-toggle-laptop-webcam');
    const btnStartToggleText = document.getElementById('btn-webcam-toggle-text');
    const btnHudToggle = document.getElementById('btn-hud-cam-toggle');
    const btnHudCalibrate = document.getElementById('btn-hud-cam-calibrate');
    const btnHudInvert = document.getElementById('btn-hud-cam-invert');
    const sensSlider = document.getElementById('webcam-sens-slider');
    const sensVal = document.getElementById('webcam-sens-val');
    const settingToggle = document.getElementById('setting-webcam-toggle');
    const settingInvert = document.getElementById('setting-webcam-invert');
    const settingSens = document.getElementById('setting-webcam-sens');
    const settingSensLabel = document.getElementById('setting-webcam-sens-label');
    const settingDeadzone = document.getElementById('setting-webcam-deadzone');
    const settingDeadzoneLabel = document.getElementById('setting-webcam-deadzone-label');

    const updateToggleUI = () => {
      if (this.webcamEnabled) {
        if (btnStartWebcamToggle) {
          btnStartWebcamToggle.className = 'btn btn-webcam-toggle active';
          if (btnStartToggleText) btnStartToggleText.textContent = 'ENABLED';
        }
        if (btnHudToggle) btnHudToggle.className = 'btn-hud-icon active';
        if (settingToggle) settingToggle.checked = true;
      } else {
        if (btnStartWebcamToggle) {
          btnStartWebcamToggle.className = 'btn btn-webcam-toggle';
          if (btnStartToggleText) btnStartToggleText.textContent = 'DISABLED';
        }
        if (btnHudToggle) btnHudToggle.className = 'btn-hud-icon';
        if (settingToggle) settingToggle.checked = false;
      }
    };

    const toggleWebcam = async () => {
      this.webcamEnabled = !this.webcamEnabled;
      updateToggleUI();
      if (this.webcamEnabled) {
        try {
          await this.webcamTracker.start();
        } catch (e) {
          this.webcamEnabled = false;
          updateToggleUI();
        }
      } else {
        this.webcamTracker.stop();
      }
    };

    if (btnStartWebcamToggle) btnStartWebcamToggle.addEventListener('click', toggleWebcam);
    if (btnHudToggle) btnHudToggle.addEventListener('click', toggleWebcam);
    if (settingToggle) settingToggle.addEventListener('change', (e) => {
      if (e.target.checked !== this.webcamEnabled) toggleWebcam();
    });

    if (btnHudCalibrate) {
      btnHudCalibrate.addEventListener('click', () => {
        this.webcamTracker.calibrate();
      });
    }

    const updateInvertUI = () => {
      const inv = this.webcamTracker.invertSteering;
      if (btnHudInvert) {
        if (inv) btnHudInvert.classList.add('active');
        else btnHudInvert.classList.remove('active');
      }
      if (settingInvert) settingInvert.checked = inv;
    };

    if (btnHudInvert) {
      btnHudInvert.addEventListener('click', () => {
        this.webcamTracker.setInvert(!this.webcamTracker.invertSteering);
        updateInvertUI();
      });
    }

    if (settingInvert) {
      settingInvert.addEventListener('change', (e) => {
        this.webcamTracker.setInvert(e.target.checked);
        updateInvertUI();
      });
    }

    const onSensChange = (val) => {
      const num = parseFloat(val);
      this.webcamTracker.setSensitivity(num);
      if (sensVal) sensVal.textContent = `${num.toFixed(1)}x`;
      if (settingSensLabel) settingSensLabel.textContent = `${num.toFixed(1)}x`;
      if (sensSlider) sensSlider.value = num;
      if (settingSens) settingSens.value = num;
    };

    if (sensSlider) sensSlider.addEventListener('input', (e) => onSensChange(e.target.value));
    if (settingSens) settingSens.addEventListener('input', (e) => onSensChange(e.target.value));

    if (settingDeadzone) {
      settingDeadzone.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.webcamTracker.setDeadzone(val);
        if (settingDeadzoneLabel) settingDeadzoneLabel.textContent = val.toFixed(2);
      });
    }

    // Initialize UI states from tracker settings immediately
    updateToggleUI();
    updateInvertUI();

    // Auto-start webcam if enabled
    setTimeout(() => {
      if (this.webcamEnabled && !this.webcamTracker.isActive) {
        this.webcamTracker.start().catch(() => {});
      }
    }, 400);
  }

  startRace(mode = 'endless') {
    this.audio.init();
    this.audio.resume();
    this.audio.stopMenuMusic();
    this.audio.silenceCarSounds();
    this.gameMode = mode;

    this.menus.hideAll();
    this.hud.show();
    this.engine.cameraMode = 'chase';

    // Start webcam if enabled and not already running
    if (this.webcamEnabled && !this.webcamTracker.isActive) {
      this.webcamTracker.start().catch((err) => console.warn('Webcam start notice:', err));
    }

    // Reset vehicle & track
    this.track.reset();
    this.car.mesh.position.set(0, 0.45, 0);
    this.car.speed = 0;
    this.car.yaw = 0;
    this.car.steerAngle = 0;
    this.car.nitroCharge = 100;

    // Reset stats
    this.score = 0;
    this.distance = 0;
    this.topSpeed = 0;
    this.nearMisses = 0;
    this.nearMissStreak = 0;
    this.coins = 0;

    // Reset traffic ahead of start line
    this.traffic.init(0);

    // Countdown 3, 2, 1, GO!
    this.state = 'COUNTDOWN';
    this.menus.startCountdown(() => {
      this.state = 'RACING';
      this.raceStartTime = performance.now();
      this.audio.startRaceMusic();
    });
  }

  pauseRace() {
    if (this.state !== 'RACING') return;
    this.state = 'PAUSED';
    this.audio.pauseRaceAudio();
    this.menus.showPauseScreen();
  }

  resumeRace() {
    if (this.state !== 'PAUSED') return;
    this.state = 'RACING';
    this.audio.resumeRaceAudio();
    this.menus.hidePauseScreen();
  }

  restartRace() {
    this.startRace(this.gameMode);
  }

  returnToMenu() {
    this.state = 'MENU';
    this.menus.cancelCountdown();
    this.audio.resetForMenu();
    this.hud.hide();
    this.menus.showStartScreen();
    this.engine.cameraMode = 'orbit';
  }

  finishRace() {
    this.state = 'RESULTS';
    this.audio.stopRaceMusic();
    this.audio.silenceCarSounds();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('GD_HIGHSCORE', this.highScore.toString());
    }

    this.menus.showResults({
      score: this.score,
      highScore: this.highScore,
      topSpeed: this.topSpeed,
      distance: this.distance,
      nearMisses: this.nearMisses,
      coins: this.coins
    });
  }

  _getMergedInput() {
    // 1. Laptop Webcam Hand Gesture Tracker Input
    const webcamInput = (this.webcamEnabled && this.webcamTracker) ? this.webcamTracker.getInput() : null;

    // 2. Phone Controller Input
    const phoneInput = this.network.getInput();

    // 3. Keyboard Input
    let kbSteer = 0.0;
    if (this.keys.ArrowLeft || this.keys.KeyA) kbSteer -= 1.0;
    if (this.keys.ArrowRight || this.keys.KeyD) kbSteer += 1.0;

    let kbThrottle = (this.keys.ArrowUp || this.keys.KeyW) ? 1.0 : (kbSteer !== 0 ? 0.8 : 0.0);
    let kbBrake = (this.keys.ArrowDown || this.keys.KeyS || this.keys.Space) ? 1.0 : 0.0;
    let kbNitro = this.keys.ShiftLeft || this.keys.ShiftRight;

    // Input Merge Strategy:
    // Priority 1: Physical Keyboard overrides immediately if pressed
    const hasKeyboardInput = kbSteer !== 0 || kbThrottle > 0 || kbBrake > 0 || kbNitro;

    if (hasKeyboardInput) {
      return {
        steer: kbSteer,
        throttle: kbThrottle,
        brake: kbBrake,
        nitro: kbNitro,
        source: 'keyboard'
      };
    } else if (webcamInput && webcamInput.active && webcamInput.handDetected) {
      // Priority 2: Real-time Laptop Webcam Hand Gesture Steering!
      return {
        steer: webcamInput.steer,
        throttle: (this.state === 'RACING') ? webcamInput.throttle : 0.0,
        brake: webcamInput.brake,
        nitro: webcamInput.nitro,
        source: 'webcam'
      };
    } else if (this.network.isPhoneConnected && phoneInput.handVisible) {
      // Priority 3: Phone Gesture Controller
      return {
        steer: phoneInput.steer,
        throttle: (this.state === 'RACING') ? phoneInput.throttle : 0.0,
        brake: phoneInput.brake,
        nitro: phoneInput.nitro,
        source: 'phone'
      };
    } else {
      // Safe neutral cruise / coasting
      const neutralSteer = (webcamInput && webcamInput.active) ? webcamInput.steer : 0.0;
      return {
        steer: neutralSteer,
        throttle: (this.state === 'RACING' && this.network.isPhoneConnected) ? 0.7 : 0.0,
        brake: 0.0,
        nitro: false,
        source: 'none'
      };
    }
  }

  _loop(currentTime) {
    const delta = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // 1. Process Input
    const input = this._getMergedInput();

    // 2. State-Specific Updates
    if (this.state === 'RACING') {
      this._updateRacing(delta, input);
    } else if (this.state === 'MENU') {
      // Showroom Idle Attract Mode
      if (currentTime - this.lastInteractionTime > this.idleThreshold) {
        this.engine.cameraMode = 'orbit';
      }
    }

    // 3. Update Camera
    this.engine.updateCamera(this.car, delta);

    // 4. Render 3D Scene
    this.engine.render();

    requestAnimationFrame((t) => this._loop(t));
  }

  _updateRacing(delta, input) {
    // 1. Update Player Car Physics
    this.car.update(delta, input);

    // Track top speed & distance
    if (this.car.speed > this.topSpeed) this.topSpeed = this.car.speed;
    const forwardMeters = (this.car.speed * 1000 / 3600) * delta;
    this.distance += forwardMeters;

    // Dynamic Score accrual
    this.score += (this.car.speed * 0.12) * (this.car.isNitroActive ? 2.5 : 1.0);

    // 2. Update Highway Track & Recycled Chunks
    this.track.update(this.car.mesh.position.z);

    // 3. Track Barrier Collisions
    const barrierHit = this.track.checkBarrierCollision(this.car);
    if (barrierHit.hit) {
      this.audio.playCrash();
      this.particles.spawnSparks(
        this.car.mesh.position,
        { x: barrierHit.side === 'left' ? -1 : 1, z: 0 }
      );
      this.nearMissStreak = 0; // Break streak
    }

    // 4. Track Pickups (Coins & Nitro)
    this.track.checkPickups(
      this.car.mesh.position,
      () => {
        // Coin collected
        this.coins++;
        this.score += 200;
        this.audio.playCoinSound();
      },
      () => {
        // Nitro canister collected
        this.car.nitroCharge = Math.min(100, this.car.nitroCharge + 40);
        this.score += 150;
        this.audio.playCoinSound();
      }
    );

    // 5. Update AI Traffic
    this.traffic.update(
      delta,
      this.car,
      (trafficCar, impact) => {
        // Traffic Collision
        this.audio.playCrash();
        this.particles.spawnSparks(
          { x: impact.impactX, y: 0.8, z: impact.impactZ },
          { x: 0, z: -1 }
        );
        this.nearMissStreak = 0; // Break streak
      },
      (trafficCar) => {
        // Near Miss Bonus!
        this.nearMisses++;
        this.nearMissStreak++;
        const bonusPoints = 250 * this.nearMissStreak;
        this.score += bonusPoints;
        this.audio.playNearMiss();
        this.hud.triggerNearMissPopup(bonusPoints, this.nearMissStreak);
      }
    );

    // 6. Visual Particles
    if (this.car.isNitroActive) {
      this.car.exhaustPoints.forEach(pt => {
        const worldPt = pt.clone().applyMatrix4(this.car.mesh.matrixWorld);
        this.particles.spawnNitro(worldPt, this.car.yaw, this.car.speed);
      });
    }

    if (this.car.isDrifting || (input.brake > 0.4 && this.car.speed > 50)) {
      this.car.rearWheels.forEach(w => {
        const worldPos = w.pivot.position.clone().applyMatrix4(this.car.mesh.matrixWorld);
        this.particles.spawnSmoke(worldPos);
      });
    }

    this.particles.update(delta, this.car);

    // 7. Update Procedural Engine Audio
    this.audio.updateCarSound(
      this.car.speed,
      this.car.maxSpeed,
      this.car.rpm,
      this.car.gear,
      input.brake > 0.1,
      this.car.isDrifting,
      this.car.isNitroActive
    );

    // 8. Update HUD
    const webcamInput = (this.webcamEnabled && this.webcamTracker) ? this.webcamTracker.getInput() : null;
    this.hud.update(
      this.car,
      this.traffic,
      this.network,
      this.score,
      this.distance,
      this.highScore,
      webcamInput
    );
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
