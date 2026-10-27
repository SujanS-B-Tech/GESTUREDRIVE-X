/**
 * GESTUREDRIVE X - Controller Network Client
 * Ultra-low latency WebSocket connection, pairing, and command streamer
 */

export class ControllerClient {
  constructor(options = {}) {
    this.options = Object.assign({
      serverUrl: null, // If null, auto-detects from current window.location
      reconnectInterval: 2000,
      pingInterval: 1000
    }, options);

    this.ws = null;
    this.sessionCode = null;
    this.isConnected = false;
    this.isPaired = false;
    this.latencyMs = 0;
    this.pingTimer = null;

    // Callbacks
    this.onStateChange = null;
    this.onPairSuccess = null;
    this.onError = null;
    this.onGameMessage = null;

    // Throttling stream
    this.lastSentInputTime = 0;
    this.minSendIntervalMs = 25; // ~40 Hz input stream for high responsiveness
    this.lastSentPacket = null;
  }

  connect(sessionCode, customServerUrl = null) {
    this.sessionCode = (sessionCode || '').toUpperCase().trim();

    let wsUrl = customServerUrl || this.options.serverUrl;
    if (!wsUrl) {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${loc.hostname}:${loc.port || '8080'}`;
    }

    console.log(`[ControllerClient] Connecting to ${wsUrl} for session ${this.sessionCode}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this._notifyState('CONNECTED');
        this._joinSession();
        this._startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.error('[ControllerClient] Message parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[ControllerClient] WebSocket error:', err);
        if (this.onError) this.onError(err);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isPaired = false;
        this._stopPing();
        this._notifyState('DISCONNECTED');
        console.warn('[ControllerClient] Connection closed');
      };
    } catch (err) {
      if (this.onError) this.onError(err);
    }
  }

  disconnect() {
    this._stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isPaired = false;
  }

  _joinSession() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'join_session',
      sessionCode: this.sessionCode,
      deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Laptop Browser'
    }));
  }

  _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          clientTime: performance.now()
        }));
      }
    }, this.options.pingInterval);
  }

  _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'session_joined':
        this.isPaired = true;
        this._notifyState('PAIRED');
        if (this.onPairSuccess) this.onPairSuccess(msg);
        break;

      case 'join_error':
        this.isPaired = false;
        this._notifyState('JOIN_ERROR', msg.error);
        if (this.onError) this.onError(new Error(msg.error));
        break;

      case 'game_disconnected':
        this.isPaired = false;
        this._notifyState('GAME_DISCONNECTED', msg.message);
        break;

      case 'pong':
        this.latencyMs = Math.round(performance.now() - msg.clientTime);
        break;

      default:
        if (this.onGameMessage) this.onGameMessage(msg);
        break;
    }
  }

  sendInput(state) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isPaired) return;

    const now = performance.now();
    if (now - this.lastSentInputTime < this.minSendIntervalMs) {
      return; // throttle
    }

    this.lastSentInputTime = now;

    const packet = {
      type: 'input',
      steer: state.steer,
      throttle: state.throttle,
      brake: state.brake,
      nitro: state.nitro,
      gesture: state.gestureName,
      handVisible: state.handVisible,
      confidence: state.confidence,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(packet));
  }

  sendCommand(action, value = null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isPaired) return;

    this.ws.send(JSON.stringify({
      type: 'command',
      action,
      value,
      timestamp: Date.now()
    }));
  }

  _notifyState(status, details = null) {
    if (this.onStateChange) {
      this.onStateChange({
        status,
        isConnected: this.isConnected,
        isPaired: this.isPaired,
        latencyMs: this.latencyMs,
        details
      });
    }
  }
}
