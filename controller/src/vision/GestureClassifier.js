/**
 * GESTUREDRIVE X - Gesture Classifier & Input Smoothing Engine
 * Classifies continuous steering, closed fist (brake), thumbs up (nitro), and open palm (pause)
 */

export class GestureClassifier {
  constructor(options = {}) {
    this.options = Object.assign({
      deadzone: 0.08,           // Deadzone around center
      maxRange: 0.35,           // Maximum displacement from center for full 1.0 steer
      sensitivity: 1.3,         // Steering multiplier
      smoothingFactor: 0.35,    // Exponential filter alpha (0: stiff, 1: instant)
      pauseHoldDurationMs: 800, // Hold open palm for 800ms to trigger pause
      gestureCooldownMs: 1200   // Cooldown after discrete trigger
    }, options);

    // Calibration
    this.calibratedCenterX = 0.5;
    this.calibratedCenterY = 0.5;

    // Smoothed state
    this.smoothedSteer = 0.0;
    this.smoothedBrake = 0.0;
    this.smoothedThrottle = 1.0; // Default cruise throttle

    // Discrete hold states
    this.openPalmStartTime = 0;
    this.lastTriggeredTime = 0;

    // Active state snapshot
    this.currentState = {
      steer: 0.0,
      throttle: 1.0,
      brake: 0.0,
      nitro: false,
      gestureName: 'DRIVE_STRAIGHT',
      confidence: 0.0,
      handVisible: false,
      holdProgress: 0.0,
      commandTrigger: null
    };
  }

  calibrate(landmarks) {
    if (!landmarks) return;
    const center = this._getHandCenter(landmarks);
    // Mirrored X for natural user perspective
    this.calibratedCenterX = 1.0 - center.x;
    this.calibratedCenterY = center.y;
    console.log(`[GestureClassifier] Calibrated center: (${this.calibratedCenterX.toFixed(3)}, ${this.calibratedCenterY.toFixed(3)})`);
  }

  process(handData) {
    const now = performance.now();

    // If no hand detected, immediately return safe neutral controls
    if (!handData || !handData.hasHand || !handData.landmarks) {
      this.smoothedSteer *= 0.8;
      if (Math.abs(this.smoothedSteer) < 0.01) this.smoothedSteer = 0.0;
      this.smoothedBrake = 0.0;
      this.smoothedThrottle = 0.0;
      this.openPalmStartTime = 0;

      this.currentState = {
        steer: this.smoothedSteer,
        throttle: 0.0,
        brake: 0.0,
        nitro: false,
        gestureName: 'NO_HAND',
        confidence: 0.0,
        handVisible: false,
        holdProgress: 0.0,
        commandTrigger: null
      };
      return this.currentState;
    }

    const lm = handData.landmarks;
    const center = this._getHandCenter(lm);
    // Mirrored coordinate: hand moving to user's right moves right
    const userX = 1.0 - center.x;
    const userY = center.y;

    // 1. Calculate Palm Scale for distance invariance
    const palmScale = this._distance(lm[0], lm[9]) || 0.15;

    // 2. Classify individual fingers (extended vs curled)
    const fingers = this._analyzeFingers(lm, palmScale);

    // 3. Detect Gestures
    let rawSteer = 0.0;
    let rawBrake = 0.0;
    let rawThrottle = 1.0;
    let isNitro = false;
    let gestureName = 'DRIVE_STRAIGHT';
    let commandTrigger = null;

    // --- Check Gesture: CLOSED FIST (BRAKE) ---
    // All 4 primary fingers are curled
    const isFist = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky && !fingers.thumbExtended;

    // --- Check Gesture: THUMBS UP (NITRO BOOST) ---
    // 4 fingers curled + thumb extended upwards
    const isThumbsUp = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky && 
                       (lm[4].y < lm[3].y) && (lm[4].y < lm[2].y) && (lm[4].y < lm[9].y - 0.04);

    // --- Check Gesture: OPEN PALM (PAUSE / RESUME) ---
    // All 5 fingers extended
    const isOpenPalm = fingers.thumbExtended && fingers.index && fingers.middle && fingers.ring && fingers.pinky;

    if (isFist) {
      gestureName = 'BRAKE';
      rawBrake = 1.0;
      rawThrottle = 0.0;
      this.openPalmStartTime = 0;
    } else if (isThumbsUp) {
      gestureName = 'NITRO';
      isNitro = true;
      rawThrottle = 1.0;
      rawBrake = 0.0;
      this.openPalmStartTime = 0;
    } else if (isOpenPalm) {
      gestureName = 'OPEN_PALM';
      rawThrottle = 0.5;
      rawBrake = 0.0;

      if (!this.openPalmStartTime) {
        this.openPalmStartTime = now;
      }

      const elapsed = now - this.openPalmStartTime;
      const progress = Math.min(1.0, elapsed / this.options.pauseHoldDurationMs);

      if (progress >= 1.0 && (now - this.lastTriggeredTime > this.options.gestureCooldownMs)) {
        commandTrigger = 'TOGGLE_PAUSE';
        this.lastTriggeredTime = now;
        this.openPalmStartTime = 0;
      }
    } else {
      this.openPalmStartTime = 0;
    }

    // --- Continuous Steering Calculation ---
    const deltaX = userX - this.calibratedCenterX;
    const absDelta = Math.abs(deltaX);

    if (absDelta > this.options.deadzone) {
      const sign = Math.sign(deltaX);
      const effectiveDisplacement = (absDelta - this.options.deadzone) / (this.options.maxRange - this.options.deadzone);
      rawSteer = Math.max(-1.0, Math.min(1.0, sign * effectiveDisplacement * this.options.sensitivity));
      
      if (!isFist && !isThumbsUp && !isOpenPalm) {
        gestureName = rawSteer < -0.15 ? 'STEER_LEFT' : (rawSteer > 0.15 ? 'STEER_RIGHT' : 'DRIVE_STRAIGHT');
      }
    } else {
      rawSteer = 0.0;
    }

    // Apply exponential temporal smoothing
    const alpha = this.options.smoothingFactor;
    this.smoothedSteer = this.smoothedSteer * (1.0 - alpha) + rawSteer * alpha;
    this.smoothedBrake = this.smoothedBrake * (1.0 - alpha) + rawBrake * alpha;
    this.smoothedThrottle = this.smoothedThrottle * (1.0 - alpha) + rawThrottle * alpha;

    // Hold progress for UI feedback
    const holdProgress = this.openPalmStartTime ? Math.min(1.0, (now - this.openPalmStartTime) / this.options.pauseHoldDurationMs) : 0.0;

    this.currentState = {
      steer: Number(this.smoothedSteer.toFixed(3)),
      throttle: Number(this.smoothedThrottle.toFixed(3)),
      brake: Number(this.smoothedBrake.toFixed(3)),
      nitro: isNitro,
      gestureName,
      confidence: 0.95,
      handVisible: true,
      holdProgress,
      commandTrigger
    };

    return this.currentState;
  }

  _getHandCenter(lm) {
    // Average wrist and base knuckles for stable center
    return {
      x: (lm[0].x + lm[5].x + lm[9].x + lm[17].x) * 0.25,
      y: (lm[0].y + lm[5].y + lm[9].y + lm[17].y) * 0.25
    };
  }

  _distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _analyzeFingers(lm, palmScale) {
    // Check if each fingertip is extended relative to PIP joint and wrist
    const wrist = lm[0];

    const checkFinger = (tipIdx, pipIdx, mcpIdx) => {
      const tipToWrist = this._distance(lm[tipIdx], wrist);
      const pipToWrist = this._distance(lm[pipIdx], wrist);
      return tipToWrist > pipToWrist + (palmScale * 0.15);
    };

    // Thumb extension: distance between thumb tip (4) and pinky MCP (17)
    const thumbTipToPinky = this._distance(lm[4], lm[17]);
    const thumbMcpToPinky = this._distance(lm[2], lm[17]);
    const thumbExtended = thumbTipToPinky > thumbMcpToPinky + (palmScale * 0.2);

    return {
      thumbExtended,
      index: checkFinger(8, 6, 5),
      middle: checkFinger(12, 10, 9),
      ring: checkFinger(16, 14, 13),
      pinky: checkFinger(20, 18, 17)
    };
  }
}
