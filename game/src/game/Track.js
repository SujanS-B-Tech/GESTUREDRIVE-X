/**
 * GESTUREDRIVE X - Procedural Highway, Scenery & Collectibles
 * 4-lane wet asphalt highway, cyberpunk skyscrapers, tunnels, streetlamps, coins, and nitro canisters
 */

import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;

    // Track Geometry Configuration
    this.segmentLength = 60;   // Length of one chunk in meters
    this.visibleSegments = 16; // Chunks kept ahead (~960m visible track)
    this.roadWidth = 18.0;     // 4 lanes (each 4.5m)
    this.lanePositions = [-6.75, -2.25, 2.25, 6.75]; // X coordinates of 4 lanes

    this.segments = [];
    this.coins = [];
    this.nitroCanisters = [];

    this.lastSpawnZ = 0;

    // Materials
    this._initMaterials();

    // Initial track generation ahead
    for (let i = 0; i < this.visibleSegments; i++) {
      this._spawnSegment(i * this.segmentLength);
    }
  }

  _initMaterials() {
    // Wet Dark Asphalt
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x12151c,
      roughness: 0.35,
      metalness: 0.15
    });

    // Dashed Lane Markings (White)
    this.markingMat = new THREE.MeshBasicMaterial({
      color: 0xddffff
    });

    // Outer Shoulder Line (Yellow)
    this.shoulderMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00
    });

    // Guardrail Barrier (Metallic Carbon)
    this.barrierMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      metalness: 0.8,
      roughness: 0.3
    });

    // Neon Barrier LED Strip (Cyan)
    this.neonStripMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    // Building Materials
    this.buildingMats = [
      new THREE.MeshStandardMaterial({ color: 0x0c111d, roughness: 0.6, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x111625, roughness: 0.5, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x090e18, roughness: 0.7, metalness: 0.3 })
    ];

    // Building Window Glows
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.windowPinkMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });

    // Collectible: Gold Coin
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x886600,
      emissiveIntensity: 0.5
    });

    // Collectible: Nitro Canister (Neon Blue)
    this.nitroMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      metalness: 0.8,
      roughness: 0.15,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8
    });
  }

  _spawnSegment(zPos) {
    const segment = new THREE.Group();
    segment.position.z = zPos;

    // 1. Road Surface (Asphalt)
    const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.position.y = 0.0;
    roadMesh.receiveShadow = true;
    segment.add(roadMesh);

    // 2. Dashed Lane Stripes (Between lanes 1-2, 2-3, 3-4)
    const stripePositionsX = [-4.5, 0.0, 4.5];
    const stripeCount = 4;
    const stripeLen = 6.0;
    const stripeGap = 9.0;

    stripePositionsX.forEach(x => {
      for (let s = 0; s < stripeCount; s++) {
        const stripeGeo = new THREE.PlaneGeometry(0.25, stripeLen);
        stripeGeo.rotateX(-Math.PI / 2);
        const stripe = new THREE.Mesh(stripeGeo, this.markingMat);
        stripe.position.set(x, 0.01, -this.segmentLength / 2 + s * (stripeLen + stripeGap) + stripeLen / 2);
        segment.add(stripe);
      }
    });

    // 3. Solid Yellow Shoulder Lines
    [-this.roadWidth / 2 + 0.35, this.roadWidth / 2 - 0.35].forEach(x => {
      const shoulderGeo = new THREE.PlaneGeometry(0.35, this.segmentLength);
      shoulderGeo.rotateX(-Math.PI / 2);
      const shoulder = new THREE.Mesh(shoulderGeo, this.shoulderMat);
      shoulder.position.set(x, 0.012, 0);
      segment.add(shoulder);
    });

    // 4. Guardrail Barriers with Glowing Neon Strips
    [-this.roadWidth / 2 - 0.3, this.roadWidth / 2 + 0.3].forEach((x, idx) => {
      const barrierGeo = new THREE.BoxGeometry(0.5, 0.75, this.segmentLength);
      const barrier = new THREE.Mesh(barrierGeo, this.barrierMat);
      barrier.position.set(x, 0.375, 0);
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      segment.add(barrier);

      // Embedded LED Neon Strip
      const stripGeo = new THREE.BoxGeometry(0.08, 0.08, this.segmentLength);
      const strip = new THREE.Mesh(stripGeo, this.neonStripMat);
      strip.position.set(x + (idx === 0 ? 0.22 : -0.22), 0.55, 0);
      segment.add(strip);
    });

    // 5. Overhead Highway Gantries / Streetlamps every 2 segments
    if (Math.round(zPos / this.segmentLength) % 2 === 0) {
      this._addHighwayGantry(segment);
    }

    // 6. Cyberpunk Roadside Skyscrapers & Silhouettes
    this._addBuildings(segment);

    // 7. Spawn Collectibles (Coins or Nitro Canisters)
    this._addPickups(segment, zPos);

    this.scene.add(segment);
    this.segments.push({ group: segment, z: zPos });
    this.lastSpawnZ = zPos;
  }

  _addHighwayGantry(segment) {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, 0);

    // Left and Right Truss Columns
    const colGeo = new THREE.BoxGeometry(0.6, 7.5, 0.6);
    const colL = new THREE.Mesh(colGeo, this.barrierMat);
    colL.position.set(-this.roadWidth / 2 - 1.2, 3.75, 0);
    const colR = new THREE.Mesh(colGeo, this.barrierMat);
    colR.position.set(this.roadWidth / 2 + 1.2, 3.75, 0);
    gantry.add(colL, colR);

    // Overhead Crossbeam
    const beamGeo = new THREE.BoxGeometry(this.roadWidth + 3.0, 0.8, 0.8);
    const beam = new THREE.Mesh(beamGeo, this.barrierMat);
    beam.position.set(0, 7.5, 0);
    gantry.add(beam);

    // Digital Electronic Overhead Display Sign
    const signGeo = new THREE.BoxGeometry(10.0, 1.8, 0.2);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x050914 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 7.0, -0.4);
    gantry.add(sign);

    // Neon Accent Border on Sign
    const signBorderGeo = new THREE.BoxGeometry(10.2, 0.08, 0.25);
    const borderTop = new THREE.Mesh(signBorderGeo, this.neonStripMat);
    borderTop.position.set(0, 7.95, -0.4);
    const borderBottom = new THREE.Mesh(signBorderGeo, this.neonStripMat);
    borderBottom.position.set(0, 6.05, -0.4);
    gantry.add(borderTop, borderBottom);

    segment.add(gantry);
  }

  _addBuildings(segment) {
    // Generate 3-5 skyscrapers on both left and right sides
    const sides = [-1, 1];
    sides.forEach(side => {
      const buildingCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < buildingCount; b++) {
        const w = 15 + Math.random() * 20;
        const h = 40 + Math.random() * 90;
        const d = 15 + Math.random() * 25;
        const xDist = (this.roadWidth / 2 + 12 + Math.random() * 25) * side;
        const zDist = (b - 1) * 25 + (Math.random() - 0.5) * 10;

        const bGeo = new THREE.BoxGeometry(w, h, d);
        const bMat = this.buildingMats[Math.floor(Math.random() * this.buildingMats.length)];
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(xDist, h / 2, zDist);
        segment.add(bMesh);

        // Neon roof antenna or edge
        if (Math.random() > 0.4) {
          const edgeGeo = new THREE.BoxGeometry(w * 0.9, 0.5, 0.5);
          const edgeMesh = new THREE.Mesh(edgeGeo, Math.random() > 0.5 ? this.windowMat : this.windowPinkMat);
          edgeMesh.position.set(xDist, h + 0.25, zDist);
          segment.add(edgeMesh);
        }
      }
    });
  }

  _addPickups(segment, zPos) {
    // 60% chance to spawn coins, 30% chance to spawn nitro canister
    const rand = Math.random();
    const laneX = this.lanePositions[Math.floor(Math.random() * this.lanePositions.length)];

    if (rand < 0.45) {
      // Spawn line of 3 coins
      for (let c = 0; c < 3; c++) {
        const coinGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.15, 16);
        coinGeo.rotateX(Math.PI / 2);
        const coin = new THREE.Mesh(coinGeo, this.coinMat);
        const localZ = -15 + c * 15;
        coin.position.set(laneX, 0.9, localZ);
        segment.add(coin);

        this.coins.push({
          mesh: coin,
          segment: segment,
          worldPos: new THREE.Vector3(laneX, 0.9, zPos + localZ),
          collected: false
        });
      }
    } else if (rand < 0.75) {
      // Spawn Glowing Nitro Canister
      const nitroGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16);
      const canister = new THREE.Mesh(nitroGeo, this.nitroMat);
      canister.position.set(laneX, 1.0, 0);
      segment.add(canister);

      this.nitroCanisters.push({
        mesh: canister,
        segment: segment,
        worldPos: new THREE.Vector3(laneX, 1.0, zPos),
        collected: false
      });
    }
  }

  reset() {
    // 1. Remove and deeply dispose all existing track segments
    this.segments.forEach(seg => {
      this.scene.remove(seg.group);
      this._disposeGroup(seg.group);
    });
    this.segments = [];

    // 2. Clear coins & nitro canisters
    this.coins.forEach(c => {
      if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
    });
    this.coins = [];

    this.nitroCanisters.forEach(n => {
      if (n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
    });
    this.nitroCanisters = [];

    // 3. Re-spawn initial clean track starting from Z = 0
    this.lastSpawnZ = 0;
    for (let i = 0; i < this.visibleSegments; i++) {
      this._spawnSegment(i * this.segmentLength);
    }
  }

  _disposeGroup(group) {
    if (!group) return;
    group.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.dispose();
      }
    });
  }

  update(playerZ) {
    // 1. Recycle track segments that fall behind player
    const recycleThreshold = playerZ - this.segmentLength * 2;

    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (seg.z < recycleThreshold) {
        // Deeply dispose GPU geometries to eliminate memory leaks
        this.scene.remove(seg.group);
        this._disposeGroup(seg.group);
        this.segments.splice(i, 1);

        // Spawn new segment ahead
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
      coin.mesh.rotation.y = now * 1.5;
      coin.mesh.position.y = 0.9 + Math.sin(now * 2.0) * 0.15;
      // Recycle if far behind
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
      canister.mesh.rotation.y = now * 2.2;
      canister.mesh.position.y = 1.0 + Math.cos(now * 2.5) * 0.2;
      if (canister.worldPos.z < recycleThreshold) {
        this.nitroCanisters.splice(i, 1);
      }
    }
  }

  checkBarrierCollision(car) {
    const carX = car.mesh.position.x;
    const limit = this.roadWidth / 2 - 1.2;

    if (carX > limit) {
      // Hit left barrier (+limit is on screen left)
      car.mesh.position.x = limit;
      car.speed *= 0.88; // Friction penalty
      car.yaw -= 0.05;   // Bounce inward toward center (-X)
      return { hit: true, side: 'left', x: limit };
    } else if (carX < -limit) {
      // Hit right barrier (-limit is on screen right)
      car.mesh.position.x = -limit;
      car.speed *= 0.88; // Friction penalty
      car.yaw += 0.05;   // Bounce inward toward center (+X)
      return { hit: true, side: 'right', x: -limit };
    }
    return { hit: false };
  }

  checkPickups(carPos, onCoinCollect, onNitroCollect) {
    const collectDist = 2.0;

    // Coins
    this.coins.forEach(coin => {
      if (!coin.collected && coin.worldPos.distanceTo(carPos) < collectDist) {
        coin.collected = true;
        if (onCoinCollect) onCoinCollect();
      }
    });

    // Nitro
    this.nitroCanisters.forEach(canister => {
      if (!canister.collected && canister.worldPos.distanceTo(carPos) < collectDist) {
        canister.collected = true;
        if (onNitroCollect) onNitroCollect();
      }
    });
  }
}
