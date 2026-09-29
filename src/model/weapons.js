import * as THREE from 'three';

/**
 * Weapons Bay, Common Strategic Rotary Launcher (CSRL), Munitions & Ballistics System
 */
export class WeaponsSystem {
  constructor(materials, scene) {
    this.materials = materials;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WeaponsSystem';

    this.bayDoorsOpen = 0.0; // 0.0 = Closed, 1.0 = Fully Open
    this.targetDoors = 0.0;
    this.doorSpeed = 1.2;

    this.activeBombs = []; // Munitions currently falling in the world
    this.explosions = []; // Active shockwaves & debris particles

    // Create twin weapons bays (Left & Right)
    this.leftBay = this.createWeaponsBay(true);
    this.rightBay = this.createWeaponsBay(false);

    this.group.add(this.leftBay.group);
    this.group.add(this.rightBay.group);

    // Current weapon type: 'jdam' or 'jassm'
    this.weaponType = 'jdam';
    this.rotaryIndex = 0;
  }

  createJDAM() {
    const bombGroup = new THREE.Group();
    bombGroup.name = 'JDAM_GBU31';

    // Main 2,000 lb bomb body (Ogive nose + cylindrical body)
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.4, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.materials.weapon);
    body.castShadow = true;
    bombGroup.add(body);

    // Aerodynamic nose cone (GPS/INS guidance seeker)
    const noseGeo = new THREE.ConeGeometry(0.24, 0.7, 16);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.translate(0, 0, 1.55);
    const nose = new THREE.Mesh(noseGeo, this.materials.weapon);
    nose.castShadow = true;
    bombGroup.add(nose);

    // Yellow high-explosive identification ring
    const ringGeo = new THREE.CylinderGeometry(0.245, 0.245, 0.15, 16);
    ringGeo.rotateX(Math.PI / 2);
    ringGeo.translate(0, 0, 1.0);
    const ring = new THREE.Mesh(ringGeo, this.materials.weaponAcc);
    bombGroup.add(ring);

    // Tail kit (KMU-556 GPS/INS guidance strakes and tailfins)
    const tailSectionGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.8, 16);
    tailSectionGeo.rotateX(Math.PI / 2);
    tailSectionGeo.translate(0, 0, -1.5);
    const tailSection = new THREE.Mesh(tailSectionGeo, this.materials.weapon);
    bombGroup.add(tailSection);

    // 4 Cruciform Tail Control Fins
    for (let i = 0; i < 4; i++) {
      const finGeo = new THREE.BoxGeometry(0.04, 0.45, 0.4);
      finGeo.translate(0, 0.3, -1.6);
      const fin = new THREE.Mesh(finGeo, this.materials.weapon);
      fin.rotation.z = (i * Math.PI) / 2;
      bombGroup.add(fin);
    }

    return bombGroup;
  }

  createJASSM() {
    const missileGroup = new THREE.Group();
    missileGroup.name = 'AGM158_JASSM';

    // Faceted Stealth Fuselage
    const bodyGeo = new THREE.BoxGeometry(0.38, 0.32, 3.2);
    const body = new THREE.Mesh(bodyGeo, this.materials.weapon);
    missileGroup.add(body);

    // Chiseled Stealth Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.28, 0.8, 4);
    noseGeo.rotateY(Math.PI / 4);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.translate(0, 0, 2.0);
    const nose = new THREE.Mesh(noseGeo, this.materials.weapon);
    missileGroup.add(nose);

    // Folding Stealth Wings (Extended)
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.35), this.materials.weapon);
    wingL.position.set(-0.7, 0.1, 0);
    missileGroup.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.35), this.materials.weapon);
    wingR.position.set(0.7, 0.1, 0);
    missileGroup.add(wingR);

    // Stealth Vertical Stabilizer
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.4), this.materials.weapon);
    fin.position.set(0, 0.3, -1.4);
    missileGroup.add(fin);

    return missileGroup;
  }

  createWeaponsBay(isLeft = true) {
    const group = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    group.position.set(sign * 1.35, -0.4, 0.2);

    // Rotary Launcher Axle (CSRL)
    const axleGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.2, 16);
    axleGeo.rotateX(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeo, this.materials.rotary);
    group.add(axle);

    // Rotary Carousel Hubs
    const hubFront = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 8), this.materials.rotary);
    hubFront.rotateX(Math.PI / 2);
    hubFront.position.set(0, 0, 1.2);
    group.add(hubFront);

    const hubRear = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 8), this.materials.rotary);
    hubRear.rotateX(Math.PI / 2);
    hubRear.position.set(0, 0, -1.2);
    group.add(hubRear);

    // Rotary Pylon arms with 8 weapon mount stations
    const weaponsGroup = new THREE.Group();
    group.add(weaponsGroup);

    const munitionMeshes = [];
    const numStations = 8;
    const radius = 0.65;

    for (let i = 0; i < numStations; i++) {
      const angle = (i / numStations) * Math.PI * 2;
      const station = new THREE.Group();
      station.position.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0);
      station.rotation.z = -angle;

      const weapon = this.createJDAM();
      station.add(weapon);
      weaponsGroup.add(station);
      munitionMeshes.push(station);
    }

    // Serrated Bay Doors (Twin clamshell doors per bay)
    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-0.75, -0.25, 0);
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 4.4), this.materials.body);
    leftDoor.position.set(0.35, 0, 0);
    leftDoorPivot.add(leftDoor);
    group.add(leftDoorPivot);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(0.75, -0.25, 0);
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 4.4), this.materials.body);
    rightDoor.position.set(-0.35, 0, 0);
    rightDoorPivot.add(rightDoor);
    group.add(rightDoorPivot);

    return {
      group,
      weaponsGroup,
      munitionMeshes,
      leftDoorPivot,
      rightDoorPivot,
      isLeft
    };
  }

  toggleBayDoors() {
    this.targetDoors = this.targetDoors === 0.0 ? 1.0 : 0.0;
    return this.targetDoors === 1.0;
  }

  setDoors(open) {
    this.targetDoors = open ? 1.0 : 0.0;
  }

  dropBomb(aircraftPosition, aircraftRotation, aircraftVelocity) {
    // Open bay doors automatically if closed
    if (this.bayDoorsOpen < 0.8) {
      this.targetDoors = 1.0;
    }

    // Create a physical falling weapon in world space
    const bombMesh = this.weaponType === 'jassm' ? this.createJASSM() : this.createJDAM();

    // Initial position slightly below bomb bay
    const spawnPos = aircraftPosition.clone().add(
      new THREE.Vector3((Math.random() - 0.5) * 1.5, -1.8, (Math.random() - 0.5) * 1.0)
        .applyEuler(aircraftRotation)
    );

    bombMesh.position.copy(spawnPos);
    bombMesh.rotation.copy(aircraftRotation);

    // Initial velocity from aircraft + slight downward ejection impulse
    const forwardVector = new THREE.Vector3(0, 0, -1).applyEuler(aircraftRotation);
    const velocity = forwardVector.multiplyScalar(aircraftVelocity || 80);
    velocity.y -= 4.0; // Ejection piston push

    // Weapon trail smoke particles
    const trailPoints = [];
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    this.scene.add(trailLine);

    this.scene.add(bombMesh);

    const bomb = {
      mesh: bombMesh,
      velocity: velocity,
      position: spawnPos,
      rotation: aircraftRotation.clone(),
      angularVelocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1, 0),
      age: 0,
      lifetime: 25.0,
      trailLine,
      trailPoints
    };

    this.activeBombs.push(bomb);

    // Rotate internal rotary launcher to next weapon slot
    this.rotaryIndex++;
    return bomb;
  }

  createExplosion(position) {
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);

    // 1. Expanding Fiery Shockwave Sphere
    const shockwaveGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    explosionGroup.add(shockwave);

    // 2. White hot core flash
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    explosionGroup.add(core);

    // 3. Ground shockwave ring
    const ringGeo = new THREE.RingGeometry(0.5, 2.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.2;
    explosionGroup.add(ring);

    // 4. Flying debris spark particles
    const sparkCount = 35;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = [];

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const spd = Math.random() * 25 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // Shoot upward and outward
      sparkVelocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.cos(phi) * spd,
          Math.sin(phi) * Math.sin(theta) * spd
        )
      );
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffbb44,
      size: 0.6,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    explosionGroup.add(sparks);

    // Dynamic point light for dramatic explosion glow
    const light = new THREE.PointLight(0xff7722, 12, 120);
    explosionGroup.add(light);

    this.scene.add(explosionGroup);

    this.explosions.push({
      group: explosionGroup,
      shockwave,
      core,
      ring,
      sparks,
      sparkVelocities,
      light,
      age: 0,
      maxAge: 3.5,
      position: position.clone()
    });
  }

  update(delta, groundHeight = 0) {
    // 1. Animate Bay Doors
    if (this.bayDoorsOpen !== this.targetDoors) {
      const step = (delta / this.doorSpeed) * Math.sign(this.targetDoors - this.bayDoorsOpen);
      if (Math.abs(this.targetDoors - this.bayDoorsOpen) <= Math.abs(step)) {
        this.bayDoorsOpen = this.targetDoors;
      } else {
        this.bayDoorsOpen += step;
      }
    }

    const doorAngle = this.bayDoorsOpen * (Math.PI * 0.55);
    this.leftBay.leftDoorPivot.rotation.z = -doorAngle;
    this.leftBay.rightDoorPivot.rotation.z = doorAngle;
    this.rightBay.leftDoorPivot.rotation.z = -doorAngle;
    this.rightBay.rightDoorPivot.rotation.z = doorAngle;

    // Rotate internal rotary launchers smoothly
    const targetRotary = this.rotaryIndex * (Math.PI / 4);
    this.leftBay.weaponsGroup.rotation.z = THREE.MathUtils.lerp(
      this.leftBay.weaponsGroup.rotation.z,
      targetRotary,
      delta * 4.0
    );
    this.rightBay.weaponsGroup.rotation.z = THREE.MathUtils.lerp(
      this.rightBay.weaponsGroup.rotation.z,
      -targetRotary,
      delta * 4.0
    );

    // 2. Update active falling bombs physics & trajectories
    for (let i = this.activeBombs.length - 1; i >= 0; i--) {
      const b = this.activeBombs[i];
      b.age += delta;

      // Gravity & Aerodynamic Drag
      b.velocity.y -= 9.81 * 2.2 * delta; // Accelerate downward
      b.velocity.x *= Math.pow(0.992, delta * 60);
      b.velocity.z *= Math.pow(0.992, delta * 60);

      // Move weapon
      b.position.addScaledVector(b.velocity, delta);
      b.mesh.position.copy(b.position);

      // Aerodynamic pitch alignment with velocity vector
      const speed = b.velocity.length();
      if (speed > 1.0) {
        const dir = b.velocity.clone().normalize();
        const targetRot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
        b.mesh.quaternion.slerp(targetRot, delta * 4.0);
      }

      // Add trail point
      if (b.age % 0.05 < delta) {
        b.trailPoints.push(b.position.clone());
        if (b.trailPoints.length > 40) b.trailPoints.shift();

        const positions = new Float32Array(b.trailPoints.length * 3);
        for (let j = 0; j < b.trailPoints.length; j++) {
          positions[j * 3] = b.trailPoints[j].x;
          positions[j * 3 + 1] = b.trailPoints[j].y;
          positions[j * 3 + 2] = b.trailPoints[j].z;
        }
        b.trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        b.trailLine.geometry.computeBoundingSphere();
      }

      // Impact detection with ground terrain
      if (b.position.y <= groundHeight || b.age > b.lifetime) {
        this.createExplosion(b.position);
        this.scene.remove(b.mesh);
        this.scene.remove(b.trailLine);
        b.mesh.geometry?.dispose();
        b.trailLine.geometry?.dispose();
        this.activeBombs.splice(i, 1);
      }
    }

    // 3. Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += delta;
      const progress = exp.age / exp.maxAge;

      if (progress >= 1.0) {
        this.scene.remove(exp.group);
        this.explosions.splice(i, 1);
        continue;
      }

      // Expand shockwave
      const scale = 1.0 + progress * 24.0;
      exp.shockwave.scale.set(scale, scale, scale);
      exp.shockwave.material.opacity = (1.0 - progress) * 0.9;

      // Core flash shrinks and fades quickly
      const coreScale = Math.max(0.01, 1.0 - progress * 3.0);
      exp.core.scale.set(coreScale * 3.0, coreScale * 3.0, coreScale * 3.0);
      exp.core.material.opacity = Math.max(0, 1.0 - progress * 2.5);

      // Expanding ground ring
      const ringScale = 1.0 + progress * 18.0;
      exp.ring.scale.set(ringScale, ringScale, ringScale);
      exp.ring.material.opacity = Math.pow(1.0 - progress, 2.0) * 0.8;

      // Spark debris particles
      const sparkPosAttr = exp.sparks.geometry.attributes.position;
      const sparkPos = sparkPosAttr.array;
      for (let j = 0; j < exp.sparkVelocities.length; j++) {
        const vel = exp.sparkVelocities[j];
        vel.y -= 25.0 * delta; // Gravity on debris
        sparkPos[j * 3] += vel.x * delta;
        sparkPos[j * 3 + 1] += vel.y * delta;
        sparkPos[j * 3 + 2] += vel.z * delta;
      }
      sparkPosAttr.needsUpdate = true;
      exp.sparks.material.opacity = (1.0 - progress);

      // Light fade
      exp.light.intensity = (1.0 - progress) * 12.0;
    }
  }
}
