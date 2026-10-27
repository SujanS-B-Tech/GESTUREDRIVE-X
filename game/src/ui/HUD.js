/**
 * GESTUREDRIVE X - AAA Black & Red Racing HUD
 * Digital and analog speedometer gauge, RPM tachometer, minimap radar,
 * nitro meter, near-miss combo popups, and compact webcam AI steering widget.
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

    // Pause Button
    this.btnPause = document.getElementById('btn-hud-pause');

    // Minimap Radar Canvas
    this.radarCanvas = document.getElementById('hud-radar-canvas');
    if (this.radarCanvas) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }

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

  update(car, trafficManager, score, distanceMeters, highScore, webcamInput = null) {
    if (!car) return;

    // 1. Digital & Analog Speedometer Readout (0 to 280 km/h)
    const speed = Math.round(car.speed);
    if (this.speedVal) this.speedVal.textContent = speed;

    if (this.speedNeedle) {
      const angle = -120 + (Math.min(speed, 280) / 280) * 240;
      this.speedNeedle.style.transform = `rotate(${angle}deg)`;
    }

    // 2. Tachometer RPM Arc
    if (this.rpmVal) this.rpmVal.textContent = car.rpm;
    if (this.rpmArc) {
      const rpmRatio = Math.min(1.0, car.rpm / 8500);
      const offset = 220 * (1.0 - rpmRatio);
      this.rpmArc.style.strokeDashoffset = offset;
      if (car.rpm > 7500) {
        this.rpmArc.style.stroke = '#ff1133'; // Redline
      } else {
        this.rpmArc.style.stroke = '#ffffff';
      }
    }

    // 3. Current Gear
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

    // 6. Proximity Radar Minimap
    this._renderRadar(car, trafficManager);

    // 7. Laptop Webcam Steering HUD Updates
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
      } else {
        if (this.camLossOverlay) this.camLossOverlay.classList.add('visible');

        if (webcamInput.handsCount === 1) {
          if (this.camStatusPill) {
            this.camStatusPill.className = 'cam-status-pill warning';
            this.camStatusText.textContent = '1 HAND IN VIEW';
          }
          if (this.camLossTitle) this.camLossTitle.textContent = 'HOLD BOTH HANDS UP';
          if (this.camLossDesc) this.camLossDesc.textContent = 'Grip the invisible wheel at 9 & 3';
        } else {
          if (this.camStatusPill) {
            this.camStatusPill.className = 'cam-status-pill loss';
            this.camStatusText.textContent = 'NO HANDS';
          }
          if (this.camLossTitle) this.camLossTitle.textContent = 'HANDS NOT DETECTED';
          if (this.camLossDesc) this.camLossDesc.textContent = 'Hold hands in front of webcam';
        }

        if (this.camDirBadge) {
          this.camDirBadge.textContent = '▲ NEUTRAL';
          this.camDirBadge.className = 'cam-dir-badge';
        }
      }
    } else {
      if (this.webcamWidget) this.webcamWidget.style.display = 'none';
    }
  }

  triggerNearMissPopup(points, streak) {
    if (!this.comboPopup) return;

    if (this.comboText) {
      this.comboText.textContent = streak > 1 ? `NEAR MISS! (x${streak} STREAK)` : `NEAR MISS!`;
    }
    if (this.comboScore) {
      this.comboScore.textContent = `+${points} PTS`;
    }

    this.comboPopup.classList.add('active');

    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.comboPopup.classList.remove('active');
    }, 1800);
  }

  showCheckpointBanner(title, subtitle) {
    if (!this.comboPopup) return;

    if (this.comboText) {
      this.comboText.textContent = title;
    }
    if (this.comboScore) {
      this.comboScore.textContent = subtitle;
    }

    this.comboPopup.classList.add('active');

    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.comboPopup.classList.remove('active');
    }, 2000);
  }

  _renderRadar(car, trafficManager) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background & range rings
    ctx.fillStyle = 'rgba(10, 11, 16, 0.9)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.72, 35, 0, Math.PI * 2);
    ctx.arc(w / 2, h * 0.72, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Road Lanes Boundaries
    const roadXScale = w / 22;
    const playerX = w / 2;
    const playerY = h * 0.72;

    ctx.strokeStyle = 'rgba(255, 17, 51, 0.3)';
    ctx.beginPath();
    ctx.moveTo(playerX - 9 * roadXScale, 0);
    ctx.lineTo(playerX - 9 * roadXScale, h);
    ctx.moveTo(playerX + 9 * roadXScale, 0);
    ctx.lineTo(playerX + 9 * roadXScale, h);
    ctx.stroke();

    // Player Blip (Precision Red Triangle)
    ctx.save();
    ctx.translate(playerX + car.mesh.position.x * roadXScale * 0.45, playerY);
    ctx.rotate(car.yaw);
    ctx.fillStyle = '#ff1133';
    ctx.shadowColor = '#ff1133';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Traffic Blips (White/Silver Rectangles)
    if (trafficManager && trafficManager.vehicles) {
      const zRange = 120; // 120 meters range ahead
      trafficManager.vehicles.forEach(v => {
        const relZ = v.mesh.position.z - car.mesh.position.z;
        const relX = v.mesh.position.x - car.mesh.position.x;

        if (relZ > -30 && relZ < zRange) {
          const radarZ = playerY - (relZ / zRange) * (h * 0.65);
          const radarX = playerX + v.mesh.position.x * roadXScale * 0.45;

          ctx.fillStyle = relZ < 15 && Math.abs(relX) < 3.0 ? '#ff3344' : '#e0e0e0';
          ctx.fillRect(radarX - 3, radarZ - 5, 6, 10);
        }
      });
    }
  }
}
