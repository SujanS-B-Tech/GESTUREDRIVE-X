/**
 * GESTUREDRIVE X - Particle Systems & Visual Effects
 * Real-time nitro plasma trails, tire friction smoke, collision sparks, and speed lines
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    this.particles = [];
    this.maxParticles = 600;

    // 1. Sparks & Nitro Particle Texture (Generated procedurally)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(0,240,255,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const sparkTexture = new THREE.CanvasTexture(canvas);

    // Particle Geometry & Material
    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.mat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      map: sparkTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.scene.add(this.points);

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 1.0,
        life: 0.0,
        maxLife: 1.0
      });
    }

    // 2. Speed Lines (Warp Tunnel effect at high speed)
    this._setupSpeedLines();
  }

  _setupSpeedLines() {
    this.speedLineCount = 180;
    const lineGeo = new THREE.BufferGeometry();
    this.speedLinePos = new Float32Array(this.speedLineCount * 6); // 2 points per line

    for (let i = 0; i < this.speedLineCount; i++) {
      this._resetSpeedLine(i, 0);
    }

    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.speedLinePos, 3));
    this.speedLineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.0
    });

    this.speedLines = new THREE.LineSegments(lineGeo, this.speedLineMat);
    this.scene.add(this.speedLines);
  }

  _resetSpeedLine(index, playerZ) {
    const i = index * 6;
    const angle = Math.random() * Math.PI * 2;
    const radius = 5.0 + Math.random() * 9.0;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * (radius * 0.6) + 2.5;
    const z = playerZ + 15 + Math.random() * 40;
    const len = 6 + Math.random() * 12;

    this.speedLinePos[i] = x;
    this.speedLinePos[i + 1] = y;
    this.speedLinePos[i + 2] = z;

    this.speedLinePos[i + 3] = x;
    this.speedLinePos[i + 4] = y;
    this.speedLinePos[i + 5] = z + len;
  }

  spawnNitro(exhaustPos, carYaw, carSpeed) {
    for (let k = 0; k < 2; k++) {
      const p = this._getInactiveParticle();
      if (!p) break;

      p.active = true;
      p.pos.copy(exhaustPos);
      p.pos.x += (Math.random() - 0.5) * 0.15;
      p.pos.y += (Math.random() - 0.5) * 0.15;

      const speedMps = carSpeed * 1000 / 3600;
      const ejectSpeed = 18.0 + Math.random() * 12.0;

      // Eject straight backwards from car heading
      p.vel.set(
        -Math.sin(carYaw) * ejectSpeed + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1.5,
        -Math.cos(carYaw) * ejectSpeed + (Math.random() - 0.5) * 2
      );

      // Cyan to purple gradient
      p.color.setHex(Math.random() > 0.4 ? 0x00f0ff : 0xbd00ff);
      p.size = 1.2 + Math.random() * 0.8;
      p.life = 0.0;
      p.maxLife = 0.35 + Math.random() * 0.2;
    }
  }

  spawnSmoke(wheelPos) {
    const p = this._getInactiveParticle();
    if (!p) return;

    p.active = true;
    p.pos.copy(wheelPos);
    p.pos.y = 0.15;

    p.vel.set(
      (Math.random() - 0.5) * 1.5,
      0.6 + Math.random() * 0.8,
      (Math.random() - 0.5) * 1.5
    );

    p.color.setHex(0xaaaaaa);
    p.size = 2.0;
    p.life = 0.0;
    p.maxLife = 0.6 + Math.random() * 0.4;
  }

  spawnSparks(hitPos, hitNormal) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const p = this._getInactiveParticle();
      if (!p) break;

      p.active = true;
      p.pos.copy(hitPos);

      const speed = 8.0 + Math.random() * 15.0;
      p.vel.set(
        (hitNormal.x + (Math.random() - 0.5)) * speed,
        (2.0 + Math.random() * 8.0),
        (hitNormal.z + (Math.random() - 0.5)) * speed
      );

      p.color.setHex(Math.random() > 0.3 ? 0xffcc00 : 0xff3300);
      p.size = 0.9;
      p.life = 0.0;
      p.maxLife = 0.25 + Math.random() * 0.25;
    }
  }

  _getInactiveParticle() {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) return this.particles[i];
    }
    return null;
  }

  update(delta, playerCar) {
    const playerZ = playerCar.mesh.position.z;
    const playerSpeed = playerCar.speed;

    // 1. Update Active Particles
    let activeCount = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      const idx = i * 3;

      if (p.active) {
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          this.sizes[i] = 0;
          continue;
        }

        // Apply velocity & drag
        p.pos.addScaledVector(p.vel, delta);
        p.vel.y -= 9.8 * delta * 0.4; // slight gravity

        const progress = p.life / p.maxLife;
        const currentSize = p.size * (1.0 - progress);

        this.positions[idx] = p.pos.x;
        this.positions[idx + 1] = p.pos.y;
        this.positions[idx + 2] = p.pos.z;

        this.colors[idx] = p.color.r * (1.0 - progress);
        this.colors[idx + 1] = p.color.g * (1.0 - progress);
        this.colors[idx + 2] = p.color.b * (1.0 - progress);

        this.sizes[i] = currentSize;
        activeCount++;
      } else {
        this.sizes[i] = 0;
      }
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;

    // 2. Update Speed Lines
    if (this.speedLines) {
      const speedRatio = Math.max(0.0, (playerSpeed - 110) / (playerCar.nitroMaxSpeed - 110));
      this.speedLineMat.opacity = playerCar.isNitroActive ? 0.75 : speedRatio * 0.45;

      if (this.speedLineMat.opacity > 0.01) {
        const linePos = this.speedLines.geometry.attributes.position.array;
        for (let j = 0; j < this.speedLineCount; j++) {
          const zIdx = j * 6 + 2;
          const zEndIdx = j * 6 + 5;

          // If line fell behind player camera
          if (linePos[zIdx] < playerZ - 10) {
            this._resetSpeedLine(j, playerZ);
          }
        }
        this.speedLines.geometry.attributes.position.needsUpdate = true;
      }
    }
  }
}
