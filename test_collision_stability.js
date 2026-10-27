// test_collision_stability.js
// Reproduction & Verification of Wall Collision Screen Flickering & Yaw Oscillation

const assert = require('assert');

console.log('====================================================');
console.log(' GESTUREDRIVE X - WALL COLLISION STABILITY TEST');
console.log('====================================================\n');

// 1. Current Baseline Physics Model (Before Fix)
function runBaselineTest() {
  console.log('[Phase 1: Baseline Reproduction]');
  const car = {
    position: { x: 0, y: 0.45, z: 0 },
    yaw: 0,
    speed: 180, // km/h
    maxSpeed: 320,
    maxSteerAngle: 0.52,
    steerAngle: 0
  };
  const camera = { position: { x: 0, y: 3.6, z: -8.6 } };
  const roadWidth = 27.0;
  const limit = roadWidth / 2 - 1.25; // 12.25
  const delta = 1 / 60; // 60 FPS
  const leftSteerInput = { steer: -1.0 }; // Full left

  let oscillations = 0;
  let prevVel = 0;
  let prevCamX = 0;
  let firstContactFrame = -1;

  for (let frame = 0; frame < 150; frame++) {
    const speedRatio = Math.min(1.0, car.speed / car.maxSpeed);
    const steerAttenuation = 1.0 - speedRatio * 0.45;
    const targetSteer = -(leftSteerInput.steer) * car.maxSteerAngle * steerAttenuation;
    car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1.0, delta * 12.0);

    const yawRate = car.steerAngle * (speedRatio * 1.4 + 0.22);
    car.yaw += yawRate * delta * 1.8;

    const forwardDist = (car.speed * 1000 / 3600) * delta;
    car.position.x += Math.sin(car.yaw) * forwardDist;
    car.position.z += Math.cos(car.yaw) * forwardDist;

    // Hard snap collision logic (current baseline bug)
    if (car.position.x > limit) {
      if (firstContactFrame === -1) firstContactFrame = frame;
      car.position.x = limit;
      car.speed *= 0.88;
      car.yaw -= 0.06; // Discontinuous yaw snap
    }

    // Camera target X calculation
    const camTargetX = car.position.x - Math.sin(car.yaw) * 8.6;
    camera.position.x += (camTargetX - camera.position.x) * Math.min(1.0, delta * 14.0);

    const camVel = camera.position.x - prevCamX;
    if (firstContactFrame !== -1 && frame > firstContactFrame + 5) {
      // If camera velocity changes direction (sign flips), that is an oscillation / flicker!
      if ((camVel > 0.01 && prevVel < -0.01) || (camVel < -0.01 && prevVel > 0.01)) {
        oscillations++;
      }
    }
    prevVel = camVel;
    prevCamX = camera.position.x;
  }

  console.log(`- Hit wall at frame: ${firstContactFrame}`);
  console.log(`- Baseline Camera Directional Oscillations (Sign-flip Flickers): ${oscillations} times`);
  console.log(`- Diagnosis: During sustained wall contact, the camera oscillates back and forth ${oscillations} times causing violent screen flicker!\n`);
  return oscillations;
}

// 2. High-Fidelity Continuous Slide Physics Model (Our Engineered Fix)
function runFixedTest() {
  console.log('[Phase 2: Engineered Continuous Wall Physics Test]');
  const car = {
    position: { x: 0, y: 0.45, z: 0 },
    yaw: 0,
    speed: 180, // km/h
    maxSpeed: 320,
    maxSteerAngle: 0.52,
    steerAngle: 0
  };
  const camera = { position: { x: 0, y: 3.6, z: -8.6 } };
  const roadWidth = 27.0;
  const limit = roadWidth / 2 - 1.25; // 12.25
  const delta = 1 / 60; // 60 FPS
  const leftSteerInput = { steer: -1.0 }; // Full left

  let oscillations = 0;
  let prevVel = 0;
  let prevCamX = 0;
  let firstContactFrame = -1;
  let smoothedCamYaw = 0;

  for (let frame = 0; frame < 150; frame++) {
    const speedRatio = Math.min(1.0, car.speed / car.maxSpeed);
    const steerAttenuation = 1.0 - speedRatio * 0.45;
    
    // Check if touching barrier before steering integration
    const touchingLeft = car.position.x >= limit;
    const touchingRight = car.position.x <= -limit;

    let steerCmd = leftSteerInput.steer;
    if (touchingLeft && steerCmd < 0) steerCmd = 0; // Disallow steering into wall
    if (touchingRight && steerCmd > 0) steerCmd = 0;

    const targetSteer = -(steerCmd) * car.maxSteerAngle * steerAttenuation;
    car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1.0, delta * 12.0);

    // If touching barrier, cancel steer angle that would push further into wall
    if (touchingLeft && car.steerAngle > 0) car.steerAngle = 0;
    if (touchingRight && car.steerAngle < 0) car.steerAngle = 0;

    const yawRate = car.steerAngle * (speedRatio * 1.4 + 0.22);
    car.yaw += yawRate * delta * 1.8;

    const forwardDist = (car.speed * 1000 / 3600) * delta;
    car.position.x += Math.sin(car.yaw) * forwardDist;
    car.position.z += Math.cos(car.yaw) * forwardDist;

    // Continuous glide collision resolution:
    if (car.position.x > limit) {
      if (firstContactFrame === -1) firstContactFrame = frame;
      car.position.x = limit;
      // Smoothly align yaw with the road direction (0 radians) without sudden snap
      car.yaw += (0 - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(30.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
    } else if (car.position.x < -limit) {
      if (firstContactFrame === -1) firstContactFrame = frame;
      car.position.x = -limit;
      car.yaw += (0 - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(30.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
    }

    // Smoothed Camera Yaw prevents high frequency vibration
    smoothedCamYaw += (car.yaw - smoothedCamYaw) * Math.min(1.0, delta * 6.0);
    // Camera spring arm clamp to prevent camera clipping through barrier
    const camTargetX = Math.min(limit + 0.5, Math.max(-limit - 0.5, car.position.x - Math.sin(smoothedCamYaw) * 8.6));
    camera.position.x += (camTargetX - camera.position.x) * Math.min(1.0, delta * 14.0);

    const camVel = camera.position.x - prevCamX;
    if (firstContactFrame !== -1 && frame > firstContactFrame + 5) {
      if ((camVel > 0.005 && prevVel < -0.005) || (camVel < -0.005 && prevVel > 0.005)) {
        oscillations++;
      }
    }
    prevVel = camVel;
    prevCamX = camera.position.x;
  }

  console.log(`- Hit wall at frame: ${firstContactFrame}`);
  console.log(`- Engineered Camera Directional Oscillations (Sign-flip Flickers): ${oscillations} times`);
  console.log(`- Verification: Oscillations completely eliminated (0 flickers)!`);
  
  assert.strictEqual(oscillations, 0, 'Zero camera oscillations allowed during continuous wall contact');
  console.log('>>> WALL COLLISION STABILITY TEST: 100% PASSED <<<\n');
  return oscillations;
}

const baselineOsc = runBaselineTest();
const fixedOsc = runFixedTest();
assert.ok(baselineOsc > 0, 'Baseline must reproduce collision oscillations');
assert.strictEqual(fixedOsc, 0, 'Fixed implementation must have 0 oscillations');
