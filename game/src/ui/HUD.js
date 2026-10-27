/**
 * GESTUREDRIVE X - Cyber AAA Racing HUD
 * Analog speedometer, tachometer, minimap, nitro gauge, combo streak popups, and phone status
 */

export class HUD {
  constructor() {
    this.container = document.getElementById('hud-container');

    // Gauges
    this.speedVal = document.getElementById('hud-speed-val');
    this.speedNeedle = document.getElementById('hud-speed-needle');
    this.rpmArc = document.getElementById('hud-rpm-arc');
    this.rpmVal = document.getElementById('hud-rpm-val');
    this.gearVal = document.getElementById('hud-gear-val');
    this.nitroFill = document.getElementById('hud-nitro-fill');
    this.nitroText = document.getElementById('hud-nitro-text');

    // Score & Distance
    this.scoreVal = document.getElementById('hud-score-val');
    this.distVal = document.getElementById('hud-dist-val');
    this.highScoreVal = document.getElementById('hud-highscore-val');

    // Minimap Radar Canvas
    this.radarCanvas = document.getElementById('hud-radar-canvas');
    if (this.radarCanvas) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }

    // Phone Pairing & Gesture Status
    this.phoneStatusPill = document.getElementById('hud-phone-pill');
    this.phonePing = document.getElementById('hud-phone-ping');
    this.gestureBadge = document.getElementById('hud-gesture-badge');
    this.qrBox = document.getElementById('hud-qr-box');
    this.qrImg = document.getElementById('hud-qr-img');
    this.qrSessionCode = document.getElementById('hud-session-code');

    // Combo Near-Miss Notification
    this.comboPopup = document.getElementById('hud-combo-popup');
    this.comboText = document.getElementById('hud-combo-text');
    this.comboScore = document.getElementById('hud-combo-score');
    this.comboTimer = null;

    // Laptop Webcam Steering HUD Elements
    this.webcamWidget = document.getElementById('webcam-hud-widget');
    this.camStatusPill = document.getElementById('cam-status-pill');
    this.camStatusText = document.getElementById('cam-status-text');
    this.camLossOverlay = document.getElementById('cam-loss-overlay');
    this.camLossTitle = document.getElementById('cam-loss-title');
    this.camLossDesc = document.getElementById('cam-loss-desc');
    this.camSteerNeedle = document.getElementById('cam-steer-needle');
    this.camDirBadge = document.getElementById('cam-dir-badge');
    this.camSteerReadout = document.getElementById('cam-steer-readout');
  }

  show() {
    if (this.container) this.container.classList.remove('hidden');
  }

  hide() {
    if (this.container) this.container.classList.add('hidden');
  }

  setPairingInfo(sessionCode, qrDataUrl) {
    if (this.qrSessionCode) this.qrSessionCode.textContent = sessionCode;
    if (this.qrImg && qrDataUrl) this.qrImg.src = qrDataUrl;
  }

  update(car, trafficManager, network, score, distanceMeters, highScore, webcamInput = null) {
    if (!car) return;

    // 1. Speedometer Readout (0 to 280 km/h)
    const speed = Math.round(car.speed);
    if (this.speedVal) this.speedVal.textContent = speed;

    // Speedometer Needle (-120deg at 0 to +120deg at 280)
    if (this.speedNeedle) {
      const angle = -120 + (Math.min(speed, 280) / 280) * 240;
      this.speedNeedle.style.transform = `rotate(${angle}deg)`;
    }

    // 2. Tachometer RPM Arc
    if (this.rpmVal) this.rpmVal.textContent = car.rpm;
    if (this.rpmArc) {
      const rpmRatio = Math.min(1.0, car.rpm / 8500);
      // Stroke dashoffset for SVG circle (circumference ~ 220)
      const offset = 220 * (1.0 - rpmRatio);
      this.rpmArc.style.strokeDashoffset = offset;
      if (car.rpm > 7400) {
        this.rpmArc.style.stroke = '#ff0055'; // Redline
      } else {
        this.rpmArc.style.stroke = '#00f0ff';
      }
    }

    // 3. Gear Indicator
    if (this.gearVal) {
      this.gearVal.textContent = car.gear;
    }

    // 4. Nitro Bar (0 to 100%)
    if (this.nitroFill) {
      const nitroPercent = Math.round(car.nitroCharge);
      this.nitroFill.style.width = `${nitroPercent}%`;
      if (this.nitroText) this.nitroText.textContent = `${nitroPercent}%`;
      if (car.isNitroActive) {
        this.nitroFill.classList.add('pulsing');
      } else {
        this.nitroFill.classList.remove('pulsing');
      }
    }

    // 5. Score & Distance
    if (this.scoreVal) this.scoreVal.textContent = Math.round(score).toLocaleString();
    if (this.highScoreVal) this.highScoreVal.textContent = Math.round(highScore).toLocaleString();
    if (this.distVal) {
      const km = (distanceMeters / 1000).toFixed(2);
      this.distVal.textContent = `${km} KM`;
    }

    // 6. Top-Down Minimap Radar
    this._renderRadar(car, trafficManager);

    // 7. Phone Controller Status & Ping
    if (network) {
      if (network.isPhoneConnected) {
        if (this.phoneStatusPill) {
          this.phoneStatusPill.className = 'pill pill-connected';
          this.phoneStatusPill.innerHTML = '<span class="dot"></span> 📱 PHONE CONTROLLER ACTIVE';
        }
        if (this.phonePing) {
          this.phonePing.textContent = `${network.latencyMs}ms`;
        }

        // Live Hand Gesture Badge
        const input = network.getInput();
        if (this.gestureBadge) {
          this.gestureBadge.className = 'gesture-badge';
          if (input.nitro) {
            this.gestureBadge.innerHTML = '⚡ NITRO BOOST';
            this.gestureBadge.classList.add('badge-nitro');
          } else if (input.brake > 0.4) {
            this.gestureBadge.innerHTML = '🛑 BRAKE (FIST)';
            this.gestureBadge.classList.add('badge-brake');
          } else if (input.steer < -0.15) {
            this.gestureBadge.innerHTML = '◀ STEERING LEFT';
          } else if (input.steer > 0.15) {
            this.gestureBadge.innerHTML = '▶ STEERING RIGHT';
          } else if (input.handVisible) {
            this.gestureBadge.innerHTML = '✋ STEERING CENTER';
          } else {
            this.gestureBadge.innerHTML = '⚠️ NO HAND (NEUTRAL)';
            this.gestureBadge.classList.add('badge-alert');
          }
        }
      } else {
        if (this.phoneStatusPill) {
          this.phoneStatusPill.className = 'pill pill-waiting';
          this.phoneStatusPill.innerHTML = '<span class="pulse-dot"></span> 📱 WAITING FOR PHONE';
        }
        if (this.phonePing) this.phonePing.textContent = '--';
        if (this.gestureBadge) {
          this.gestureBadge.innerHTML = '⌨️ KEYBOARD ACTIVE';
          this.gestureBadge.className = 'gesture-badge';
        }
      }
    }

    // 8. Laptop Webcam Steering HUD Updates
    if (webcamInput && webcamInput.active) {
      if (this.webcamWidget) this.webcamWidget.style.display = 'block';

      if (this.camSteerNeedle) {
        const needleOffset = Math.max(-55, Math.min(55, webcamInput.steer * 55));
        this.camSteerNeedle.style.transform = `translateX(${needleOffset}px)`;
      }

      if (this.camSteerReadout) {
        this.camSteerReadout.textContent = `${Math.round(webcamInput.steer * 45)}°`;
      }

      if (webcamInput.handDetected) {
        if (this.camLossOverlay) this.camLossOverlay.classList.remove('visible');
        if (this.camStatusPill) {
          this.camStatusPill.className = 'cam-status-pill tracking';
          this.camStatusText.textContent = '2 HANDS (WHEEL)';
        }

        if (this.camDirBadge) {
          if (webcamInput.nitro) {
            this.camDirBadge.textContent = '⚡ NITRO';
            this.camDirBadge.className = 'cam-dir-badge nitro';
          } else if (webcamInput.brake > 0.4) {
            this.camDirBadge.textContent = '🛑 BRAKE';
            this.camDirBadge.className = 'cam-dir-badge brake';
          } else if (webcamInput.steer < -0.15) {
            this.camDirBadge.textContent = '◀ LEFT';
            this.camDirBadge.className = 'cam-dir-badge left';
          } else if (webcamInput.steer > 0.15) {
            this.camDirBadge.textContent = '▶ RIGHT';
            this.camDirBadge.className = 'cam-dir-badge right';
          } else {
            this.camDirBadge.textContent = '▲ STRAIGHT';
            this.camDirBadge.className = 'cam-dir-badge';
          }
        }

        if (this.gestureBadge) {
          this.gestureBadge.innerHTML = `💻 WHEEL: ${this.camDirBadge ? this.camDirBadge.textContent : 'ACTIVE'}`;
          this.gestureBadge.className = 'gesture-badge badge-nitro';
        }
      } else {
        if (this.camLossOverlay) this.camLossOverlay.classList.add('visible');

        if (webcamInput.handsCount === 1) {
          if (this.camStatusPill) {
            this.camStatusPill.className = 'cam-status-pill warning';
            this.camStatusText.textContent = '1 HAND IN VIEW';
          }
          if (this.camLossTitle) this.camLossTitle.textContent = 'HOLD BOTH HANDS UP';
          if (this.camLossDesc) this.camLossDesc.textContent = 'Two hands needed to grip the wheel';
          if (this.gestureBadge) {
            this.gestureBadge.innerHTML = '⚠️ HOLD BOTH HANDS (NEUTRAL)';
            this.gestureBadge.className = 'gesture-badge badge-alert';
          }
        } else {
          if (this.camStatusPill) {
            this.camStatusPill.className = 'cam-status-pill loss';
            this.camStatusText.textContent = 'NO HANDS';
          }
          if (this.camLossTitle) this.camLossTitle.textContent = 'HANDS NOT DETECTED';
          if (this.camLossDesc) this.camLossDesc.textContent = 'Show both hands to laptop webcam';
          if (this.gestureBadge) {
            this.gestureBadge.innerHTML = '⚠️ NO HANDS (NEUTRAL)';
            this.gestureBadge.className = 'gesture-badge badge-alert';
          }
        }

        if (this.camDirBadge) {
          this.camDirBadge.textContent = '⚠️ NEUTRAL';
          this.camDirBadge.className = 'cam-dir-badge';
        }
      }
    } else {
      if (this.webcamWidget) this.webcamWidget.style.display = 'none';
    }
  }

  _renderRadar(playerCar, trafficManager) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h * 0.72; // Player positioned at lower middle of radar
    const scale = 0.55;       // Pixels per meter

    // Draw Highway Boundary Lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    const roadHalfWidth = 9.0 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - roadHalfWidth, 0);
    ctx.lineTo(centerX - roadHalfWidth, h);
    ctx.moveTo(centerX + roadHalfWidth, 0);
    ctx.lineTo(centerX + roadHalfWidth, h);
    ctx.stroke();

    // Draw Traffic Cars Ahead
    if (trafficManager && trafficManager.vehicles) {
      trafficManager.vehicles.forEach(v => {
        const dx = (v.mesh.position.x - playerCar.mesh.position.x) * scale;
        const dz = (v.mesh.position.z - playerCar.mesh.position.z) * scale;

        // In 3D scene, +X is on the player's left, so radarX is centerX - dx
        const radarX = centerX - dx;
        const radarY = centerY - dz;

        if (radarY >= 5 && radarY <= h - 5 && radarX >= 5 && radarX <= w - 5) {
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 4;
          ctx.fillRect(radarX - 2.5, radarY - 4, 5, 8);
        }
      });
    }

    // Draw Player Car (Cyan triangle at center)
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 6);
    ctx.lineTo(centerX - 4, centerY + 5);
    ctx.lineTo(centerX + 4, centerY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  triggerNearMissPopup(points, streak) {
    if (!this.comboPopup) return;

    if (this.comboTimer) clearTimeout(this.comboTimer);

    if (this.comboText) this.comboText.textContent = `⚡ NEAR MISS! (x${streak} STREAK)`;
    if (this.comboScore) this.comboScore.textContent = `+${points} PTS`;

    this.comboPopup.classList.add('visible');
    this.comboPopup.classList.remove('pulse-anim');
    void this.comboPopup.offsetWidth; // trigger reflow
    this.comboPopup.classList.add('pulse-anim');

    this.comboTimer = setTimeout(() => {
      this.comboPopup.classList.remove('visible');
    }, 1800);
  }
}
