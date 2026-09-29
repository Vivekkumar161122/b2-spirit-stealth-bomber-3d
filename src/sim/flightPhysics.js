import * as THREE from 'three';

/**
 * Aerodynamic Flight Dynamics Model for B-2 Spirit Stealth Bomber
 * Realistic fly-by-wire smoothing, lift, drag, Mach calculations, and inertia
 */
export class FlightPhysics {
  constructor() {
    // Aircraft State
    this.position = new THREE.Vector3(0, 1800, 0); // Altitude in meters (~6,000 ft)
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    this.velocity = new THREE.Vector3(0, 0, -180); // Forward airspeed m/s (~350 knots / Mach 0.55)
    this.speed = 180; // m/s
    this.mach = 0.55;
    this.altitude = 1800; // meters
    this.gForce = 1.0;
    this.climbRate = 0; // m/s

    // Control Inputs (-1.0 to 1.0)
    this.inputs = {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0.65, // 0.0 to 1.0 (Dry thrust)
      airbrake: false,
      autopilot: false
    };

    // Angular velocities (rad/s)
    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;

    // Aircraft physical specs (B-2 Spirit)
    this.mass = 120000; // kg (Loaded mission weight)
    this.maxThrust = 4 * 77000; // 4x F118-GE-100 (308 kN total dry thrust)
    this.wingArea = 478; // m²
    this.soundSpeedAtSeaLevel = 340.29; // m/s

    // Flight limits
    this.maxSpeed = 280; // m/s (~Mach 0.95 max subsonic cruise)
    this.minSpeed = 65; // m/s (Stall speed with flaps)
    this.isStalled = false;
    this.isOnGround = false;
  }

  setInputs(pitch, roll, yaw, throttle, airbrake) {
    this.inputs.pitch = pitch;
    this.inputs.roll = roll;
    this.inputs.yaw = yaw;
    if (throttle !== undefined) this.inputs.throttle = THREE.MathUtils.clamp(throttle, 0.0, 1.0);
    if (airbrake !== undefined) this.inputs.airbrake = !!airbrake;
  }

  toggleAutopilot() {
    this.inputs.autopilot = !this.inputs.autopilot;
    return this.inputs.autopilot;
  }

  update(delta, groundLevel = 0, isGearDown = false) {
    if (delta <= 0 || delta > 0.1) delta = 0.016;

    // 1. Atmosphere calculations based on altitude
    const altKm = Math.max(0, this.position.y) / 1000;
    // Standard atmosphere density drop: rho ≈ rho0 * e^(-h / 8.5km)
    const airDensity = 1.225 * Math.exp(-altKm / 8.5);
    // Speed of sound drops with altitude
    const speedOfSound = Math.max(295, 340.29 - 4.0 * altKm);

    // 2. Control response with Fly-By-Wire stability augmentation
    let targetPitchRate = this.inputs.pitch * 0.85; // rad/s max pitch
    let targetRollRate = -this.inputs.roll * 1.4; // rad/s roll
    let targetYawRate = -this.inputs.yaw * 0.45; // rad/s yaw

    // Autopilot: Auto level wings and maintain altitude
    if (this.inputs.autopilot) {
      const currentBank = this.rotation.z;
      const currentPitch = this.rotation.x;
      targetRollRate = -currentBank * 1.5;
      targetPitchRate = -currentPitch * 1.2;
      // Auto throttle for cruise
      this.inputs.throttle = 0.65;
    }

    // Dynamic pressure control authority (higher speed = crisper control, stall = sluggish)
    const dynamicPressure = 0.5 * airDensity * (this.speed * this.speed);
    const controlAuth = THREE.MathUtils.clamp(dynamicPressure / 15000, 0.25, 1.2);

    this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, targetPitchRate * controlAuth, delta * 5.0);
    this.rollRate = THREE.MathUtils.lerp(this.rollRate, targetRollRate * controlAuth, delta * 6.0);
    this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYawRate * controlAuth, delta * 4.0);

    // 3. Update Orientations
    // Apply local pitch, yaw, roll rotations
    const deltaRot = new THREE.Quaternion();
    const rotEuler = new THREE.Euler(
      this.pitchRate * delta,
      this.yawRate * delta,
      this.rollRate * delta,
      'YXZ'
    );
    deltaRot.setFromEuler(rotEuler);
    this.quaternion.multiply(deltaRot);
    this.rotation.setFromQuaternion(this.quaternion, 'YXZ');

    // 4. Thrust, Drag & Aerodynamic Forces
    // Aircraft forward vector in world coordinates
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);

    // Thrust force
    const thrustForce = this.inputs.throttle * this.maxThrust;

    // Parasitic & Induced Drag
    let dragCoeff = 0.016; // Extremely low stealth flying wing zero-lift drag
    if (this.inputs.airbrake) dragCoeff += 0.055; // Split decelerons deployed
    if (isGearDown) dragCoeff += 0.035; // Landing gear drag

    // Transonic wave drag rise near Mach 0.9+
    this.mach = this.speed / speedOfSound;
    if (this.mach > 0.88) {
      dragCoeff += Math.pow((this.mach - 0.88) * 10, 2) * 0.08;
    }

    const dragForce = 0.5 * airDensity * (this.speed * this.speed) * this.wingArea * dragCoeff;

    // Lift force (acts along aircraft 'up' axis)
    // Angle of attack (AoA) approximation based on pitch and climb
    const liftCoeff = 0.28 + (this.inputs.pitch * 0.35);
    const liftForce = 0.5 * airDensity * (this.speed * this.speed) * this.wingArea * liftCoeff;

    // Acceleration vector
    const accel = new THREE.Vector3();
    accel.addScaledVector(forward, (thrustForce - dragForce) / this.mass);
    accel.addScaledVector(up, liftForce / this.mass);
    accel.y -= 9.81; // Gravity

    // Integrate Velocity
    this.velocity.addScaledVector(accel, delta);

    // Align velocity slightly with aircraft nose direction (Aerodynamic weather-vaning)
    const currentSpeed = this.velocity.length();
    this.velocity.lerp(forward.clone().multiplyScalar(currentSpeed), delta * 3.5);

    this.speed = this.velocity.length();
    this.climbRate = this.velocity.y;

    // G-Force calculation
    const liftAccel = liftForce / this.mass;
    this.gForce = Math.max(0.1, (liftAccel / 9.81));

    // Stall check
    this.isStalled = (this.speed < this.minSpeed && this.position.y > groundLevel + 10);

    // 5. Integrate Position
    this.position.addScaledVector(this.velocity, delta);
    this.altitude = this.position.y;

    // Ground collision / Runway interaction
    const minAlt = groundLevel + (isGearDown ? 3.2 : 1.2);
    if (this.position.y <= minAlt) {
      this.position.y = minAlt;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.isOnGround = true;

      // Ground friction
      this.velocity.x *= 0.98;
      this.velocity.z *= 0.98;

      // Keep level on ground
      this.rotation.z *= 0.85;
      this.rotation.x = Math.max(-0.05, Math.min(0.12, this.rotation.x));
      this.quaternion.setFromEuler(this.rotation);
    } else {
      this.isOnGround = false;
    }
  }

  reset(position = new THREE.Vector3(0, 1800, 0), speed = 180) {
    this.position.copy(position);
    this.rotation.set(0, 0, 0);
    this.quaternion.identity();
    this.velocity.set(0, 0, -speed);
    this.speed = speed;
    this.inputs.throttle = 0.65;
    this.inputs.pitch = 0;
    this.inputs.roll = 0;
    this.inputs.yaw = 0;
  }
}
