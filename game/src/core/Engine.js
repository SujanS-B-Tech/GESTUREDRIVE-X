/**
 * GESTUREDRIVE X - Core 3D Graphics Engine
 * High-performance Three.js PBR rendering pipeline with bright coastal daylight atmosphere,
 * realistic sky dome, dynamic sun shadows, time-of-day switcher, smooth chase camera with
 * guardrail wall anti-clipping, and scalable 4K graphics presets.
 */

import * as THREE from 'three';

export class Engine {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Quality Presets: 'low' | 'medium' | 'high' | 'ultra'
    this.quality = 'high';

    // Time of Day: 'day' | 'sunset' | 'night'
    this.timeOfDay = 'day';

    // 1. Scene & Atmosphere Setup
    this.scene = new THREE.Scene();

    // 2. Camera Setup with Speed-Sensitive FOV & Anti-Jitter Smoothing
    this.baseFov = 66;
    this.targetFov = 66;
    // High-precision depth buffer (0.45m near plane avoids Z-fighting on road decals at medium-far distance)
    this.camera = new THREE.PerspectiveCamera(this.baseFov, this.width / this.height, 0.45, 1200);

    // Camera modes: 'chase' | 'hood' | 'orbit'
    this.cameraMode = 'chase';
    this.camYaw = 0.0; // Smoothed camera heading to eliminate collision camera snap
    this.orbitAngle = 0.0;
    this.smoothedLookTarget = null; // Unified damped look target

    // 3. WebGL Renderer with ACES Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
      stencil: false,
      depth: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Defensive WebGL context loss recovery
    this.isContextLost = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Engine] WebGL context lost! Pausing rendering.');
      this.isContextLost = true;
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('[Engine] WebGL context restored.');
      this.isContextLost = false;
    }, false);

    // 4. Lighting Rig & Atmosphere
    this._setupLighting();
    this.setTimeOfDay('day');

    // Resize listener
    window.addEventListener('resize', () => this.onResize());
  }

  _setupLighting() {
    // Ambient diffuse fill
    this.ambientLight = new THREE.AmbientLight(0x526075, 1.35);
    this.scene.add(this.ambientLight);

    // Hemisphere sky-ground bounce light
    this.hemiLight = new THREE.HemisphereLight(0x75b4f7, 0x41523c, 1.15);
    this.scene.add(this.hemiLight);

    // Key Directional Sun Radiance
    this.dirLight = new THREE.DirectionalLight(0xfffaea, 3.4);
    this.dirLight.position.set(45, 95, -55);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 280;
    const d = 42;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.00025;
    this.scene.add(this.dirLight);

    // Rim / Automotive Silhouette Accent Light
    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.rimLight.position.set(-50, 30, 60);
    this.scene.add(this.rimLight);
  }

  _createSkyTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);

    if (type === 'day') {
      grad.addColorStop(0.0, '#1561be'); // Deep zenith blue
      grad.addColorStop(0.35, '#3888e6'); // Azure sky
      grad.addColorStop(0.72, '#7ec1f5'); // Horizon coastal blue
      grad.addColorStop(1.0, '#d9eefe'); // Warm coastal horizon haze
    } else if (type === 'sunset') {
      grad.addColorStop(0.0, '#1c1b3c'); // Twilight indigo
      grad.addColorStop(0.3, '#562562'); // Violet magenta
      grad.addColorStop(0.65, '#ce4124'); // Crimson orange
      grad.addColorStop(1.0, '#f9a738'); // Golden horizon glow
    } else {
      // Midnight
      grad.addColorStop(0.0, '#060812');
      grad.addColorStop(0.5, '#0b1224');
      grad.addColorStop(1.0, '#141d38');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle atmospheric clouds for daylight & sunset
    if (type !== 'night') {
      ctx.fillStyle = type === 'day' ? 'rgba(255, 255, 255, 0.26)' : 'rgba(255, 185, 130, 0.32)';
      for (let i = 0; i < 9; i++) {
        const cx = (i * 130 + 40) % canvas.width;
        const cy = 180 + Math.sin(i * 1.8) * 35;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80 + (i % 3) * 25, 14 + (i % 2) * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  setTimeOfDay(type = 'day') {
    this.timeOfDay = type;
    const skyTexture = this._createSkyTexture(type);
    this.scene.background = skyTexture;
    this.scene.environment = skyTexture; // PBR reflections

    if (type === 'day') {
      this.scene.fog = new THREE.FogExp2(0xaad0f2, 0.0016);
      this.dirLight.color.setHex(0xfffaea);
      this.dirLight.intensity = 3.4;
      this.ambientLight.color.setHex(0x526075);
      this.ambientLight.intensity = 1.35;
      this.hemiLight.color.setHex(0x75b4f7);
      this.hemiLight.groundColor.setHex(0x41523c);
      this.rimLight.color.setHex(0xffffff);
      this.renderer.toneMappingExposure = 1.22;
    } else if (type === 'sunset') {
      this.scene.fog = new THREE.FogExp2(0xd6703c, 0.0020);
      this.dirLight.color.setHex(0xff7c32);
      this.dirLight.intensity = 3.0;
      this.ambientLight.color.setHex(0x5e3c4b);
      this.ambientLight.intensity = 1.25;
      this.hemiLight.color.setHex(0xaa4466);
      this.hemiLight.groundColor.setHex(0x281c20);
      this.rimLight.color.setHex(0xffaa55);
      this.renderer.toneMappingExposure = 1.15;
    } else {
      // Night
      this.scene.fog = new THREE.FogExp2(0x0a0d18, 0.0026);
      this.dirLight.color.setHex(0x88bbff);
      this.dirLight.intensity = 1.8;
      this.ambientLight.color.setHex(0x202636);
      this.ambientLight.intensity = 0.95;
      this.hemiLight.color.setHex(0x354466);
      this.hemiLight.groundColor.setHex(0x11131c);
      this.rimLight.color.setHex(0xff1133);
      this.renderer.toneMappingExposure = 1.10;
    }
  }

  setQuality(preset) {
    this.quality = preset;
    console.log(`[Engine] Applying Graphics Preset: ${preset.toUpperCase()}`);

    switch (preset) {
      case 'low':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = false;
        this.dirLight.castShadow = false;
        break;

      case 'medium':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(1024, 1024);
        break;

      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(2048, 2048);
        break;

      case 'ultra':
        // 4K Ultra Resolution Scaling
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(4096, 4096);
        break;
    }
  }

  updateCamera(car, delta, track = null) {
    if (!car || !car.mesh) return;

    const carPos = car.mesh.position;
    const speedRatio = Math.min(1.0, car.speed / car.maxSpeed);

    // Dynamic Speed FOV
    this.targetFov = this.baseFov + speedRatio * 16.0 + (car.isNitroActive ? 6.0 : 0.0);
    this.camera.fov += (this.targetFov - this.camera.fov) * Math.min(1.0, delta * 5.0);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase') {
      // Smooth camera heading with shortest-arc angle wrapping (eliminates angle sign-flip snaps)
      let yawDiff = (car.yaw - this.camYaw) % (Math.PI * 2);
      if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      const yawAlpha = 1.0 - Math.exp(-8.0 * delta);
      this.camYaw += yawDiff * yawAlpha;
      const heading = this.camYaw;

      // Ideal camera spring arm offset behind car
      const armLength = 8.6;
      const rawCamX = carPos.x - Math.sin(heading) * armLength;
      const targetCamZ = carPos.z - Math.cos(heading) * armLength;
      const targetCamY = carPos.y + 3.6;

      // Dynamic lateral boundary clamp relative to curved procedural road centerline
      let targetCamX = rawCamX;
      if (track && typeof track.getCenterline === 'function') {
        const roadCenterAtCam = track.getCenterline(targetCamZ);
        const halfRoadWidth = (track.roadWidth || 18.0) * 0.5;
        const maxLateralLimit = halfRoadWidth + 1.8;
        targetCamX = Math.min(roadCenterAtCam + maxLateralLimit, Math.max(roadCenterAtCam - maxLateralLimit, rawCamX));
      }

      // Critically damped unified position tracking across all axes (eliminates asymmetric oscillation)
      const posAlpha = 1.0 - Math.exp(-12.0 * delta);
      this.camera.position.x += (targetCamX - this.camera.position.x) * posAlpha;
      this.camera.position.y += (targetCamY - this.camera.position.y) * posAlpha;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * posAlpha;

      // Smoothly damped forward look target (eliminates frame-to-frame lookAt jerking)
      if (!this.smoothedLookTarget) {
        this.smoothedLookTarget = new THREE.Vector3(carPos.x, carPos.y + 1.2, carPos.z + 12.0);
      }
      const rawLookTargetX = carPos.x + Math.sin(heading) * 12.0;
      const rawLookTargetY = carPos.y + 1.2;
      const rawLookTargetZ = carPos.z + Math.cos(heading) * 12.0;
      const lookAlpha = 1.0 - Math.exp(-14.0 * delta);
      this.smoothedLookTarget.x += (rawLookTargetX - this.smoothedLookTarget.x) * lookAlpha;
      this.smoothedLookTarget.y += (rawLookTargetY - this.smoothedLookTarget.y) * lookAlpha;
      this.smoothedLookTarget.z += (rawLookTargetZ - this.smoothedLookTarget.z) * lookAlpha;
      this.camera.lookAt(this.smoothedLookTarget);

      // Snap sun shadow camera to shadow map texel grid to eliminate shadow crawling and flickering
      const shadowMapSize = this.dirLight.shadow.mapSize.width || 2048;
      const shadowFrustumSize = 84;
      const texelSize = shadowFrustumSize / shadowMapSize;

      const lightRawX = carPos.x + 45;
      const lightRawZ = carPos.z - 55;
      const snappedX = Math.round(lightRawX / texelSize) * texelSize;
      const snappedZ = Math.round(lightRawZ / texelSize) * texelSize;

      this.dirLight.position.set(snappedX, carPos.y + 95, snappedZ);
      this.dirLight.target.position.set(
        Math.round(carPos.x / texelSize) * texelSize,
        carPos.y,
        Math.round(carPos.z / texelSize) * texelSize
      );
      this.dirLight.target.updateMatrixWorld();

    } else if (this.cameraMode === 'hood') {
      // High-speed hood / cockpit perspective
      const heading = car.yaw;
      this.camera.position.set(
        carPos.x + Math.sin(heading) * 0.8,
        carPos.y + 1.15,
        carPos.z + Math.cos(heading) * 0.8
      );
      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(heading) * 40.0,
        carPos.y + 1.0,
        carPos.z + Math.cos(heading) * 40.0
      );
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'orbit') {
      // Showroom / Garage 360 degree orbit presentation
      this.orbitAngle += delta * 0.35;
      const radius = 6.8;
      this.camera.position.set(
        carPos.x + Math.cos(this.orbitAngle) * radius,
        carPos.y + 2.1 + Math.sin(this.orbitAngle * 0.5) * 0.5,
        carPos.z + Math.sin(this.orbitAngle) * radius
      );
      this.camera.lookAt(carPos.x, carPos.y + 0.6, carPos.z);
    }
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    if (this.isContextLost) return;
    this.renderer.render(this.scene, this.camera);
  }
}
