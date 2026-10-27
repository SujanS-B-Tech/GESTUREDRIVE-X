/**
 * GESTUREDRIVE X — High-Performance Laptop Webcam 9-and-3 Two-Hand Steering Tracker
 * 
 * Features:
 * - Real 9 o'clock & 3 o'clock two-hand steering wheel tracking
 * - Concurrency lock and 30 FPS inference throttling (eliminates CPU/GPU lag and WebGL context loss)
 * - Robust multi-frame baseline calibration (no accidental 1-frame click corruption)
 * - True mathematical sign alignment: Left Steer = Negative, Right Steer = Positive
 * - User Invert Steering option toggle
 * - Safe temporal hold and smooth neutral decay on tracking loss
 * - Real-time Debug Telemetry Overlay showing detected hands, baseline, raw/smoothed steer, and vehicle direction
 */

export class WebcamGestureTracker {
  constructor(videoElement, canvasElement, options = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.options = Object.assign({
      deadzone: 0.04,           // Subtle deadzone around neutral
      maxTiltAngle: 0.50,       // Radians (~28.6 deg) for 100% steering lock
      sensitivity: 1.4,         // Steering multiplier
      smoothingFactor: 0.35,    // Exponential filter alpha
      minConfidence: 0.55,      // Detection confidence
      targetFps: 32             // Inference rate limit (prevents lag and GPU overload)
    }, options);

    // Calibration State
    this.calibratedNeutralAngle = 0.0; // Default to true horizontal level
    this.calibratedCenterX = 0.5;
    this.isCalibrated = true;          // Initialized to true horizontal baseline
    this.calibrationCountdown = 0;     // Settling countdown on manual calibrate click
    this.calibrationSamples = [];

    // Direction Inversion Setting (persisted in localStorage)
    this.invertSteering = localStorage.getItem('GD_INVERT_STEER') === 'true';

    // Tracking & Concurrency State
    this.isActive = false;
    this.isEvaluating = false;         // Concurrency guard: prevents overlapping hands.send calls
    this.lastInferenceTime = 0;        // Frame throttling clock
    this.isHandDetected = false;
    this.detectedHandsCount = 0;
    this.lostFrames = 0;
    this.stream = null;
    this.hands = null;
    this.animFrameId = null;

    // Performance Metrics
    this.inferenceLatencyMs = 0;
    this.inferenceFps = 0;
    this.fpsCounter = 0;
    this.lastFpsUpdateTime = performance.now();

    // Smoothed Vehicle Outputs
    this.rawSteer = 0.0;
    this.smoothedSteer = 0.0;
    this.smoothedThrottle = 1.0;
    this.smoothedBrake = 0.0;
    this.isNitro = false;
    this.currentGesture = 'CENTER';
    this.lastWheelAngle = 0.0;
    this.handLPos = { x: 0, y: 0 };
    this.handRPos = { x: 0, y: 0 };

    // Debug Overlay Toggle (enabled by default as requested in Priority 1)
    this.showDebugOverlay = true;

    // Callbacks
    this.onStateChange = null;

    // MediaPipe Hand Landmark Connections
    this.CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],        // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],        // Index
      [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                                // Palm base
    ];
  }

  async start() {
    if (this.isActive) return;

    try {
      // 1. Request Webcam Media Stream with balanced 640x480 resolution
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();

      // 2. Initialize MediaPipe Hands (Up to 2 Hands for 9 & 3 Steering Wheel)
      await this._initMediaPipe();

      this.isActive = true;
      this.isEvaluating = false;
      this.lastInferenceTime = performance.now();
      this._notifyState('ACTIVE', 'Webcam active. Grip the wheel at 9 and 3.');
      this._processFrame();
      return true;
    } catch (err) {
      console.error('[WebcamTracker] Camera initialization failed:', err);
      this.stop();
      this._notifyState('ERROR', err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access in browser.'
        : `Camera error: ${err.message}`);
      throw err;
    }
  }

  stop() {
    this.isActive = false;
    this.isEvaluating = false;
    this.isHandDetected = false;
    this.detectedHandsCount = 0;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[WebcamTracker] Stopped media track:', track.label);
      });
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Reset vehicle steering to safe neutral
    this.rawSteer = 0.0;
    this.smoothedSteer = 0.0;
    this.smoothedThrottle = 0.0;
    this.smoothedBrake = 0.0;
    this.isNitro = false;

    this._notifyState('DISABLED', 'Webcam steering disabled.');
  }

  async _initMediaPipe() {
    if (this.hands) return;

    const HandsClass = window.Hands || (await import('@mediapipe/hands')).Hands;
    this.hands = new HandsClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2, // TWO HANDS FOR 9-and-3 STEERING WHEEL
      modelComplexity: 1,
      minDetectionConfidence: this.options.minConfidence,
      minTrackingConfidence: 0.50
    });

    this.hands.onResults((results) => this._onResults(results));
  }

  async _processFrame() {
    if (!this.isActive) return;

    const now = performance.now();
    const minIntervalMs = 1000 / this.options.targetFps; // ~31ms for 32 FPS

    // Throttling: If called faster than target FPS, schedule next tick and wait
    if (now - this.lastInferenceTime < minIntervalMs) {
      this.animFrameId = requestAnimationFrame(() => this._processFrame());
      return;
    }

    // Concurrency Lock: Prevent overlapping hands.send calls that crash MediaPipe/WebGL
    if (this.isEvaluating) {
      this.animFrameId = requestAnimationFrame(() => this._processFrame());
      return;
    }

    if (this.video && this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0 && this.hands) {
      this.isEvaluating = true;
      const sendStartTime = performance.now();

      try {
        await this.hands.send({ image: this.video });
        this.inferenceLatencyMs = Math.round(performance.now() - sendStartTime);
        this.lastInferenceTime = performance.now();

        // Calculate actual inference FPS
        this.fpsCounter++;
        if (performance.now() - this.lastFpsUpdateTime >= 1000) {
          this.inferenceFps = this.fpsCounter;
          this.fpsCounter = 0;
          this.lastFpsUpdateTime = performance.now();
        }
      } catch (err) {
        console.warn('[WebcamTracker] Inference error handled:', err.message);
      } finally {
        this.isEvaluating = false;
      }
    }

    if (this.isActive) {
      this.animFrameId = requestAnimationFrame(() => this._processFrame());
    }
  }

  _onResults(results) {
    const w = this.canvas.width = this.video.videoWidth || 640;
    const h = this.canvas.height = this.video.videoHeight || 480;

    this.ctx.clearRect(0, 0, w, h);

    const detected = results.multiHandLandmarks || [];
    this.detectedHandsCount = detected.length;

    if (detected.length >= 2) {
      this.isHandDetected = true;
      this.lostFrames = 0;

      // Extract Screen Coordinates (Mirrored: screenX = 1.0 - rawX so left hand is on left)
      const handA = this._getHandInfo(detected[0]);
      const handB = this._getHandInfo(detected[1]);

      // Assign Left Hand (9 o'clock) and Right Hand (3 o'clock) based on horizontal screen position
      const hand9 = (handA.screenX < handB.screenX) ? handA : handB; // Left Hand (9 o'clock)
      const hand3 = (handA.screenX < handB.screenX) ? handB : handA; // Right Hand (3 o'clock)

      this.handLPos = { x: hand9.screenX, y: hand9.screenY };
      this.handRPos = { x: hand3.screenX, y: hand3.screenY };

      // Calculate Steering Angle and Vehicle Control
      this._compute9And3Steering(hand9, hand3, w, h);

      // Render Virtual Steering Wheel & Skeletons
      this._renderSteeringWheelHUD(hand9, hand3, w, h);

      this._notifyState('TRACKING', `Two-Hand 9 & 3 Steering Active (${this.currentGesture})`);

    } else if (detected.length === 1) {
      // Single hand detected: hold briefly, then decay to neutral safely
      this.lostFrames++;
      this._handlePartialOrLostTracking(detected, w, h);
      this._notifyState('ONE_HAND', 'HOLD BOTH HANDS AT 9 & 3 TO STEER');

    } else {
      // No hands: smooth decay to neutral
      this.lostFrames++;
      this.isHandDetected = false;
      this._decayToNeutral();
      this.currentGesture = 'NO_HAND';
      this._notifyState('NO_HAND', 'SHOW BOTH HANDS TO CAMERA');
    }

    // Always render the Debug Telemetry Overlay on canvas
    if (this.showDebugOverlay) {
      this._renderDebugOverlay(w, h);
    }
  }

  _getHandInfo(landmarks) {
    // Stable palm center using wrist (0) + base knuckles (5, 9, 17)
    const rawX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[17].x) * 0.25;
    const rawY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[17].y) * 0.25;

    // Mirrored screen coordinates: 0.0 = User Physical Left, 1.0 = User Physical Right
    const screenX = 1.0 - rawX;
    const screenY = rawY;

    const palmScale = this._distance(landmarks[0], landmarks[9]) || 0.15;
    const isFist = this._checkFist(landmarks, palmScale);
    const isThumbsUp = this._checkThumbsUp(landmarks);

    return {
      landmarks,
      rawX,
      rawY,
      screenX,
      screenY,
      isFist,
      isThumbsUp
    };
  }

  _compute9And3Steering(hand9, hand3, w, h) {
    // Vector from Left Hand (9h) to Right Hand (3h) in screen space
    const deltaX = hand3.screenX - hand9.screenX; // Positive distance between hands
    const deltaY = hand3.screenY - hand9.screenY; // Vertical tilt

    // Calculate Steering Wheel Angle (radians):
    // Turn LEFT: Left hand (9h) moves DOWN -> hand9.screenY increases -> deltaY < 0 -> rawAngle < 0 (NEGATIVE)
    // Turn RIGHT: Right hand (3h) moves DOWN -> hand3.screenY increases -> deltaY > 0 -> rawAngle > 0 (POSITIVE)
    const rawWheelAngle = Math.atan2(deltaY, Math.max(0.08, deltaX));
    this.lastWheelAngle = rawWheelAngle;

    const wheelCenterX = (hand9.screenX + hand3.screenX) * 0.5;

    // Multi-frame Settle Calibration
    if (this.calibrationCountdown > 0) {
      this.calibrationSamples.push({ angle: rawWheelAngle, centerX: wheelCenterX });
      this.calibrationCountdown--;
      if (this.calibrationCountdown === 0) {
        // Average the settled calibration samples
        let sumAngle = 0, sumX = 0;
        this.calibrationSamples.forEach(s => { sumAngle += s.angle; sumX += s.centerX; });
        this.calibratedNeutralAngle = sumAngle / this.calibrationSamples.length;
        this.calibratedCenterX = sumX / this.calibrationSamples.length;
        this.isCalibrated = true;
        this.calibrationSamples = [];
        console.log(`[WebcamTracker] Calibrated settled baseline: ${(this.calibratedNeutralAngle * 180 / Math.PI).toFixed(1)}°`);
      }
    }

    // Relative angle against neutral baseline
    const relativeAngle = rawWheelAngle - this.calibratedNeutralAngle;
    const relativeDispX = wheelCenterX - this.calibratedCenterX;

    // Angle component: ~28.6 degrees tilt gives full lock
    const angleRatio = relativeAngle / this.options.maxTiltAngle;
    // Lateral shift assist: subtle lane positioning
    const dispRatio = relativeDispX / 0.18;

    let calculatedSteer = angleRatio * 0.85 + dispRatio * 0.35;

    // Deadzone application around neutral center
    const absSteer = Math.abs(calculatedSteer);
    if (absSteer < this.options.deadzone) {
      calculatedSteer = 0.0;
    } else {
      const sign = Math.sign(calculatedSteer);
      calculatedSteer = sign * ((absSteer - this.options.deadzone) / (1.0 - this.options.deadzone));
    }

    // Sensitivity & Clamp to standard [-1.0, 1.0]
    calculatedSteer = Math.max(-1.0, Math.min(1.0, calculatedSteer * this.options.sensitivity));

    // Sign alignment:
    // When invertSteering is false (default):
    // Steer LEFT (Counter-Clockwise) -> calculatedSteer < 0 -> Car turns LEFT
    // Steer RIGHT (Clockwise)        -> calculatedSteer > 0 -> Car turns RIGHT
    if (this.invertSteering) {
      calculatedSteer = -calculatedSteer;
    }

    this.rawSteer = calculatedSteer;

    // Gesture Classification (Brake = Fist, Nitro = Thumbs-Up)
    const isBraking = hand9.isFist || hand3.isFist;
    const isNitro = hand9.isThumbsUp || hand3.isThumbsUp;

    let rawThrottle = 1.0;
    let rawBrake = 0.0;

    if (isBraking) {
      rawBrake = 1.0;
      rawThrottle = 0.0;
      this.currentGesture = 'BRAKE';
    } else if (isNitro) {
      rawThrottle = 1.0;
      this.currentGesture = 'NITRO';
    } else {
      if (this.rawSteer < -0.15) {
        this.currentGesture = 'STEER_LEFT';
      } else if (this.rawSteer > 0.15) {
        this.currentGesture = 'STEER_RIGHT';
      } else {
        this.currentGesture = 'DRIVE_STRAIGHT';
      }
    }

    // Exponential Low-Latency Filter
    const alpha = this.options.smoothingFactor;
    this.smoothedSteer = this.smoothedSteer * (1.0 - alpha) + this.rawSteer * alpha;
    this.smoothedBrake = this.smoothedBrake * (1.0 - alpha) + rawBrake * alpha;
    this.smoothedThrottle = this.smoothedThrottle * (1.0 - alpha) + rawThrottle * alpha;
    this.isNitro = isNitro;
  }

  _handlePartialOrLostTracking(detected, w, h) {
    if (detected.length === 1) {
      const hand = this._getHandInfo(detected[0]);
      this._drawHandBones(this.ctx, hand.landmarks, w, h, '#ffaa00', '#ff0077');
    }

    // If hands were lost very recently (< 6 frames / 180ms), hold steering gently
    if (this.lostFrames < 6) {
      this.smoothedSteer *= 0.95;
    } else {
      // Smooth decay toward neutral straight driving
      this._decayToNeutral();
    }
    this.currentGesture = 'HOLD_BOTH_HANDS';
  }

  _decayToNeutral() {
    this.smoothedSteer *= 0.80;
    if (Math.abs(this.smoothedSteer) < 0.02) this.smoothedSteer = 0.0;
    this.smoothedBrake = 0.0;
    this.smoothedThrottle = 0.0;
    this.isNitro = false;
    this.rawSteer = 0.0;
  }

  // --- RENDERING HUD OVERLAYS (Black & Red Motorsport Aesthetic) ---

  _renderSteeringWheelHUD(hand9, hand3, w, h) {
    const ctx = this.ctx;

    // Draw hand skeletons (Left: Racing Red/White, Right: Crimson/White)
    this._drawHandBones(ctx, hand9.landmarks, w, h, '#ff1133', '#ffffff');
    this._drawHandBones(ctx, hand3.landmarks, w, h, '#ff4466', '#ffffff');

    // Canvas buffer is visually flipped horizontally by CSS scaleX(-1)
    const lx = hand9.rawX * w;
    const ly = hand9.rawY * h;
    const rx = hand3.rawX * w;
    const ry = hand3.rawY * h;

    const midX = (lx + rx) * 0.5;
    const midY = (ly + ry) * 0.5;
    const wheelRadius = Math.max(30, this._distance({ x: lx, y: ly }, { x: rx, y: ry }) * 0.52);

    ctx.save();

    // 1. Steering Wheel Rim
    ctx.beginPath();
    ctx.arc(midX, midY, wheelRadius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = Math.abs(this.smoothedSteer) > 0.15 ? '#ff1133' : 'rgba(255, 17, 51, 0.45)';
    ctx.shadowColor = '#ff1133';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 2. Wheel Crossbar Spoke (connecting 9h and 3h grips)
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();

    // 3. 9 o'clock & 3 o'clock Grip Badges
    ctx.font = 'bold 11px sans-serif';
    ctx.save();
    ctx.translate(lx, ly - 14);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#ff1133';
    ctx.fillText('9h', -8, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(rx, ry - 14);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3h', -8, 0);
    ctx.restore();

    // 4. Center Wheel Hub
    ctx.beginPath();
    ctx.arc(midX, midY, 9, 0, Math.PI * 2);
    ctx.fillStyle = this.smoothedSteer < -0.15 ? '#ff1133' : (this.smoothedSteer > 0.15 ? '#ff4466' : '#ffffff');
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
  }

  _renderDebugOverlay(w, h) {
    const ctx = this.ctx;
    ctx.save();

    // Canvas element has CSS scaleX(-1). We reflect across canvas width w
    ctx.setTransform(-1, 0, 0, 1, w, 0);

    const padX = 8;
    const padY = 8;
    const boxW = 210;
    const boxH = 96;

    // Obsidian Matte Black telemetry background
    ctx.fillStyle = 'rgba(10, 10, 14, 0.92)';
    ctx.fillRect(padX, padY, boxW, boxH);
    ctx.strokeStyle = 'rgba(255, 17, 51, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, padY, boxW, boxH);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ff1133';
    ctx.fillText('GESTUREDRIVE TELEMETRY', padX + 8, padY + 14);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#a0a0b0';

    // Line 1: Hands & FPS
    const handsLabel = this.detectedHandsCount >= 2 ? '2 (9h & 3h Grip)' : (this.detectedHandsCount === 1 ? '1 Hand' : '0 Hands');
    ctx.fillText(`Hands: ${handsLabel} | ${this.inferenceFps} FPS`, padX + 8, padY + 28);

    // Line 2: Wheel Angle & Baseline
    const angleDeg = (this.lastWheelAngle * 180 / Math.PI).toFixed(1);
    const baseDeg = (this.calibratedNeutralAngle * 180 / Math.PI).toFixed(1);
    ctx.fillText(`Angle: ${angleDeg}° (Base: ${baseDeg}°)`, padX + 8, padY + 42);

    // Line 3: Raw vs Smoothed Steer
    ctx.fillText(`Raw: ${this.rawSteer.toFixed(3)} | Smooth: ${this.smoothedSteer.toFixed(3)}`, padX + 8, padY + 56);

    // Line 4: Final Vehicle Action
    let dirText = '▲ STRAIGHT';
    ctx.fillStyle = '#ffffff';
    if (this.smoothedSteer < -0.15) {
      dirText = '◀ STEER LEFT';
      ctx.fillStyle = '#ff1133';
    } else if (this.smoothedSteer > 0.15) {
      dirText = '▶ STEER RIGHT';
      ctx.fillStyle = '#ff4466';
    }
    const invLabel = this.invertSteering ? '[INV]' : '';
    ctx.fillText(`Action: ${dirText} ${invLabel}`, padX + 8, padY + 70);

    // Line 5: Inference Latency
    ctx.fillStyle = '#777788';
    ctx.fillText(`Latency: ${this.inferenceLatencyMs}ms (Throttled 32fps)`, padX + 8, padY + 84);

    ctx.restore();
  }

  _drawHandBones(ctx, lm, w, h, boneColor, tipColor) {
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = boneColor;
    ctx.shadowColor = boneColor;
    ctx.shadowBlur = 6;

    for (const [i, j] of this.CONNECTIONS) {
      const p1 = lm[i];
      const p2 = lm[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      const x = p.x * w;
      const y = p.y * h;

      ctx.beginPath();
      if ([4, 8, 12, 16, 20].includes(i)) {
        ctx.fillStyle = tipColor;
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
      } else if (i === 0) {
        ctx.fillStyle = '#ffd700';
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
      } else {
        ctx.fillStyle = boneColor;
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // --- CONTROLS & API ---

  calibrate() {
    // Start settle window so mouse-click hand movement doesn't ruin the baseline!
    this.calibrationCountdown = 25; // Settle across ~0.8s
    this.calibrationSamples = [];
    console.log('[WebcamTracker] Starting multi-frame settled calibration for 9 and 3 steering...');
  }

  setSensitivity(val) {
    this.options.sensitivity = Math.max(0.5, Math.min(2.5, val));
  }

  setDeadzone(val) {
    this.options.deadzone = Math.max(0.02, Math.min(0.2, val));
  }

  setInvert(invert) {
    this.invertSteering = Boolean(invert);
    localStorage.setItem('GD_INVERT_STEER', this.invertSteering.toString());
    console.log(`[WebcamTracker] Steering inversion set to: ${this.invertSteering}`);
  }

  getInput() {
    return {
      active: this.isActive,
      handDetected: this.isHandDetected,
      handsCount: this.detectedHandsCount,
      steer: Number(this.smoothedSteer.toFixed(3)),
      rawSteer: Number(this.rawSteer.toFixed(3)),
      throttle: Number(this.smoothedThrottle.toFixed(3)),
      brake: Number(this.smoothedBrake.toFixed(3)),
      nitro: this.isNitro,
      gesture: this.currentGesture,
      angleDeg: Math.round(this.lastWheelAngle * 180 / Math.PI),
      latencyMs: this.inferenceLatencyMs,
      fps: this.inferenceFps,
      inverted: this.invertSteering
    };
  }

  _notifyState(status, message) {
    if (this.onStateChange) {
      this.onStateChange({
        status,
        message,
        isHandDetected: this.isHandDetected,
        handsCount: this.detectedHandsCount,
        steer: this.smoothedSteer,
        gesture: this.currentGesture
      });
    }
  }

  _distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _checkFist(lm, palmScale) {
    const wrist = lm[0];
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    let curledCount = 0;
    for (let i = 0; i < 4; i++) {
      const tipDist = this._distance(lm[tips[i]], wrist);
      const pipDist = this._distance(lm[pips[i]], wrist);
      if (tipDist < pipDist + (palmScale * 0.1)) {
        curledCount++;
      }
    }
    return curledCount >= 3;
  }

  _checkThumbsUp(lm) {
    const isThumbUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y && lm[4].y < lm[9].y - 0.04;
    const fingersCurled = lm[8].y > lm[6].y && lm[12].y > lm[10].y && lm[16].y > lm[14].y;
    return isThumbUp && fingersCurled;
  }
}
