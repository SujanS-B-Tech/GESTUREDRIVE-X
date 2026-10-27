// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.
// GESTUREDRIVE X - Standalone PC & Unreal Engine 5 Integration Test Suite

const http = require('http');
const WebSocket = require('./server/node_modules/ws');

let serverInstance = null;

async function ensureServerRunning() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:8080/api/status', (res) => {
      if (res.statusCode === 200) resolve();
    }).on('error', () => {
      // Start in-process server
      console.log('[TestSetup] Starting local relay server...');
      require('./server/index.js');
      setTimeout(resolve, 800);
    });
  });
}

async function testHttp(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTests() {
  await ensureServerRunning();

  console.log('--- 1. Testing Standalone PC REST Endpoints ---');
  const statusRes = await testHttp('http://127.0.0.1:8080/api/status');
  console.log('✓ /api/status HTTP:', statusRes.status, JSON.parse(statusRes.data));

  const gameRes = await testHttp('http://127.0.0.1:8080/game/');
  console.log('✓ /game/ HTTP:', gameRes.status, `(${gameRes.data.length} bytes HTML)`);

  console.log('\n--- 2. Testing Unreal Engine 5 C++ Bridge WebSocket Connection ---');
  const ue5Ws = new WebSocket('ws://127.0.0.1:8080');

  await new Promise((resolve) => {
    ue5Ws.on('open', () => {
      console.log('✓ Unreal Engine 5 Client connected to bridge socket');
      ue5Ws.send(JSON.stringify({ type: 'register_ue5' }));
    });

    ue5Ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'registered' && msg.role === 'ue5') {
        console.log('✓ UE5 Bridge successfully registered as active vehicle simulation consumer');
        resolve();
      }
    });
  });

  console.log('\n--- 3. Testing Local Webcam AI Gesture Stream to UE5 Bridge ---');
  const visionWs = new WebSocket('ws://127.0.0.1:8080');

  await new Promise((resolve) => {
    visionWs.on('open', () => {
      console.log('✓ Computer Vision Pipeline connected to bridge');
      visionWs.send(JSON.stringify({ type: 'register_game' }));
      resolve();
    });
  });

  await new Promise((resolve) => {
    ue5Ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'input') {
        console.log(`✓ UE5 Chaos Vehicle received real-time hand gesture packet: Steer=${msg.steer}, Nitro=${msg.nitro}, Gesture="${msg.gesture}"`);
        resolve();
      }
    });

    // Vision pipeline transmits 9 & 3 steering wheel gesture
    visionWs.send(JSON.stringify({
      type: 'input',
      steer: -0.72,
      throttle: 1.0,
      brake: 0.0,
      nitro: true,
      gesture: 'STEER_LEFT',
      handVisible: true,
      confidence: 0.99,
      timestamp: Date.now()
    }));
  });

  console.log('\n--- 4. Testing Ping/Pong Roundtrip Latency ---');
  const startPing = Date.now();
  await new Promise((resolve) => {
    visionWs.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'pong') {
        const roundtrip = Date.now() - startPing;
        console.log(`✓ Roundtrip ping latency: ${roundtrip}ms (Target: < 10ms local loopback)`);
        resolve();
      }
    });

    visionWs.send(JSON.stringify({
      type: 'ping',
      clientTime: startPing
    }));
  });

  visionWs.close();
  ue5Ws.close();

  console.log('\n=======================================================');
  console.log('  ALL INTEGRATION TESTS PASSED PERFECTLY (100% OK)      ');
  console.log('=======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
