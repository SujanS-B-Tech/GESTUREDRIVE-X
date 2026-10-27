/**
 * GESTUREDRIVE X — Smart AI Mobile Controller
 * Entry point & orchestration
 */

import { HandTracker } from './vision/HandTracker.js';
import { GestureClassifier } from './vision/GestureClassifier.js';
import { ControllerClient } from './network/ControllerClient.js';

// DOM Elements
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('hand-canvas');
const pairingModal = document.getElementById('pairing-modal');
const sessionInput = document.getElementById('session-input');
const btnPair = document.getElementById('btn-pair');
const sessionCodeDisplay = document.getElementById('session-code-display');
const pingVal = document.getElementById('ping-val');
const connBadge = document.getElementById('conn-badge');
const gaugeNeedle = document.getElementById('gauge-needle');
const steerReadout = document.getElementById('steer-readout');
const gestureBanner = document.getElementById('gesture-banner');
const gestureIcon = document.getElementById('gesture-icon');
const gestureName = document.getElementById('gesture-name');
const holdRingContainer = document.getElementById('hold-ring-container');
const ringProgress = document.getElementById('ring-progress');
const lossAlert = document.getElementById('loss-alert');
const touchBar = document.getElementById('touch-bar');
const btnCalibrate = document.getElementById('btn-calibrate');
const btnSwitchCam = document.getElementById('btn-switch-cam');
const btnToggleTouch = document.getElementById('btn-toggle-touch');
const btnGuide = document.getElementById('btn-guide');
const btnCloseGuide = document.getElementById('btn-close-guide');
const btnGotIt = document.getElementById('btn-got-it');
const guideModal = document.getElementById('guide-modal');
const btnPauseCmd = document.getElementById('btn-pause-cmd');
const sensSlider = document.getElementById('sens-slider');
const sensVal = document.getElementById('sens-val');

// Fallback touch controls
const btnSteerLeft = document.getElementById('btn-steer-left');
const btnSteerRight = document.getElementById('btn-steer-right');
const btnTouchBrake = document.getElementById('btn-touch-brake');
const btnTouchNitro = document.getElementById('btn-touch-nitro');

// Instances
const tracker = new HandTracker(webcam, canvas);
const classifier = new GestureClassifier();
const network = new ControllerClient();

let currentLandmarks = null;
let currentFacingMode = 'user';
let touchControlsActive = false;
let touchState = { steer: 0, brake: 0, throttle: 1, nitro: false };

// 1. Check URL parameters for session code
function checkUrlSession() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get('session');
  if (session) {
    const cleanSession = session.replace(/^GD-/, '').toUpperCase();
    sessionInput.value = cleanSession;
    // Auto-connect
    setTimeout(() => startSession(`GD-${cleanSession}`), 300);
  }
}

// 2. Start Session & Camera
async function startSession(sessionCode) {
  sessionCodeDisplay.textContent = sessionCode;
  btnPair.disabled = true;
  btnPair.textContent = 'CONNECTING...';

  // Connect WebSocket
  network.connect(sessionCode);

  network.onStateChange = (state) => {
    if (state.isPaired) {
      pairingModal.classList.add('hidden');
      connBadge.textContent = 'PAIRED';
      connBadge.className = 'badge badge-connected';
    } else if (state.isConnected) {
      connBadge.textContent = 'CONNECTING...';
    } else {
      connBadge.textContent = 'DISCONNECTED';
      connBadge.className = 'badge badge-disconnected';
      if (state.details) {
        alert(state.details);
      }
    }

    if (state.latencyMs > 0) {
      pingVal.textContent = `${state.latencyMs}ms`;
    }
  };

  // Start Camera & MediaPipe
  try {
    await tracker.init((handData) => {
      onTrackingResults(handData);
    });

    await tracker.startCamera();
  } catch (err) {
    console.error('Camera init error:', err);
    alert('Camera permission denied or camera not found. You can use the TOUCH controls to drive!');
    touchBar.classList.add('active');
    touchControlsActive = true;
  }
}

// 3. Process Tracking Loop
function onTrackingResults(handData) {
  if (touchControlsActive) return; // Touch controls take priority if active

  currentLandmarks = handData.landmarks;

  // Classify Gestures
  const state = classifier.process(handData);

  // Send over network to Game
  network.sendInput(state);

  // Execute discrete trigger commands (e.g. TOGGLE_PAUSE)
  if (state.commandTrigger === 'TOGGLE_PAUSE') {
    network.sendCommand('TOGGLE_PAUSE');
    vibrate(100);
  }

  // Update UI Visuals
  updateUI(state, handData);
}

// 4. Update UI Indicators
function updateUI(state, handData) {
  // Steer needle displacement (-1 to 1) -> (-70px to +70px)
  const needleOffset = state.steer * 70;
  gaugeNeedle.style.transform = `translateX(${needleOffset}px)`;
  steerReadout.textContent = `${Math.round(state.steer * 45)}°`;

  // Hand Loss Alert
  if (!state.handVisible) {
    lossAlert.classList.add('visible');
    gestureBanner.style.opacity = '0.5';
    holdRingContainer.classList.remove('active');
    return;
  } else {
    lossAlert.classList.remove('visible');
    gestureBanner.style.opacity = '1.0';
  }

  // Gesture Banner State
  gestureBanner.className = 'gesture-banner';
  if (state.nitro) {
    gestureBanner.classList.add('state-nitro');
    gestureIcon.textContent = '⚡';
    gestureName.textContent = 'NITRO ACTIVATED!';
  } else if (state.brake > 0.5) {
    gestureBanner.classList.add('state-brake');
    gestureIcon.textContent = '🛑';
    gestureName.textContent = 'BRAKING HARD';
  } else if (state.gestureName === 'OPEN_PALM') {
    gestureIcon.textContent = '🖐️';
    gestureName.textContent = 'HOLD FOR PAUSE';
  } else if (Math.abs(state.steer) > 0.15) {
    gestureBanner.classList.add('state-steer');
    gestureIcon.textContent = state.steer < 0 ? '◀' : '▶';
    gestureName.textContent = state.steer < 0 ? 'STEERING LEFT' : 'STEERING RIGHT';
  } else {
    gestureIcon.textContent = '⬆️';
    gestureName.textContent = 'DRIVE STRAIGHT';
  }

  // Open Palm Hold Ring Progress
  if (state.holdProgress > 0) {
    holdRingContainer.classList.add('active');
    // Circumference = 2 * PI * 42 = 263.89
    const offset = 264 * (1.0 - state.holdProgress);
    ringProgress.style.strokeDashoffset = offset;
  } else {
    holdRingContainer.classList.remove('active');
  }
}

// Vibrate helper for mobile feedback
function vibrate(ms) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
}

// Calibration
btnCalibrate.addEventListener('click', () => {
  if (currentLandmarks) {
    classifier.calibrate(currentLandmarks);
    vibrate(60);
    gestureName.textContent = 'CALIBRATED!';
  } else {
    alert('Hold your hand in front of the camera to calibrate.');
  }
});

// Camera Switch (Front / Back)
btnSwitchCam.addEventListener('click', async () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  tracker.options.facingMode = currentFacingMode;
  try {
    tracker.stop();
    await tracker.startCamera();
    vibrate(50);
  } catch (e) {
    console.error('Camera switch error:', e);
  }
});

// Toggle Touch Fallback
btnToggleTouch.addEventListener('click', () => {
  touchControlsActive = !touchControlsActive;
  touchBar.classList.toggle('active', touchControlsActive);
  vibrate(50);
});

// Guide Modal
btnGuide.addEventListener('click', () => guideModal.classList.add('visible'));
btnCloseGuide.addEventListener('click', () => guideModal.classList.remove('visible'));
btnGotIt.addEventListener('click', () => guideModal.classList.remove('visible'));

// Sensitivity Slider
sensSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  sensVal.textContent = `${val.toFixed(1)}x`;
  classifier.options.sensitivity = val;
});

// Pause Button
btnPauseCmd.addEventListener('click', () => {
  network.sendCommand('TOGGLE_PAUSE');
  vibrate(80);
});

// Pair Button Click
btnPair.addEventListener('click', () => {
  const val = sessionInput.value.trim().toUpperCase();
  if (val.length >= 2) {
    startSession(val.startsWith('GD-') ? val : `GD-${val}`);
  } else {
    alert('Please enter a 4-letter session code (e.g. GD-A9K2)');
  }
});

// --- Touchscreen Controls Event Handlers ---
function emitTouch() {
  const state = {
    steer: touchState.steer,
    throttle: touchState.throttle,
    brake: touchState.brake,
    nitro: touchState.nitro,
    gestureName: touchState.nitro ? 'TOUCH_NITRO' : (touchState.brake ? 'TOUCH_BRAKE' : 'TOUCH_DRIVE'),
    confidence: 1.0,
    handVisible: true,
    holdProgress: 0.0,
    commandTrigger: null
  };
  network.sendInput(state);
  updateUI(state, { hasHand: true });
}

btnSteerLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); touchState.steer = -0.85; emitTouch(); });
btnSteerLeft.addEventListener('pointerup', (e) => { e.preventDefault(); touchState.steer = 0; emitTouch(); });

btnSteerRight.addEventListener('pointerdown', (e) => { e.preventDefault(); touchState.steer = 0.85; emitTouch(); });
btnSteerRight.addEventListener('pointerup', (e) => { e.preventDefault(); touchState.steer = 0; emitTouch(); });

btnTouchBrake.addEventListener('pointerdown', (e) => { e.preventDefault(); touchState.brake = 1; touchState.throttle = 0; emitTouch(); });
btnTouchBrake.addEventListener('pointerup', (e) => { e.preventDefault(); touchState.brake = 0; touchState.throttle = 1; emitTouch(); });

btnTouchNitro.addEventListener('pointerdown', (e) => { e.preventDefault(); touchState.nitro = true; emitTouch(); });
btnTouchNitro.addEventListener('pointerup', (e) => { e.preventDefault(); touchState.nitro = false; emitTouch(); });

// Init
checkUrlSession();
