/**
 * GESTUREDRIVE X - Player Supercar & Vehicle Physics
 * Composite PBR 3D Supercar with animated wheels, suspension dynamics, headlights, taillights, and nitro
 */

import * as THREE from 'three';

export class Car {
  constructor(scene, colorHex = 0x00f0ff) {
    this.scene = scene;
    this.colorHex = colorHex;

    // Vehicle Physics State
    this.speed = 0.0;           // km/h
    this.maxSpeed = 220.0;      // Base top speed (km/h)
    this.nitroMaxSpeed = 275.0; // Top speed with nitro
    this.acceleration = 70.0;   // km/h per second
    this.nitroAccel = 130.0;
    this.braking = 120.0;
    this.drag = 15.0;           // Rolling resistance / air drag
    this.steerAngle = 0.0;
    this.maxSteerAngle = 0.55;  // Radians
    this.yaw = 0.0;             // Car heading in world space

    // Suspension & Chassis Roll
    this.roll = 0.0;
    this.pitch = 0.0;

    // Transmission & RPM
    this.gear = 1;
    this.rpm = 900;
    this.gearRatios = [0, 45, 85, 130, 175, 220, 280]; // Speed thresholds for gears 1-6

    // Nitro
    this.nitroCharge = 100.0;   // 0 to 100%
    this.isNitroActive = false;
    this.nitroConsumptionRate = 35.0; // % per second
    this.nitroRechargeRate = 8.0;

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
    // 1. PBR Paint Material
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.colorHex,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    // Carbon fiber / Black trim material
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      metalness: 0.3,
      roughness: 0.4
    });

    // Dark tinted glass
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050810,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.0
    });

    // Chrome exhaust / alloy rim material
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.95,
      roughness: 0.15
    });

    // Tire rubber
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.85,
      metalness: 0.1
    });

    // Brake caliper (Neon orange/red)
    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      roughness: 0.3,
      metalness: 0.6
    });

    // --- MAIN CHASSIS BODY ---
    // Lower body (wedge aerodynamic profile)
    const lowerBodyGeo = new THREE.BoxGeometry(2.0, 0.42, 4.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, this.bodyMaterial);
    lowerBody.position.y = 0.22;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Aerodynamic Hood & Front Splitter
    const hoodGeo = new THREE.BoxGeometry(1.86, 0.22, 1.4);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 0.35, 1.4);
    hood.rotation.x = 0.08;
    hood.castShadow = true;
    this.chassisGroup.add(hood);

    const splitterGeo = new THREE.BoxGeometry(2.1, 0.08, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.06, 2.2);
    this.chassisGroup.add(splitter);

    // Cabin / Cockpit Roof (Sleek teardrop curve)
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.48, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.65, -0.2);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Roof scoop
    const scoopGeo = new THREE.BoxGeometry(0.35, 0.12, 0.8);
    const scoop = new THREE.Mesh(scoopGeo, carbonMaterial);
    scoop.position.set(0, 0.92, -0.4);
    this.chassisGroup.add(scoop);

    // Rear Engine Cover / Louvers
    const louverGeo = new THREE.BoxGeometry(1.5, 0.2, 1.2);
    const louver = new THREE.Mesh(louverGeo, carbonMaterial);
    louver.position.set(0, 0.45, -1.5);
    louver.rotation.x = -0.1;
    this.chassisGroup.add(louver);

    // Rear GT Wing / Spoiler
    const wingGeo = new THREE.BoxGeometry(2.1, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, carbonMaterial);
    wing.position.set(0, 0.85, -2.1);
    wing.castShadow = true;
    this.chassisGroup.add(wing);

    // Wing Struts
    const strutGeo = new THREE.BoxGeometry(0.06, 0.35, 0.15);
    const strutL = new THREE.Mesh(strutGeo, carbonMaterial);
    strutL.position.set(-0.6, 0.65, -2.05);
    const strutR = new THREE.Mesh(strutGeo, carbonMaterial);
    strutR.position.set(0.6, 0.65, -2.05);
    this.chassisGroup.add(strutL, strutR);

    // Rear Diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.9, 0.2, 0.5);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.12, -2.2);
    this.chassisGroup.add(diffuser);

    // --- LED HEADLIGHTS & PROJECTOR LIGHTS ---
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0x99e6ff });
    const hlGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.75, 0.36, 2.15);
    hlL.rotation.y = -0.2;
    const hlR = new THREE.Mesh(hlGeo, headlightMat);
    hlR.position.set(0.75, 0.36, 2.15);
    hlR.rotation.y = 0.2;
    this.chassisGroup.add(hlL, hlR);

    // Projected Forward Spotlights (lighting the road ahead)
    this.headlightSpotL = new THREE.SpotLight(0xaaddff, 3.5, 55, Math.PI / 7, 0.4, 1.2);
    this.headlightSpotL.position.set(-0.75, 0.38, 2.2);
    this.headlightSpotL.target.position.set(-0.75, 0, 30);
    this.chassisGroup.add(this.headlightSpotL);
    this.chassisGroup.add(this.headlightSpotL.target);

    this.headlightSpotR = new THREE.SpotLight(0xaaddff, 3.5, 55, Math.PI / 7, 0.4, 1.2);
    this.headlightSpotR.position.set(0.75, 0.38, 2.2);
    this.headlightSpotR.target.position.set(0.75, 0, 30);
    this.chassisGroup.add(this.headlightSpotR);
    this.chassisGroup.add(this.headlightSpotR.target);

    // --- LED TAILLIGHTS (Brake light bar) ---
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    const tlGeo = new THREE.BoxGeometry(1.85, 0.08, 0.1);
    this.taillightMesh = new THREE.Mesh(tlGeo, this.taillightMat);
    this.taillightMesh.position.set(0, 0.42, -2.22);
    this.chassisGroup.add(this.taillightMesh);

    // --- DUAL CHROME EXHAUST TIPS & FLAME EMITTER ANCHORS ---
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
    exhaustGeo.rotateX(Math.PI / 2);

    const exhL = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhL.position.set(-0.4, 0.18, -2.25);
    const exhR = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhR.position.set(0.4, 0.18, -2.25);
    this.chassisGroup.add(exhL, exhR);

    this.exhaustPoints = [
      new THREE.Vector3(-0.4, 0.18, -2.4),
      new THREE.Vector3(0.4, 0.18, -2.4)
    ];

    // Animated Nitro Flame Meshes
    const flameGeo = new THREE.ConeGeometry(0.12, 1.1, 16);
    flameGeo.rotateX(-Math.PI / 2);
    this.flameMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.0
    });
    this.flameL = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameL.position.copy(this.exhaustPoints[0]);
    this.flameR = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameR.position.copy(this.exhaustPoints[1]);
    this.chassisGroup.add(this.flameL, this.flameR);

    // --- 4 WHEEL ASSEMBLIES ---
    const wheelPositions = [
      { x: -1.02, y: 0.0, z: 1.35, isFront: true },   // Front Left
      { x: 1.02, y: 0.0, z: 1.35, isFront: true },    // Front Right
      { x: -1.05, y: 0.0, z: -1.35, isFront: false },  // Rear Left
      { x: 1.05, y: 0.0, z: -1.35, isFront: false }   // Rear Right
    ];

    const wheelRadius = 0.38;
    const wheelWidth = 0.32;
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.15);

    wheelPositions.forEach((wp) => {
      // Steering pivot group (turns around Y axis)
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wp.y, wp.z);

      // Rolling spin group (rotates around X axis)
      const spinGroup = new THREE.Group();

      const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
      tireMesh.castShadow = true;
      spinGroup.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, chromeMaterial);
      spinGroup.add(rimMesh);

      steerPivot.add(spinGroup);

      // Caliper stays upright
      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(wp.x > 0 ? -0.06 : 0.06, 0.15, 0.1);
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

  update(delta, input) {
    // 1. Process Steering Input
    // In this camera projection (chase camera behind car looking towards +Z):
    // Turning LEFT requires turning toward +X (positive yaw, positive wheel angle).
    // Input contract: input.steer < 0 is LEFT, input.steer > 0 is RIGHT.
    // Invert input.steer to align negative steering input with positive Three.js world yaw.
    const targetSteer = -(input.steer || 0.0) * this.maxSteerAngle;
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
      this.flameMat.opacity = 0.8 + Math.random() * 0.2;
      const flicker = 0.9 + Math.random() * 0.3;
      this.flameL.scale.set(flicker, flicker, flicker * 1.3);
      this.flameR.scale.set(flicker, flicker, flicker * 1.3);
    } else {
      this.flameMat.opacity = 0.0;
    }

    // 3. Acceleration & Speed Physics
    const throttle = typeof input.throttle === 'number' ? input.throttle : 1.0;
    const brake = typeof input.brake === 'number' ? input.brake : 0.0;
    const currentMaxSpeed = this.isNitroActive ? this.nitroMaxSpeed : this.maxSpeed;
    const currentAccel = this.isNitroActive ? this.nitroAccel : this.acceleration;

    if (brake > 0.1) {
      // Braking
      this.speed = Math.max(0.0, this.speed - (this.braking * brake) * delta);
      // Brighten taillights
      this.taillightMat.color.setHex(0xff0022);
    } else if (throttle > 0.05) {
      // Accelerating
      if (this.speed < currentMaxSpeed) {
        this.speed = Math.min(currentMaxSpeed, this.speed + (currentAccel * throttle) * delta);
      }
      this.taillightMat.color.setHex(0x660000);
    } else {
      // Coasting / Drag
      this.speed = Math.max(0.0, this.speed - this.drag * delta);
      this.taillightMat.color.setHex(0x440000);
    }

    // 4. Update Gear & RPM
    this._updateGearAndRpm();

    // 5. Turn Car & Lateral Movement
    const speedRatio = this.speed / this.maxSpeed;
    // Yaw heading changes proportional to steering and speed
    const yawRate = this.steerAngle * (speedRatio * 1.5 + 0.2);
    this.yaw += yawRate * delta * 1.8;
    this.mesh.rotation.y = this.yaw;

    // Move forward in world space
    const forwardDist = (this.speed * 1000 / 3600) * delta; // convert km/h to m/s
    this.mesh.position.x += Math.sin(this.yaw) * forwardDist;
    this.mesh.position.z += Math.cos(this.yaw) * forwardDist;

    // 6. Suspension Lean & Pitch
    // Chassis rolls away from turn direction
    const targetRoll = -this.steerAngle * speedRatio * 0.14;
    this.roll += (targetRoll - this.roll) * Math.min(1.0, delta * 10.0);
    this.chassisGroup.rotation.z = this.roll;

    // Chassis pitches back on accel, dips on brake
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
    this.rpm = Math.min(8500, Math.round(2000 + progressInGear * 6000));
  }
}
