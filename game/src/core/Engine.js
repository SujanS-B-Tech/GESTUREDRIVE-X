/**
 * GESTUREDRIVE X - Core 3D Graphics Engine
 * High-performance Three.js PBR rendering pipeline with dynamic lighting and camera systems
 */

import * as THREE from 'three';

export class Engine {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Quality Presets: 'low' | 'medium' | 'high' | 'ultra'
    this.quality = 'high';

    // 1. Scene & Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x080d1a, 0.0028);

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(65, this.width / this.height, 0.2, 1000);
    this.baseFov = 65;
    this.targetFov = 65;

    // Camera modes: 'chase' | 'hood' | 'orbit'
    this.cameraMode = 'chase';
    this.cameraLag = new THREE.Vector3(0, 3.8, -9.0);
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
    this.renderer.toneMappingExposure = 1.15;
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

    // 5. Sky & Environment Glow
    this._setupSky();

    // Resize listener
    window.addEventListener('resize', () => this.onResize());
  }

  _setupLighting() {
    // Ambient fill
    this.ambientLight = new THREE.AmbientLight(0x223355, 1.2);
    this.scene.add(this.ambientLight);

    // Hemisphere light for ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x4466aa, 0x111622, 0.8);
    this.scene.add(this.hemiLight);

    // Key directional light (Moon / Overhead city radiance)
    this.dirLight = new THREE.DirectionalLight(0x88ccff, 2.4);
    this.dirLight.position.set(30, 80, -40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 250;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Cyber Rim Light (Pink/Magenta backlight for automotive silhouette)
    this.rimLight = new THREE.DirectionalLight(0xff0088, 1.5);
    this.rimLight.position.set(-40, 25, 60);
    this.scene.add(this.rimLight);
  }

  _setupSky() {
    // Dome geometry with dynamic gradient
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x070b16,
      side: THREE.BackSide
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Distant Star Field
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 800;
      positions[i + 1] = Math.random() * 300 + 40;
      positions[i + 2] = (Math.random() - 0.5) * 800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 1.2,
      transparent: true,
      opacity: 0.8
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  setQuality(preset) {
    this.quality = preset;
    switch (preset) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = true;
        this.dirLight.shadow.mapSize.set(1024, 1024);
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.dirLight.shadow.mapSize.set(2048, 2048);
        break;
      case 'ultra':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.dirLight.shadow.mapSize.set(4096, 4096);
        break;
    }
  }

  updateCamera(car, delta) {
    if (!car || !car.mesh) return;

    const carPos = car.mesh.position;
    const speedRatio = Math.min(1.0, car.speed / car.maxSpeed);

    // Dynamic FOV based on speed and nitro
    const targetFov = this.baseFov + (car.isNitroActive ? 22 : speedRatio * 14);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, delta * 6.0);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase') {
      // 3rd Person Smooth Follow
      // Offset behind and above car based on car orientation
      const desiredPos = new THREE.Vector3(
        carPos.x - Math.sin(car.yaw) * 7.5,
        carPos.y + 2.8 + (car.isNitroActive ? 0.3 : 0),
        carPos.z - Math.cos(car.yaw) * 7.5
      );

      // Smooth interpolation (spring-damper feeling)
      this.camera.position.lerp(desiredPos, Math.min(1.0, delta * 8.0));

      // Look slightly ahead of the car
      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(car.yaw) * 14.0,
        carPos.y + 1.2,
        carPos.z + Math.cos(car.yaw) * 14.0
      );
      this.camera.lookAt(lookTarget);

      // Camera roll/bank into high speed turns
      const bankAngle = -car.steerAngle * 0.12 * speedRatio;
      this.camera.rotation.z += (bankAngle - this.camera.rotation.z) * 0.1;

    } else if (this.cameraMode === 'hood') {
      // 1st Person Cockpit/Hood view
      const hoodPos = new THREE.Vector3(
        carPos.x + Math.sin(car.yaw) * 0.8,
        carPos.y + 1.05,
        carPos.z + Math.cos(car.yaw) * 0.8
      );
      this.camera.position.copy(hoodPos);

      const hoodLook = new THREE.Vector3(
        carPos.x + Math.sin(car.yaw) * 30.0,
        carPos.y + 1.0,
        carPos.z + Math.cos(car.yaw) * 30.0
      );
      this.camera.lookAt(hoodLook);

    } else if (this.cameraMode === 'orbit') {
      // Cinematic rotating showroom camera
      this.orbitAngle += delta * 0.5;
      const radius = 6.8;
      this.camera.position.set(
        carPos.x + Math.sin(this.orbitAngle) * radius,
        carPos.y + 2.0,
        carPos.z + Math.cos(this.orbitAngle) * radius
      );
      this.camera.lookAt(carPos.x, carPos.y + 0.8, carPos.z);
    }

    // Keep key light following the player
    this.dirLight.position.set(carPos.x + 30, carPos.y + 80, carPos.z - 40);
    this.dirLight.target.position.copy(carPos);
    this.dirLight.target.updateMatrixWorld();

    if (this.skyDome) {
      this.skyDome.position.copy(carPos);
    }
    if (this.stars) {
      this.stars.position.z = carPos.z;
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
