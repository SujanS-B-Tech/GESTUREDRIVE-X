/**
 * GESTUREDRIVE X - Player Supercar & Vehicle Physics
 * High-fidelity 3D Exotic Supercar inspired by Need for Speed.
 * Features sculpted aerodynamic widebody fenders, raked teardrop cockpit canopy,
 * carbon fiber front splitter with dive planes, side intake scoops, louvered engine bay,
 * active swan-neck GT rear wing, quad titanium exhaust tips, 5-twin-spoke forged concave wheels,
 * cross-drilled carbon-ceramic brakes with Brembo red calipers, interior bucket seats,
 * aggressive LED headlamp clusters with DRL brows, full-width razor taillight bar,
 * iconic neon underglow ground effects, and dual plasma nitro thrusters.
 */

import * as THREE from 'three';

export class Car {
  constructor(scene, colorHex = 0xff1133) {
    this.scene = scene;
    this.colorHex = colorHex;

    // Vehicle Physics State
    this.speed = 0.0;           // km/h
    this.maxSpeed = 230.0;      // Base top speed (km/h)
    this.nitroMaxSpeed = 285.0; // Top speed with nitro
    this.acceleration = 74.0;   // km/h per second
    this.nitroAccel = 140.0;
    this.braking = 130.0;
    this.drag = 16.0;           // Rolling resistance & aerodynamic drag
    this.steerAngle = 0.0;
    this.maxSteerAngle = 0.52;  // Radians (~30 deg)
    this.yaw = 0.0;             // Car heading in world space
    this.touchingBarrier = null; // 'left' | 'right' | null

    // Suspension & Chassis Roll
    this.roll = 0.0;
    this.pitch = 0.0;

    // Transmission & RPM
    this.gear = 1;
    this.rpm = 900;
    this.gearRatios = [0, 45, 85, 130, 175, 225, 285]; // Speed thresholds for gears 1-6

    // Nitro
    this.nitroCharge = 100.0;   // 0 to 100%
    this.isNitroActive = false;
    this.nitroConsumptionRate = 32.0; // % per second
    this.nitroRechargeRate = 9.0;

    // Drift / Slip
    this.slipAngle = 0.0;
    this.isDrifting = false;

    // Collision Box
    this.collider = {
      halfWidth: 1.15,
      halfLength: 2.35,
      halfHeight: 0.65
    };

    // Build 3D Car Hierarchy
    this.mesh = new THREE.Group();
    this.chassisGroup = new THREE.Group(); // Handles suspension roll & pitch
    this.mesh.add(this.chassisGroup);

    this.wheels = [];
    this.frontWheels = [];
    this.rearWheels = [];
    this.exhaustPoints = [];

    this._buildSupercar();
    this.scene.add(this.mesh);

    // Initial position on the track
    this.mesh.position.set(0, 0.45, 0);
  }

  _buildSupercar() {
    // -------------------------------------------------------------
    // 1. PBR HIGH-END AUTOMOTIVE MATERIALS
    // -------------------------------------------------------------
    // High-gloss metallic clearcoat automotive paint with deep specular reflection
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.colorHex,
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.98
    });

    // Matte twill woven carbon fiber trim
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x121418,
      metalness: 0.45,
      roughness: 0.38
    });

    // Dark tinted privacy glass with sun reflection
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x060912,
      metalness: 0.92,
      roughness: 0.06,
      transparent: true,
      opacity: 0.86,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03
    });

    // High-polish chrome & lightweight brushed alloy
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      metalness: 0.98,
      roughness: 0.08
    });

    // Titanium exhaust tips with blued heated gradient
    const titaniumMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d668c,
      metalness: 0.94,
      roughness: 0.14
    });

    // Cross-drilled carbon-ceramic brake disc
    const brakeRotorMaterial = new THREE.MeshStandardMaterial({
      color: 0x626670,
      metalness: 0.88,
      roughness: 0.28
    });

    // Brembo Racing Red monobloc 6-piston brake caliper
    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xff002b,
      roughness: 0.18,
      metalness: 0.70
    });

    // High-grip low-profile racing tire rubber
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x131518,
      roughness: 0.92,
      metalness: 0.04
    });

    // Honeycomb radiator mesh
    const meshGrilleMaterial = new THREE.MeshStandardMaterial({
      color: 0x08090c,
      roughness: 0.8,
      metalness: 0.2
    });

    // -------------------------------------------------------------
    // 2. SCULPTED CHASSIS & AERODYNAMIC BODYWORK
    // -------------------------------------------------------------
    // A. Main Center Tub & Floorpan
    const floorpanGeo = new THREE.BoxGeometry(1.92, 0.22, 4.3);
    const floorpan = new THREE.Mesh(floorpanGeo, carbonMaterial);
    floorpan.position.set(0, 0.14, 0);
    floorpan.receiveShadow = true;
    this.chassisGroup.add(floorpan);

    // B. Low-Slung Sculpted Wedge Nose (Front Bumper)
    const noseGeo = new THREE.BoxGeometry(1.96, 0.32, 1.4);
    const nose = new THREE.Mesh(noseGeo, this.bodyMaterial);
    nose.position.set(0, 0.26, 1.7);
    nose.rotation.x = -0.06;
    nose.castShadow = true;
    nose.receiveShadow = true;
    this.chassisGroup.add(nose);

    // Front Honeycomb Grille & Center Air Dam
    const grilleGeo = new THREE.BoxGeometry(1.4, 0.20, 0.15);
    const grille = new THREE.Mesh(grilleGeo, meshGrilleMaterial);
    grille.position.set(0, 0.20, 2.42);
    this.chassisGroup.add(grille);

    // Front Carbon Fiber Splitter with Aerodynamic Side Canards
    const splitterGeo = new THREE.BoxGeometry(2.14, 0.06, 0.7);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.06, 2.15);
    splitter.castShadow = true;
    this.chassisGroup.add(splitter);

    // Front Side Aero Canards (Dive planes)
    [-1.05, 1.05].forEach(x => {
      const canardGeo = new THREE.BoxGeometry(0.12, 0.22, 0.4);
      const canard = new THREE.Mesh(canardGeo, carbonMaterial);
      canard.position.set(x, 0.18, 2.15);
      canard.rotation.z = (x < 0 ? -0.2 : 0.2);
      this.chassisGroup.add(canard);
    });

    // C. Sculpted Hood with Dual Recessed Heat Extractor Vents
    const hoodGeo = new THREE.BoxGeometry(1.72, 0.22, 1.35);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 0.38, 1.05);
    hood.rotation.x = -0.10;
    hood.castShadow = true;
    this.chassisGroup.add(hood);

    // Hood Heat Extractor Vents (Matte Carbon insets)
    [-0.42, 0.42].forEach(x => {
      const ventGeo = new THREE.BoxGeometry(0.24, 0.05, 0.55);
      const vent = new THREE.Mesh(ventGeo, carbonMaterial);
      vent.position.set(x, 0.48, 1.08);
      vent.rotation.x = -0.10;
      this.chassisGroup.add(vent);
    });

    // D. Muscular Widebody Front Fenders
    [-0.98, 0.98].forEach(x => {
      const fenderGeo = new THREE.BoxGeometry(0.26, 0.42, 1.5);
      const fender = new THREE.Mesh(fenderGeo, this.bodyMaterial);
      fender.position.set(x, 0.36, 1.35);
      fender.castShadow = true;
      this.chassisGroup.add(fender);
    });

    // E. Scalloped Door Waistline & Massive Side Intake Pods
    const waistlineGeo = new THREE.BoxGeometry(1.76, 0.42, 1.7);
    const waistline = new THREE.Mesh(waistlineGeo, this.bodyMaterial);
    waistline.position.set(0, 0.34, -0.2);
    waistline.castShadow = true;
    this.chassisGroup.add(waistline);

    // Deep Side Carbon Air Scoops (Feeding Rear Radiators)
    [-0.96, 0.96].forEach(x => {
      // Carbon scoop recess
      const scoopGeo = new THREE.BoxGeometry(0.18, 0.35, 0.85);
      const scoop = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoop.position.set(x, 0.35, -0.55);
      this.chassisGroup.add(scoop);

      // Carbon side blade
      const bladeGeo = new THREE.BoxGeometry(0.06, 0.25, 0.75);
      const blade = new THREE.Mesh(bladeGeo, carbonMaterial);
      blade.position.set(x + (x > 0 ? 0.08 : -0.08), 0.35, -0.55);
      this.chassisGroup.add(blade);

      // Carbon Side Skirt Ground Effects
      const skirtGeo = new THREE.BoxGeometry(0.18, 0.05, 1.8);
      const skirt = new THREE.Mesh(skirtGeo, carbonMaterial);
      skirt.position.set(x + (x > 0 ? 0.06 : -0.06), 0.08, -0.1);
      this.chassisGroup.add(skirt);
    });

    // F. Widebody Muscular Rear Haunches (Extended Track Width)
    [-1.06, 1.06].forEach(x => {
      const rearFenderGeo = new THREE.BoxGeometry(0.32, 0.48, 1.6);
      const rearFender = new THREE.Mesh(rearFenderGeo, this.bodyMaterial);
      rearFender.position.set(x, 0.39, -1.35);
      rearFender.castShadow = true;
      this.chassisGroup.add(rearFender);
    });

    // G. Aerodynamic Teardrop Cockpit Canopy & Windshield
    const windshieldGeo = new THREE.BoxGeometry(1.48, 0.46, 1.1);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 0.65, 0.28);
    windshield.rotation.x = -0.36;
    windshield.castShadow = true;
    this.chassisGroup.add(windshield);

    // Roof Panel with Ram-Air Scoop
    const roofGeo = new THREE.BoxGeometry(1.34, 0.08, 1.25);
    const roof = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roof.position.set(0, 0.89, -0.22);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // Functional Carbon Roof Scoop
    const roofScoopGeo = new THREE.BoxGeometry(0.38, 0.12, 0.65);
    const roofScoop = new THREE.Mesh(roofScoopGeo, carbonMaterial);
    roofScoop.position.set(0, 0.98, -0.12);
    roofScoop.castShadow = true;
    this.chassisGroup.add(roofScoop);

    // Fastback Rear Glass / Louvered Engine Cover
    const rearGlassGeo = new THREE.BoxGeometry(1.42, 0.42, 1.25);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlass.position.set(0, 0.68, -0.88);
    rearGlass.rotation.x = 0.26;
    rearGlass.castShadow = true;
    this.chassisGroup.add(rearGlass);

    // Carbon Engine Louvers (Slat Vents)
    for (let l = 0; l < 4; l++) {
      const louverGeo = new THREE.BoxGeometry(1.0, 0.03, 0.12);
      const louver = new THREE.Mesh(louverGeo, carbonMaterial);
      louver.position.set(0, 0.74 - l * 0.08, -0.65 - l * 0.22);
      louver.rotation.x = 0.26;
      this.chassisGroup.add(louver);
    }

    // Engine Cylinder Heads (Visible inside glass)
    const engineBlockGeo = new THREE.BoxGeometry(0.85, 0.24, 0.9);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x990011, metalness: 0.8, roughness: 0.3 });
    const engineBlock = new THREE.Mesh(engineBlockGeo, engineMat);
    engineBlock.position.set(0, 0.48, -0.95);
    this.chassisGroup.add(engineBlock);

    // H. Cockpit Interior (Visible through tinted glass)
    // Dual Carbon Racing Bucket Seats with Headrests
    [-0.32, 0.32].forEach(x => {
      const seatBaseGeo = new THREE.BoxGeometry(0.42, 0.18, 0.45);
      const seatBase = new THREE.Mesh(seatBaseGeo, carbonMaterial);
      seatBase.position.set(x, 0.34, 0.05);
      this.chassisGroup.add(seatBase);

      const seatBackGeo = new THREE.BoxGeometry(0.40, 0.44, 0.12);
      const seatBack = new THREE.Mesh(seatBackGeo, carbonMaterial);
      seatBack.position.set(x, 0.58, -0.15);
      seatBack.rotation.x = 0.12;
      this.chassisGroup.add(seatBack);

      const headrestGeo = new THREE.BoxGeometry(0.24, 0.15, 0.12);
      const headrest = new THREE.Mesh(headrestGeo, caliperMaterial); // Red racing headrest
      headrest.position.set(x, 0.82, -0.18);
      this.chassisGroup.add(headrest);
    });

    // Racing Sport Steering Wheel
    const wheelHubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16);
    wheelHubGeo.rotateX(Math.PI / 2);
    const steeringWheel = new THREE.Mesh(wheelHubGeo, carbonMaterial);
    steeringWheel.position.set(-0.32, 0.60, 0.32);
    steeringWheel.rotation.x = -0.32;
    this.chassisGroup.add(steeringWheel);

    // Sleek Aerodynamic Carbon Wing Mirrors
    [-0.92, 0.92].forEach(x => {
      const mirrorStemGeo = new THREE.BoxGeometry(0.12, 0.04, 0.04);
      const mirrorStem = new THREE.Mesh(mirrorStemGeo, carbonMaterial);
      mirrorStem.position.set(x > 0 ? x - 0.04 : x + 0.04, 0.62, 0.52);
      this.chassisGroup.add(mirrorStem);

      const mirrorHeadGeo = new THREE.BoxGeometry(0.22, 0.10, 0.12);
      const mirrorHead = new THREE.Mesh(mirrorHeadGeo, this.bodyMaterial);
      mirrorHead.position.set(x, 0.64, 0.52);
      mirrorHead.rotation.y = (x > 0 ? -0.15 : 0.15);
      mirrorHead.castShadow = true;
      this.chassisGroup.add(mirrorHead);
    });

    // I. Rear Fascia & Aggressive Aerodynamics
    // Rear Deck & Ducktail Lip
    const rearDeckGeo = new THREE.BoxGeometry(1.92, 0.34, 1.1);
    const rearDeck = new THREE.Mesh(rearDeckGeo, this.bodyMaterial);
    rearDeck.position.set(0, 0.42, -1.65);
    rearDeck.castShadow = true;
    this.chassisGroup.add(rearDeck);

    // Integrated Ducktail Carbon Lip
    const ducktailGeo = new THREE.BoxGeometry(1.88, 0.06, 0.18);
    const ducktail = new THREE.Mesh(ducktailGeo, carbonMaterial);
    ducktail.position.set(0, 0.58, -2.18);
    this.chassisGroup.add(ducktail);

    // Swan-Neck Racing GT Rear Wing with Aerodynamic Endplates
    const wingGeo = new THREE.BoxGeometry(2.28, 0.08, 0.48);
    const wing = new THREE.Mesh(wingGeo, carbonMaterial);
    wing.position.set(0, 0.96, -2.15);
    wing.rotation.x = -0.04; // Downforce pitch
    wing.castShadow = true;
    this.chassisGroup.add(wing);

    // Aerodynamic Wing Endplates
    [-1.14, 1.14].forEach(x => {
      const endplateGeo = new THREE.BoxGeometry(0.04, 0.28, 0.54);
      const endplate = new THREE.Mesh(endplateGeo, carbonMaterial);
      endplate.position.set(x, 0.96, -2.15);
      this.chassisGroup.add(endplate);
    });

    // Dual Swan-Neck Aluminum Struts
    [-0.68, 0.68].forEach(x => {
      const strutGeo = new THREE.BoxGeometry(0.05, 0.44, 0.24);
      const strut = new THREE.Mesh(strutGeo, chromeMaterial);
      strut.position.set(x, 0.76, -2.10);
      strut.rotation.x = -0.12;
      this.chassisGroup.add(strut);
    });

    // Rear Carbon Diffuser with 4 Vertical Aerodynamic Strakes
    const diffuserGeo = new THREE.BoxGeometry(2.02, 0.18, 0.65);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.12, -2.15);
    this.chassisGroup.add(diffuser);

    [-0.75, -0.25, 0.25, 0.75].forEach(x => {
      const strakeGeo = new THREE.BoxGeometry(0.04, 0.16, 0.55);
      const strake = new THREE.Mesh(strakeGeo, carbonMaterial);
      strake.position.set(x, 0.10, -2.15);
      this.chassisGroup.add(strake);
    });

    // -------------------------------------------------------------
    // 3. ADVANCED LIGHTING & NEED FOR SPEED ILLUMINATION
    // -------------------------------------------------------------
    // A. Predatory Angled LED Headlight Projectors
    const hlGeo = new THREE.BoxGeometry(0.36, 0.11, 0.14);
    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(hlGeo, this.headlightMat);
    hlL.position.set(-0.76, 0.38, 2.22);
    hlL.rotation.y = 0.18;
    const hlR = new THREE.Mesh(hlGeo, this.headlightMat);
    hlR.position.set(0.76, 0.38, 2.22);
    hlR.rotation.y = -0.18;
    this.chassisGroup.add(hlL, hlR);

    // Ice-Blue DRL Daytime Running Light Eyebrow Strips
    const drlGeo = new THREE.BoxGeometry(0.42, 0.04, 0.08);
    this.drlMat = new THREE.MeshBasicMaterial({ color: 0x66ccff });
    const drlL = new THREE.Mesh(drlGeo, this.drlMat);
    drlL.position.set(-0.76, 0.44, 2.24);
    drlL.rotation.y = 0.18;
    const drlR = new THREE.Mesh(drlGeo, this.drlMat);
    drlR.position.set(0.76, 0.44, 2.24);
    drlR.rotation.y = -0.18;
    this.chassisGroup.add(drlL, drlR);

    // B. Razor-Thin Full-Width Dynamic LED Taillight Bar
    const tlGeo = new THREE.BoxGeometry(1.96, 0.07, 0.06);
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0x880010 });
    const tl = new THREE.Mesh(tlGeo, this.taillightMat);
    tl.position.set(0, 0.46, -2.28);
    this.chassisGroup.add(tl);

    // Center High-Mounted Brake Light (CHMSL)
    const chmslGeo = new THREE.BoxGeometry(0.48, 0.04, 0.06);
    this.chmslMat = new THREE.MeshBasicMaterial({ color: 0x880010 });
    const chmsl = new THREE.Mesh(chmslGeo, this.chmslMat);
    chmsl.position.set(0, 0.88, -0.85);
    this.chassisGroup.add(chmsl);

    // C. Iconic Need for Speed Underglow Neon Ground Effects
    const underglowGeo = new THREE.PlaneGeometry(1.9, 3.8);
    underglowGeo.rotateX(-Math.PI / 2);
    this.underglowMat = new THREE.MeshBasicMaterial({
      color: 0xff0828,
      transparent: true,
      opacity: 0.70,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.underglowMesh = new THREE.Mesh(underglowGeo, this.underglowMat);
    this.underglowMesh.position.set(0, 0.04, 0);
    this.chassisGroup.add(this.underglowMesh);

    // D. Quad Titanium Staggered Exhaust Tips with Heated Blued Finish
    const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 14);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustInnerGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.36, 14);
    exhaustInnerGeo.rotateX(Math.PI / 2);
    const exhaustHoleMat = new THREE.MeshBasicMaterial({ color: 0x050508 });

    [-0.52, -0.32, 0.32, 0.52].forEach(x => {
      const tip = new THREE.Mesh(exhaustGeo, titaniumMaterial);
      tip.position.set(x, 0.24, -2.28);
      const inner = new THREE.Mesh(exhaustInnerGeo, exhaustHoleMat);
      inner.position.set(x, 0.24, -2.28);
      this.chassisGroup.add(tip, inner);
    });

    this.exhaustPoints = [
      new THREE.Vector3(-0.42, 0.24, -2.38),
      new THREE.Vector3(0.42, 0.24, -2.38)
    ];

    // E. Twin Dual-Core Plasma Nitro Thrusters
    const flameOuterGeo = new THREE.ConeGeometry(0.20, 1.6, 14);
    flameOuterGeo.rotateX(-Math.PI / 2);
    this.flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xff1144,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    const flameInnerGeo = new THREE.ConeGeometry(0.10, 1.1, 12);
    flameInnerGeo.rotateX(-Math.PI / 2);
    this.flameInnerMat = new THREE.MeshBasicMaterial({
      color: 0x55ccff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    this.flames = [];
    [-0.42, 0.42].forEach(x => {
      const flameGroup = new THREE.Group();
      flameGroup.position.set(x, 0.24, -2.42);

      const fOuter = new THREE.Mesh(flameOuterGeo, this.flameOuterMat);
      fOuter.position.z = -0.8;
      const fInner = new THREE.Mesh(flameInnerGeo, this.flameInnerMat);
      fInner.position.z = -0.55;

      flameGroup.add(fOuter, fInner);
      this.chassisGroup.add(flameGroup);
      this.flames.push({ group: flameGroup, outer: fOuter, inner: fInner });
    });

    // -------------------------------------------------------------
    // 4. HIGH-DETAIL 5-TWIN-SPOKE FORGED ALLOY WHEELS & ROTORS
    // -------------------------------------------------------------
    const wheelRadius = 0.38;
    const wheelWidth = 0.30;
    const wheelPositions = [
      { x: -1.04, y: 0.38, z: 1.35, isFront: true },  // Front Left
      { x: 1.04,  y: 0.38, z: 1.35, isFront: true },  // Front Right
      { x: -1.08, y: 0.38, z: -1.35, isFront: false }, // Rear Left (Wider track)
      { x: 1.08,  y: 0.38, z: -1.35, isFront: false }  // Rear Right (Wider track)
    ];

    // High-performance tire with shoulder bevel
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);

    // Deep concave rim barrel
    const rimBarrelGeo = new THREE.CylinderGeometry(wheelRadius * 0.74, wheelRadius * 0.70, wheelWidth + 0.01, 20);
    rimBarrelGeo.rotateZ(Math.PI / 2);

    // 5-Twin-Spoke Wheel Structure
    const spokeGeo = new THREE.BoxGeometry(wheelWidth * 0.85, wheelRadius * 1.35, 0.04);
    const centerCapGeo = new THREE.CylinderGeometry(0.08, 0.08, wheelWidth + 0.03, 12);
    centerCapGeo.rotateZ(Math.PI / 2);

    // Cross-drilled carbon-ceramic brake rotor disc
    const rotorGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.04, 20);
    rotorGeo.rotateZ(Math.PI / 2);

    // Monobloc 6-piston brake caliper
    const caliperGeo = new THREE.BoxGeometry(0.12, 0.22, 0.16);

    wheelPositions.forEach(wp => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wp.y, wp.z);

      const spinGroup = new THREE.Group();
      steerPivot.add(spinGroup);

      // Tire & Concave Rim Barrel
      const tire = new THREE.Mesh(tireGeo, tireMaterial);
      tire.castShadow = true;
      spinGroup.add(tire);

      const rimBarrel = new THREE.Mesh(rimBarrelGeo, carbonMaterial);
      spinGroup.add(rimBarrel);

      // 5-Twin Spokes
      for (let s = 0; s < 5; s++) {
        const spokePair = new THREE.Mesh(spokeGeo, chromeMaterial);
        spokePair.rotation.x = (s * Math.PI) / 2.5;
        spinGroup.add(spokePair);
      }

      // Center Hub Cap with Red Racing Accent
      const centerCap = new THREE.Mesh(centerCapGeo, caliperMaterial);
      spinGroup.add(centerCap);

      // Brake Rotor Disc (mounted to spin group)
      const rotor = new THREE.Mesh(rotorGeo, brakeRotorMaterial);
      spinGroup.add(rotor);

      // Non-rotating Brake Caliper (mounted to steerPivot so it stays upright!)
      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(wp.x > 0 ? -0.08 : 0.08, 0.12, 0);
      steerPivot.add(caliper);

      this.mesh.add(steerPivot);

      const wheelObj = {
        pivot: steerPivot,
        spin: spinGroup,
        radius: wheelRadius,
        isFront: wp.isFront
      };

      this.wheels.push(wheelObj);
      if (wp.isFront) this.frontWheels.push(wheelObj);
      else this.rearWheels.push(wheelObj);
    });
  }

  setColor(hex) {
    this.colorHex = hex;
    if (this.bodyMaterial) {
      this.bodyMaterial.color.setHex(hex);
    }
  }

  resetPosition() {
    this.mesh.position.set(0, 0.45, this.mesh.position.z);
    this.yaw = 0;
    this.mesh.rotation.y = 0;
    this.speed = Math.max(30.0, this.speed * 0.5);
    this.steerAngle = 0;
    this.roll = 0;
    this.pitch = 0;
    this.touchingBarrier = null;
  }

  update(delta, input) {
    // 1. Process Steering Input with Speed-Sensitive Steering Assistance
    // Input contract: input.steer < 0 is LEFT, input.steer > 0 is RIGHT.
    // Three.js world yaw: turning LEFT requires turning toward +X (positive yaw).
    const speedRatio = Math.min(1.0, this.speed / this.maxSpeed);
    const steerAttenuation = 1.0 - speedRatio * 0.45;

    let steerCmd = input.steer || 0.0;
    // Barrier contact prevention: clamp steering from penetrating deeper into wall,
    // while allowing immediate steering recovery away from the barrier
    if (this.touchingBarrier === 'left' && steerCmd < 0) steerCmd = 0;
    if (this.touchingBarrier === 'right' && steerCmd > 0) steerCmd = 0;

    const targetSteer = -(steerCmd) * this.maxSteerAngle * steerAttenuation;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, delta * 12.0);

    // Smoothly damp steer angle that would push further into wall (avoids 60Hz chatter)
    if (this.touchingBarrier === 'left' && this.steerAngle > 0) {
      this.steerAngle *= Math.max(0.0, 1.0 - delta * 15.0);
    }
    if (this.touchingBarrier === 'right' && this.steerAngle < 0) {
      this.steerAngle *= Math.max(0.0, 1.0 - delta * 15.0);
    }

    // Steer front wheels
    this.frontWheels.forEach(w => {
      w.pivot.rotation.y = this.steerAngle;
    });

    // 2. Process Nitro Boost
    const wantsNitro = input.nitro && this.nitroCharge > 5.0 && this.speed > 30.0;
    if (wantsNitro) {
      this.isNitroActive = true;
      this.nitroCharge = Math.max(0, this.nitroCharge - this.nitroConsumptionRate * delta);
    } else {
      this.isNitroActive = false;
      this.nitroCharge = Math.min(100.0, this.nitroCharge + this.nitroRechargeRate * delta);
    }

    // Nitro Flame Visuals
    if (this.isNitroActive) {
      this.flameOuterMat.opacity = 0.85 + Math.random() * 0.15;
      this.flameInnerMat.opacity = 0.95;
      const flicker = 0.85 + Math.random() * 0.35;
      this.flames.forEach(f => {
        f.outer.scale.set(flicker, flicker, flicker * 1.5);
        f.inner.scale.set(flicker * 0.8, flicker * 0.8, flicker * 1.3);
      });
    } else {
      this.flameOuterMat.opacity = 0.0;
      this.flameInnerMat.opacity = 0.0;
    }

    // 3. Acceleration & Speed Physics
    const throttle = typeof input.throttle === 'number' ? input.throttle : 1.0;
    const brake = typeof input.brake === 'number' ? input.brake : 0.0;
    const currentMaxSpeed = this.isNitroActive ? this.nitroMaxSpeed : this.maxSpeed;
    const currentAccel = this.isNitroActive ? this.nitroAccel : this.acceleration;

    if (brake > 0.1) {
      // Braking: Glowing red taillights & CHMSL
      this.speed = Math.max(0.0, this.speed - (this.braking * brake) * delta);
      this.taillightMat.color.setHex(0xff002b);
      if (this.chmslMat) this.chmslMat.color.setHex(0xff002b);
    } else if (throttle > 0.05) {
      // Accelerating
      if (this.speed < currentMaxSpeed) {
        this.speed = Math.min(currentMaxSpeed, this.speed + (currentAccel * throttle) * delta);
      }
      this.taillightMat.color.setHex(0x770014);
      if (this.chmslMat) this.chmslMat.color.setHex(0x770014);
    } else {
      // Coasting / Aerodynamic Drag
      this.speed = Math.max(0.0, this.speed - this.drag * delta);
      this.taillightMat.color.setHex(0x44000a);
      if (this.chmslMat) this.chmslMat.color.setHex(0x44000a);
    }

    // 4. Update Gear & RPM
    this._updateGearAndRpm();

    // 5. Turn Car & Lateral Movement
    const yawRate = this.steerAngle * (speedRatio * 1.4 + 0.22);
    this.yaw += yawRate * delta * 1.8;
    // Normalize yaw to [-PI, PI]
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    this.mesh.rotation.y = this.yaw;

    // Move forward in world space
    const forwardDist = (this.speed * 1000 / 3600) * delta; // km/h to m/s
    this.mesh.position.x += Math.sin(this.yaw) * forwardDist;
    this.mesh.position.z += Math.cos(this.yaw) * forwardDist;

    // 6. Suspension Lean & Pitch
    const targetRoll = -this.steerAngle * speedRatio * 0.13;
    this.roll += (targetRoll - this.roll) * Math.min(1.0, delta * 10.0);
    this.chassisGroup.rotation.z = this.roll;

    const targetPitch = (brake > 0.1 ? -0.06 * brake : (this.isNitroActive ? 0.05 : 0.02 * throttle));
    this.pitch += (targetPitch - this.pitch) * Math.min(1.0, delta * 8.0);
    this.chassisGroup.rotation.x = this.pitch;

    // 7. Wheel Rolling Rotation
    const wheelCircumference = 2 * Math.PI * 0.38;
    const wheelRot = forwardDist / wheelCircumference * (2 * Math.PI);
    this.wheels.forEach(w => {
      w.spin.rotation.x += wheelRot;
    });

    // 8. Drift Detection
    this.slipAngle = Math.abs(this.steerAngle) * speedRatio;
    this.isDrifting = this.speed > 60.0 && Math.abs(this.steerAngle) > 0.25;
  }

  _updateGearAndRpm() {
    if (this.speed <= 0.1) {
      this.gear = 1;
      this.rpm = 900;
      return;
    }

    let g = 1;
    for (let i = 1; i < this.gearRatios.length; i++) {
      if (this.speed >= this.gearRatios[i - 1]) {
        g = i;
      }
    }
    this.gear = g;

    const lowerBound = this.gearRatios[g - 1];
    const upperBound = this.gearRatios[g] || this.nitroMaxSpeed;
    const progressInGear = (this.speed - lowerBound) / (upperBound - lowerBound);
    this.rpm = Math.min(8500, Math.round(2200 + progressInGear * 5800));
  }
}
