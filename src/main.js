import * as THREE from 'three';
import { MaterialManager } from './model/materials.js';
import { B2Bomber } from './model/b2Bomber.js';
import { SceneManager } from './core/sceneManager.js';
import { EnvironmentManager } from './core/environment.js';
import { FlightPhysics } from './sim/flightPhysics.js';
import { RCSSimulator } from './sim/rcsSimulator.js';
import { MissionManager } from './sim/missionManager.js';
import { SoundManager } from './audio/soundManager.js';
import { TacticalHUD } from './ui/hud.js';
import { TacticalRadarMap } from './ui/radarMap.js';
import { ControlsUI } from './ui/controlsUI.js';

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.canvasContainer = document.getElementById('canvasContainer');

    // 1. Core Scene & Lighting
    this.sceneManager = new SceneManager(this.canvasContainer);
    this.scene = this.sceneManager.scene;

    // 2. Materials & 3D B-2 Bomber
    this.materialManager = new MaterialManager();
    this.bomber = new B2Bomber(this.materialManager, this.scene);
    this.scene.add(this.bomber.group);

    // 3. Dynamic Environment & Sky
    this.environment = new EnvironmentManager(this.scene);
    this.environment.setEnvironment('stratosphere', this.sceneManager.dirLight, this.sceneManager.hemiLight);

    // 4. Aerodynamics & Stealth Simulators
    this.physics = new FlightPhysics();
    this.rcs = new RCSSimulator();
    this.mission = new MissionManager(this.scene);

    // 5. Sound Engine
    this.sound = new SoundManager();

    // 6. Tactical HUD & Radar Screen
    this.hud = new TacticalHUD(this.appContainer);
    this.radar = new TacticalRadarMap(this.appContainer);

    // 7. UI Controls & State
    this.mode = 'showcase'; // 'showcase', 'flightsim', 'mission'
    this.initUI();

    // 8. Flight Input Listener
    this.keys = {};
    this.initInputListeners();

    // 9. Master Animation Loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // First user gesture initializes audio
    window.addEventListener('click', () => this.sound.init(), { once: true });
    window.addEventListener('keydown', () => this.sound.init(), { once: true });
  }

  initUI() {
    this.ui = new ControlsUI(this.appContainer, {
      onModeChange: (mode) => {
        this.mode = mode;
        if (mode === 'showcase') {
          this.sceneManager.setCameraMode('orbit', this.bomber.group.position, this.bomber.group.rotation);
        } else if (mode === 'flightsim' || mode === 'mission') {
          if (this.sceneManager.cameraMode === 'orbit') {
            this.sceneManager.setCameraMode('chase', this.bomber.group.position, this.bomber.group.rotation);
          }
          if (mode === 'mission') {
            this.sound.playCockpitVoice('Operation Dark Skies active. Infiltrate target sector.');
          }
        }
      },
      onCameraChange: (cam) => {
        this.sceneManager.setCameraMode(cam, this.bomber.group.position, this.bomber.group.rotation);
        if (cam === 'flyby') {
          this.sound.playSonicFlyby();
        }
      },
      onVisualModeChange: (visMode) => {
        this.bomber.setVisualMode(visMode);
      },
      onLiveryChange: (liveryKey) => {
        this.materialManager.setLivery(liveryKey);
      },
      onEnvironmentChange: (envKey) => {
        this.environment.setEnvironment(envKey, this.sceneManager.dirLight, this.sceneManager.hemiLight);
      },
      onToggleBay: (isOpen) => {
        this.bomber.weapons.setDoors(isOpen);
        this.sound.playHydraulicServo();
        if (isOpen) this.sound.playCockpitVoice('Weapons bay open');
      },
      onToggleGear: (isDown) => {
        this.bomber.landingGear.setGearState(isDown);
        this.sound.playHydraulicServo();
        this.sound.playCockpitVoice(isDown ? 'Landing gear down' : 'Landing gear up');
      },
      onDropWeapon: () => {
        this.dropWeapon();
      },
      onToggleAirbrake: () => {
        this.physics.inputs.airbrake = !this.physics.inputs.airbrake;
        this.sound.playHydraulicServo();
      },
      onToggleAutopilot: (active) => {
        this.physics.inputs.autopilot = active;
        this.sound.playCockpitVoice(active ? 'Autopilot engaged' : 'Autopilot disengaged');
      },
      onThrottleChange: (val) => {
        this.physics.inputs.throttle = val;
      },
      onToggleSound: () => {
        return this.sound.toggleMute();
      }
    });
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Single-shot key triggers
      if (e.code === 'Space') {
        e.preventDefault();
        this.dropWeapon();
      } else if (e.code === 'KeyB') {
        const isOpen = this.bomber.weapons.toggleBayDoors();
        this.sound.playHydraulicServo();
        this.ui.wrapper.querySelector('#txtBayState').innerText = isOpen ? 'OPEN' : 'CLOSED';
        this.sound.playCockpitVoice(isOpen ? 'Weapons bay open' : 'Weapons bay closed');
      } else if (e.code === 'KeyG') {
        const isDown = this.bomber.landingGear.toggleGear();
        this.sound.playHydraulicServo();
        this.ui.wrapper.querySelector('#txtGearState').innerText = isDown ? 'DEPLOYED' : 'RETRACTED';
        this.sound.playCockpitVoice(isDown ? 'Landing gear down' : 'Landing gear up');
      } else if (e.code === 'KeyF') {
        this.physics.inputs.airbrake = !this.physics.inputs.airbrake;
        this.sound.playHydraulicServo();
      } else if (e.code === 'KeyH') {
        const auto = this.physics.toggleAutopilot();
        this.sound.playCockpitVoice(auto ? 'Autopilot engaged' : 'Autopilot disengaged');
      } else if (e.code === 'Digit1') {
        this.sceneManager.setCameraMode('orbit', this.bomber.group.position, this.bomber.group.rotation);
      } else if (e.code === 'Digit2') {
        this.sceneManager.setCameraMode('chase', this.bomber.group.position, this.bomber.group.rotation);
      } else if (e.code === 'Digit3') {
        this.sceneManager.setCameraMode('cockpit', this.bomber.group.position, this.bomber.group.rotation);
      } else if (e.code === 'Digit4') {
        this.sceneManager.setCameraMode('bomb_bay', this.bomber.group.position, this.bomber.group.rotation);
      } else if (e.code === 'Digit5') {
        this.sceneManager.setCameraMode('blueprint', this.bomber.group.position, this.bomber.group.rotation);
      } else if (e.code === 'Digit6') {
        this.sceneManager.setCameraMode('flyby', this.bomber.group.position, this.bomber.group.rotation);
        this.sound.playSonicFlyby();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  dropWeapon() {
    this.sound.init();
    this.sound.playWeaponRelease();
    this.bomber.weapons.dropBomb(
      this.bomber.group.position,
      this.bomber.group.rotation,
      this.physics.speed
    );
  }

  updateFlightControls(delta) {
    if (this.mode === 'showcase') {
      // In showcase mode, gentle slow hovering / turntable rotation if desired
      this.physics.speed = 0;
      return;
    }

    let pitch = 0;
    let roll = 0;
    let yaw = 0;

    // Pitch: W / S or Up / Down
    if (this.keys['KeyW'] || this.keys['ArrowUp']) pitch -= 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) pitch += 1.0;

    // Roll: A / D or Left / Right
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) roll -= 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) roll += 1.0;

    // Yaw: Q / E
    if (this.keys['KeyQ']) yaw -= 1.0;
    if (this.keys['KeyE']) yaw += 1.0;

    // Throttle: Shift / Control
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      this.physics.inputs.throttle = Math.min(1.0, this.physics.inputs.throttle + delta * 0.4);
      const slider = this.ui.wrapper.querySelector('#throttleSlider');
      if (slider) slider.value = Math.round(this.physics.inputs.throttle * 100);
      const valEl = this.ui.wrapper.querySelector('#throttleValue');
      if (valEl) valEl.innerText = `${Math.round(this.physics.inputs.throttle * 100)}%`;
    }
    if (this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyX']) {
      this.physics.inputs.throttle = Math.max(0.0, this.physics.inputs.throttle - delta * 0.4);
      const slider = this.ui.wrapper.querySelector('#throttleSlider');
      if (slider) slider.value = Math.round(this.physics.inputs.throttle * 100);
      const valEl = this.ui.wrapper.querySelector('#throttleValue');
      if (valEl) valEl.innerText = `${Math.round(this.physics.inputs.throttle * 100)}%`;
    }

    this.physics.setInputs(pitch, roll, yaw, undefined, this.keys['KeyF']);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    let delta = (now - this.lastTime) * 0.001;
    this.lastTime = now;
    if (delta > 0.1) delta = 0.016;

    // 1. Flight Controls & Physics Simulation
    this.updateFlightControls(delta);

    if (this.mode !== 'showcase') {
      const isGearDown = this.bomber.landingGear.gearState > 0.5;
      this.physics.update(delta, 0, isGearDown);

      // Sync 3D Aircraft Position & Orientation
      this.bomber.group.position.copy(this.physics.position);
      this.bomber.group.quaternion.copy(this.physics.quaternion);

      // Low Altitude Warning alert
      if (this.physics.altitude < 250 && this.physics.climbRate < -15 && !this.physics.isOnGround) {
        this.sound.playWarningBeep();
        this.sound.playCockpitVoice('Pull up');
      }
    } else {
      // In showcase mode, place aircraft centered in view
      this.bomber.group.position.set(0, 0, 0);
      this.bomber.group.rotation.set(0, 0, 0);
    }

    // 2. Control surfaces animation & Subsystems
    this.bomber.update(delta, {
      pitch: this.physics.inputs.pitch,
      roll: this.physics.inputs.roll,
      yaw: this.physics.inputs.yaw,
      throttle: this.physics.inputs.throttle,
      airbrake: this.physics.inputs.airbrake
    });

    // 3. Dynamic Environment & Clouds
    this.environment.update(delta);

    // 4. Mission & SAM Defenses update
    this.mission.update(delta);
    const hitTarget = this.mission.checkBombHits(this.bomber.weapons.explosions);
    if (hitTarget) {
      this.sound.playExplosion();
      this.sound.playCockpitVoice('Direct hit. Target destroyed.');
    }

    // 5. Radar Cross Section (RCS) scattering calculation
    const isBayOpen = this.bomber.weapons.bayDoorsOpen;
    const isGearDown = this.bomber.landingGear.gearState;
    const nearestSam = this.mission.samSites[0]?.position;

    this.rcs.calculateRCS(
      this.bomber.group.rotation,
      isBayOpen,
      isGearDown,
      nearestSam,
      this.bomber.group.position
    );

    const threatResult = this.rcs.updateThreatLevel(this.bomber.group.position, this.mission.samSites);
    if (threatResult.threatLevel > 0.8) {
      this.sound.playWarningBeep();
    }

    // Update mission status in UI
    this.ui.updateMissionStats(
      this.mission.missionState.targetsDestroyed,
      this.mission.missionState.totalTargets,
      this.mission.missionState.score,
      threatResult.threatLevel > 0.65
    );

    // 6. Dynamic Sound Engine Update
    this.sound.updateEngine(
      this.physics.inputs.throttle,
      this.physics.speed,
      this.physics.mach
    );

    // 7. Tactical HUD & Radar Canvas rendering
    this.hud.draw(
      this.physics,
      this.mission,
      this.rcs,
      this.bomber.weapons,
      this.mode !== 'showcase'
    );

    this.radar.draw(
      this.bomber.group.position,
      this.bomber.group.rotation,
      this.mission.targets,
      this.mission.samSites,
      this.mission.waypoints
    );

    // 8. Camera Update & Render Scene
    this.sceneManager.updateCamera(
      this.bomber.group.position,
      this.bomber.group.rotation,
      this.bomber.group.quaternion,
      this.mode !== 'showcase'
    );

    this.sceneManager.render();
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
