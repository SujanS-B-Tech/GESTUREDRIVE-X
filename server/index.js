const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const cors = require('cors');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());
app.use(express.json());

// Helper: detect primary non-internal IPv4
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignore internal (127.0.0.1) and IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prefer Wi-Fi or Ethernet
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') || name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('local')) {
          return iface.address;
        }
      }
    }
  }
  // Fallback to first non-internal
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const LAN_IP = getLocalIp();

// Serve Game and Controller static files
app.use('/game', express.static(path.join(__dirname, '../game')));
app.use('/controller', express.static(path.join(__dirname, '../controller')));
app.use('/', express.static(path.join(__dirname, '../game')));

// REST endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    lanIp: LAN_IP,
    port: PORT,
    activeSessions: sessions.size,
    timestamp: Date.now()
  });
});

app.get('/api/qr', async (req, res) => {
  const session = req.query.session || 'DEFAULT';
  const url = `http://${LAN_IP}:${PORT}/controller/?session=${session}`;
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 2,
      width: 320,
      color: {
        dark: '#00f0ff',
        light: '#0a0d14'
      }
    });
    res.json({ url, qrDataUrl: dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Session state storage
// sessionCode -> { gameWs, controllerWs, createdAt, lastHeartbeat }
const sessions = new Map();

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GD-${code}`;
}

wss.on('connection', (ws) => {
  let boundSession = null;
  let boundRole = null; // 'game' | 'controller'

  ws.on('message', async (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw);

      switch (msg.type) {
        case 'create_session': {
          // Game requests a new session
          const sessionCode = msg.sessionCode || generateSessionCode();
          boundSession = sessionCode;
          boundRole = 'game';

          const controllerUrl = `http://${LAN_IP}:${PORT}/controller/?session=${sessionCode}`;
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(controllerUrl, {
              margin: 1,
              width: 256,
              color: {
                dark: '#00f0ff',
                light: '#080c14'
              }
            });
          } catch (e) {
            console.error('QR Gen error:', e);
          }

          sessions.set(sessionCode, {
            gameWs: ws,
            controllerWs: null,
            createdAt: Date.now(),
            lastHeartbeat: Date.now()
          });

          ws.send(JSON.stringify({
            type: 'session_created',
            sessionCode,
            controllerUrl,
            qrCode,
            lanIp: LAN_IP,
            port: PORT
          }));

          console.log(`[Server] Game session created: ${sessionCode} | Connect URL: ${controllerUrl}`);
          break;
        }

        case 'join_session': {
          // Controller connects with sessionCode
          const sessionCode = (msg.sessionCode || '').toUpperCase().trim();
          boundSession = sessionCode;
          boundRole = 'controller';

          const session = sessions.get(sessionCode);
          if (!session || !session.gameWs || session.gameWs.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'join_error',
              error: `Session "${sessionCode}" not found or game is not active.`
            }));
            return;
          }

          // Close previous controller if any
          if (session.controllerWs && session.controllerWs !== ws && session.controllerWs.readyState === WebSocket.OPEN) {
            session.controllerWs.send(JSON.stringify({
              type: 'superseded',
              message: 'Another controller connected to this session'
            }));
          }

          session.controllerWs = ws;
          session.deviceInfo = msg.deviceInfo || 'Mobile Device';

          // Notify controller
          ws.send(JSON.stringify({
            type: 'session_joined',
            sessionCode,
            success: true
          }));

          // Notify game
          session.gameWs.send(JSON.stringify({
            type: 'controller_connected',
            deviceInfo: session.deviceInfo,
            timestamp: Date.now()
          }));

          console.log(`[Server] Controller paired with session: ${sessionCode}`);
          break;
        }

        case 'input': {
          // High-frequency input from controller to game
          if (boundSession && sessions.has(boundSession)) {
            const session = sessions.get(boundSession);
            if (session.gameWs && session.gameWs.readyState === WebSocket.OPEN) {
              // Direct relay
              session.gameWs.send(messageRaw);
            }
          }
          break;
        }

        case 'command': {
          // Discrete commands: 'PAUSE', 'RESUME', 'RESTART', 'CAMERA', 'NITRO'
          if (boundSession && sessions.has(boundSession)) {
            const session = sessions.get(boundSession);
            if (session.gameWs && session.gameWs.readyState === WebSocket.OPEN) {
              session.gameWs.send(JSON.stringify({
                type: 'command',
                action: msg.action,
                value: msg.value,
                timestamp: Date.now()
              }));
            }
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({
            type: 'pong',
            clientTime: msg.clientTime,
            serverTime: Date.now()
          }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[Server] Message parse error:', err.message);
    }
  });

  ws.on('close', () => {
    if (boundSession && sessions.has(boundSession)) {
      const session = sessions.get(boundSession);
      if (boundRole === 'controller') {
        console.log(`[Server] Controller disconnected from ${boundSession}`);
        session.controllerWs = null;
        if (session.gameWs && session.gameWs.readyState === WebSocket.OPEN) {
          session.gameWs.send(JSON.stringify({
            type: 'controller_disconnected',
            timestamp: Date.now()
          }));
        }
      } else if (boundRole === 'game') {
        console.log(`[Server] Game closed session ${boundSession}`);
        if (session.controllerWs && session.controllerWs.readyState === WebSocket.OPEN) {
          session.controllerWs.send(JSON.stringify({
            type: 'game_disconnected',
            message: 'Game session ended'
          }));
        }
        sessions.delete(boundSession);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  GESTUREDRIVE X - Real-Time Pairing & Relay Server    `);
  console.log(`=======================================================`);
  console.log(`  Local Address:     http://localhost:${PORT}`);
  console.log(`  LAN Network URL:   http://${LAN_IP}:${PORT}`);
  console.log(`  Game Screen:       http://${LAN_IP}:${PORT}/game/`);
  console.log(`  Mobile Controller: http://${LAN_IP}:${PORT}/controller/`);
  console.log(`=======================================================`);
});
