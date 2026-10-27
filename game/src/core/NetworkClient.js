/**
 * GESTUREDRIVE X - Game Host Network Client
 * Handles pairing session generation, QR code reception, and real-time controller input stream
 */

export class NetworkClient {
  constructor(options = {}) {
    this.options = Object.assign({
      serverUrl: null, // Auto-detected from window.location
      reconnectInterval: 2500
    }, options);

    this.ws = null;
    this.sessionCode = null;
    this.controllerUrl = null;
    this.qrCodeDataUrl = null;
    this.isPhoneConnected = false;
    this.phoneDeviceInfo = null;
    this.latencyMs = 0;

    // Smoothed latest input
    this.inputState = {
      steer: 0.0,
      throttle: 0.0,
      brake: 0.0,
      nitro: false,
      gesture: 'DRIVE_STRAIGHT',
      handVisible: false,
      confidence: 0.0,
      lastReceivedTime: 0
    };

    // Callbacks
    this.onSessionCreated = null;
    this.onControllerConnect = null;
    this.onControllerDisconnect = null;
    this.onCommand = null;
  }

  connect(customServerUrl = null) {
    let wsUrl = customServerUrl || this.options.serverUrl;
    if (!wsUrl) {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${loc.hostname}:${loc.port || '8080'}`;
    }

    console.log(`[GameNetwork] Connecting to WebSocket relay: ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GameNetwork] Connected to relay. Requesting new pairing session...');
        // Request game session
        this.ws.send(JSON.stringify({
          type: 'create_session'
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.error('[GameNetwork] Message parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[GameNetwork] Connection warning:', err);
      };

      this.ws.onclose = () => {
        console.warn('[GameNetwork] Connection closed. Will attempt reconnect...');
        this.isPhoneConnected = false;
        if (this.onControllerDisconnect) this.onControllerDisconnect();
        setTimeout(() => this.connect(customServerUrl), this.options.reconnectInterval);
      };
    } catch (err) {
      console.error('[GameNetwork] Connection failed:', err);
      setTimeout(() => this.connect(customServerUrl), this.options.reconnectInterval);
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'session_created':
        this.sessionCode = msg.sessionCode;
        this.controllerUrl = msg.controllerUrl;
        this.qrCodeDataUrl = msg.qrCode;
        console.log(`[GameNetwork] Session ready: ${this.sessionCode} | Connect phone at: ${this.controllerUrl}`);
        if (this.onSessionCreated) {
          this.onSessionCreated({
            sessionCode: this.sessionCode,
            controllerUrl: this.controllerUrl,
            qrCode: this.qrCodeDataUrl
          });
        }
        break;

      case 'controller_connected':
        this.isPhoneConnected = true;
        this.phoneDeviceInfo = msg.deviceInfo;
        console.log(`[GameNetwork] Phone controller connected! Device: ${msg.deviceInfo}`);
        if (this.onControllerConnect) {
          this.onControllerConnect({
            deviceInfo: msg.deviceInfo
          });
        }
        break;

      case 'controller_disconnected':
        this.isPhoneConnected = false;
        // Return safe neutral controls immediately
        this.inputState.steer = 0.0;
        this.inputState.throttle = 0.0;
        this.inputState.brake = 0.0;
        this.inputState.nitro = false;
        this.inputState.handVisible = false;
        console.warn('[GameNetwork] Phone disconnected. Controls reset to safe neutral.');
        if (this.onControllerDisconnect) {
          this.onControllerDisconnect();
        }
        break;

      case 'input':
        this.inputState.steer = typeof msg.steer === 'number' ? msg.steer : 0.0;
        this.inputState.throttle = typeof msg.throttle === 'number' ? msg.throttle : 1.0;
        this.inputState.brake = typeof msg.brake === 'number' ? msg.brake : 0.0;
        this.inputState.nitro = Boolean(msg.nitro);
        this.inputState.gesture = msg.gesture || 'DRIVE_STRAIGHT';
        this.inputState.handVisible = Boolean(msg.handVisible);
        this.inputState.confidence = typeof msg.confidence === 'number' ? msg.confidence : 0.9;
        this.inputState.lastReceivedTime = performance.now();

        if (msg.timestamp) {
          this.latencyMs = Math.max(1, Math.round(Date.now() - msg.timestamp));
        }
        break;

      case 'command':
        if (this.onCommand) {
          this.onCommand(msg.action, msg.value);
        }
        break;
    }
  }

  getInput() {
    // If no message received for >1.5 seconds while supposedly connected, failsafe to neutral
    if (this.isPhoneConnected && (performance.now() - this.inputState.lastReceivedTime > 1500)) {
      this.inputState.steer = 0.0;
      this.inputState.throttle = 0.0;
      this.inputState.brake = 0.0;
      this.inputState.nitro = false;
      this.inputState.handVisible = false;
    }
    return this.inputState;
  }
}
