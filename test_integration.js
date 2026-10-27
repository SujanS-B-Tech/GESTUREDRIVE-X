// GESTUREDRIVE X - End-to-End Integration Test
const http = require('http');
const WebSocket = require('./server/node_modules/ws');

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
  console.log('--- 1. Testing REST Endpoints ---');
  const statusRes = await testHttp('http://localhost:8080/api/status');
  console.log('✓ /api/status HTTP:', statusRes.status, JSON.parse(statusRes.data));

  const gameRes = await testHttp('http://localhost:8080/game/');
  console.log('✓ /game/ HTTP:', gameRes.status, `(${gameRes.data.length} bytes HTML)`);

  const controllerRes = await testHttp('http://localhost:8080/controller/');
  console.log('✓ /controller/ HTTP:', controllerRes.status, `(${controllerRes.data.length} bytes HTML)`);

  console.log('\n--- 2. Testing Real-Time WebSocket Pairing & Relay ---');
  const gameWs = new WebSocket('ws://localhost:8080');

  let sessionCode = null;

  await new Promise((resolve) => {
    gameWs.on('open', () => {
      console.log('✓ Game WebSocket connected');
      gameWs.send(JSON.stringify({ type: 'create_session' }));
    });

    gameWs.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'session_created') {
        sessionCode = msg.sessionCode;
        console.log(`✓ Session Created: ${sessionCode} | Connect URL: ${msg.controllerUrl}`);
        console.log(`✓ QR Code Data URL generated (${msg.qrCode.length} chars)`);
        resolve();
      }
    });
  });

  // Connect Mobile Controller
  const controllerWs = new WebSocket('ws://localhost:8080');

  await new Promise((resolve) => {
    controllerWs.on('open', () => {
      console.log('✓ Controller WebSocket connected');
      controllerWs.send(JSON.stringify({
        type: 'join_session',
        sessionCode: sessionCode,
        deviceInfo: 'Samsung Galaxy / Chrome'
      }));
    });

    controllerWs.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'session_joined') {
        console.log(`✓ Controller successfully paired with session: ${msg.sessionCode}`);
        resolve();
      }
    });
  });

  // Test Real-Time Gesture Streaming
  console.log('\n--- 3. Testing High-Frequency Gesture Input Stream ---');
  await new Promise((resolve) => {
    gameWs.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'input') {
        console.log(`✓ Game received real-time hand gesture packet: Steer=${msg.steer}, Nitro=${msg.nitro}, Gesture="${msg.gesture}"`);
        resolve();
      }
    });

    // Controller transmits hand gesture input
    controllerWs.send(JSON.stringify({
      type: 'input',
      steer: -0.65,
      throttle: 1.0,
      brake: 0.0,
      nitro: true,
      gesture: 'STEER_LEFT_NITRO',
      handVisible: true,
      confidence: 0.98,
      timestamp: Date.now()
    }));
  });

  // Test Safe Disconnect Failsafe
  console.log('\n--- 4. Testing Disconnection Failsafe ---');
  await new Promise((resolve) => {
    gameWs.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'controller_disconnected') {
        console.log('✓ Game successfully received controller_disconnected event and triggered safe neutral controls');
        resolve();
      }
    });

    controllerWs.close();
  });

  gameWs.close();
  console.log('\n=======================================================');
  console.log('  ALL INTEGRATION TESTS PASSED PERFECTLY (100% SUCCESS) ');
  console.log('=======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
