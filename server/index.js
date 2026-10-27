// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.
// GESTUREDRIVE X - Low-Latency Local PC Game & Unreal Engine Relay Server

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());
app.use(express.json());

// Serve Game static files directly
app.use(express.static(path.join(__dirname, '../game')));
app.use('/game', express.static(path.join(__dirname, '../game')));

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    port: PORT,
    timestamp: Date.now(),
    ue5BridgeConnected: ue5Clients.size > 0
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Active connected clients
const gameClients = new Set();
const ue5Clients = new Set();

wss.on('connection', (ws) => {
  let clientType = 'unknown';

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw);

      switch (msg.type) {
        case 'register_game': {
          clientType = 'game';
          gameClients.add(ws);
          ws.send(JSON.stringify({ type: 'registered', role: 'game' }));
          break;
        }

        case 'register_ue5':
        case 'create_session': {
          clientType = 'ue5';
          ue5Clients.add(ws);
          ws.send(JSON.stringify({ type: 'registered', role: 'ue5' }));
          console.log('[Server] Unreal Engine 5 Client connected to bridge.');
          break;
        }

        case 'input': {
          // Broadcast high-speed webcam input to Unreal Engine and game clients
          const payload = typeof messageRaw === 'string' ? messageRaw : messageRaw.toString();
          
          for (const ueWs of ue5Clients) {
            if (ueWs.readyState === WebSocket.OPEN) {
              ueWs.send(payload);
            }
          }

          for (const gWs of gameClients) {
            if (gWs !== ws && gWs.readyState === WebSocket.OPEN) {
              gWs.send(payload);
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
      console.warn('[Server] Message parse error:', err.message);
    }
  });

  ws.on('close', () => {
    if (clientType === 'game') gameClients.delete(ws);
    if (clientType === 'ue5') {
      ue5Clients.delete(ws);
      console.log('[Server] Unreal Engine 5 Client disconnected.');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('=======================================================');
  console.log('  GESTUREDRIVE X — Standalone PC Racing Relay Server   ');
  console.log('=======================================================');
  console.log(`  Local Address:     http://localhost:${PORT}`);
  console.log(`  Game Screen:       http://localhost:${PORT}/game/`);
  console.log(`  UE5 Bridge Port:   ws://127.0.0.1:${PORT}`);
  console.log('=======================================================');
});
