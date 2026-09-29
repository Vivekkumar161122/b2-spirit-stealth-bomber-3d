import * as THREE from 'three';

/**
 * Three.js Scene, Camera Presets, Lighting, and Render Loop Manager
 */
export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x101a28, 0.00008);

    // 2. Camera & Modes
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.5,
      40000
    );
    this.camera.position.set(0, 8, 38);

    // Camera Modes: 'orbit', 'chase', 'cockpit', 'bomb_bay', 'flyby', 'blueprint'
    this.cameraMode = 'orbit';
    this.orbitRadius = 38;
    this.orbitTheta = 0.4;
    this.orbitPhi = 1.35;
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };

    // Flyby Camera Cache
    this.flybyPos = new THREE.Vector3();
    this.flybyTarget = new THREE.Vector3();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.initLights();

    // 5. Input Listeners
    this.initControls();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initLights() {
    // Hemispheric Sky/Ground Light
    this.hemiLight = new THREE.HemisphereLight(0x8cb6e8, 0x0e141c, 1.2);
    this.hemiLight.position.set(0, 500, 0);
    this.scene.add(this.hemiLight);

    // Main Sunlight (Casts crisp directional stealth shadows)
    this.dirLight = new THREE.DirectionalLight(0xd0e6ff, 2.2);
    this.dirLight.position.set(400, 800, 300);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 2500;
    this.dirLight.shadow.camera.left = -60;
    this.dirLight.shadow.camera.right = 60;
    this.dirLight.shadow.camera.top = 60;
    this.dirLight.shadow.camera.bottom = -60;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Subtle Stealth Rim Accent Light
    this.rimLight = new THREE.DirectionalLight(0x00f0ff, 0.6);
    this.rimLight.position.set(-300, -200, -400);
    this.scene.add(this.rimLight);
  }

  initControls() {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.cameraMode !== 'orbit') return;

      const deltaX = e.clientX - this.prevMousePos.x;
      const deltaY = e.clientY - this.prevMousePos.y;
      this.prevMousePos = { x: e.clientX, y: e.clientY };

      this.orbitTheta -= deltaX * 0.006;
      this.orbitPhi = Math.max(0.1, Math.min(Math.PI * 0.95, this.orbitPhi + deltaY * 0.006));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Zoom
    el.addEventListener('wheel', (e) => {
      if (this.cameraMode === 'orbit') {
        this.orbitRadius = Math.max(12, Math.min(180, this.orbitRadius + e.deltaY * 0.05));
      }
    }, { passive: true });

    // Touch support
    let touchStartDist = 0;
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging && this.cameraMode === 'orbit') {
        const deltaX = e.touches[0].clientX - this.prevMousePos.x;
        const deltaY = e.touches[0].clientY - this.prevMousePos.y;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        this.orbitTheta -= deltaX * 0.008;
        this.orbitPhi = Math.max(0.1, Math.min(Math.PI * 0.95, this.orbitPhi + deltaY * 0.008));
      } else if (e.touches.length === 2 && this.cameraMode === 'orbit') {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = touchStartDist - dist;
        this.orbitRadius = Math.max(12, Math.min(180, this.orbitRadius + diff * 0.1));
        touchStartDist = dist;
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  setCameraMode(mode, aircraftPos, aircraftRot) {
    this.cameraMode = mode;

    if (mode === 'flyby' && aircraftPos) {
      // Set up a stationary camera ahead and off to the side
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(aircraftRot);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(aircraftRot);

      this.flybyPos.copy(aircraftPos)
        .addScaledVector(forward, 240)
        .addScaledVector(right, (Math.random() > 0.5 ? 1 : -1) * 80)
        .add(new THREE.Vector3(0, (Math.random() - 0.5) * 30, 0));
    }
  }

  updateCamera(aircraftPos, aircraftRot, aircraftQuaternion, isFlightSim) {
    if (!aircraftPos) return;

    if (this.cameraMode === 'orbit') {
      // 360 Spherical Orbit centered around the aircraft
      const x = aircraftPos.x + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const y = aircraftPos.y + this.orbitRadius * Math.cos(this.orbitPhi);
      const z = aircraftPos.z + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);

      this.camera.position.lerp(new THREE.Vector3(x, y, z), 0.15);
      this.camera.lookAt(aircraftPos);
    } else if (this.cameraMode === 'chase') {
      // Third-person chase cam with dynamic high-speed dampening
      const offset = new THREE.Vector3(0, 6.5, 42).applyQuaternion(aircraftQuaternion);
      const targetCamPos = aircraftPos.clone().add(offset);

      this.camera.position.lerp(targetCamPos, 0.12);

      const lookAhead = aircraftPos.clone().add(new THREE.Vector3(0, 1.2, -60).applyQuaternion(aircraftQuaternion));
      this.camera.lookAt(lookAhead);
    } else if (this.cameraMode === 'cockpit') {
      // First person Pilot's Eye view inside the cockpit
      const eyePos = aircraftPos.clone().add(new THREE.Vector3(-0.42, 1.35, 3.6).applyQuaternion(aircraftQuaternion));
      this.camera.position.copy(eyePos);

      const forwardLook = eyePos.clone().add(new THREE.Vector3(0, 0, -100).applyQuaternion(aircraftQuaternion));
      this.camera.lookAt(forwardLook);
    } else if (this.cameraMode === 'bomb_bay') {
      // Belly camera looking right into the internal rotary launcher
      const bayCamPos = aircraftPos.clone().add(new THREE.Vector3(0, -6.5, 12).applyQuaternion(aircraftQuaternion));
      this.camera.position.lerp(bayCamPos, 0.15);

      const bayTarget = aircraftPos.clone().add(new THREE.Vector3(0, -1.0, 0).applyQuaternion(aircraftQuaternion));
      this.camera.lookAt(bayTarget);
    } else if (this.cameraMode === 'blueprint') {
      // Top-down Orthographic-style Blueprint schematic
      const topPos = aircraftPos.clone().add(new THREE.Vector3(0, 65, 0));
      this.camera.position.lerp(topPos, 0.12);
      this.camera.lookAt(aircraftPos);
      this.camera.up.set(0, 0, -1);
    } else if (this.cameraMode === 'flyby') {
      // Stationary cinematic camera watching aircraft roar past
      this.camera.position.copy(this.flybyPos);
      this.camera.lookAt(aircraftPos);

      // Reset flyby if aircraft has passed far behind
      if (aircraftPos.distanceTo(this.flybyPos) > 450) {
        this.setCameraMode('flyby', aircraftPos, aircraftRot);
      }
    }

    // Reset camera up vector for non-blueprint modes
    if (this.cameraMode !== 'blueprint' && this.cameraMode !== 'cockpit') {
      this.camera.up.set(0, 1, 0);
    }

    // Move directional shadow light with aircraft
    this.dirLight.position.set(aircraftPos.x + 300, aircraftPos.y + 600, aircraftPos.z + 250);
    this.dirLight.target.position.copy(aircraftPos);
    this.dirLight.target.updateMatrixWorld();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
