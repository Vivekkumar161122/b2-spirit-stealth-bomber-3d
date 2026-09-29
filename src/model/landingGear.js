import * as THREE from 'three';

/**
 * Detailed Tricycle Landing Gear System for B-2 Spirit Bomber
 * Nose Gear (Dual wheel) + Main Gear (Dual 4-wheel bogies)
 */
export class LandingGearSystem {
  constructor(materials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'LandingGearSystem';

    this.gearState = 0.0; // 0.0 = Retracted (In flight), 1.0 = Fully Extended (On ground)
    this.targetState = 0.0;
    this.transitionSpeed = 0.8; // seconds to transition

    this.noseGear = this.createNoseGear();
    this.leftMainGear = this.createMainGear(true);
    this.rightMainGear = this.createMainGear(false);

    this.group.add(this.noseGear.group);
    this.group.add(this.leftMainGear.group);
    this.group.add(this.rightMainGear.group);

    // Initial state retracted
    this.update(0);
  }

  createWheel(radius = 0.45, width = 0.28) {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, this.materials.tire);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim / Hub
    const rimGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, this.materials.rim);
    rim.castShadow = true;
    wheelGroup.add(rim);

    // Brake disc / Hub cap detail
    const hubGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, width * 1.1, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, this.materials.gearBody);
    wheelGroup.add(hub);

    return wheelGroup;
  }

  createNoseGear() {
    const group = new THREE.Group();
    group.position.set(0, -0.6, 5.8);

    // Pivot root for retraction
    const pivot = new THREE.Group();
    group.add(pivot);

    // Main vertical oleo shock strut
    const upperStrutGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 16);
    upperStrutGeo.translate(0, -0.9, 0);
    const upperStrut = new THREE.Mesh(upperStrutGeo, this.materials.gearBody);
    upperStrut.castShadow = true;
    pivot.add(upperStrut);

    // Lower chrome piston
    const lowerPistonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16);
    lowerPistonGeo.translate(0, -1.8, 0);
    const lowerPiston = new THREE.Mesh(lowerPistonGeo, this.materials.strutChrome);
    pivot.add(lowerPiston);

    // Axle assembly
    const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12);
    axleGeo.rotateZ(Math.PI / 2);
    axleGeo.translate(0, -2.2, 0);
    const axle = new THREE.Mesh(axleGeo, this.materials.gearBody);
    pivot.add(axle);

    // Dual nose wheels
    const leftWheel = this.createWheel(0.35, 0.22);
    leftWheel.position.set(-0.32, -2.2, 0);
    pivot.add(leftWheel);

    const rightWheel = this.createWheel(0.35, 0.22);
    rightWheel.position.set(0.32, -2.2, 0);
    pivot.add(rightWheel);

    // Torque scissors linkage
    const scissorUpper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.12), this.materials.gearBody);
    scissorUpper.position.set(0, -1.35, 0.15);
    scissorUpper.rotation.x = Math.PI / 6;
    pivot.add(scissorUpper);

    const scissorLower = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.12), this.materials.gearBody);
    scissorLower.position.set(0, -1.65, 0.15);
    scissorLower.rotation.x = -Math.PI / 6;
    pivot.add(scissorLower);

    // Taxi / Landing floodlight
    const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.15, 12), this.materials.gearBody);
    lightHousing.rotateX(Math.PI / 2);
    lightHousing.position.set(0, -1.1, 0.18);
    const lightLens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), this.materials.strobeWhite);
    lightLens.position.set(0, -1.1, 0.26);
    pivot.add(lightHousing);
    pivot.add(lightLens);

    // Nose Gear Bay Doors (Serrated stealth edges)
    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-0.4, 0, 0);
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 2.2), this.materials.body);
    leftDoor.position.set(0, 0, -0.4);
    leftDoorPivot.add(leftDoor);
    group.add(leftDoorPivot);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(0.4, 0, 0);
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 2.2), this.materials.body);
    rightDoor.position.set(0, 0, -0.4);
    rightDoorPivot.add(rightDoor);
    group.add(rightDoorPivot);

    return {
      group,
      pivot,
      leftDoorPivot,
      rightDoorPivot
    };
  }

  createMainGear(isLeft = true) {
    const group = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    group.position.set(sign * 3.8, -0.6, -0.8);

    // Pivot root for retraction into fuselage
    const pivot = new THREE.Group();
    group.add(pivot);

    // Massive main trunnion strut
    const mainStrutGeo = new THREE.CylinderGeometry(0.18, 0.15, 2.2, 16);
    mainStrutGeo.translate(0, -1.1, 0);
    const mainStrut = new THREE.Mesh(mainStrutGeo, this.materials.gearBody);
    mainStrut.castShadow = true;
    pivot.add(mainStrut);

    // Chrome hydraulic cylinder
    const pistonGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16);
    pistonGeo.translate(0, -2.0, 0);
    const piston = new THREE.Mesh(pistonGeo, this.materials.strutChrome);
    pivot.add(piston);

    // 4-Wheel Bogie Beam / Truck
    const bogiePivot = new THREE.Group();
    bogiePivot.position.set(0, -2.4, 0);
    pivot.add(bogiePivot);

    const bogieBeamGeo = new THREE.BoxGeometry(0.35, 0.2, 1.8);
    const bogieBeam = new THREE.Mesh(bogieBeamGeo, this.materials.gearBody);
    bogieBeam.castShadow = true;
    bogiePivot.add(bogieBeam);

    // Front & Rear Axles
    const fAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12);
    fAxleGeo.rotateZ(Math.PI / 2);
    fAxleGeo.translate(0, 0, 0.6);
    const fAxle = new THREE.Mesh(fAxleGeo, this.materials.gearBody);
    bogiePivot.add(fAxle);

    const rAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12);
    rAxleGeo.rotateZ(Math.PI / 2);
    rAxleGeo.translate(0, 0, -0.6);
    const rAxle = new THREE.Mesh(rAxleGeo, this.materials.gearBody);
    bogiePivot.add(rAxle);

    // 4 Main Wheels (Dual tandem)
    const wheelParams = [
      { x: -0.52, z: 0.6 },
      { x: 0.52, z: 0.6 },
      { x: -0.52, z: -0.6 },
      { x: 0.52, z: -0.6 }
    ];

    wheelParams.forEach(p => {
      const wheel = this.createWheel(0.52, 0.32);
      wheel.position.set(p.x, 0, p.z);
      bogiePivot.add(wheel);
    });

    // Hydraulic retract actuator brace
    const braceGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12);
    braceGeo.translate(0, -0.9, 0);
    const brace = new THREE.Mesh(braceGeo, this.materials.gearBody);
    brace.position.set(-sign * 0.4, 0, 0.4);
    brace.rotation.z = -sign * 0.4;
    pivot.add(brace);

    // Main Gear Bay Doors
    const outerDoorPivot = new THREE.Group();
    outerDoorPivot.position.set(sign * 1.2, 0, 0);
    const outerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 2.6), this.materials.body);
    outerDoor.position.set(0, 0, 0);
    outerDoorPivot.add(outerDoor);
    group.add(outerDoorPivot);

    const innerDoorPivot = new THREE.Group();
    innerDoorPivot.position.set(-sign * 0.6, 0, 0);
    const innerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 2.6), this.materials.body);
    innerDoor.position.set(0, 0, 0);
    innerDoorPivot.add(innerDoor);
    group.add(innerDoorPivot);

    return {
      group,
      pivot,
      bogiePivot,
      outerDoorPivot,
      innerDoorPivot,
      isLeft
    };
  }

  toggleGear() {
    this.targetState = this.targetState === 0.0 ? 1.0 : 0.0;
    return this.targetState === 1.0;
  }

  setGearState(state) {
    this.targetState = state ? 1.0 : 0.0;
  }

  update(delta) {
    if (this.gearState !== this.targetState) {
      const step = (delta / this.transitionSpeed) * Math.sign(this.targetState - this.gearState);
      if (Math.abs(this.targetState - this.gearState) <= Math.abs(step)) {
        this.gearState = this.targetState;
      } else {
        this.gearState += step;
      }
    }

    const t = this.gearState; // 0.0 = retracted, 1.0 = extended

    // Nose Gear Animation
    // Retracts forward into the nose
    this.noseGear.pivot.rotation.x = -(1.0 - t) * (Math.PI * 0.52);
    // Doors open at t > 0.05 and open outward
    const noseDoorAngle = Math.min(1.0, (1.0 - Math.abs(t - 0.5) * 2) * 1.5 + (t > 0.1 ? 0.8 : 0));
    this.noseGear.leftDoorPivot.rotation.z = -noseDoorAngle * (Math.PI * 0.45);
    this.noseGear.rightDoorPivot.rotation.z = noseDoorAngle * (Math.PI * 0.45);

    // Main Gear Animation
    // Retracts inward/forward into the wing root
    const mainExtAngle = (1.0 - t) * (Math.PI * 0.48);
    this.leftMainGear.pivot.rotation.z = -mainExtAngle;
    this.rightMainGear.pivot.rotation.z = mainExtAngle;

    // Bogie tilt during retraction (truck tilts down to fit in bay)
    const bogieTilt = (1.0 - t) * (Math.PI * 0.22);
    this.leftMainGear.bogiePivot.rotation.x = bogieTilt;
    this.rightMainGear.bogiePivot.rotation.x = bogieTilt;

    // Main doors open
    const mainDoorAngle = (1.0 - Math.pow(1.0 - t, 2)) * (Math.PI * 0.48);
    this.leftMainGear.outerDoorPivot.rotation.z = -mainDoorAngle;
    this.leftMainGear.innerDoorPivot.rotation.z = mainDoorAngle * 0.8;

    this.rightMainGear.outerDoorPivot.rotation.z = mainDoorAngle;
    this.rightMainGear.innerDoorPivot.rotation.z = -mainDoorAngle * 0.8;
  }
}
