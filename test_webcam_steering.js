// GESTUREDRIVE X - Two-Hand Steering & Audio Lifecycle Verification Test
// Verifies 2-hand wheel angle math, left/right direction, deadzone, decay, invert, and audio state manager

const assert = require('assert');

// 1. Simulate the Two-Hand Steering Math from WebcamGestureTracker
class TestTwoHandTracker {
  constructor(options = {}) {
    this.options = Object.assign({
      deadzone: 0.05,
      maxTiltAngle: 0.52, // ~30 deg
      sensitivity: 1.5,
      smoothingFactor: 0.35
    }, options);

    this.calibratedNeutralAngle = 0.0;
    this.calibratedCenterX = 0.5;
    this.isCalibrated = true;
    this.invertSteering = false;

    this.smoothedSteer = 0.0;
    this.isHandDetected = false;
    this.currentGesture = 'CENTER';
  }

  processHands(handA, handB) {
    if (!handA || !handB) {
      return this.handleLoss(handA ? 1 : 0);
    }

    // Convert raw camera X to screen coordinate (mirrored preview: user physical left is screenX < 0.5)
    const hA = { screenX: 1.0 - handA.rawX, screenY: handA.rawY, isFist: handA.isFist, isThumbsUp: handA.isThumbsUp };
    const hB = { screenX: 1.0 - handB.rawX, screenY: handB.rawY, isFist: handB.isFist, isThumbsUp: handB.isThumbsUp };

    // Identify Left Hand vs Right Hand on the player's screen
    const leftHand = (hA.screenX < hB.screenX) ? hA : hB;
    const rightHand = (hA.screenX < hB.screenX) ? hB : hA;

    // Vector from Left Hand to Right Hand
    const deltaX = rightHand.screenX - leftHand.screenX;
    const deltaY = rightHand.screenY - leftHand.screenY;

    // Wheel angle (radians):
    // Left Hand DOWN (turning left) -> leftHand.screenY is larger -> deltaY < 0 -> rawWheelAngle < 0
    // Right Hand DOWN (turning right) -> rightHand.screenY is larger -> deltaY > 0 -> rawWheelAngle > 0
    const rawWheelAngle = Math.atan2(deltaY, Math.max(0.01, deltaX));
    const wheelCenterX = (leftHand.screenX + rightHand.screenX) * 0.5;

    const relativeAngle = rawWheelAngle - this.calibratedNeutralAngle;
    const relativeDispX = wheelCenterX - this.calibratedCenterX;

    const angleRatio = relativeAngle / this.options.maxTiltAngle;
    const dispRatio = relativeDispX / 0.18;

    let rawSteer = angleRatio * 0.85 + dispRatio * 0.35;

    // Deadzone
    const absSteer = Math.abs(rawSteer);
    if (absSteer < this.options.deadzone) {
      rawSteer = 0.0;
    } else {
      const sign = Math.sign(rawSteer);
      rawSteer = sign * ((absSteer - this.options.deadzone) / (1.0 - this.options.deadzone));
    }

    rawSteer = Math.max(-1.0, Math.min(1.0, rawSteer * this.options.sensitivity));

    if (this.invertSteering) {
      rawSteer = -rawSteer;
    }

    const alpha = this.options.smoothingFactor;
    this.smoothedSteer = this.smoothedSteer * (1.0 - alpha) + rawSteer * alpha;
    this.isHandDetected = true;

    if (this.smoothedSteer < -0.15) {
      this.currentGesture = 'STEER_LEFT';
    } else if (this.smoothedSteer > 0.15) {
      this.currentGesture = 'STEER_RIGHT';
    } else {
      this.currentGesture = 'DRIVE_STRAIGHT';
    }

    return {
      steer: Number(this.smoothedSteer.toFixed(3)),
      rawSteer: Number(rawSteer.toFixed(3)),
      angleDeg: Math.round(rawWheelAngle * 180 / Math.PI),
      gesture: this.currentGesture
    };
  }

  handleLoss(handsCount = 0) {
    this.isHandDetected = false;
    this.smoothedSteer *= 0.80;
    if (Math.abs(this.smoothedSteer) < 0.02) this.smoothedSteer = 0.0;
    this.currentGesture = handsCount === 1 ? 'HOLD_BOTH_HANDS' : 'NO_HAND';
    return {
      steer: Number(this.smoothedSteer.toFixed(3)),
      gesture: this.currentGesture
    };
  }
}

console.log('=== RUNNING TWO-HAND WEBCAM STEERING & AUDIO LIFECYCLE TESTS ===');

const tracker = new TestTwoHandTracker();

// Test 1: Level Steering Wheel (Hands at neutral level, screenX ~ 0.3 and 0.7)
console.log('\n[Test 1] Level Two-Hand Steering Wheel (Neutral straight):');
const handL_level = { rawX: 0.7, rawY: 0.5 }; // screenX = 0.3, screenY = 0.5
const handR_level = { rawX: 0.3, rawY: 0.5 }; // screenX = 0.7, screenY = 0.5

for (let i = 0; i < 5; i++) {
  tracker.processHands(handL_level, handR_level);
}
const levelRes = tracker.processHands(handL_level, handR_level);
console.log('Result:', levelRes);
assert.strictEqual(levelRes.steer, 0.0, 'Level steering wheel must yield 0.0 steer');
assert.strictEqual(levelRes.gesture, 'DRIVE_STRAIGHT', 'Gesture must be DRIVE_STRAIGHT');
console.log('✓ PASS: Level two-hand wheel drives straight');

// Test 2: Deadzone suppression (tiny hand tremor)
console.log('\n[Test 2] Steering Wheel slight jitter within deadzone:');
const handL_jitter = { rawX: 0.7, rawY: 0.505 };
const handR_jitter = { rawX: 0.3, rawY: 0.498 };
const jitterRes = tracker.processHands(handL_jitter, handR_jitter);
console.log('Result:', jitterRes);
assert.strictEqual(jitterRes.rawSteer, 0.0, 'Deadzone must suppress slight hand wobble');
console.log('✓ PASS: Deadzone successfully filters micro-tremors');

// Test 3: Steering Wheel turned LEFT (Counter-Clockwise: Left Hand DOWN, Right Hand UP)
console.log('\n[Test 3] Turning Steering Wheel LEFT (Left Hand DOWN, Right Hand UP):');
// Left hand goes down to screenY = 0.65 (rawY = 0.65)
// Right hand goes up to screenY = 0.35 (rawY = 0.35)
const handL_turnLeft = { rawX: 0.72, rawY: 0.65 };
const handR_turnLeft = { rawX: 0.28, rawY: 0.35 };

let leftRes;
for (let i = 0; i < 10; i++) {
  leftRes = tracker.processHands(handL_turnLeft, handR_turnLeft);
}
console.log('Result:', leftRes);
assert(leftRes.steer < -0.5, 'Steering must be strongly negative (steer < 0) for turning wheel left');
assert.strictEqual(leftRes.gesture, 'STEER_LEFT', 'Gesture must be STEER_LEFT');
console.log('✓ PASS: Turning wheel left produces smooth, natural LEFT steering (steer = ' + leftRes.steer + ')');

// Test 4: Steering Wheel turned RIGHT (Clockwise: Right Hand DOWN, Left Hand UP)
console.log('\n[Test 4] Turning Steering Wheel RIGHT (Right Hand DOWN, Left Hand UP):');
// Right hand goes down to screenY = 0.65 (rawY = 0.65)
// Left hand goes up to screenY = 0.35 (rawY = 0.35)
const handL_turnRight = { rawX: 0.72, rawY: 0.35 };
const handR_turnRight = { rawX: 0.28, rawY: 0.65 };

let rightRes;
for (let i = 0; i < 10; i++) {
  rightRes = tracker.processHands(handL_turnRight, handR_turnRight);
}
console.log('Result:', rightRes);
assert(rightRes.steer > 0.5, 'Steering must be strongly positive (steer > 0) for turning wheel right');
assert.strictEqual(rightRes.gesture, 'STEER_RIGHT', 'Gesture must be STEER_RIGHT');
console.log('✓ PASS: Turning wheel right produces smooth, natural RIGHT steering (steer = ' + rightRes.steer + ')');

// Test 5: Steering Invert Feature
console.log('\n[Test 5] Invert Steering Option:');
tracker.invertSteering = true;
const invertedRes = tracker.processHands(handL_turnLeft, handR_turnLeft);
assert(invertedRes.rawSteer > 0, 'When invert is enabled, rawSteer sign flips');
console.log('Result:', invertedRes);
tracker.invertSteering = false;
console.log('✓ PASS: Invert steering toggle flips direction properly');

// Test 6: One Hand Lost (Requires both hands for wheel)
console.log('\n[Test 6] Hand Missing (Only 1 hand in camera view):');
let oneHandRes;
for (let i = 0; i < 20; i++) {
  oneHandRes = tracker.processHands(handL_turnLeft, null);
}
console.log('Result:', oneHandRes);
assert.strictEqual(oneHandRes.steer, 0.0, 'Steering must decay safely to 0.0 when 2nd hand is missing');
assert.strictEqual(oneHandRes.gesture, 'HOLD_BOTH_HANDS', 'Gesture must prompt for both hands');
console.log('✓ PASS: Missing hand safely decays steering to 0.0');

// Test 7: Audio Lifecycle Simulation
console.log('\n[Test 7] Audio Lifecycle Manager Verification:');
class MockAudioManager {
  constructor() {
    this.audioState = 'STOPPED';
    this.isMenuMusicPlaying = false;
    this.isRaceMusicPlaying = false;
    this.carSoundVolume = 0.0;
    this.menuTimerCount = 0;
    this.raceTimerCount = 0;
  }

  startMenuMusic() {
    if (this.isMenuMusicPlaying) return; // Guard against duplicates!
    this.stopRaceMusic();
    this.silenceCarSounds();
    this.isMenuMusicPlaying = true;
    this.audioState = 'MENU';
    this.menuTimerCount++;
  }

  stopMenuMusic() {
    if (!this.isMenuMusicPlaying) return;
    this.isMenuMusicPlaying = false;
    this.menuTimerCount = Math.max(0, this.menuTimerCount - 1);
  }

  startRaceMusic() {
    if (this.isRaceMusicPlaying) return; // Guard!
    this.stopMenuMusic();
    this.isRaceMusicPlaying = true;
    this.audioState = 'RACING';
    this.raceTimerCount++;
    this.carSoundVolume = 0.7;
  }

  stopRaceMusic() {
    if (!this.isRaceMusicPlaying) return;
    this.isRaceMusicPlaying = false;
    this.raceTimerCount = Math.max(0, this.raceTimerCount - 1);
  }

  silenceCarSounds() {
    this.carSoundVolume = 0.0;
  }

  resetForMenu() {
    this.stopRaceMusic();
    this.silenceCarSounds();
    this.startMenuMusic();
  }
}

const audio = new MockAudioManager();

// Initial menu entry
audio.resetForMenu();
assert.strictEqual(audio.isMenuMusicPlaying, true);
assert.strictEqual(audio.menuTimerCount, 1);

// Repeated return to menu (must NOT duplicate or restart interval)
audio.resetForMenu();
audio.resetForMenu();
assert.strictEqual(audio.menuTimerCount, 1, 'Menu music interval must NEVER duplicate on repeated menu calls');
console.log('✓ PASS: Repeated menu transitions do not spawn duplicate music intervals');

// Race start
audio.startRaceMusic();
assert.strictEqual(audio.isMenuMusicPlaying, false);
assert.strictEqual(audio.isRaceMusicPlaying, true);
assert.strictEqual(audio.carSoundVolume, 0.7);

// Returning to menu from race
audio.resetForMenu();
assert.strictEqual(audio.isRaceMusicPlaying, false);
assert.strictEqual(audio.carSoundVolume, 0.0, 'Car engine sounds must be silenced in menu');
assert.strictEqual(audio.isMenuMusicPlaying, true);
assert.strictEqual(audio.menuTimerCount, 1);
console.log('✓ PASS: Returning to menu silences car audio and starts persistent menu music cleanly');

// Test 8: End-to-End Car Physics & Screen Coordinate System Steering Alignment
console.log('\n[Test 8] End-to-End Car Physics & Screen Coordinate System Alignment:');
const THREE = require('./game/node_modules/three');

// Mock Three.js camera matching Engine.js chase camera (looking from z = -7.5 forward to z = 14.0)
const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.2, 1000);
camera.position.set(0, 2.8, -7.5);
camera.lookAt(0, 1.2, 14.0);
camera.updateMatrixWorld();

// Simulate Car.js physics update step
function simulateCarStep(steerInput, currentPos = { x: 0, z: 0 }, currentYaw = 0) {
  const maxSteerAngle = 0.55;
  const targetSteer = -(steerInput || 0.0) * maxSteerAngle;
  const steerAngle = targetSteer; // full response for test
  const speed = 120.0; // km/h
  const speedRatio = speed / 220.0;
  const yawRate = steerAngle * (speedRatio * 1.5 + 0.2);
  const delta = 0.05; // 50ms tick
  const newYaw = currentYaw + yawRate * delta * 1.8;
  const forwardDist = (speed * 1000 / 3600) * delta;
  const newX = currentPos.x + Math.sin(newYaw) * forwardDist;
  const newZ = currentPos.z + Math.cos(newYaw) * forwardDist;
  
  // Project new car position onto screen NDC coordinates
  const projected = new THREE.Vector3(newX, 0.45, newZ).project(camera);
  return { newX, newZ, newYaw, ndcX: projected.x, steerAngle };
}

// 8a. Turning Wheel Left (leftRes.steer < 0)
const carLeft = simulateCarStep(leftRes.steer);
console.log(`Left Steer Input (${leftRes.steer}): World X = ${carLeft.newX.toFixed(3)}, Screen NDC X = ${carLeft.ndcX.toFixed(3)}`);
assert(carLeft.newX > 0, 'Turning wheel left must move car toward world +X');
assert(carLeft.ndcX < 0, 'In screen NDC space, car must move LEFT (ndcX < 0)');
console.log('✓ PASS: Hand gesture steering LEFT moves car LEFT on player screen!');

// 8b. Turning Wheel Right (rightRes.steer > 0)
const carRight = simulateCarStep(rightRes.steer);
console.log(`Right Steer Input (${rightRes.steer}): World X = ${carRight.newX.toFixed(3)}, Screen NDC X = ${carRight.ndcX.toFixed(3)}`);
assert(carRight.newX < 0, 'Turning wheel right must move car toward world -X');
assert(carRight.ndcX > 0, 'In screen NDC space, car must move RIGHT (ndcX > 0)');
console.log('✓ PASS: Hand gesture steering RIGHT moves car RIGHT on player screen!');

// Test 9: Audio Pause & Resume Lifecycle
console.log('\n[Test 9] Audio Pause & Resume Lifecycle:');
audio.startRaceMusic();
assert.strictEqual(audio.isRaceMusicPlaying, true);
audio.silenceCarSounds();
assert.strictEqual(audio.carSoundVolume, 0.0, 'Car sound silenced on pause');
console.log('✓ PASS: Pausing ducks audio cleanly without terminating racing sequence');

// Test 10: MediaPipe Hand Order Fluctuation Invariance (Left/Right Detection Swaps)
console.log('\n[Test 10] MediaPipe Hand Detection Array Order Invariance:');
const testTrackerOrder = new TestTwoHandTracker();
// 10a: Pass in order [handLeft, handRight]
for (let i = 0; i < 5; i++) {
  testTrackerOrder.processHands(handL_turnLeft, handR_turnLeft);
}
const order1Res = testTrackerOrder.processHands(handL_turnLeft, handR_turnLeft);
console.log('Result with [Left, Right]:', order1Res);
assert(order1Res.steer < -0.5, 'Steering must turn LEFT when input order is [Left, Right]');

// 10b: Pass in REVERSED order [handRight, handLeft] (simulates MediaPipe flipping array index)
const testTrackerReversed = new TestTwoHandTracker();
for (let i = 0; i < 5; i++) {
  testTrackerReversed.processHands(handR_turnLeft, handL_turnLeft);
}
const order2Res = testTrackerReversed.processHands(handR_turnLeft, handL_turnLeft);
console.log('Result with [Right, Left]:', order2Res);
assert(order2Res.steer < -0.5, 'Steering MUST STILL turn LEFT even when MediaPipe reverses array order!');
assert.strictEqual(order1Res.gesture, order2Res.gesture, 'Gesture must be identical regardless of MediaPipe array order');
console.log('✓ PASS: MediaPipe detection array order reversal yields 100% identical steering direction');

// Test 11: Alternating Array Order over 50 Frames (Zero Flicker / Zero Inversion Sign Flips)
console.log('\n[Test 11] Alternating Detection Array Order over 50 Frames:');
let signFlips = 0;
let prevSign = Math.sign(order1Res.steer);

for (let frame = 0; frame < 50; frame++) {
  // Alternate hand order every frame
  const res = (frame % 2 === 0)
    ? testTrackerOrder.processHands(handL_turnLeft, handR_turnLeft)
    : testTrackerOrder.processHands(handR_turnLeft, handL_turnLeft);
  
  const currentSign = Math.sign(res.steer);
  if (currentSign !== prevSign && currentSign !== 0) {
    signFlips++;
  }
  prevSign = currentSign;
}
console.log(`Observed Directional Sign Flips over 50 Alternating Frames: ${signFlips}`);
assert.strictEqual(signFlips, 0, 'There must be exactly 0 directional sign flips across alternating detection order!');
console.log('✓ PASS: Alternating detection order produces rock-solid monotonic steering (0 sign flips)');

console.log('\n======================================================');
console.log('  ALL TWO-HAND STEERING & AUDIO TESTS PASSED (100% OK) ');
console.log('======================================================\n');
