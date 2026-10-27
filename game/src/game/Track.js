/**
 * GESTUREDRIVE X - Procedural Coastal Highway, Cityscape & Race Waypoints
 * High-performance pooled coastal expressway with Pacific Ocean water plane,
 * sandy beaches, sea cliffs, roadside palm trees, modern city skyscrapers,
 * mountain silhouettes, highway gantries, and checkpoint waypoint arches.
 * Zero-allocation chunk recycling to eliminate garbage collection stutters.
 */

import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;

    // Track Geometry Configuration
    this.segmentLength = 70.0; // Length of one chunk in meters
    this.visibleSegments = 16;  // Chunks kept active (~1120m visible track)
    this.roadWidth = 18.0;      // 4 lanes (each 4.5m wide)
    this.lanePositions = [-6.75, -2.25, 2.25, 6.75]; // X coordinates of the 4 lanes

    this.segments = [];
    this.coins = [];
    this.nitroCanisters = [];
    this.checkpoints = [];
    this.lastSpawnZ = 0;
    this.checkpointInterval = 6; // Checkpoint arch every 6 segments (~420m)
    this.currentCheckpointIndex = 1;

    // 1. Initialize Reusable Materials & Shared Geometries (ZERO per-frame GC allocation)
    this._initMaterials();
    this._initSharedGeometries();

    // 2. Initial track generation ahead of player
    for (let i = 0; i < this.visibleSegments; i++) {
      this._spawnSegment(i * this.segmentLength);
    }
  }

  _initMaterials() {
    // 1. Daylight Charcoal Grey PBR Asphalt
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x262a32,
      roughness: 0.62,
      metalness: 0.12
    });

    // 2. Road Markings (Crisp Clean White)
    this.markingMat = new THREE.MeshBasicMaterial({
      color: 0xf4f7ff
    });

    // 3. Safety Shoulder Line (Bright Highway Yellow)
    this.shoulderYellowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00
    });

    // 4. Solid Highway White Shoulder Line
    this.shoulderWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xf0f4fc
    });

    // 5. Heavy Concrete Barrier Base
    this.barrierConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x5a5e68,
      roughness: 0.75,
      metalness: 0.15
    });

    // 6. Steel W-Beam Guardrail (Galvanized Metal)
    this.barrierSteelMat = new THREE.MeshStandardMaterial({
      color: 0x9da4b0,
      roughness: 0.35,
      metalness: 0.85
    });

    // 7. Safety Reflector Strips (Precision Red & Amber)
    this.reflectorRedMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
    this.reflectorAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // 8. Coastal Pacific Ocean Water Plane
    this.oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0d4a78,
      roughness: 0.15,
      metalness: 0.82
    });

    // 9. Coastal Golden Sand Beach
    this.beachMat = new THREE.MeshStandardMaterial({
      color: 0xd8c292,
      roughness: 0.92,
      metalness: 0.05
    });

    // 10. Rocky Sea Cliffs & Outcrops
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x484238,
      roughness: 0.88,
      metalness: 0.10
    });

    // 11. Palm Tree Trunk & Fronds
    this.palmTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.85,
      metalness: 0.05
    });
    this.palmFrondMat = new THREE.MeshStandardMaterial({
      color: 0x2e6b22,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    // 12. Cityscape Architecture (Modern Glass & Concrete Towers)
    this.glassTowerMats = [
      new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.15, metalness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x2b3848, roughness: 0.25, metalness: 0.70 }),
      new THREE.MeshStandardMaterial({ color: 0x36485e, roughness: 0.20, metalness: 0.80 })
    ];
    this.concreteFrameMat = new THREE.MeshStandardMaterial({
      color: 0xced4dc,
      roughness: 0.65,
      metalness: 0.20
    });

    // 13. Rolling Mountain Ridges
    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x283a24,
      roughness: 0.95,
      metalness: 0.05
    });

    // 14. Checkpoint Waypoint Arches (Glowing Cyan & Red)
    this.checkpointArchMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.4,
      metalness: 0.8
    });
    this.checkpointGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });

    // 15. Collectibles: High-Tech Gold Coin & Crimson Nitro
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xaa7700,
      emissiveIntensity: 0.5
    });
    this.nitroMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff1133,
      emissiveIntensity: 0.8
    });
  }

  _initSharedGeometries() {
    // Road surface
    this.roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    this.roadGeo.rotateX(-Math.PI / 2);

    // Dashed lane stripes
    this.stripeGeo = new THREE.PlaneGeometry(0.28, 6.5);
    this.stripeGeo.rotateX(-Math.PI / 2);

    // Shoulder stripes
    this.shoulderGeo = new THREE.PlaneGeometry(0.35, this.segmentLength);
    this.shoulderGeo.rotateX(-Math.PI / 2);

    // Dual-Layer Guardrail: Concrete Base + Steel W-Beam
    this.barrierBaseGeo = new THREE.BoxGeometry(0.55, 0.45, this.segmentLength);
    this.barrierSteelGeo = new THREE.BoxGeometry(0.22, 0.40, this.segmentLength);
    this.reflectorGeo = new THREE.BoxGeometry(0.08, 0.12, 0.40);

    // Ocean Water Plane (Left Side: spans from x = -12 to x = -220)
    this.oceanGeo = new THREE.PlaneGeometry(210, this.segmentLength);
    this.oceanGeo.rotateX(-Math.PI / 2);

    // Sandy Shoreline Ribbon (Left Side: x = -10 to x = -26)
    this.beachGeo = new THREE.PlaneGeometry(16, this.segmentLength);
    this.beachGeo.rotateX(-Math.PI / 2);

    // Sea Cliff Rock Outcrops
    this.cliffGeo = new THREE.ConeGeometry(5.5, 7.0, 5);
    this.cliffGeo.rotateX(-Math.PI / 2);

    // Palm Tree Geometries
    this.palmTrunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 5.5, 7);
    this.palmFrondGeo = new THREE.ConeGeometry(2.4, 0.8, 6);

    // Highway Gantry Truss
    this.gantryColGeo = new THREE.BoxGeometry(0.65, 8.5, 0.65);
    this.gantryBeamGeo = new THREE.BoxGeometry(this.roadWidth + 3.6, 0.85, 0.85);
    this.gantrySignGeo = new THREE.BoxGeometry(11.5, 2.0, 0.2);

    // Checkpoint Gate Waypoint Geometry
    this.checkpointColGeo = new THREE.BoxGeometry(0.75, 9.5, 0.75);
    this.checkpointBeamGeo = new THREE.BoxGeometry(this.roadWidth + 2.0, 1.2, 1.0);
    this.checkpointBannerGeo = new THREE.PlaneGeometry(10.0, 1.6);

    // Collectibles
    this.coinGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 16);
    this.coinGeo.rotateZ(Math.PI / 2);
    this.canisterGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 14);

    // City Skyscraper Geometries
    this.buildingGeos = [
      new THREE.BoxGeometry(18, 70, 22),
      new THREE.BoxGeometry(22, 105, 26),
      new THREE.BoxGeometry(16, 55, 18),
      new THREE.BoxGeometry(24, 130, 28)
    ];

    // Mountain Ridges
    this.mountainGeo = new THREE.ConeGeometry(40, 55, 6);
  }

  _spawnSegment(zPos) {
    const segment = new THREE.Group();
    segment.position.z = zPos;
    const segIndex = Math.round(zPos / this.segmentLength);

    // 1. Road Surface (Asphalt)
    const roadMesh = new THREE.Mesh(this.roadGeo, this.asphaltMat);
    roadMesh.position.y = 0.0;
    roadMesh.receiveShadow = true;
    segment.add(roadMesh);

    // 2. Dashed Lane Markings (Between lanes 1-2, 2-3, 3-4)
    const stripePositionsX = [-4.5, 0.0, 4.5];
    const stripeCount = 4;
    const stripeLen = 6.5;
    const stripeGap = 11.0;

    stripePositionsX.forEach(x => {
      for (let s = 0; s < stripeCount; s++) {
        const stripe = new THREE.Mesh(this.stripeGeo, this.markingMat);
        stripe.position.set(x, 0.012, -this.segmentLength / 2 + s * (stripeLen + stripeGap) + stripeLen / 2);
        segment.add(stripe);
      }
    });

    // 3. Safety Shoulders (Left: Solid Yellow; Right: Solid White)
    const shoulderL = new THREE.Mesh(this.shoulderGeo, this.shoulderYellowMat);
    shoulderL.position.set(-this.roadWidth / 2 + 0.35, 0.015, 0);
    const shoulderR = new THREE.Mesh(this.shoulderGeo, this.shoulderWhiteMat);
    shoulderR.position.set(this.roadWidth / 2 - 0.35, 0.015, 0);
    segment.add(shoulderL, shoulderR);

    // 4. Guardrails (Left and Right)
    [-this.roadWidth / 2 - 0.35, this.roadWidth / 2 + 0.35].forEach((x, idx) => {
      // Concrete Base
      const base = new THREE.Mesh(this.barrierBaseGeo, this.barrierConcreteMat);
      base.position.set(x, 0.225, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      segment.add(base);

      // Galvanized Steel W-Beam
      const steel = new THREE.Mesh(this.barrierSteelGeo, this.barrierSteelMat);
      steel.position.set(x + (idx === 0 ? 0.15 : -0.15), 0.65, 0);
      steel.castShadow = true;
      segment.add(steel);

      // Reflectors spaced every 15 meters
      for (let r = -25; r <= 25; r += 15) {
        const refl = new THREE.Mesh(this.reflectorGeo, idx === 0 ? this.reflectorAmberMat : this.reflectorRedMat);
        refl.position.set(x + (idx === 0 ? 0.25 : -0.25), 0.65, r);
        segment.add(refl);
      }
    });

    // 5. Left Side: Pacific Ocean Water Plane & Sandy Beach
    const ocean = new THREE.Mesh(this.oceanGeo, this.oceanMat);
    ocean.position.set(-118, -1.2, 0);
    segment.add(ocean);

    const beach = new THREE.Mesh(this.beachGeo, this.beachMat);
    beach.position.set(-18, -0.6, 0);
    segment.add(beach);

    // Roadside Palm Trees along Coastal Promenade (Left side)
    if (segIndex % 2 === 0) {
      this._addPalmTree(segment, -this.roadWidth / 2 - 2.8, -12);
      this._addPalmTree(segment, -this.roadWidth / 2 - 2.8, 18);
    }

    // Coastal Sea Cliffs along the beach
    if (segIndex % 3 === 0) {
      const cliff = new THREE.Mesh(this.cliffGeo, this.cliffMat);
      cliff.position.set(-32 - (segIndex % 4) * 5, 2.5, 0);
      cliff.scale.set(1.5, 1.8, 1.5);
      segment.add(cliff);
    }

    // 6. Right Side: Modern Coastal City & Mountain Backdrop
    this._addCityscape(segment, segIndex);

    // 7. Checkpoint Waypoint Gate or Highway Gantry
    if (segIndex > 0 && segIndex % this.checkpointInterval === 0) {
      this._addCheckpointGate(segment, zPos, Math.floor(segIndex / this.checkpointInterval));
    } else if (segIndex % 3 === 0) {
      this._addHighwayGantry(segment);
    }

    // 8. Collectibles (Coins & Nitro Canisters)
    this._addPickups(segment, zPos);

    this.scene.add(segment);
    this.segments.push({ group: segment, z: zPos });
    this.lastSpawnZ = zPos;
  }

  _addPalmTree(segment, x, z) {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);

    // Trunk with slight natural curve
    const trunk = new THREE.Mesh(this.palmTrunkGeo, this.palmTrunkMat);
    trunk.position.set(0, 2.75, 0);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    palm.add(trunk);

    // Foliage Crown (Layered Fronds)
    const crown = new THREE.Mesh(this.palmFrondGeo, this.palmFrondMat);
    crown.position.set(0, 5.5, 0);
    crown.scale.set(1.4, 1.2, 1.4);
    crown.castShadow = true;
    palm.add(crown);

    segment.add(palm);
  }

  _addCityscape(segment, segIndex) {
    // High-Rise Buildings on Right side (x > +25)
    const bldgCount = 2;
    for (let b = 0; b < bldgCount; b++) {
      const geo = this.buildingGeos[(segIndex + b) % this.buildingGeos.length];
      const mat = this.glassTowerMats[(segIndex + b) % this.glassTowerMats.length];
      const building = new THREE.Mesh(geo, mat);

      const distFromRoad = this.roadWidth / 2 + 18 + b * 22;
      const xPos = distFromRoad;
      const zOffset = (b === 0 ? -16 : 18);

      building.position.set(xPos, geo.parameters.height / 2 - 2, zOffset);
      building.castShadow = true;
      building.receiveShadow = true;
      segment.add(building);
    }

    // Mountain Backdrop Ridge in far distance (x > +90)
    if (segIndex % 2 === 0) {
      const mountain = new THREE.Mesh(this.mountainGeo, this.mountainMat);
      mountain.position.set(110 + (segIndex % 3) * 15, 20, 0);
      mountain.scale.set(1.8, 1.6, 1.8);
      segment.add(mountain);
    }
  }

  _addHighwayGantry(segment) {
    const gantry = new THREE.Group();

    // Steel Support Columns
    const colL = new THREE.Mesh(this.gantryColGeo, this.barrierSteelMat);
    colL.position.set(-this.roadWidth / 2 - 1.5, 4.25, 0);
    const colR = new THREE.Mesh(this.gantryColGeo, this.barrierSteelMat);
    colR.position.set(this.roadWidth / 2 + 1.5, 4.25, 0);
    gantry.add(colL, colR);

    // Crossbeam
    const beam = new THREE.Mesh(this.gantryBeamGeo, this.barrierSteelMat);
    beam.position.set(0, 8.5, 0);
    gantry.add(beam);

    // Green Highway Directional Signboard
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x114422,
      roughness: 0.35,
      metalness: 0.25
    });
    const sign = new THREE.Mesh(this.gantrySignGeo, signMat);
    sign.position.set(0, 7.8, -0.4);
    gantry.add(sign);

    segment.add(gantry);
  }

  _addCheckpointGate(segment, zPos, checkpointNumber) {
    const gate = new THREE.Group();

    // Arch Pillars
    const colL = new THREE.Mesh(this.checkpointColGeo, this.checkpointArchMat);
    colL.position.set(-this.roadWidth / 2 - 1.2, 4.75, 0);
    const colR = new THREE.Mesh(this.checkpointColGeo, this.checkpointArchMat);
    colR.position.set(this.roadWidth / 2 + 1.2, 4.75, 0);
    gate.add(colL, colR);

    // Arch Beam
    const beam = new THREE.Mesh(this.checkpointBeamGeo, this.checkpointArchMat);
    beam.position.set(0, 9.2, 0);
    gate.add(beam);

    // Glowing Waypoint Banner
    const banner = new THREE.Mesh(this.checkpointBannerGeo, this.checkpointGlowMat);
    banner.position.set(0, 8.8, -0.1);
    gate.add(banner);

    segment.add(gate);

    // Register active checkpoint
    this.checkpoints.push({
      index: checkpointNumber,
      z: zPos,
      passed: false
    });
  }

  _addPickups(segment, zPos) {
    // 35% chance to spawn an item in one of the lanes
    if (Math.random() < 0.38) {
      const laneIdx = Math.floor(Math.random() * this.lanePositions.length);
      const laneX = this.lanePositions[laneIdx];
      const isNitro = Math.random() < 0.28;

      if (isNitro) {
        const canister = new THREE.Mesh(this.canisterGeo, this.nitroMat);
        canister.position.set(laneX, 1.1, 0);
        segment.add(canister);
        this.nitroCanisters.push({
          mesh: canister,
          worldPos: new THREE.Vector3(laneX, 1.1, zPos),
          collected: false
        });
      } else {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.set(laneX, 1.0, 0);
        segment.add(coin);
        this.coins.push({
          mesh: coin,
          worldPos: new THREE.Vector3(laneX, 1.0, zPos),
          collected: false
        });
      }
    }
  }

  reset() {
    this.segments.forEach(s => this.scene.remove(s.group));
    this.segments = [];

    this.coins.forEach(c => {
      if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
    });
    this.coins = [];

    this.nitroCanisters.forEach(n => {
      if (n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
    });
    this.nitroCanisters = [];
    this.checkpoints = [];

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
        this.scene.remove(seg.group);
        this.segments.splice(i, 1);
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
      coin.mesh.position.y = 0.95 + Math.sin(now * 2.2) * 0.12;

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
      canister.mesh.position.y = 1.05 + Math.cos(now * 2.8) * 0.15;

      if (canister.worldPos.z < recycleThreshold) {
        this.nitroCanisters.splice(i, 1);
      }
    }
  }

  checkBarrierCollision(car, delta = 0.016) {
    const carX = car.mesh.position.x;
    const limit = this.roadWidth / 2 - 1.25;

    if (carX > limit) {
      // Smooth contact with left barrier: clamp position, align yaw parallel to road (0 rad)
      car.mesh.position.x = limit;
      car.touchingBarrier = 'left';
      car.yaw += (0 - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(25.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
      return { hit: true, side: 'left', x: limit };
    } else if (carX < -limit) {
      // Smooth contact with right barrier
      car.mesh.position.x = -limit;
      car.touchingBarrier = 'right';
      car.yaw += (0 - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(25.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
      return { hit: true, side: 'right', x: -limit };
    }
    car.touchingBarrier = null;
    return { hit: false };
  }

  checkCheckpoints(carPos, onCheckpointCrossed) {
    for (const cp of this.checkpoints) {
      if (!cp.passed && carPos.z >= cp.z) {
        cp.passed = true;
        if (onCheckpointCrossed) onCheckpointCrossed(cp);
      }
    }
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
