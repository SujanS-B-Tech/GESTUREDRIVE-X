/**
 * GESTUREDRIVE X - Player Supercar & Vehicle Physics
 * Composite PBR 3D Supercar with animated wheels, suspension dynamics,
 * speed-sensitive steering assist, headlights, taillights, Brembo-style calipers, and nitro thrusters.
 */

import * as THREE from 'three';

export class Car {
  constructor(scene, colorHex = 0xff1133) {
    this.scene = scene;
    this.colorHex = colorHex;

    // Vehicle Physics State
    this.speed = 0.0;           // km/h
    this.maxSpeed = 225.0;      // Base top speed (km/h)
    this.nitroMaxSpeed = 280.0; // Top speed with nitro
    this.acceleration = 72.0;   // km/h per second
    this.nitroAccel = 135.0;
    this.braking = 125.0;
    this.drag = 16.0;           // Rolling resistance & aerodynamic drag
    this.steerAngle = 0.0;
    this.maxSteerAngle = 0.52;  // Radians (~30 deg)
    this.yaw = 0.0;             // Car heading in world space

    // Suspension & Chassis Roll
    this.roll = 0.0;
    this.pitch = 0.0;

    // Transmission & RPM
    this.gear = 1;
    this.rpm = 900;
    this.gearRatios = [0, 45, 85, 130, 175, 225, 280]; // Speed thresholds for gears 1-6

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
      halfWidth: 1.1,
      halfLength: 2.3,
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
    // 1. PBR Car Paint Material (High-gloss metallic clearcoat)
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.colorHex,
      metalness: 0.88,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95
    });

    // Carbon fiber / Matte Black aerodynamic trim
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.4,
      roughness: 0.35
    });

    // Dark tinted privacy glass
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x05070d,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0
    });

    // Polished Chrome / Alloy rim material
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.96,
      roughness: 0.12
    });

    // High-grip tire rubber
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.9,
      metalness: 0.05
    });

    // Brembo-style Racing Red brake caliper
    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      roughness: 0.25,
      metalness: 0.7
    });

    // --- MAIN CHASSIS BODY ---
    // Lower body wedge profile
    const lowerBodyGeo = new THREE.BoxGeometry(2.05, 0.44, 4.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, this.bodyMaterial);
    lowerBody.position.y = 0.24;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Front Aerodynamic Hood Slant
    const hoodGeo = new THREE.BoxGeometry(1.85, 0.28, 1.6);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 0.36, 1.25);
    hood.rotation.x = -0.07;
    hood.castShadow = true;
    this.chassisGroup.add(hood);

    // Front Carbon Fiber Splitter
    const splitterGeo = new THREE.BoxGeometry(2.1, 0.08, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.06, 2.2);
    splitter.castShadow = true;
    this.chassisGroup.add(splitter);

    // Aerodynamic Cockpit Cabin & Windshield
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.48, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.62, -0.2);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Roof Panel (Painted body color)
    const roofGeo = new THREE.BoxGeometry(1.36, 0.06, 1.5);
    const roof = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roof.position.set(0, 0.87, -0.25);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // Rear Engine Hood & Vents
    const rearDeckGeo = new THREE.BoxGeometry(1.85, 0.35, 1.3);
    const rearDeck = new THREE.Mesh(rearDeckGeo, this.bodyMaterial);
    rearDeck.position.set(0, 0.42, -1.5);
    rearDeck.castShadow = true;
    this.chassisGroup.add(rearDeck);

    // Rear Carbon Diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.95, 0.18, 0.5);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.14, -2.2);
    this.chassisGroup.add(diffuser);

    // Racing GT Rear Wing (Active Aerodynamics)
    const wingGeo = new THREE.BoxGeometry(2.2, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, carbonMaterial);
    wing.position.set(0, 0.88, -2.1);
    wing.castShadow = true;
    this.chassisGroup.add(wing);

    // Wing Struts
    const strutGeo = new THREE.BoxGeometry(0.06, 0.35, 0.25);
    const strutL = new THREE.Mesh(strutGeo, carbonMaterial);
    strutL.position.set(-0.65, 0.68, -2.05);
    const strutR = new THREE.Mesh(strutGeo, carbonMaterial);
    strutR.position.set(0.65, 0.68, -2.05);
    this.chassisGroup.add(strutL, strutR);

    // --- LIGHTS ---
    // Xenon LED Headlights (Crisp Ice Blue/White)
    const hlGeo = new THREE.BoxGeometry(0.38, 0.12, 0.08);
    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xeef5ff });
    const hlL = new THREE.Mesh(hlGeo, this.headlightMat);
    hlL.position.set(-0.75, 0.34, 2.21);
    const hlR = new THREE.Mesh(hlGeo, this.headlightMat);
    hlR.position.set(0.75, 0.34, 2.21);
    this.chassisGroup.add(hlL, hlR);

    // Dynamic LED Taillight Bar (Precision Red)
    const tlGeo = new THREE.BoxGeometry(1.92, 0.09, 0.08);
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0x66000e });
    const tl = new THREE.Mesh(tlGeo, this.taillightMat);
    tl.position.set(0, 0.46, -2.21);
    this.chassisGroup.add(tl);

    // --- EXHAUST & NITRO THRUSTERS ---
    // Dual Twin Chrome Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12);
    exhaustGeo.rotateX(Math.PI / 2);

    [-0.45, -0.28, 0.28, 0.45].forEach(x => {
      const tip = new THREE.Mesh(exhaustGeo, chromeMaterial);
      tip.position.set(x, 0.24, -2.25);
      this.chassisGroup.add(tip);
    });

    this.exhaustPoints = [
      new THREE.Vector3(-0.36, 0.24, -2.35),
      new THREE.Vector3(0.36, 0.24, -2.35)
    ];

    // Nitro Flame Visual Mesh (Cones)
    const flameGeo = new THREE.ConeGeometry(0.18, 1.4, 12);
    flameGeo.rotateX(-Math.PI / 2);
    this.flameMat = new THREE.MeshBasicMaterial({
      color: 0xff2244,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    this.flameL = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameL.position.set(-0.36, 0.24, -2.85);
    this.chassisGroup.add(this.flameL);

    this.flameR = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameR.position.set(0.36, 0.24, -2.85);
    this.chassisGroup.add(this.flameR);

    // --- WHEELS & BRAKE ROTORS ---
    const wheelRadius = 0.38;
    const wheelWidth = 0.28;
    const wheelPositions = [
      { x: -1.02, y: 0.38, z: 1.35, isFront: true },  // Front Left
      { x: 1.02,  y: 0.38, z: 1.35, isFront: true },  // Front Right
      { x: -1.04, y: 0.38, z: -1.35, isFront: false }, // Rear Left
      { x: 1.04,  y: 0.38, z: -1.35, isFront: false }  // Rear Right
    ];

    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth + 0.01, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const rotorGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.04, 16);
    rotorGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.16, 0.22);

    wheelPositions.forEach(wp => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wp.y, wp.z);

      const spinGroup = new THREE.Group();
      steerPivot.add(spinGroup);

      const tire = new THREE.Mesh(tireGeo, tireMaterial);
      tire.castShadow = true;
      spinGroup.add(tire);

      const rim = new THREE.Mesh(rimGeo, chromeMaterial);
      spinGroup.add(rim);

      const rotor = new THREE.Mesh(rotorGeo, chromeMaterial);
      spinGroup.add(rotor);

      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(wp.x > 0 ? -0.1 : 0.1, 0.12, 0);
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
  }

  update(delta, input) {
    // 1. Process Steering Input with Speed-Sensitive Steering Assistance
    // Input contract: input.steer < 0 is LEFT, input.steer > 0 is RIGHT.
    // Three.js world yaw: turning LEFT requires turning toward +X (positive yaw).
    const speedRatio = Math.min(1.0, this.speed / this.maxSpeed);
    // At high speeds, dynamic attenuation prevents erratic overturning
    const steerAttenuation = 1.0 - speedRatio * 0.45;
    const targetSteer = -(input.steer || 0.0) * this.maxSteerAngle * steerAttenuation;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, delta * 12.0);

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
      this.flameMat.opacity = 0.85 + Math.random() * 0.15;
      const flicker = 0.9 + Math.random() * 0.35;
      this.flameL.scale.set(flicker, flicker, flicker * 1.4);
      this.flameR.scale.set(flicker, flicker, flicker * 1.4);
    } else {
      this.flameMat.opacity = 0.0;
    }

    // 3. Acceleration & Speed Physics
    const throttle = typeof input.throttle === 'number' ? input.throttle : 1.0;
    const brake = typeof input.brake === 'number' ? input.brake : 0.0;
    const currentMaxSpeed = this.isNitroActive ? this.nitroMaxSpeed : this.maxSpeed;
    const currentAccel = this.isNitroActive ? this.nitroAccel : this.acceleration;

    if (brake > 0.1) {
      // Braking: Brighten taillights to glowing red
      this.speed = Math.max(0.0, this.speed - (this.braking * brake) * delta);
      this.taillightMat.color.setHex(0xff0022);
    } else if (throttle > 0.05) {
      // Accelerating
      if (this.speed < currentMaxSpeed) {
        this.speed = Math.min(currentMaxSpeed, this.speed + (currentAccel * throttle) * delta);
      }
      this.taillightMat.color.setHex(0x55000a);
    } else {
      // Coasting / Aerodynamic Drag
      this.speed = Math.max(0.0, this.speed - this.drag * delta);
      this.taillightMat.color.setHex(0x330006);
    }

    // 4. Update Gear & RPM
    this._updateGearAndRpm();

    // 5. Turn Car & Lateral Movement
    const yawRate = this.steerAngle * (speedRatio * 1.4 + 0.22);
    this.yaw += yawRate * delta * 1.8;
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
