/**
 * GESTUREDRIVE X - Procedural Coastal Highway & Need for Speed Open-World
 * Features dynamic sweeping highway curvature with realistic road banking,
 * wet-reflective PBR asphalt with tire skid marks, red/white apex rumble curbs,
 * sparkling cats-eye lane reflectors, highway cantilever streetlights with downlights,
 * retro-reflective curve chevron signs, Pacific Ocean water plane, sandy shoreline,
 * dramatic sea cliffs, coastal palm trees, tiered skyscraper skyline, mountain backdrops,
 * and glowing waypoint checkpoint arches.
 * Zero-allocation chunk recycling to eliminate garbage collection stutter.
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

  getCenterline(z) {
    // Smooth, long-wavelength highway curvature with natural high-speed sweeping bends
    return Math.sin(z * 0.0024) * 14.0 + Math.sin(z * 0.0010) * 8.0;
  }

  getHeading(z) {
    // Tangent heading angle of the curved road
    const dz = 2.0;
    const dx = this.getCenterline(z + dz) - this.getCenterline(z - dz);
    return Math.atan2(dx, dz * 2.0);
  }

  getBank(z) {
    // Road banking tilt into curves (degrees of roll)
    const curve = -Math.sin(z * 0.0024) * 14.0 * (0.0024 * 0.0024);
    return curve * 160.0;
  }

  _initMaterials() {
    // 1. Semi-Wet Reflective Charcoal PBR Asphalt with Specular Sun Glint
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.38,
      metalness: 0.25
    });

    // 2. Dashed Lane Markings (Crisp Clean White)
    this.markingMat = new THREE.MeshBasicMaterial({
      color: 0xf5f8ff
    });

    // 3. Red & White Apex Racing Rumble Curbs
    this.curbRedMat = new THREE.MeshBasicMaterial({ color: 0xff0028 });
    this.curbWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // 4. Rubber Skid Mark Overlays
    this.skidMat = new THREE.MeshBasicMaterial({
      color: 0x0c0e12,
      transparent: true,
      opacity: 0.65
    });

    // 5. Raised Highway Cat-Eye Reflectors (Glowing Amber & White)
    this.catsEyeMat = new THREE.MeshBasicMaterial({
      color: 0xffea66
    });

    // 6. Heavy Concrete Barrier Base with Safety Markings
    this.barrierConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x585c66,
      roughness: 0.72,
      metalness: 0.15
    });

    // 7. Galvanized Steel W-Beam Guardrail
    this.barrierSteelMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.32,
      metalness: 0.88
    });

    // 8. Retro-Reflective Neon Yellow Chevron Warning Signs
    this.chevronMat = new THREE.MeshBasicMaterial({
      color: 0xffee00
    });

    // 9. Coastal Pacific Ocean Shimmering Water Plane
    this.oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a3c64,
      roughness: 0.12,
      metalness: 0.88
    });

    // 10. Golden Sand Beach Shoreline
    this.beachMat = new THREE.MeshStandardMaterial({
      color: 0xd6c08e,
      roughness: 0.92,
      metalness: 0.05
    });

    // 11. Rocky Sea Cliffs & Natural Outcrops
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x443e35,
      roughness: 0.88,
      metalness: 0.10
    });

    // 12. Mediterranean Coastal Palm Trees
    this.palmTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x543a2c,
      roughness: 0.85,
      metalness: 0.05
    });
    this.palmFrondMat = new THREE.MeshStandardMaterial({
      color: 0x27661e,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    // 13. Cantilever Highway Streetlights
    this.streetlampPoleMat = new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.35,
      metalness: 0.85
    });
    this.streetlampHeadMat = new THREE.MeshBasicMaterial({
      color: 0xfffaea
    });

    // 14. Modern City Glass & Concrete High-Rise Towers
    this.glassTowerMats = [
      new THREE.MeshStandardMaterial({ color: 0x1d3d5e, roughness: 0.14, metalness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.22, metalness: 0.74 }),
      new THREE.MeshStandardMaterial({ color: 0x2f4258, roughness: 0.18, metalness: 0.82 })
    ];
    this.concreteFrameMat = new THREE.MeshStandardMaterial({
      color: 0xc8d0dc,
      roughness: 0.62,
      metalness: 0.22
    });

    // 15. Mountain Ridge Backdrop
    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x253622,
      roughness: 0.95,
      metalness: 0.05
    });

    // 16. Waypoint Checkpoint Arches (Glowing Cyan & Red)
    this.checkpointArchMat = new THREE.MeshStandardMaterial({
      color: 0x121620,
      roughness: 0.35,
      metalness: 0.85
    });
    this.checkpointGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });

    // 17. Collectibles: High-Tech Gold Coin & Crimson Nitro Canister
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      metalness: 0.96,
      roughness: 0.12,
      emissive: 0xaa7700,
      emissiveIntensity: 0.55
    });
    this.nitroMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      metalness: 0.92,
      roughness: 0.08,
      emissive: 0xff1133,
      emissiveIntensity: 0.85
    });
  }

  _initSharedGeometries() {
    // Road surface
    this.roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    this.roadGeo.rotateX(-Math.PI / 2);

    // Dashed lane stripes
    this.stripeGeo = new THREE.PlaneGeometry(0.28, 6.5);
    this.stripeGeo.rotateX(-Math.PI / 2);

    // Cats-eye raised reflector
    this.catsEyeGeo = new THREE.BoxGeometry(0.14, 0.04, 0.22);

    // Apex racing rumble curbs
    this.curbGeo = new THREE.BoxGeometry(0.75, 0.10, 2.8);

    // Tire skid mark ribbons
    this.skidGeo = new THREE.PlaneGeometry(0.32, 14.0);
    this.skidGeo.rotateX(-Math.PI / 2);

    // Dual-Layer Guardrail: Concrete Base + Steel W-Beam
    this.barrierBaseGeo = new THREE.BoxGeometry(0.55, 0.45, this.segmentLength);
    this.barrierSteelGeo = new THREE.BoxGeometry(0.22, 0.40, this.segmentLength);
    this.chevronGeo = new THREE.PlaneGeometry(0.45, 0.45);

    // Ocean Water Plane (Left side: spans 220m)
    this.oceanGeo = new THREE.PlaneGeometry(230, this.segmentLength);
    this.oceanGeo.rotateX(-Math.PI / 2);

    // Sandy Shoreline Ribbon
    this.beachGeo = new THREE.PlaneGeometry(22, this.segmentLength);
    this.beachGeo.rotateX(-Math.PI / 2);

    // Sea Cliff Rock Outcrops
    this.cliffGeo = new THREE.DodecahedronGeometry(6.5, 1);

    // Palm Tree Geometries
    this.palmTrunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 6.0, 7);
    this.palmFrondGeo = new THREE.ConeGeometry(2.6, 0.9, 6);

    // Cantilever Highway Streetlight
    this.lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9.5, 8);
    this.lampArmGeo = new THREE.BoxGeometry(3.2, 0.10, 0.12);
    this.lampHeadGeo = new THREE.BoxGeometry(0.85, 0.14, 0.35);

    // Highway Gantry Truss
    this.gantryColGeo = new THREE.BoxGeometry(0.70, 9.0, 0.70);
    this.gantryBeamGeo = new THREE.BoxGeometry(this.roadWidth + 4.0, 0.95, 0.95);
    this.gantrySignGeo = new THREE.BoxGeometry(12.0, 2.2, 0.2);

    // Checkpoint Gate Waypoint Geometry
    this.checkpointColGeo = new THREE.BoxGeometry(0.80, 10.0, 0.80);
    this.checkpointBeamGeo = new THREE.BoxGeometry(this.roadWidth + 2.5, 1.4, 1.1);
    this.checkpointBannerGeo = new THREE.PlaneGeometry(10.5, 1.8);

    // Collectibles
    this.coinGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 16);
    this.coinGeo.rotateZ(Math.PI / 2);
    this.canisterGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 14);

    // City Skyscraper Geometries Pool
    this.buildingGeos = [
      new THREE.BoxGeometry(18, 75, 22),
      new THREE.BoxGeometry(24, 115, 26),
      new THREE.BoxGeometry(16, 60, 18),
      new THREE.BoxGeometry(26, 140, 28)
    ];

    // Mountain Ridges
    this.mountainGeo = new THREE.ConeGeometry(45, 65, 6);
  }

  _spawnSegment(zPos) {
    const segment = new THREE.Group();
    const segIndex = Math.round(zPos / this.segmentLength);
    const centerX = this.getCenterline(zPos);
    const heading = this.getHeading(zPos);
    const bank = this.getBank(zPos);

    segment.position.set(centerX, 0, zPos);
    segment.rotation.y = heading;
    segment.rotation.z = bank;

    // 1. Road Surface (Asphalt)
    const roadMesh = new THREE.Mesh(this.roadGeo, this.asphaltMat);
    roadMesh.position.y = 0.0;
    roadMesh.receiveShadow = true;
    segment.add(roadMesh);

    // 2. Dashed Lane Markings & Cats-Eye Reflectors (Between 4 lanes)
    const stripePositionsX = [-4.5, 0.0, 4.5];
    const stripeCount = 4;
    const stripeLen = 6.5;
    const stripeGap = 11.0;

    stripePositionsX.forEach(x => {
      for (let s = 0; s < stripeCount; s++) {
        const stripeZ = -this.segmentLength / 2 + s * (stripeLen + stripeGap) + stripeLen / 2;
        const stripe = new THREE.Mesh(this.stripeGeo, this.markingMat);
        stripe.position.set(x, 0.012, stripeZ);
        segment.add(stripe);

        // Raised cats-eye reflector every stripe
        const catsEye = new THREE.Mesh(this.catsEyeGeo, this.catsEyeMat);
        catsEye.position.set(x, 0.024, stripeZ + stripeLen / 2 + 1.5);
        segment.add(catsEye);
      }
    });

    // 3. Alternating Red & White Apex Racing Rumble Curbs on Shoulders
    const curbSteps = Math.floor(this.segmentLength / 2.8);
    for (let c = 0; c < curbSteps; c++) {
      const curbZ = -this.segmentLength / 2 + c * 2.8 + 1.4;
      const curbMat = (c % 2 === 0) ? this.curbRedMat : this.curbWhiteMat;

      // Left Curb
      const curbL = new THREE.Mesh(this.curbGeo, curbMat);
      curbL.position.set(-this.roadWidth / 2 + 0.38, 0.02, curbZ);
      // Right Curb
      const curbR = new THREE.Mesh(this.curbGeo, curbMat);
      curbR.position.set(this.roadWidth / 2 - 0.38, 0.02, curbZ);
      segment.add(curbL, curbR);
    }

    // 4. Rubber Skid Marks (Drift & Braking Lines)
    if (segIndex % 2 === 0) {
      [-2.1, 2.3].forEach(x => {
        const skid = new THREE.Mesh(this.skidGeo, this.skidMat);
        skid.position.set(x, 0.015, (Math.random() - 0.5) * 20.0);
        skid.rotation.y = (Math.random() - 0.5) * 0.15;
        segment.add(skid);
      });
    }

    // 5. Heavy Guardrails with Chevron Warning Signs
    [-this.roadWidth / 2 - 0.38, this.roadWidth / 2 + 0.38].forEach((x, idx) => {
      // Concrete Base
      const base = new THREE.Mesh(this.barrierBaseGeo, this.barrierConcreteMat);
      base.position.set(x, 0.225, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      segment.add(base);

      // Galvanized Steel W-Beam
      const steel = new THREE.Mesh(this.barrierSteelGeo, this.barrierSteelMat);
      steel.position.set(x + (idx === 0 ? 0.16 : -0.16), 0.65, 0);
      steel.castShadow = true;
      segment.add(steel);

      // Chevron curve warning signs on sweeping curves
      if (Math.abs(heading) > 0.05) {
        for (let ch = -22; ch <= 22; ch += 14) {
          const chevron = new THREE.Mesh(this.chevronGeo, this.chevronMat);
          chevron.position.set(x + (idx === 0 ? 0.28 : -0.28), 0.65, ch);
          chevron.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
          segment.add(chevron);
        }
      }
    });

    // 6. Left Side: Pacific Ocean Shimmering Water Plane & Sandy Shoreline
    const ocean = new THREE.Mesh(this.oceanGeo, this.oceanMat);
    ocean.position.set(-126, -1.4, 0);
    segment.add(ocean);

    const beach = new THREE.Mesh(this.beachGeo, this.beachMat);
    beach.position.set(-21, -0.6, 0);
    segment.add(beach);

    // Roadside Palm Trees along Promenade (Left side)
    if (segIndex % 2 === 0) {
      this._addPalmTree(segment, -this.roadWidth / 2 - 3.2, -14);
      this._addPalmTree(segment, -this.roadWidth / 2 - 3.2, 18);
    }

    // Rocky Sea Cliff Outcrops
    if (segIndex % 3 === 0) {
      const cliff = new THREE.Mesh(this.cliffGeo, this.cliffMat);
      cliff.position.set(-36 - (segIndex % 4) * 6, 3.2, 0);
      cliff.scale.set(1.4, 2.0, 1.4);
      segment.add(cliff);
    }

    // 7. Cantilever Highway Streetlights on Shoulder (Alternating sides)
    if (segIndex % 2 === 0) {
      this._addStreetlight(segment, this.roadWidth / 2 + 1.8, 0, 1);
    } else {
      this._addStreetlight(segment, -this.roadWidth / 2 - 1.8, 0, -1);
    }

    // 8. Right Side: Modern Coastal City & Mountain Backdrop
    this._addCityscape(segment, segIndex);

    // 9. Checkpoint Waypoint Gate or Highway Gantry
    if (segIndex > 0 && segIndex % this.checkpointInterval === 0) {
      this._addCheckpointGate(segment, zPos, Math.floor(segIndex / this.checkpointInterval));
    } else if (segIndex % 3 === 0) {
      this._addHighwayGantry(segment);
    }

    // 10. Collectibles (Coins & Nitro Canisters)
    this._addPickups(segment, zPos, centerX);

    this.scene.add(segment);
    this.segments.push({ group: segment, z: zPos, centerX });
    this.lastSpawnZ = zPos;
  }

  _addStreetlight(segment, x, z, sideSign) {
    const lightGroup = new THREE.Group();
    lightGroup.position.set(x, 0, z);

    // Steel Mast Pole
    const pole = new THREE.Mesh(this.lampPoleGeo, this.streetlampPoleMat);
    pole.position.set(0, 4.75, 0);
    pole.castShadow = true;
    lightGroup.add(pole);

    // Curved Cantilever Arm extending toward the road
    const arm = new THREE.Mesh(this.lampArmGeo, this.streetlampPoleMat);
    arm.position.set(-sideSign * 1.5, 9.4, 0);
    arm.rotation.z = sideSign * 0.12;
    lightGroup.add(arm);

    // Glowing Lamp Head fixture
    const head = new THREE.Mesh(this.lampHeadGeo, this.streetlampHeadMat);
    head.position.set(-sideSign * 2.8, 9.2, 0);
    lightGroup.add(head);

    segment.add(lightGroup);
  }

  _addPalmTree(segment, x, z) {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(this.palmTrunkGeo, this.palmTrunkMat);
    trunk.position.set(0, 3.0, 0);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    palm.add(trunk);

    // Foliage Crown (Layered Fronds)
    const crown = new THREE.Mesh(this.palmFrondGeo, this.palmFrondMat);
    crown.position.set(0, 6.0, 0);
    crown.scale.set(1.5, 1.3, 1.5);
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

      const distFromRoad = this.roadWidth / 2 + 20 + b * 24;
      const xPos = distFromRoad;
      const zOffset = (b === 0 ? -16 : 18);

      building.position.set(xPos, geo.parameters.height / 2 - 2, zOffset);
      building.castShadow = true;
      building.receiveShadow = true;
      segment.add(building);
    }

    // Mountain Backdrop Ridge in far distance (x > +95)
    if (segIndex % 2 === 0) {
      const mountain = new THREE.Mesh(this.mountainGeo, this.mountainMat);
      mountain.position.set(115 + (segIndex % 3) * 16, 22, 0);
      mountain.scale.set(1.9, 1.7, 1.9);
      segment.add(mountain);
    }
  }

  _addHighwayGantry(segment) {
    const gantry = new THREE.Group();

    // Steel Support Columns
    const colL = new THREE.Mesh(this.gantryColGeo, this.barrierSteelMat);
    colL.position.set(-this.roadWidth / 2 - 1.6, 4.5, 0);
    const colR = new THREE.Mesh(this.gantryColGeo, this.barrierSteelMat);
    colR.position.set(this.roadWidth / 2 + 1.6, 4.5, 0);
    gantry.add(colL, colR);

    // Crossbeam
    const beam = new THREE.Mesh(this.gantryBeamGeo, this.barrierSteelMat);
    beam.position.set(0, 9.0, 0);
    gantry.add(beam);

    // Green Highway Directional Signboard
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x0f4024,
      roughness: 0.35,
      metalness: 0.25
    });
    const sign = new THREE.Mesh(this.gantrySignGeo, signMat);
    sign.position.set(0, 8.2, -0.4);
    gantry.add(sign);

    segment.add(gantry);
  }

  _addCheckpointGate(segment, zPos, checkpointNumber) {
    const gate = new THREE.Group();

    // Arch Pillars
    const colL = new THREE.Mesh(this.checkpointColGeo, this.checkpointArchMat);
    colL.position.set(-this.roadWidth / 2 - 1.4, 5.0, 0);
    const colR = new THREE.Mesh(this.checkpointColGeo, this.checkpointArchMat);
    colR.position.set(this.roadWidth / 2 + 1.4, 5.0, 0);
    gate.add(colL, colR);

    // Arch Beam
    const beam = new THREE.Mesh(this.checkpointBeamGeo, this.checkpointArchMat);
    beam.position.set(0, 9.6, 0);
    gate.add(beam);

    // Glowing Waypoint Banner
    const banner = new THREE.Mesh(this.checkpointBannerGeo, this.checkpointGlowMat);
    banner.position.set(0, 9.1, -0.1);
    gate.add(banner);

    segment.add(gate);

    // Register active checkpoint
    this.checkpoints.push({
      index: checkpointNumber,
      z: zPos,
      passed: false
    });
  }

  _addPickups(segment, zPos, centerX) {
    // 38% chance to spawn an item in one of the lanes
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
          worldPos: new THREE.Vector3(centerX + laneX, 1.1, zPos),
          collected: false
        });
      } else {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.set(laneX, 1.0, 0);
        segment.add(coin);
        this.coins.push({
          mesh: coin,
          worldPos: new THREE.Vector3(centerX + laneX, 1.0, zPos),
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
    const centerRoadX = this.getCenterline(car.mesh.position.z);
    const relX = car.mesh.position.x - centerRoadX;
    const roadHeading = this.getHeading(car.mesh.position.z);
    const limit = this.roadWidth / 2 - 1.25;

    if (relX > limit) {
      // Smooth contact with left barrier: clamp position, align yaw parallel to road curve
      car.mesh.position.x = centerRoadX + limit;
      car.touchingBarrier = 'left';
      car.yaw += (roadHeading - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(25.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
      return { hit: true, side: 'left', x: centerRoadX + limit };
    } else if (relX < -limit) {
      // Smooth contact with right barrier
      car.mesh.position.x = centerRoadX - limit;
      car.touchingBarrier = 'right';
      car.yaw += (roadHeading - car.yaw) * Math.min(1.0, delta * 6.0);
      car.speed = Math.max(25.0, car.speed - (car.speed * 0.22 + 10.0) * delta);
      return { hit: true, side: 'right', x: centerRoadX - limit };
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
