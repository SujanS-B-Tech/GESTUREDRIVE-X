/**
 * GESTUREDRIVE X - Menus & Modal Screens Manager
 * Start screen, Car Color Selector, Mode Selection, Pause Menu, Results Screen, and Settings
 */

export class Menus {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    // Screens
    this.startScreen = document.getElementById('screen-start');
    this.pauseScreen = document.getElementById('screen-pause');
    this.resultsScreen = document.getElementById('screen-results');
    this.settingsModal = document.getElementById('modal-settings');
    this.guideModal = document.getElementById('modal-guide');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');

    // Start Screen Elements
    this.btnStartRace = document.getElementById('btn-start-race');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnOpenGuide = document.getElementById('btn-open-guide');
    this.startQrImg = document.getElementById('start-qr-img');
    this.startSessionCode = document.getElementById('start-session-code');
    this.startControllerUrl = document.getElementById('start-controller-url');
    this.phonePairBanner = document.getElementById('start-phone-banner');

    // Pause Screen Elements
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnQuit = document.getElementById('btn-quit');

    // Results Screen Elements
    this.btnResultsRestart = document.getElementById('btn-results-restart');
    this.btnResultsMenu = document.getElementById('btn-results-menu');
    this.resScore = document.getElementById('res-score');
    this.resBestScore = document.getElementById('res-best-score');
    this.resTopSpeed = document.getElementById('res-top-speed');
    this.resDistance = document.getElementById('res-distance');
    this.resNearMiss = document.getElementById('res-near-miss');
    this.resCoins = document.getElementById('res-coins');
    this.resRank = document.getElementById('res-rank');

    // Color Swatches
    this.colorSwatches = document.querySelectorAll('.color-swatch');

    // Mode Buttons
    this.modeButtons = document.querySelectorAll('.btn-mode');
    this.selectedMode = 'endless';

    this._bindEvents();
  }

  _bindEvents() {
    // Start Race
    if (this.btnStartRace) {
      this.btnStartRace.addEventListener('click', () => {
        if (this.callbacks.onStartRace) this.callbacks.onStartRace(this.selectedMode);
      });
    }

    // Color Swatches
    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const hex = parseInt(swatch.dataset.color, 16);
        if (this.callbacks.onColorChange) this.callbacks.onColorChange(hex);
      });
    });

    // Mode Selection
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode;
      });
    });

    // Pause Controls
    if (this.btnResume) {
      this.btnResume.addEventListener('click', () => {
        if (this.callbacks.onResume) this.callbacks.onResume();
      });
    }
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        if (this.callbacks.onRestart) this.callbacks.onRestart();
      });
    }
    if (this.btnQuit) {
      this.btnQuit.addEventListener('click', () => {
        if (this.callbacks.onQuit) this.callbacks.onQuit();
      });
    }

    // Results Controls
    if (this.btnResultsRestart) {
      this.btnResultsRestart.addEventListener('click', () => {
        if (this.callbacks.onRestart) this.callbacks.onRestart();
      });
    }
    if (this.btnResultsMenu) {
      this.btnResultsMenu.addEventListener('click', () => {
        if (this.callbacks.onQuit) this.callbacks.onQuit();
      });
    }

    // Settings Modal
    if (this.btnOpenSettings) {
      this.btnOpenSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      });
    }
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }

    // Guide Modal
    if (this.btnOpenGuide) {
      this.btnOpenGuide.addEventListener('click', () => {
        if (this.guideModal) this.guideModal.classList.remove('hidden');
      });
    }
    const btnCloseGuide = document.getElementById('btn-close-game-guide');
    if (btnCloseGuide) {
      btnCloseGuide.addEventListener('click', () => {
        if (this.guideModal) this.guideModal.classList.add('hidden');
      });
    }

    // Graphics Preset Buttons
    document.querySelectorAll('.btn-quality').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-quality').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange(btn.dataset.quality);
      });
    });

    // Camera Mode Select in Settings
    const camSelect = document.getElementById('setting-cam-select');
    if (camSelect) {
      camSelect.addEventListener('change', (e) => {
        if (this.callbacks.onCameraChange) this.callbacks.onCameraChange(e.target.value);
      });
    }

    // Mute Audio Toggle
    const muteToggle = document.getElementById('setting-audio-toggle');
    if (muteToggle) {
      muteToggle.addEventListener('change', (e) => {
        if (this.callbacks.onMuteToggle) this.callbacks.onMuteToggle(e.target.checked);
      });
    }
  }

  setPairingInfo(sessionCode, controllerUrl, qrDataUrl) {
    if (this.startSessionCode) this.startSessionCode.textContent = sessionCode;
    if (this.startControllerUrl) this.startControllerUrl.textContent = controllerUrl;
    if (this.startQrImg && qrDataUrl) this.startQrImg.src = qrDataUrl;
  }

  setPhoneConnected(connected, deviceInfo) {
    if (this.phonePairBanner) {
      if (connected) {
        this.phonePairBanner.className = 'phone-banner connected';
        this.phonePairBanner.innerHTML = `<span>🟢 📱 PHONE CONNECTED (${deviceInfo || 'Mobile'})</span>`;
      } else {
        this.phonePairBanner.className = 'phone-banner waiting';
        this.phonePairBanner.innerHTML = `<span>📡 SCAN QR CODE BELOW TO PAIR YOUR PHONE</span>`;
      }
    }
  }

  showStartScreen() {
    this.hideAll();
    if (this.startScreen) this.startScreen.classList.remove('hidden');
  }

  showPauseScreen() {
    if (this.pauseScreen) this.pauseScreen.classList.remove('hidden');
  }

  hidePauseScreen() {
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
  }

  showResults(stats) {
    this.hideAll();
    if (this.resultsScreen) {
      this.resultsScreen.classList.remove('hidden');

      if (this.resScore) this.resScore.textContent = Math.round(stats.score).toLocaleString();
      if (this.resBestScore) this.resBestScore.textContent = Math.round(stats.highScore).toLocaleString();
      if (this.resTopSpeed) this.resTopSpeed.textContent = `${Math.round(stats.topSpeed)} KM/H`;
      if (this.resDistance) this.resDistance.textContent = `${(stats.distance / 1000).toFixed(2)} KM`;
      if (this.resNearMiss) this.resNearMiss.textContent = stats.nearMisses;
      if (this.resCoins) this.resCoins.textContent = stats.coins;

      // Calculate Driver Rank
      let rank = 'C';
      if (stats.score > 25000) rank = 'S+';
      else if (stats.score > 15000) rank = 'S';
      else if (stats.score > 8000) rank = 'A';
      else if (stats.score > 4000) rank = 'B';

      if (this.resRank) {
        this.resRank.textContent = rank;
        this.resRank.className = `rank-badge rank-${rank.charAt(0).toLowerCase()}`;
      }
    }
  }

  startCountdown(onComplete) {
    this.cancelCountdown();

    if (!this.countdownOverlay) {
      if (onComplete) onComplete();
      return;
    }

    this.countdownOverlay.classList.remove('hidden');
    let count = 3;
    this.countdownNumber.textContent = count;
    this.countdownNumber.style.color = '#fff';

    if (this.callbacks.onBeep) this.callbacks.onBeep(false);

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownNumber.textContent = count;
        if (this.callbacks.onBeep) this.callbacks.onBeep(false);
      } else if (count === 0) {
        this.countdownNumber.textContent = 'GO!';
        this.countdownNumber.style.color = '#00f0ff';
        if (this.callbacks.onBeep) this.callbacks.onBeep(true);
      } else {
        this.cancelCountdown();
        if (onComplete) onComplete();
      }
    }, 900);
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
    if (this.countdownNumber) {
      this.countdownNumber.style.color = '#fff';
    }
  }

  hideAll() {
    this.cancelCountdown();
    if (this.startScreen) this.startScreen.classList.add('hidden');
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    if (this.resultsScreen) this.resultsScreen.classList.add('hidden');
    if (this.countdownOverlay) this.countdownOverlay.classList.add('hidden');
  }
}

