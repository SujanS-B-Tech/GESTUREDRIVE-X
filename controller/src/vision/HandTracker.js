/**
 * GESTUREDRIVE X - MediaPipe Hand Tracker
 * High-performance real-time 21-landmark tracking with canvas visualization
 */

export class HandTracker {
  constructor(videoElement, canvasElement, options = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.options = Object.assign({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.6,
      facingMode: 'user', // front camera by default
      mirror: true
    }, options);

    this.hands = null;
    this.camera = null;
    this.isRunning = false;
    this.onResultsCallback = null;
    this.lastFpsUpdate = performance.now();
    this.framesCount = 0;
    this.currentFps = 0;

    // Connections between landmarks (MediaPipe Hands topology)
    this.CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];
  }

  async init(onResults) {
    this.onResultsCallback = onResults;

    // Check if Hands is globally available from script or import
    const HandsClass = window.Hands || (await import('@mediapipe/hands')).Hands;
    
    this.hands = new HandsClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: this.options.maxNumHands,
      modelComplexity: this.options.modelComplexity,
      minDetectionConfidence: this.options.minDetectionConfidence,
      minTrackingConfidence: this.options.minTrackingConfidence
    });

    this.hands.onResults((results) => this._handleResults(results));
  }

  async startCamera(preferredDeviceId = null) {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: preferredDeviceId ? undefined : this.options.facingMode,
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await this.video.play();

      this.isRunning = true;
      this._processFrame();
      return true;
    } catch (err) {
      console.error('[HandTracker] Camera access error:', err);
      throw err;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
  }

  async _processFrame() {
    if (!this.isRunning) return;

    if (this.video.readyState >= 2 && this.hands) {
      try {
        await this.hands.send({ image: this.video });
      } catch (err) {
        console.warn('[HandTracker] Frame send warning:', err.message);
      }
    }

    // Measure FPS
    this.framesCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.framesCount * 1000) / (now - this.lastFpsUpdate));
      this.framesCount = 0;
      this.lastFpsUpdate = now;
    }

    if (this.isRunning) {
      requestAnimationFrame(() => this._processFrame());
    }
  }

  _handleResults(results) {
    // Resize canvas to match video display
    const w = this.canvas.width = this.video.videoWidth || 640;
    const h = this.canvas.height = this.video.videoHeight || 480;

    this.ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = (results.multiHandedness && results.multiHandedness[0]) 
        ? results.multiHandedness[0].label 
        : 'Right';

      this._drawSkeleton(landmarks, w, h);

      if (this.onResultsCallback) {
        this.onResultsCallback({
          hasHand: true,
          landmarks,
          handedness,
          fps: this.currentFps
        });
      }
    } else {
      if (this.onResultsCallback) {
        this.onResultsCallback({
          hasHand: false,
          landmarks: null,
          handedness: null,
          fps: this.currentFps
        });
      }
    }
  }

  _drawSkeleton(landmarks, w, h) {
    const ctx = this.ctx;

    // Draw bones (connections)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    for (const [i, j] of this.CONNECTIONS) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const x = p.x * w;
      const y = p.y * h;

      ctx.beginPath();
      // Fingertips (4, 8, 12, 16, 20) are highlighted with magenta
      if ([4, 8, 12, 16, 20].includes(i)) {
        ctx.fillStyle = '#ff0077';
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
      } else if (i === 0) {
        // Wrist
        ctx.fillStyle = '#ffe600';
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
      } else {
        ctx.fillStyle = '#00f0ff';
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
      }
      ctx.fill();
    }

    // Center of palm indicator
    const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3 * w;
    const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3 * h;

    ctx.beginPath();
    ctx.arc(palmX, palmY, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
