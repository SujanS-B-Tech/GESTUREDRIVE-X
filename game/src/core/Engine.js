/**
 * GESTUREDRIVE X - Core 3D Graphics Engine
 * High-performance Three.js PBR rendering pipeline with dynamic lighting,
 * asphalt-style cinematic camera effects, scalable graphics presets (Low to 4K Ultra),
 * and WebGL context restoration guards.
 */

import * as THREE from 'three';

export class Engine {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Quality Presets: 'low' | 'medium' | 'high' | 'ultra'
    this.quality = 'high';

    // 1. Scene & Deep Midnight Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080d);
    this.scene.fog = new THREE.FogExp2(0x090b12, 0.0026);

    // 2. Camera Setup with Speed-Sensitive FOV
    this.baseFov = 66;
    this.targetFov = 66;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, this.width / this.height, 0.2, 1200);

    // Camera modes: 'chase' | 'hood' | 'orbit'
    this.cameraMode = 'chase';
    this.cameraLag = new THREE.Vector3(0, 3.6, -8.6);
    this.cameraLookLag = new THREE.Vector3(0, 1.2, 8.0);
    this.orbitAngle = 0;

    // 3. WebGL Renderer
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
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // WebGL Context Loss Defensive Recovery
    this.isContextLost = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Engine] WebGL context lost! Pausing rendering until restored.');
      this.isContextLost = true;
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('[Engine] WebGL context restored successfully.');
      this.isContextLost = false;
    }, false);

    // 4. Lighting Rig
    this._setupLighting();

    // Resize listener
    window.addEventListener('resize', () => this.onResize());
  }

  _setupLighting() {
    // Ambient fill
    this.ambientLight = new THREE.AmbientLight(0x202636, 1.25);
    this.scene.add(this.ambientLight);

    // Hemisphere light for realistic ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x405580, 0x12141c, 0.85);
    this.scene.add(this.hemiLight);

    // Key directional light (Overhead moon radiance)
    this.dirLight = new THREE.DirectionalLight(0x99ccff, 2.3);
    this.dirLight.position.set(30, 80, -40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 260;
    const d = 36;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    // Precision Racing Red Rim Light (Automotive silhouette accent)
    this.rimLight = new THREE.DirectionalLight(0xff1133, 1.8);
    this.rimLight.position.set(-45, 25, 60);
    this.scene.add(this.rimLight);
  }

  setQuality(preset) {
    this.quality = preset;
    console.log(`[Engine] Applying Graphics Preset: ${preset.toUpperCase()}`);

    switch (preset) {
      case 'low':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = false;
        this.dirLight.castShadow = false;
        this.scene.fog.density = 0.0035;
        break;

      case 'medium':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(1024, 1024);
        this.scene.fog.density = 0.0028;
        break;

      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(2048, 2048);
        this.scene.fog.density = 0.0026;
        break;

      case 'ultra':
        // Maximum 4K / Retina fidelity
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(4096, 4096);
        this.scene.fog.density = 0.0022;
        break;
    }
  }

  updateCamera(car, delta) {
    if (!car || !car.mesh) return;

    const carPos = car.mesh.position;
    const speedRatio = Math.min(1.0, car.speed / car.maxSpeed);

    // Dynamic Speed FOV
    this.targetFov = this.baseFov + speedRatio * 18.0 + (car.isNitroActive ? 8.0 : 0.0);
    this.camera.fov += (this.targetFov - this.camera.fov) * Math.min(1.0, delta * 6.0);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase') {
      // Smooth Third-Person Chase Camera behind supercar
      const heading = car.yaw;
      const targetCamX = carPos.x - Math.sin(heading) * 8.6;
      const targetCamZ = carPos.z - Math.cos(heading) * 8.6;
      const targetCamY = carPos.y + 3.6;

      this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, delta * 14.0);
      this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, delta * 12.0);
      this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1.0, delta * 16.0);

      // Look slightly ahead of car
      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(heading) * 12.0,
        carPos.y + 1.2,
        carPos.z + Math.cos(heading) * 12.0
      );
      this.camera.lookAt(lookTarget);

      // Keep key light centered on player
      this.dirLight.position.set(carPos.x + 30, carPos.y + 80, carPos.z - 40);
      this.dirLight.target.position.copy(carPos);
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
