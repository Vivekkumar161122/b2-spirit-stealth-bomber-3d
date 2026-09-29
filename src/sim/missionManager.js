import * as THREE from 'three';

/**
 * Tactical Stealth Strike Mission Manager
 * Handles objectives, SAM radar air defenses, target bunkers, and scoring
 */
export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'MissionObjectives';
    this.scene.add(this.group);

    this.targets = [];
    this.samSites = [];
    this.waypoints = [];
    this.currentWaypointIndex = 0;

    this.missionState = {
      score: 0,
      targetsDestroyed: 0,
      totalTargets: 3,
      isCompleted: false,
      detectedBySAM: false,
      missionTime: 0
    };

    this.initMission();
  }

  initMission() {
    // Clear old objects
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.targets = [];
    this.samSites = [];

    // 1. Primary Target: Hardened Underground Command Bunker (At coords 0, 0, -4500)
    const bunker = this.createTargetBunker(new THREE.Vector3(0, 0, -4500), 'ALPHA: CMD BUNKER (PRIMARY)', 5000);
    this.targets.push(bunker);

    // 2. Secondary Target: Long-Range Early Warning Radar (At coords -2200, 0, -3800)
    const radarTower = this.createTargetRadar(new THREE.Vector3(-2200, 0, -3800), 'BRAVO: EARLY WARNING RADAR', 3000);
    this.targets.push(radarTower);

    // 3. Secondary Target: Strategic Fuel Depot (At coords 2400, 0, -5200)
    const fuelDepot = this.createTargetFuelDepot(new THREE.Vector3(2400, 0, -5200), 'CHARLIE: STRATEGIC FUEL STORAGE', 3000);
    this.targets.push(fuelDepot);

    // 4. Enemy S-400 / SA-20 SAM Air Defense Sites with Radar Domes
    this.samSites = [
      {
        id: 'SAM-1',
        name: 'SA-20 GARGLE BATTERY NORTH',
        position: new THREE.Vector3(1200, 0, -3200),
        radarRange: 4500, // meters detection range
        mesh: this.createSAMSite(new THREE.Vector3(1200, 0, -3200))
      },
      {
        id: 'SAM-2',
        name: 'SA-20 GARGLE BATTERY WEST',
        position: new THREE.Vector3(-3100, 0, -4200),
        radarRange: 4200,
        mesh: this.createSAMSite(new THREE.Vector3(-3100, 0, -4200))
      },
      {
        id: 'SAM-3',
        name: 'PANTSIR-S1 POINT DEFENSE',
        position: new THREE.Vector3(200, 0, -4700),
        radarRange: 2800,
        mesh: this.createSAMSite(new THREE.Vector3(200, 0, -4700))
      }
    ];

    // 5. Flight Waypoints
    this.waypoints = [
      { name: 'WP1: INGRESS POINT', pos: new THREE.Vector3(0, 1800, -1500) },
      { name: 'WP2: WEAPON RELEASE IP', pos: new THREE.Vector3(0, 1500, -3800) },
      { name: 'WP3: EGRESS / RECOVERY', pos: new THREE.Vector3(-2000, 2000, -7500) }
    ];
    this.currentWaypointIndex = 0;
  }

  createTargetBunker(position, name, scoreVal) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Heavy reinforced concrete dome structure
    const domeGeo = new THREE.CylinderGeometry(18, 28, 12, 16);
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x4a4c52,
      roughness: 0.9,
      metalness: 0.1
    });
    const dome = new THREE.Mesh(domeGeo, concreteMat);
    dome.position.y = 6;
    dome.castShadow = true;
    dome.receiveShadow = true;
    group.add(dome);

    // Blast doors & ventilation shafts
    const doorGeo = new THREE.BoxGeometry(8, 6, 2);
    doorGeo.translate(0, 3, 22);
    const door = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.8 }));
    group.add(door);

    // Glowing target marker ring on ground
    const ringGeo = new THREE.RingGeometry(30, 32, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.5;
    group.add(ring);

    this.group.add(group);

    return {
      group,
      dome,
      ring,
      position: position.clone(),
      name,
      scoreValue: scoreVal,
      isDestroyed: false,
      hitRadius: 40
    };
  }

  createTargetRadar(position, name, scoreVal) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Lattice Tower
    const towerGeo = new THREE.CylinderGeometry(2, 6, 28, 6);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.6 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 14;
    group.add(tower);

    // Rotating parabolic dish
    const dishPivot = new THREE.Group();
    dishPivot.position.y = 28;
    const dishGeo = new THREE.SphereGeometry(12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    dishGeo.rotateX(Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dishPivot.add(dish);
    group.add(dishPivot);

    this.group.add(group);

    return {
      group,
      dishPivot,
      position: position.clone(),
      name,
      scoreValue: scoreVal,
      isDestroyed: false,
      hitRadius: 35
    };
  }

  createTargetFuelDepot(position, name, scoreVal) {
    const group = new THREE.Group();
    group.position.copy(position);

    // 3 Large Cylindrical Fuel Storage Tanks
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xd8dede, metalness: 0.3, roughness: 0.6 });
    const tankOffsets = [
      { x: -16, z: -12 },
      { x: 16, z: -12 },
      { x: 0, z: 16 }
    ];

    tankOffsets.forEach(o => {
      const tankGeo = new THREE.CylinderGeometry(12, 12, 14, 16);
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(o.x, 7, o.z);
      tank.castShadow = true;
      group.add(tank);
    });

    this.group.add(group);

    return {
      group,
      position: position.clone(),
      name,
      scoreValue: scoreVal,
      isDestroyed: false,
      hitRadius: 45
    };
  }

  createSAMSite(position) {
    const group = new THREE.Group();
    group.position.copy(position);

    // SAM Launcher Vehicle Chassis
    const vehicleGeo = new THREE.BoxGeometry(6, 3, 14);
    const camoMat = new THREE.MeshStandardMaterial({ color: 0x3d4436, roughness: 0.85 });
    const vehicle = new THREE.Mesh(vehicleGeo, camoMat);
    vehicle.position.y = 1.5;
    group.add(vehicle);

    // Missile Cannisters
    const tubeGeo = new THREE.CylinderGeometry(0.8, 0.8, 11, 8);
    tubeGeo.rotateX(Math.PI / 2);
    tubeGeo.rotateX(-0.5); // Elevated launch angle
    [-1.2, 1.2].forEach(x => {
      const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x222620 }));
      tube.position.set(x, 4.5, 0);
      group.add(tube);
    });

    // Radar Tracking Dome (Rotates)
    const radarPivot = new THREE.Group();
    radarPivot.position.set(0, 3.5, 5);
    const domeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2e352b })
    );
    radarPivot.add(domeMesh);
    group.add(radarPivot);

    // Radar Coverage Zone Ring (Visualized on ground)
    const zoneGeo = new THREE.RingGeometry(800, 810, 48);
    zoneGeo.rotateX(-Math.PI / 2);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15
    });
    const zone = new THREE.Mesh(zoneGeo, zoneMat);
    zone.position.y = 1;
    group.add(zone);

    this.group.add(group);
    return { group, radarPivot, zone };
  }

  checkBombHits(explosions) {
    let hitAny = false;

    explosions.forEach(exp => {
      this.targets.forEach(tgt => {
        if (!tgt.isDestroyed) {
          const dist = new THREE.Vector2(exp.position.x, exp.position.z).distanceTo(
            new THREE.Vector2(tgt.position.x, tgt.position.z)
          );

          if (dist <= tgt.hitRadius) {
            // Target Destroyed!
            tgt.isDestroyed = true;
            this.missionState.targetsDestroyed++;
            this.missionState.score += tgt.scoreValue;
            hitAny = true;

            // Turn target into smoking crater / charred mesh
            tgt.group.traverse(child => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x111111,
                  roughness: 0.98,
                  metalness: 0.05
                });
              }
            });

            if (this.missionState.targetsDestroyed >= this.missionState.totalTargets) {
              this.missionState.isCompleted = true;
            }
          }
        }
      });
    });

    return hitAny;
  }

  update(delta) {
    this.missionState.missionTime += delta;

    // Rotate SAM radar antennas and target radar dishes
    const time = performance.now() * 0.001;
    this.samSites.forEach(sam => {
      if (sam.mesh && sam.mesh.radarPivot) {
        sam.mesh.radarPivot.rotation.y += delta * 1.8;
      }
    });

    this.targets.forEach(tgt => {
      if (tgt.dishPivot && !tgt.isDestroyed) {
        tgt.dishPivot.rotation.y += delta * 1.2;
      }
      if (tgt.ring) {
        tgt.ring.rotation.z += delta * 0.5;
      }
    });
  }
}
