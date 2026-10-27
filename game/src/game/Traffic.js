/**
 * GESTUREDRIVE X - AI Traffic Simulator & Near-Miss System
 * Multi-lane AI traffic cars, dynamic lane changing, collision physics, and near-miss combo tracking
 */

import * as THREE from 'three';

export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.lanePositions = [-6.75, -2.25, 2.25, 6.75]; // 4 lanes
    this.vehicles = [];
    this.maxTraffic = 7; // Optimal for density and performance

    // Reusable Materials
    this.carColors = [0xff2200, 0x0066ff, 0xffcc00, 0x22aa33, 0x9900ee, 0xdddddd];
    this.materials = this.carColors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.7,
      roughness: 0.3
    }));

    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      metalness: 0.9,
      roughness: 0.1
    });

    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    this.wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    // Pre-allocated shared geometries (Prevents GPU VRAM bloat)
    this.bodyGeo = new THREE.BoxGeometry(1.9, 0.65, 4.2);
    this.cabinGeo = new THREE.BoxGeometry(1.55, 0.55, 2.0);
    this.tlGeo = new THREE.BoxGeometry(1.6, 0.1, 0.08);
    this.hlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    this.wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    this.wGeo.rotateZ(Math.PI / 2);
  }

  init(playerZ) {
    // Clear and remove existing meshes from scene
    this.vehicles.forEach(v => {
      if (v.mesh && v.mesh.parent) {
        v.mesh.parent.remove(v.mesh);
      }
    });
    this.vehicles = [];

    // Spawn initial pool ahead of player
    for (let i = 0; i < this.maxTraffic; i++) {
      const spawnZ = playerZ + 70 + i * 45;
      this._spawnVehicle(spawnZ);
    }
  }

  _spawnVehicle(zPos) {
    const laneIdx = Math.floor(Math.random() * this.lanePositions.length);
    const laneX = this.lanePositions[laneIdx];

    // Speed: 65 - 110 km/h
    const speed = 65 + Math.random() * 45;

    // Vehicle 3D Mesh
    const mesh = new THREE.Group();
    const mat = this.materials[Math.floor(Math.random() * this.materials.length)];

    // Body
    const body = new THREE.Mesh(this.bodyGeo, mat);
    body.position.y = 0.55;
    body.castShadow = true;
    mesh.add(body);

    // Cabin
    const cabin = new THREE.Mesh(this.cabinGeo, this.glassMat);
    cabin.position.set(0, 1.05, -0.2);
    mesh.add(cabin);

    // Taillights
    const tl = new THREE.Mesh(this.tlGeo, this.taillightMat);
    tl.position.set(0, 0.65, -2.12);
    mesh.add(tl);

    // Headlights
    const hlL = new THREE.Mesh(this.hlGeo, this.headlightMat);
    hlL.position.set(-0.65, 0.55, 2.12);
    const hlR = new THREE.Mesh(this.hlGeo, this.headlightMat);
    hlR.position.set(0.65, 0.55, 2.12);
    mesh.add(hlL, hlR);

    // Wheels (Sharing wGeo)
    [
      [-0.95, 0.35, 1.2],
      [0.95, 0.35, 1.2],
      [-0.95, 0.35, -1.2],
      [0.95, 0.35, -1.2]
    ].forEach(p => {
      const w = new THREE.Mesh(this.wGeo, this.wheelMat);
      w.position.set(p[0], p[1], p[2]);
      mesh.add(w);
    });

    mesh.position.set(laneX, 0, zPos);
    this.scene.add(mesh);

    this.vehicles.push({
      mesh,
      currentLane: laneIdx,
      targetLane: laneIdx,
      speed, // km/h
      isNearMissAwarded: false,
      laneChangeTimer: 3 + Math.random() * 8, // seconds until next lane change
      collider: { halfWidth: 1.05, halfLength: 2.2 }
    });
  }

  update(delta, playerCar, onCollision, onNearMiss) {
    const playerPos = playerCar.mesh.position;
    const playerSpeed = playerCar.speed;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // 1. Move Traffic forward along track
      const forwardMeters = (v.speed * 1000 / 3600) * delta;
      v.mesh.position.z += forwardMeters;

      // 2. AI Lane Changing Logic
      v.laneChangeTimer -= delta;
      if (v.laneChangeTimer <= 0) {
        v.laneChangeTimer = 6 + Math.random() * 12;
        // 40% chance to switch to adjacent lane
        if (Math.random() < 0.4) {
          const shift = Math.random() > 0.5 ? 1 : -1;
          const newLane = v.currentLane + shift;
          if (newLane >= 0 && newLane < this.lanePositions.length) {
            v.targetLane = newLane;
          }
        }
      }

      // Smooth lane transition
      const targetX = this.lanePositions[v.targetLane];
      v.mesh.position.x += (targetX - v.mesh.position.x) * Math.min(1.0, delta * 2.0);
      if (Math.abs(v.mesh.position.x - targetX) < 0.05) {
        v.currentLane = v.targetLane;
      }

      // 3. Collision Check with Player
      const dx = Math.abs(playerPos.x - v.mesh.position.x);
      const dz = Math.abs(playerPos.z - v.mesh.position.z);

      const minX = playerCar.collider.halfWidth + v.collider.halfWidth;
      const minZ = playerCar.collider.halfLength + v.collider.halfLength;

      if (dx < minX && dz < minZ) {
        // Crash / Collision occurred!
        if (onCollision) {
          onCollision(v, {
            impactX: (playerPos.x + v.mesh.position.x) / 2,
            impactZ: (playerPos.z + v.mesh.position.z) / 2
          });
        }

        // Physical impulse reaction
        playerCar.speed *= 0.55; // Drop speed
        v.speed *= 0.7;
        // Bounce player sideways away from traffic car
        playerCar.mesh.position.x += (playerPos.x > v.mesh.position.x ? 1.2 : -1.2);
        playerCar.yaw += (playerPos.x > v.mesh.position.x ? 0.08 : -0.08);
      }

      // 4. Near-Miss Reward Check (Thrill factor!)
      // Must be overtaking at high speed (player faster than traffic), close pass (dx < 2.3m, dz < 3.2m), not already awarded
      if (!v.isNearMissAwarded && playerSpeed > 90.0 && playerPos.z > v.mesh.position.z) {
        if (dx < 2.3 && dz < 3.5 && (playerPos.z - v.mesh.position.z) < 3.5) {
          v.isNearMissAwarded = true;
          if (onNearMiss) {
            onNearMiss(v);
          }
        }
      }

      // 5. Recycle Traffic behind player or too far ahead
      if (v.mesh.position.z < playerPos.z - 45) {
        // Traffic was passed and is far behind -> respawn far ahead
        const furthestZ = this._getFurthestVehicleZ(playerPos.z);
        v.mesh.position.z = Math.max(playerPos.z + 140, furthestZ + 45 + Math.random() * 25);
        v.targetLane = Math.floor(Math.random() * this.lanePositions.length);
        v.currentLane = v.targetLane;
        v.mesh.position.x = this.lanePositions[v.currentLane];
        v.speed = 65 + Math.random() * 45;
        v.isNearMissAwarded = false;
      }
    }
  }

  _getFurthestVehicleZ(defaultZ) {
    let maxZ = defaultZ;
    this.vehicles.forEach(v => {
      if (v.mesh.position.z > maxZ) maxZ = v.mesh.position.z;
    });
    return maxZ;
  }
}
