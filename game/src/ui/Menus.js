/**
 * GESTUREDRIVE X - Menus & Modal Screens Manager
 * Controls Splash, Main Menu, Garage Customizer, Settings, Controls Guide, Pause, and Results.
 */

export class Menus {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    // Screens & Modals
    this.splashScreen = document.getElementById('screen-splash');
    this.splashFill = document.getElementById('splash-loader-fill');
    this.splashPrompt = document.getElementById('splash-press-prompt');
    this.startScreen = document.getElementById('screen-start');
    this.garageScreen = document.getElementById('screen-garage');
    this.pauseScreen = document.getElementById('screen-pause');
    this.resultsScreen = document.getElementById('screen-results');
    this.settingsModal = document.getElementById('modal-settings');
    this.guideModal = document.getElementById('modal-guide');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');

    // Main Menu Buttons
    this.btnStartRace = document.getElementById('btn-start-race');
    this.btnOpenGarage = document.getElementById('btn-open-garage');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnOpenGuide = document.getElementById('btn-open-guide');
    this.btnExitGame = document.getElementById('btn-exit-game');

    // Garage Controls
    this.btnCloseGarage = document.getElementById('btn-close-garage');
    this.btnGarageRace = document.getElementById('btn-garage-race');
    this.colorSwatches = document.querySelectorAll('.color-swatch');

    // Mode Buttons
    this.modeButtons = document.querySelectorAll('.btn-mode-tab');
    this.selectedMode = 'endless';

    // Pause Screen Elements
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnPauseSettings = document.getElementById('btn-pause-settings');
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

    // Settings Controls
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.qualityButtons = document.querySelectorAll('.btn-quality');
    this.camButtons = document.querySelectorAll('.btn-cam-opt');
    this.settingFullscreen = document.getElementById('setting-fullscreen');
    this.volumeSlider = document.getElementById('setting-volume-slider');
    this.volumeVal = document.getElementById('setting-volume-val');

    // Controls Guide
    this.btnCloseGuide = document.getElementById('btn-close-guide');
    this.btnCloseGuideAction = document.getElementById('btn-close-guide-action');

    this.countdownTimer = null;

    this._bindEvents();
    this._initSplashScreen();
  }

  _initSplashScreen() {
    if (!this.splashScreen) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (this.splashFill) this.splashFill.style.width = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);
        if (this.splashPrompt) this.splashPrompt.classList.remove('hidden');

        const dismissSplash = () => {
          this.splashScreen.classList.add('hidden');
          window.removeEventListener('keydown', dismissSplash);
          window.removeEventListener('pointerdown', dismissSplash);
          if (this.callbacks.onSplashDismissed) this.callbacks.onSplashDismissed();
        };

        window.addEventListener('keydown', dismissSplash, { once: true });
        window.addEventListener('pointerdown', dismissSplash, { once: true });
      }
    }, 120);
  }

  _bindEvents() {
    // Start Race
    if (this.btnStartRace) {
      this.btnStartRace.addEventListener('click', () => {
        if (this.callbacks.onStartRace) this.callbacks.onStartRace(this.selectedMode);
      });
    }

    // Garage Open & Close
    if (this.btnOpenGarage) {
      this.btnOpenGarage.addEventListener('click', () => {
        this.hideAll();
        if (this.garageScreen) this.garageScreen.classList.remove('hidden');
        if (this.callbacks.onGarageOpened) this.callbacks.onGarageOpened();
      });
    }
    if (this.btnCloseGarage) {
      this.btnCloseGarage.addEventListener('click', () => {
        if (this.garageScreen) this.garageScreen.classList.add('hidden');
        this.showStartScreen();
        if (this.callbacks.onGarageClosed) this.callbacks.onGarageClosed();
      });
    }
    if (this.btnGarageRace) {
      this.btnGarageRace.addEventListener('click', () => {
        if (this.garageScreen) this.garageScreen.classList.add('hidden');
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

    // Mode Selection Tabs
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode;
      });
    });

    // Settings Modal
    if (this.btnOpenSettings) {
      this.btnOpenSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      });
    }
    if (this.btnPauseSettings) {
      this.btnPauseSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      });
    }
    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }

    // Quality buttons
    this.qualityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.qualityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange(btn.dataset.quality);
      });
    });

    // Camera buttons
    this.camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onCameraChange) this.callbacks.onCameraChange(btn.dataset.cam);
      });
    });

    // Fullscreen toggle
    if (this.settingFullscreen) {
      this.settingFullscreen.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      });
    }

    // Volume Slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.volumeVal) this.volumeVal.textContent = `${val}%`;
        if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(val / 100);
      });
    }

    // Controls Guide Modal
    if (this.btnOpenGuide) {
      this.btnOpenGuide.addEventListener('click', () => {
        if (this.guideModal) this.guideModal.classList.remove('hidden');
      });
    }
    if (this.btnCloseGuide) {
      this.btnCloseGuide.addEventListener('click', () => {
        if (this.guideModal) this.guideModal.classList.add('hidden');
      });
    }
    if (this.btnCloseGuideAction) {
      this.btnCloseGuideAction.addEventListener('click', () => {
        if (this.guideModal) this.guideModal.classList.add('hidden');
      });
    }

    // Exit Game
    if (this.btnExitGame) {
      this.btnExitGame.addEventListener('click', () => {
        if (window.close) window.close();
      });
    }

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
    if (this.resultsScreen) this.resultsScreen.classList.remove('hidden');

    if (this.resScore) this.resScore.textContent = Math.round(stats.score).toLocaleString();
    if (this.resBestScore) this.resBestScore.textContent = Math.round(stats.highScore).toLocaleString();
    if (this.resTopSpeed) this.resTopSpeed.textContent = `${Math.round(stats.topSpeed)} KM/H`;
    if (this.resDistance) this.resDistance.textContent = `${(stats.distance / 1000).toFixed(2)} KM`;
    if (this.resNearMiss) this.resNearMiss.textContent = stats.nearMisses;
    if (this.resCoins) this.resCoins.textContent = stats.coins;

    // Calculate Rank
    let rank = 'RANK C';
    if (stats.score > 15000) rank = 'RANK S';
    else if (stats.score > 8000) rank = 'RANK A';
    else if (stats.score > 3500) rank = 'RANK B';

    if (this.resRank) this.resRank.textContent = rank;
  }

  hideAll() {
    if (this.startScreen) this.startScreen.classList.add('hidden');
    if (this.garageScreen) this.garageScreen.classList.add('hidden');
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    if (this.resultsScreen) this.resultsScreen.classList.add('hidden');
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
    if (this.guideModal) this.guideModal.classList.add('hidden');
    if (this.countdownOverlay) this.countdownOverlay.classList.add('hidden');
  }

  startCountdown(onComplete) {
    if (!this.countdownOverlay || !this.countdownNumber) {
      if (onComplete) onComplete();
      return;
    }

    this.countdownOverlay.classList.remove('hidden');
    let count = 3;
    this.countdownNumber.textContent = count;
    this.countdownNumber.style.color = '#fff';

    if (this.callbacks.onBeep) this.callbacks.onBeep(false);

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownNumber.textContent = count;
        if (this.callbacks.onBeep) this.callbacks.onBeep(false);
      } else if (count === 0) {
        this.countdownNumber.textContent = 'GO!';
        this.countdownNumber.style.color = '#ff1133';
        if (this.callbacks.onBeep) this.callbacks.onBeep(true);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.countdownOverlay.classList.add('hidden');
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
  }
}
