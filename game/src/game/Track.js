/**
 * GESTUREDRIVE X - Procedural Highway, Scenery & Collectibles
 * High-performance pooled 4-lane highway with wet asphalt reflections,
 * red-accented neon barriers, overhead digital gantries, cityscape silhouettes,
 * and zero-allocation chunk recycling to eliminate garbage collection stutter.
 */

import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;

    // Track Geometry Configuration
    this.segmentLength = 65.0; // Length of one chunk in meters
    this.visibleSegments = 16;  // Chunks kept active (~1040m visible track)
    this.roadWidth = 18.0;      // 4 lanes (each 4.5m wide)
    this.lanePositions = [-6.75, -2.25, 2.25, 6.75]; // X coordinates of the 4 lanes

    this.segments = [];
    this.coins = [];
    this.nitroCanisters = [];
    this.lastSpawnZ = 0;

    // 1. Initialize Reusable Materials & Shared Geometries (ZERO per-frame allocation)
    this._initMaterials();
    this._initSharedGeometries();

    // 2. Initial track generation ahead of player
    for (let i = 0; i < this.visibleSegments; i++) {
      this._spawnSegment(i * this.segmentLength);
    }
  }

  _initMaterials() {
    // Wet Dark Asphalt with high specular clearcoat
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      roughness: 0.28,
      metalness: 0.35
    });

    // Dashed Lane Markings (Clean Racing White)
    this.markingMat = new THREE.MeshBasicMaterial({
      color: 0xeef2ff
    });

    // Outer Shoulder Line (Precision Red / Amber Warning)
    this.shoulderMat = new THREE.MeshBasicMaterial({
      color: 0xff1133
    });

    // Guardrail Barrier (Matte Dark Carbon)
    this.barrierMat = new THREE.MeshStandardMaterial({
      color: 0x161820,
      metalness: 0.85,
      roughness: 0.25
    });

    // Neon Barrier LED Strip (Precision Racing Red)
    this.neonStripRedMat = new THREE.MeshBasicMaterial({
      color: 0xff1133
    });

    // Gantry LED Accent (Bright White)
    this.neonStripWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    // Distant City Skyscrapers
    this.buildingMats = [
      new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.8, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x0d101a, roughness: 0.7, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 0.9, metalness: 0.2 })
    ];

    // Building Window Illumination (Warm Amber & Restrained Red)
    this.windowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    this.windowRedMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });

    // Collectible: High-Tech Gold Coin
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xaa7700,
      emissiveIntensity: 0.6
    });

    // Collectible: Nitro Canister (Crimson Racing Plasma)
    this.nitroMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff1133,
      emissiveIntensity: 0.9
    });
  }

  _initSharedGeometries() {
    // Road surface geometry
    this.roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    this.roadGeo.rotateX(-Math.PI / 2);

    // Dashed stripe geometry
    this.stripeGeo = new THREE.PlaneGeometry(0.28, 6.5);
    this.stripeGeo.rotateX(-Math.PI / 2);

    // Shoulder stripe geometry
    this.shoulderGeo = new THREE.PlaneGeometry(0.35, this.segmentLength);
    this.shoulderGeo.rotateX(-Math.PI / 2);

    // Barrier block geometry
    this.barrierGeo = new THREE.BoxGeometry(0.55, 0.85, this.segmentLength);

    // Neon LED strip geometry
    this.stripGeo = new THREE.BoxGeometry(0.08, 0.08, this.segmentLength);

    // Gantry truss geometries
    this.gantryColGeo = new THREE.BoxGeometry(0.65, 8.0, 0.65);
    this.gantryBeamGeo = new THREE.BoxGeometry(this.roadWidth + 3.2, 0.8, 0.8);
    this.gantrySignGeo = new THREE.BoxGeometry(11.0, 1.8, 0.2);
    this.gantrySignBorderGeo = new THREE.BoxGeometry(11.2, 0.08, 0.25);

    // Coin & Canister geometries
    this.coinGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 16);
    this.coinGeo.rotateZ(Math.PI / 2);
    this.canisterGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 14);

    // Building box geometries pool
    this.buildingGeos = [
      new THREE.BoxGeometry(16, 65, 20),
      new THREE.BoxGeometry(20, 95, 24),
      new THREE.BoxGeometry(14, 50, 16),
      new THREE.BoxGeometry(22, 120, 26)
    ];
  }

  _spawnSegment(zPos) {
    const segment = new THREE.Group();
    segment.position.z = zPos;

    // 1. Road Surface (Asphalt)
    const roadMesh = new THREE.Mesh(this.roadGeo, this.asphaltMat);
    roadMesh.position.y = 0.0;
    roadMesh.receiveShadow = true;
    segment.add(roadMesh);

    // 2. Dashed Lane Markings (Between lanes 1-2, 2-3, 3-4)
    const stripePositionsX = [-4.5, 0.0, 4.5];
    const stripeCount = 4;
    const stripeLen = 6.5;
    const stripeGap = 9.75;

    stripePositionsX.forEach(x => {
      for (let s = 0; s < stripeCount; s++) {
        const stripe = new THREE.Mesh(this.stripeGeo, this.markingMat);
        stripe.position.set(x, 0.012, -this.segmentLength / 2 + s * (stripeLen + stripeGap) + stripeLen / 2);
        segment.add(stripe);
      }
    });

    // 3. Solid Precision Red Shoulder Lines
    [-this.roadWidth / 2 + 0.35, this.roadWidth / 2 - 0.35].forEach(x => {
      const shoulder = new THREE.Mesh(this.shoulderGeo, this.shoulderMat);
      shoulder.position.set(x, 0.015, 0);
      segment.add(shoulder);
    });

    // 4. Heavy Carbon Guardrails with Glowing Red LED Strips
    [-this.roadWidth / 2 - 0.3, this.roadWidth / 2 + 0.3].forEach((x, idx) => {
      const barrier = new THREE.Mesh(this.barrierGeo, this.barrierMat);
      barrier.position.set(x, 0.425, 0);
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      segment.add(barrier);

      // Embedded LED Neon Strip
      const strip = new THREE.Mesh(this.stripGeo, this.neonStripRedMat);
      strip.position.set(x + (idx === 0 ? 0.25 : -0.25), 0.60, 0);
      segment.add(strip);
    });

    // 5. Overhead Highway Gantries every 2 segments
    if (Math.round(zPos / this.segmentLength) % 2 === 0) {
      this._addHighwayGantry(segment);
    }

    // 6. Cityscape Architecture
    this._addBuildings(segment);

    // 7. Pickups (Coins or Nitro Canisters)
    this._addPickups(segment, zPos);

    this.scene.add(segment);
    this.segments.push({ group: segment, z: zPos });
    this.lastSpawnZ = zPos;
  }

  _addHighwayGantry(segment) {
    const gantry = new THREE.Group();

    // Columns
    const colL = new THREE.Mesh(this.gantryColGeo, this.barrierMat);
    colL.position.set(-this.roadWidth / 2 - 1.4, 4.0, 0);
    const colR = new THREE.Mesh(this.gantryColGeo, this.barrierMat);
    colR.position.set(this.roadWidth / 2 + 1.4, 4.0, 0);
    gantry.add(colL, colR);

    // Crossbeam
    const beam = new THREE.Mesh(this.gantryBeamGeo, this.barrierMat);
    beam.position.set(0, 8.0, 0);
    gantry.add(beam);

    // Digital Signboard
    const sign = new THREE.Mesh(this.gantrySignGeo, this.asphaltMat);
    sign.position.set(0, 7.3, -0.4);
    gantry.add(sign);

    // Red Accent Border
    const borderTop = new THREE.Mesh(this.gantrySignBorderGeo, this.neonStripRedMat);
    borderTop.position.set(0, 8.25, -0.4);
    const borderBottom = new THREE.Mesh(this.gantrySignBorderGeo, this.neonStripWhiteMat);
    borderBottom.position.set(0, 6.35, -0.4);
    gantry.add(borderTop, borderBottom);

    segment.add(gantry);
  }

  _addBuildings(segment) {
    const sides = [-1, 1];
    sides.forEach(side => {
      const bldgCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < bldgCount; b++) {
        const geo = this.buildingGeos[Math.floor(Math.random() * this.buildingGeos.length)];
        const mat = this.buildingMats[Math.floor(Math.random() * this.buildingMats.length)];
        const building = new THREE.Mesh(geo, mat);

        const distFromRoad = this.roadWidth / 2 + 18 + Math.random() * 22;
        const xPos = side * distFromRoad;
        const zOffset = (Math.random() - 0.5) * this.segmentLength * 0.8;

        building.position.set(xPos, geo.parameters.height / 2 - 2, zOffset);
        segment.add(building);
      }
    });
  }

  _addPickups(segment, zPos) {
    // 35% chance to spawn an item in one of the lanes
    if (Math.random() < 0.35) {
      const laneIdx = Math.floor(Math.random() * this.lanePositions.length);
      const laneX = this.lanePositions[laneIdx];
      const zOffset = (Math.random() - 0.5) * (this.segmentLength * 0.6);
      const isNitro = Math.random() < 0.25; // 25% nitro, 75% coins

      if (isNitro) {
        const canister = new THREE.Mesh(this.canisterGeo, this.nitroMat);
        canister.position.set(laneX, 1.0, zOffset);
        segment.add(canister);
        this.nitroCanisters.push({
          mesh: canister,
          worldPos: new THREE.Vector3(laneX, 1.0, zPos + zOffset),
          collected: false
        });
      } else {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.set(laneX, 0.9, zOffset);
        segment.add(coin);
        this.coins.push({
          mesh: coin,
          worldPos: new THREE.Vector3(laneX, 0.9, zPos + zOffset),
          collected: false
        });
      }
    }
  }

  reset() {
    this.segments.forEach(s => {
      this.scene.remove(s.group);
    });
    this.segments = [];

    this.coins.forEach(c => {
      if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
    });
    this.coins = [];

    this.nitroCanisters.forEach(n => {
      if (n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
    });
    this.nitroCanisters = [];

    this.lastSpawnZ = 0;
    for (let i = 0; i < this.visibleSegments; i++) {
      this._spawnSegment(i * this.segmentLength);
    }
  }

  update(playerZ) {
    // 1. Recycle track segments that fall behind player
    const recycleThreshold = playerZ - this.segmentLength * 2;

    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (seg.z < recycleThreshold) {
        // Remove segment and reposition forward without garbage collection
        this.scene.remove(seg.group);
        this.segments.splice(i, 1);

        // Spawn new segment ahead seamlessly
        this._spawnSegment(this.lastSpawnZ + this.segmentLength);
      }
    }

    // 2. Animate and rotate coins
    const now = performance.now() * 0.003;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (coin.collected) {
        if (coin.mesh.parent) coin.mesh.parent.remove(coin.mesh);
        this.coins.splice(i, 1);
        continue;
      }
      coin.mesh.rotation.y = now * 1.8;
      coin.mesh.position.y = 0.9 + Math.sin(now * 2.2) * 0.12;

      if (coin.worldPos.z < recycleThreshold) {
        this.coins.splice(i, 1);
      }
    }

    // 3. Animate and rotate nitro canisters
    for (let i = this.nitroCanisters.length - 1; i >= 0; i--) {
      const canister = this.nitroCanisters[i];
      if (canister.collected) {
        if (canister.mesh.parent) canister.mesh.parent.remove(canister.mesh);
        this.nitroCanisters.splice(i, 1);
        continue;
      }
      canister.mesh.rotation.y = now * 2.5;
      canister.mesh.position.y = 1.0 + Math.cos(now * 2.8) * 0.15;

      if (canister.worldPos.z < recycleThreshold) {
        this.nitroCanisters.splice(i, 1);
      }
    }
  }

  checkBarrierCollision(car) {
    const carX = car.mesh.position.x;
    const limit = this.roadWidth / 2 - 1.25;

    if (carX > limit) {
      // Hit left barrier
      car.mesh.position.x = limit;
      car.speed *= 0.88;
      car.yaw -= 0.06;
      return { hit: true, side: 'left', x: limit };
    } else if (carX < -limit) {
      // Hit right barrier
      car.mesh.position.x = -limit;
      car.speed *= 0.88;
      car.yaw += 0.06;
      return { hit: true, side: 'right', x: -limit };
    }
    return { hit: false };
  }

  checkPickups(carPos, onCoinCollect, onNitroCollect) {
    const collectDist = 2.2;

    this.coins.forEach(coin => {
      if (!coin.collected && coin.worldPos.distanceTo(carPos) < collectDist) {
        coin.collected = true;
        if (onCoinCollect) onCoinCollect();
      }
    });

    this.nitroCanisters.forEach(canister => {
      if (!canister.collected && canister.worldPos.distanceTo(carPos) < collectDist) {
        canister.collected = true;
        if (onNitroCollect) onNitroCollect();
      }
    });
  }
}
