import * as THREE from 'three';
import { LandingGearSystem } from './landingGear.js';
import { WeaponsSystem } from './weapons.js';

/**
 * Procedural High-Fidelity 3D B-2 Spirit Stealth Bomber Model
 * Real-world scale: Wingspan 52.4m, Length 21.0m, Height 5.18m
 */
export class B2Bomber {
  constructor(materialManager, scene) {
    this.materialManager = materialManager;
    this.materials = materialManager.materials;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = 'B2_Spirit_Stealth_Bomber';

    // Subsystems
    this.landingGear = new LandingGearSystem(this.materials);
    this.weapons = new WeaponsSystem(this.materials, scene);

    // Control surfaces references
    this.controlSurfaces = {
      leftDragRudderUpper: null,
      leftDragRudderLower: null,
      rightDragRudderUpper: null,
      rightDragRudderLower: null,
      leftElevon: null,
      rightElevon: null,
      beaverTail: null
    };

    // Engine exhaust glow meshes
    this.exhaustGlows = [];

    // Vapor trails
    this.vaporTrails = [];

    // Build the complete aircraft
    this.buildAirframe();
    this.buildCockpit();
    this.buildIntakesAndExhausts();
    this.buildControlSurfaces();
    this.buildNavigationLights();
    this.buildInternalXRayStructures();

    // Attach Landing Gear and Weapons
    this.group.add(this.landingGear.group);
    this.group.add(this.weapons.group);

    // Airframe visual mode: 'standard', 'xray', 'rcs'
    this.visualMode = 'standard';

    // Animation & control state
    this.state = {
      throttle: 0.5,
      pitch: 0,
      roll: 0,
      yaw: 0,
      airbrake: 0,
      stealthActive: true
    };
  }

  buildAirframe() {
    // We construct the iconic Flying Wing 3D geometry using high-density parametric grid
    // Leading edge: 33° sweep
    // Trailing edge: 12-segment W-tail
    const span = 52.4; // Total wingspan
    const halfSpan = span / 2; // 26.2
    const length = 21.0; // Total length
    const noseZ = 10.5;
    const tailZ = -10.5;

    // We build the body with a custom high-poly geometry for smooth blended contours
    const uSteps = 48; // Spanwise divisions
    const vSteps = 36; // Chordwise divisions

    const vertices = [];
    const uvs = [];
    const normals = [];
    const indices = [];

    // Helper functions for B-2 planform boundary
    const getLeadingEdgeZ = (x) => {
      const absX = Math.abs(x);
      // Sweep angle ~33 degrees: tan(33°) ≈ 0.6494
      // x / tan(57°) or z = noseZ - absX * tan(33°)
      return noseZ - absX * Math.tan(33.05 * Math.PI / 180);
    };

    const getTrailingEdgeZ = (x) => {
      const absX = Math.abs(x);
      // 12-facet Double-W trailing edge
      // Segment 1 (Wing tip to outer facet): 26.2 down to 18.2
      if (absX >= 18.2) {
        const t = (absX - 18.2) / (26.2 - 18.2);
        return -3.8 - t * 2.8; // -3.8 at 18.2 to -6.6 at 26.2
      }
      // Segment 2 (Outer notch forward): 18.2 down to 12.4
      if (absX >= 12.4) {
        const t = (absX - 12.4) / (18.2 - 12.4);
        return -7.6 + t * 3.8; // -7.6 at 12.4 to -3.8 at 18.2
      }
      // Segment 3 (Middle notch back): 12.4 down to 6.6
      if (absX >= 6.6) {
        const t = (absX - 6.6) / (12.4 - 6.6);
        return -3.8 - (1 - t) * 3.8; // -3.8 at 6.6 to -7.6 at 12.4
      }
      // Segment 4 (Inboard notch forward to beaver tail root): 6.6 down to 2.2
      if (absX >= 2.2) {
        const t = (absX - 2.2) / (6.6 - 2.2);
        return -7.8 + t * 4.0; // -7.8 at 2.2 to -3.8 at 6.6
      }
      // Segment 5 (Beaver tail apex): 2.2 to 0
      const t = absX / 2.2;
      return tailZ + t * 2.7; // -10.5 at center (x=0) to -7.8 at x=2.2
    };

    const getThicknessProfile = (x, chordFrac, isUpper) => {
      const absX = Math.abs(x);
      const spanFrac = absX / halfSpan;

      // Base thickness drops with span (Thick center lifting body, thin wingtips)
      let maxThick = (1.0 - Math.pow(spanFrac, 0.8)) * 2.8 + 0.35;

      // Cockpit hump at center (x < 2.5, chordFrac 0.15 to 0.45)
      if (absX < 2.8 && chordFrac > 0.1 && chordFrac < 0.55) {
        const humpX = Math.cos((absX / 2.8) * Math.PI * 0.5);
        const humpZ = Math.sin(((chordFrac - 0.1) / 0.45) * Math.PI);
        if (isUpper) {
          maxThick += humpX * humpZ * 1.35;
        } else {
          maxThick += humpX * humpZ * 0.3;
        }
      }

      // Twin Engine Nacelle Humps (x between 2.8 and 6.8, chordFrac 0.25 to 0.8)
      if (absX >= 2.6 && absX <= 7.2 && chordFrac > 0.2 && chordFrac < 0.85) {
        const nacelleCenter = 4.8;
        const nacelleW = 2.2;
        const nacelleDist = Math.abs(absX - nacelleCenter) / nacelleW;
        if (nacelleDist <= 1.0) {
          const nacelleX = Math.cos(nacelleDist * Math.PI * 0.5);
          const nacelleZ = Math.sin(((chordFrac - 0.2) / 0.65) * Math.PI);
          if (isUpper) {
            maxThick += nacelleX * nacelleZ * 1.05;
          }
        }
      }

      // Aerodynamic camber profile (supercritical reflexed airfoil)
      // 4 * t * (1-t) parabolic
      let airfoil = Math.sin(chordFrac * Math.PI);
      if (chordFrac > 0.3) {
        airfoil = Math.pow(Math.sin(chordFrac * Math.PI), 0.85);
      }

      let y = airfoil * maxThick;
      if (isUpper) {
        // Flatten top trailing edge slightly for stealth exhaust
        return y * 0.72;
      } else {
        return -y * 0.48;
      }
    };

    // Generate Upper Surface Mesh
    const upperVertsStart = vertices.length / 3;
    for (let j = 0; j <= vSteps; j++) {
      const v = j / vSteps; // 0 = Leading edge, 1 = Trailing edge
      for (let i = 0; i <= uSteps; i++) {
        const u = i / uSteps; // 0 = Left tip, 0.5 = Center, 1 = Right tip
        const x = (u - 0.5) * span;
        const leZ = getLeadingEdgeZ(x);
        const teZ = getTrailingEdgeZ(x);
        const z = THREE.MathUtils.lerp(leZ, teZ, v);
        const y = getThicknessProfile(x, v, true);

        vertices.push(x, y, z);
        uvs.push(u, v);
        normals.push(0, 1, 0); // Will be recomputed
      }
    }

    for (let j = 0; j < vSteps; j++) {
      for (let i = 0; i < uSteps; i++) {
        const a = upperVertsStart + j * (uSteps + 1) + i;
        const b = upperVertsStart + j * (uSteps + 1) + (i + 1);
        const c = upperVertsStart + (j + 1) * (uSteps + 1) + i;
        const d = upperVertsStart + (j + 1) * (uSteps + 1) + (i + 1);
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // Generate Lower Surface Mesh (Belly)
    const lowerVertsStart = vertices.length / 3;
    for (let j = 0; j <= vSteps; j++) {
      const v = j / vSteps;
      for (let i = 0; i <= uSteps; i++) {
        const u = i / uSteps;
        const x = (u - 0.5) * span;
        const leZ = getLeadingEdgeZ(x);
        const teZ = getTrailingEdgeZ(x);
        const z = THREE.MathUtils.lerp(leZ, teZ, v);
        const y = getThicknessProfile(x, v, false);

        vertices.push(x, y, z);
        uvs.push(u, v);
        normals.push(0, -1, 0);
      }
    }

    for (let j = 0; j < vSteps; j++) {
      for (let i = 0; i < uSteps; i++) {
        const a = lowerVertsStart + j * (uSteps + 1) + i;
        const b = lowerVertsStart + j * (uSteps + 1) + (i + 1);
        const c = lowerVertsStart + (j + 1) * (uSteps + 1) + i;
        const d = lowerVertsStart + (j + 1) * (uSteps + 1) + (i + 1);
        // Reverse winding for lower surface
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    // Connect Leading Edge Perimeter (Sealing upper and lower shells)
    for (let i = 0; i < uSteps; i++) {
      const upperA = upperVertsStart + i;
      const upperB = upperVertsStart + (i + 1);
      const lowerA = lowerVertsStart + i;
      const lowerB = lowerVertsStart + (i + 1);

      indices.push(upperA, lowerA, upperB);
      indices.push(upperB, lowerA, lowerB);
    }

    // Connect Trailing Edge Perimeter
    const upperLastRow = upperVertsStart + vSteps * (uSteps + 1);
    const lowerLastRow = lowerVertsStart + vSteps * (uSteps + 1);
    for (let i = 0; i < uSteps; i++) {
      const upperA = upperLastRow + i;
      const upperB = upperLastRow + (i + 1);
      const lowerA = lowerLastRow + i;
      const lowerB = lowerLastRow + (i + 1);

      indices.push(upperA, upperB, lowerA);
      indices.push(upperB, lowerB, lowerA);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    this.airframeMesh = new THREE.Mesh(geometry, this.materials.body);
    this.airframeMesh.castShadow = true;
    this.airframeMesh.receiveShadow = true;
    this.group.add(this.airframeMesh);

    // Chiseled Leading Edge Stealth Bevel (Facet strips for radar deflection)
    const bevelMat = this.materials.edge;
    const leEdgeGeo = new THREE.CylinderGeometry(0.12, 0.12, span * 0.58, 6);
    leEdgeGeo.rotateZ(Math.PI / 2);

    const leftLeStrip = new THREE.Mesh(leEdgeGeo, bevelMat);
    leftLeStrip.position.set(-13.1, 0, 1.8);
    leftLeStrip.rotation.y = 33.05 * Math.PI / 180;
    this.group.add(leftLeStrip);

    const rightLeStrip = new THREE.Mesh(leEdgeGeo, bevelMat);
    rightLeStrip.position.set(13.1, 0, 1.8);
    rightLeStrip.rotation.y = -33.05 * Math.PI / 180;
    this.group.add(rightLeStrip);
  }

  buildCockpit() {
    const cockpitGroup = new THREE.Group();
    cockpitGroup.position.set(0, 1.25, 4.2);

    // 1. Gold-tinted canopy glass (Stealth anti-radar dielectric dome)
    // Curvature is aerodynamic bubble embedded in top fuselage
    const canopyGeo = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    canopyGeo.scale(0.9, 0.45, 1.8);
    canopyGeo.rotateX(-0.1);
    this.canopyMesh = new THREE.Mesh(canopyGeo, this.materials.canopy);
    this.canopyMesh.castShadow = true;
    cockpitGroup.add(this.canopyMesh);

    // Canopy Center Pillar & Faceted Framing
    const frameGeo = new THREE.BoxGeometry(0.1, 0.08, 2.5);
    frameGeo.rotateX(-0.12);
    frameGeo.translate(0, 0.58, 0);
    const frame = new THREE.Mesh(frameGeo, this.materials.canopyFrame);
    cockpitGroup.add(frame);

    // 2. Cockpit Interior
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, -0.3, 0);

    // Crew Floor / Tub
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.2), this.materials.interior);
    interiorGroup.add(floor);

    // ACES II Ejection Seats (Pilot left, Mission Commander right)
    [-0.42, 0.42].forEach(x => {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(x, 0.2, -0.2);

      // Seat base & cushion
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.5), this.materials.interior);
      seatGroup.add(base);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.12), this.materials.interior);
      back.position.set(0, 0.35, -0.2);
      back.rotation.x = -0.15;
      seatGroup.add(back);

      // Headrest & Ejection handles
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.15), this.materials.interior);
      head.position.set(0, 0.75, -0.26);
      seatGroup.add(head);

      const ejHandle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 12), this.materials.weaponAcc);
      ejHandle.position.set(0, 0.08, 0.22);
      ejHandle.rotateX(Math.PI / 2);
      seatGroup.add(ejHandle);

      interiorGroup.add(seatGroup);
    });

    // Instrument Panel / Glowing Multifunctional Displays (MFDs)
    const panelGeo = new THREE.BoxGeometry(1.3, 0.45, 0.2);
    panelGeo.rotateX(-0.35);
    panelGeo.translate(0, 0.35, 0.6);
    const panel = new THREE.Mesh(panelGeo, this.materials.interior);
    interiorGroup.add(panel);

    // 4 Glowing Color MFD Flight Screen Displays
    [-0.45, -0.15, 0.15, 0.45].forEach((x, idx) => {
      const mfdGeo = new THREE.PlaneGeometry(0.2, 0.18);
      mfdGeo.rotateX(-0.35);
      const mfdMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x00ffaa : 0x00aaff
      });
      const mfd = new THREE.Mesh(mfdGeo, mfdMat);
      mfd.position.set(x, 0.4, 0.62);
      interiorGroup.add(mfd);
    });

    // Dual HUD (Head-Up Display) Glass Combiners
    [-0.42, 0.42].forEach(x => {
      const hudGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.18),
        new THREE.MeshPhysicalMaterial({
          color: 0x88ffaa,
          transparent: true,
          opacity: 0.55,
          roughness: 0.05
        })
      );
      hudGlass.position.set(x, 0.65, 0.75);
      hudGlass.rotation.x = -0.4;
      interiorGroup.add(hudGlass);
    });

    cockpitGroup.add(interiorGroup);
    this.group.add(cockpitGroup);
  }

  buildIntakesAndExhausts() {
    // The B-2 has 4 General Electric F118-GE-100 turbofans in twin pairs
    // Intakes are on TOP of the wing roots with serrated "cat's ear" boundary layer splitters
    [-4.6, 4.6].forEach(x => {
      const isLeft = x < 0;
      const intakeGroup = new THREE.Group();
      intakeGroup.position.set(x, 1.45, 2.8);

      // Scalloped / Serrated intake lip
      const lipGeo = new THREE.BoxGeometry(2.4, 0.75, 1.8);
      const lip = new THREE.Mesh(lipGeo, this.materials.body);
      lip.position.set(0, 0, 0);
      intakeGroup.add(lip);

      // Recessed S-Duct dark cavity (prevents radar reflections from compressor blades)
      const ductGeo = new THREE.BoxGeometry(2.0, 0.45, 2.8);
      ductGeo.translate(0, -0.15, -0.8);
      const duct = new THREE.Mesh(ductGeo, this.materials.intake);
      intakeGroup.add(duct);

      // Boundary Layer Airflow Splitter Ramps
      const splitterGeo = new THREE.ConeGeometry(0.2, 1.8, 3);
      splitterGeo.rotateX(Math.PI / 2);
      splitterGeo.rotateZ(Math.PI);
      const splitter = new THREE.Mesh(splitterGeo, this.materials.edge);
      splitter.position.set(0, 0.15, 0.9);
      intakeGroup.add(splitter);

      // Compressor Turbine Face (visible deep inside duct)
      for (let e = -0.55; e <= 0.55; e += 1.1) {
        const turbineGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 18);
        turbineGeo.rotateX(Math.PI / 2);
        const turbine = new THREE.Mesh(turbineGeo, this.materials.turbine);
        turbine.position.set(e, -0.18, -2.1);
        intakeGroup.add(turbine);
      }

      this.group.add(intakeGroup);

      // Rear Heat Suppression Exhaust Troughs
      // Recessed over rear upper surface with heat-resistant titanium/ceramic tiles
      const exhaustGroup = new THREE.Group();
      exhaustGroup.position.set(x, 0.75, -5.8);

      const troughGeo = new THREE.BoxGeometry(2.6, 0.5, 3.2);
      troughGeo.translate(0, -0.15, 0);
      const trough = new THREE.Mesh(troughGeo, this.materials.exhaust);
      exhaustGroup.add(trough);

      // Twin Exhaust Nozzle Slits
      for (let e = -0.55; e <= 0.55; e += 1.1) {
        // Internal exhaust glow core
        const glowGeo = new THREE.PlaneGeometry(0.85, 0.25);
        const glow = new THREE.Mesh(glowGeo, this.materials.exhaustGlow);
        glow.position.set(e, -0.05, 0.2);
        glow.rotateY(Math.PI);
        exhaustGroup.add(glow);
        this.exhaustGlows.push(glow);

        // Point light for exhaust heat illumination
        const heatLight = new THREE.PointLight(0xff6611, 0.8, 12);
        heatLight.position.set(e, 0.1, -1.0);
        exhaustGroup.add(heatLight);
      }

      this.group.add(exhaustGroup);
    });
  }

  buildControlSurfaces() {
    // 1. Split Drag Rudders (Decelerons) at Wingtips (Yaw & Airbrake)
    // Left Wingtip Clamshell
    const leftWingtipPos = new THREE.Vector3(-22.4, 0.1, -5.2);
    const rightWingtipPos = new THREE.Vector3(22.4, 0.1, -5.2);

    // Left Upper Drag Rudder
    const leftUpperPivot = new THREE.Group();
    leftUpperPivot.position.copy(leftWingtipPos);
    const leftUpperMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.4), this.materials.body);
    leftUpperMesh.position.set(0, 0.04, -0.7);
    leftUpperPivot.add(leftUpperMesh);
    this.group.add(leftUpperPivot);
    this.controlSurfaces.leftDragRudderUpper = leftUpperPivot;

    // Left Lower Drag Rudder
    const leftLowerPivot = new THREE.Group();
    leftLowerPivot.position.copy(leftWingtipPos);
    const leftLowerMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.4), this.materials.body);
    leftLowerMesh.position.set(0, -0.04, -0.7);
    leftLowerPivot.add(leftLowerMesh);
    this.group.add(leftLowerPivot);
    this.controlSurfaces.leftDragRudderLower = leftLowerPivot;

    // Right Upper Drag Rudder
    const rightUpperPivot = new THREE.Group();
    rightUpperPivot.position.copy(rightWingtipPos);
    const rightUpperMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.4), this.materials.body);
    rightUpperMesh.position.set(0, 0.04, -0.7);
    rightUpperPivot.add(rightUpperMesh);
    this.group.add(rightUpperPivot);
    this.controlSurfaces.rightDragRudderUpper = rightUpperPivot;

    // Right Lower Drag Rudder
    const rightLowerPivot = new THREE.Group();
    rightLowerPivot.position.copy(rightWingtipPos);
    const rightLowerMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.4), this.materials.body);
    rightLowerMesh.position.set(0, -0.04, -0.7);
    rightLowerPivot.add(rightLowerMesh);
    this.group.add(rightLowerPivot);
    this.controlSurfaces.rightDragRudderLower = rightLowerPivot;

    // 2. Mid-wing Elevons (Pitch & Roll)
    const leftElevonPivot = new THREE.Group();
    leftElevonPivot.position.set(-14.5, 0.1, -6.2);
    const leftElevonMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 1.6), this.materials.body);
    leftElevonMesh.position.set(0, 0, -0.8);
    leftElevonPivot.add(leftElevonMesh);
    this.group.add(leftElevonPivot);
    this.controlSurfaces.leftElevon = leftElevonPivot;

    const rightElevonPivot = new THREE.Group();
    rightElevonPivot.position.set(14.5, 0.1, -6.2);
    const rightElevonMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 1.6), this.materials.body);
    rightElevonMesh.position.set(0, 0, -0.8);
    rightElevonPivot.add(rightElevonMesh);
    this.group.add(rightElevonPivot);
    this.controlSurfaces.rightElevon = rightElevonPivot;

    // 3. Center Beaver Tail Control Surface (Gust-load dampener & Pitch trim)
    const beaverTailPivot = new THREE.Group();
    beaverTailPivot.position.set(0, 0.15, -8.6);
    const beaverTailGeo = new THREE.ConeGeometry(2.4, 2.2, 3);
    beaverTailGeo.rotateX(Math.PI / 2);
    beaverTailGeo.rotateZ(Math.PI);
    const beaverTailMesh = new THREE.Mesh(beaverTailGeo, this.materials.body);
    beaverTailMesh.position.set(0, 0, -0.9);
    beaverTailPivot.add(beaverTailMesh);
    this.group.add(beaverTailPivot);
    this.controlSurfaces.beaverTail = beaverTailPivot;
  }

  buildNavigationLights() {
    // Wingtip Red/Green Navigation Lights
    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.materials.strobeRed);
    navRed.position.set(-26.1, 0.1, -6.4);
    this.group.add(navRed);

    const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.materials.formationLight);
    navGreen.position.set(26.1, 0.1, -6.4);
    this.group.add(navGreen);

    // Electroluminescent Green Formation Strips ("Slime lights" on leading edge & beaver tail)
    const formationStrips = [
      { pos: [-18.0, 0.12, 0.2], rot: [0, 33 * Math.PI / 180, 0], scale: [1.8, 0.04, 0.04] },
      { pos: [18.0, 0.12, 0.2], rot: [0, -33 * Math.PI / 180, 0], scale: [1.8, 0.04, 0.04] },
      { pos: [0, 0.35, -9.8], rot: [0, 0, 0], scale: [0.8, 0.04, 0.04] }
    ];

    formationStrips.forEach(s => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(s.scale[0], s.scale[1], s.scale[2]), this.materials.formationLight);
      strip.position.set(s.pos[0], s.pos[1], s.pos[2]);
      strip.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
      this.group.add(strip);
    });

    // Anti-collision strobes (Top & Bottom)
    const strobeTop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.materials.strobeWhite);
    strobeTop.position.set(0, 1.85, 2.2);
    this.group.add(strobeTop);

    const strobeBottom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.materials.strobeRed);
    strobeBottom.position.set(0, -1.15, 2.2);
    this.group.add(strobeBottom);

    this.lights = { navRed, navGreen, strobeTop, strobeBottom };
  }

  buildInternalXRayStructures() {
    // Internal avionics, APQ-181 AESA radar array in nose, fuel cells, engines
    const xrayGroup = new THREE.Group();
    xrayGroup.name = 'XRayInternalStructure';
    xrayGroup.visible = false;

    // 1. APQ-181 AESA Radar Array in leading edge nose
    const radarGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 16);
    radarGeo.rotateX(Math.PI / 2);
    radarGeo.translate(0, 0, 9.2);
    const radar = new THREE.Mesh(radarGeo, this.materials.xray);
    xrayGroup.add(radar);

    // 2. Massive Wing Fuel Cell Bladders (Left & Right)
    [-10.5, 10.5].forEach(x => {
      const fuelGeo = new THREE.BoxGeometry(11.0, 0.8, 5.5);
      fuelGeo.translate(x, 0, -1.8);
      const fuelCell = new THREE.Mesh(fuelGeo, this.materials.xray);
      xrayGroup.add(fuelCell);
    });

    // 3. F118 Turbofan Engine Cores
    [-4.6, 4.6].forEach(x => {
      const engGeo = new THREE.CylinderGeometry(0.7, 0.65, 5.2, 12);
      engGeo.rotateX(Math.PI / 2);
      engGeo.translate(x, 0.6, -1.5);
      const engine = new THREE.Mesh(engGeo, this.materials.xray);
      xrayGroup.add(engine);
    });

    // 4. Quadruple-Redundant Fly-By-Wire Avionics Bays
    const avionicsGeo = new THREE.BoxGeometry(2.2, 0.6, 1.8);
    avionicsGeo.translate(0, 0.2, 1.2);
    const avionics = new THREE.Mesh(avionicsGeo, this.materials.xray);
    xrayGroup.add(avionics);

    this.group.add(xrayGroup);
    this.xrayGroup = xrayGroup;
  }

  setVisualMode(mode) {
    this.visualMode = mode;

    if (mode === 'xray') {
      this.airframeMesh.material = this.materials.xray;
      this.xrayGroup.visible = true;
    } else if (mode === 'rcs') {
      this.airframeMesh.material = this.materials.rcsHeatmap;
      this.xrayGroup.visible = false;
    } else {
      this.airframeMesh.material = this.materials.body;
      this.xrayGroup.visible = false;
    }
  }

  update(delta, controlsState) {
    // 1. Sync control inputs
    if (controlsState) {
      this.state.pitch = THREE.MathUtils.lerp(this.state.pitch, controlsState.pitch || 0, delta * 8.0);
      this.state.roll = THREE.MathUtils.lerp(this.state.roll, controlsState.roll || 0, delta * 8.0);
      this.state.yaw = THREE.MathUtils.lerp(this.state.yaw, controlsState.yaw || 0, delta * 8.0);
      this.state.throttle = controlsState.throttle !== undefined ? controlsState.throttle : 0.6;
      this.state.airbrake = THREE.MathUtils.lerp(this.state.airbrake, controlsState.airbrake ? 1.0 : 0.0, delta * 6.0);
    }

    // 2. Animate Control Surfaces
    // Elevons: Pitch + Roll
    const leftElevonAngle = (this.state.pitch * 0.45) - (this.state.roll * 0.4);
    const rightElevonAngle = (this.state.pitch * 0.45) + (this.state.roll * 0.4);
    this.controlSurfaces.leftElevon.rotation.x = leftElevonAngle;
    this.controlSurfaces.rightElevon.rotation.x = rightElevonAngle;

    // Beaver Tail (Pitch dampener)
    this.controlSurfaces.beaverTail.rotation.x = this.state.pitch * 0.25;

    // Split Drag Rudders (Decelerons): Yaw creates differential split on one wingtip; Airbrake splits both
    const baseAirbrake = this.state.airbrake * 0.6;
    const yawLeft = Math.max(0, -this.state.yaw) * 0.65;
    const yawRight = Math.max(0, this.state.yaw) * 0.65;

    const leftSplit = Math.min(0.85, baseAirbrake + yawLeft);
    const rightSplit = Math.min(0.85, baseAirbrake + yawRight);

    this.controlSurfaces.leftDragRudderUpper.rotation.x = leftSplit;
    this.controlSurfaces.leftDragRudderLower.rotation.x = -leftSplit;

    this.controlSurfaces.rightDragRudderUpper.rotation.x = rightSplit;
    this.controlSurfaces.rightDragRudderLower.rotation.x = -rightSplit;

    // 3. Engine Exhaust Glow Intensity
    const glowIntensity = 0.2 + this.state.throttle * 0.65;
    this.exhaustGlows.forEach(g => {
      g.material.opacity = glowIntensity;
    });

    // 4. Strobe Lights Blinking
    const time = performance.now() * 0.001;
    if (this.lights) {
      const strobeActive = (Math.sin(time * 6.0) > 0.85);
      this.lights.strobeTop.visible = strobeActive;
      this.lights.strobeBottom.visible = strobeActive;
    }

    // 5. Update RCS Heatmap Uniforms
    if (this.visualMode === 'rcs') {
      this.materials.rcsHeatmap.uniforms.time.value = time;
    }

    // 6. Subsystems update
    this.landingGear.update(delta);
    this.weapons.update(delta);
  }
}
