/**
 * Cinematic Glassmorphism Tactical UI Controls & State Coordinator
 */
export class ControlsUI {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks || {};

    this.currentMode = 'showcase'; // 'showcase', 'flightsim', 'mission'
    this.currentCamera = 'orbit';
    this.currentLivery = 'spirit_missouri';
    this.currentEnv = 'stratosphere';
    this.visualMode = 'standard';

    this.bayOpen = false;
    this.gearDown = false;
    this.isMuted = false;
    this.autopilot = false;

    this.createUI();
  }

  createUI() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'tacticalUI';
    this.wrapper.innerHTML = `
      <!-- Top Tactical Header -->
      <header class="tactical-header">
        <div class="header-left">
          <div class="emblem-badge">
            <span class="badge-icon">▲</span>
            <div class="badge-text">
              <span class="usaf-text">USAF // 509TH BOMB WING</span>
              <span class="stealth-title">B-2 SPIRIT STEALTH BOMBER</span>
            </div>
          </div>
          <div class="specs-tag">
            <span class="spec-item">SPAN: <strong>52.4 M</strong></span>
            <span class="spec-item">RCS: <strong>0.0001 M²</strong></span>
            <span class="spec-item">MAX MACH: <strong>0.95</strong></span>
          </div>
        </div>

        <div class="header-center">
          <div class="mode-tabs">
            <button class="mode-tab active" data-mode="showcase">3D SHOWCASE</button>
            <button class="mode-tab" data-mode="flightsim">FLIGHT SIMULATOR</button>
            <button class="mode-tab" data-mode="mission">STEALTH STRIKE</button>
          </div>
        </div>

        <div class="header-right">
          <button id="btnSound" class="tactical-btn icon-btn" title="Toggle Engine Audio">
            <span class="btn-icon">🔊</span> <span class="btn-label">AUDIO ON</span>
          </button>
          <button id="btnHelp" class="tactical-btn icon-btn" title="Flight Controls & Help">
            <span class="btn-icon">⌨</span> <span class="btn-label">CONTROLS</span>
          </button>
        </div>
      </header>

      <!-- Camera Preset Bar -->
      <div class="camera-bar">
        <span class="bar-label">OPTICAL SENSORS:</span>
        <button class="cam-btn active" data-cam="orbit">360° ORBIT</button>
        <button class="cam-btn" data-cam="chase">CHASE CAM</button>
        <button class="cam-btn" data-cam="cockpit">COCKPIT FPV</button>
        <button class="cam-btn" data-cam="bomb_bay">WEAPONS BAY</button>
        <button class="cam-btn" data-cam="blueprint">TOP BLUEPRINT</button>
        <button class="cam-btn" data-cam="flyby">CINEMATIC FLYBY</button>
      </div>

      <!-- Left Inspector & Customization Panel (Showcase Mode) -->
      <div id="inspectorPanel" class="side-panel left-panel glass-card">
        <div class="panel-header">
          <h3>SYSTEMS & CONFIGURATION</h3>
          <span class="panel-tag">AN/APQ-181</span>
        </div>

        <!-- Visual Inspection Modes -->
        <div class="control-group">
          <label>VISUAL SCAN MODE</label>
          <div class="btn-group-row">
            <button class="sub-btn active" data-vismode="standard">STANDARD</button>
            <button class="sub-btn" data-vismode="xray">X-RAY CUTAWAY</button>
            <button class="sub-btn" data-vismode="rcs">RCS HEATMAP</button>
          </div>
        </div>

        <!-- Stealth Liveries -->
        <div class="control-group">
          <label>STEALTH LIVERY</label>
          <select id="liverySelect" class="tactical-select">
            <option value="spirit_missouri" selected>Spirit of Missouri (Standard Charcoal)</option>
            <option value="night_spectre">Night Spectre (Classified SpecOps)</option>
            <option value="white_hawk">White Hawk (Anti-Flash Prototype)</option>
            <option value="ghost_hex">Ghost Hex (Digital Active Camo)</option>
            <option value="desert_mirage">Desert Mirage (Low-Obs Earth)</option>
          </select>
        </div>

        <!-- Atmospheric Environment -->
        <div class="control-group">
          <label>OPERATIONAL THEATER / ENVIRONMENT</label>
          <select id="envSelect" class="tactical-select">
            <option value="stratosphere" selected>Stratosphere (45,000 FT Dusk)</option>
            <option value="sunset">Sunset Golden Hour (Canyon)</option>
            <option value="stormy">Stormy Night Ops (Lightning)</option>
            <option value="windtunnel">Wind Tunnel (Aerodynamic Laser)</option>
          </select>
        </div>

        <!-- Mechanical Subsystem Toggles -->
        <div class="control-group">
          <label>ARTICULATED SUBSYSTEMS</label>
          <div class="action-grid">
            <button id="btnToggleBay" class="action-btn">
              <span class="action-icon">⬡</span>
              <span class="action-text">BOMB BAY: <strong id="txtBayState">CLOSED</strong></span>
            </button>
            <button id="btnToggleGear" class="action-btn">
              <span class="action-icon">⚙</span>
              <span class="action-text">LANDING GEAR: <strong id="txtGearState">RETRACTED</strong></span>
            </button>
            <button id="btnDropWeapon" class="action-btn highlight-btn">
              <span class="action-icon">▼</span>
              <span class="action-text">RELEASE WEAPON (JDAM)</span>
            </button>
          </div>
        </div>

        <!-- Technical Specifications Accordion -->
        <div class="specs-box">
          <div class="spec-row"><span>Manufacturer</span><span>Northrop Grumman</span></div>
          <div class="spec-row"><span>Wingspan</span><span>52.4 m (172 ft)</span></div>
          <div class="spec-row"><span>Powerplant</span><span>4x GE F118-GE-100</span></div>
          <div class="spec-row"><span>Payload</span><span>40,000 lb internal</span></div>
          <div class="spec-row"><span>Combat Range</span><span>11,100 km (Unrefueled)</span></div>
          <div class="spec-row"><span>Sweep Angle</span><span>33.05° Constant Planform</span></div>
        </div>
      </div>

      <!-- Flight Simulation On-Screen Cockpit Controls (Visible in Flight Sim & Mission) -->
      <div id="flightControlsOverlay" class="flight-controls-overlay hidden">
        <!-- Throttle Slider (Left) -->
        <div class="throttle-container glass-card">
          <span class="slider-title">THROTTLE</span>
          <input type="range" id="throttleSlider" min="0" max="100" value="65" orient="vertical" class="vertical-slider">
          <span id="throttleValue" class="slider-val">65%</span>
        </div>

        <!-- Flight Action Buttons (Right) -->
        <div class="flight-action-buttons">
          <button id="btnSimDropBomb" class="flight-action-btn bomb-btn">
            <span class="flt-icon">💣</span>
            <span class="flt-label">DROP ORDNANCE (SPACE)</span>
          </button>
          <button id="btnSimAirbrake" class="flight-action-btn">
            <span class="flt-icon">🛑</span>
            <span class="flt-label">SPLIT AIRBRAKE (B)</span>
          </button>
          <button id="btnSimAutopilot" class="flight-action-btn">
            <span class="flt-icon">✈</span>
            <span class="flt-label">AUTOPILOT (H)</span>
          </button>
        </div>
      </div>

      <!-- Mission Status Banner (Mission Mode) -->
      <div id="missionBanner" class="mission-banner glass-card hidden">
        <div class="banner-title">OPERATION DARK SKIES // MISSION BRIEFING</div>
        <div class="banner-desc">Infiltrate enemy airspace undetected. Evade SAM radar coverage zones and destroy fortified underground bunker ALPHA with precision JDAM munitions.</div>
        <div class="mission-stats">
          <span class="stat">TARGETS: <strong id="txtDestroyedCount">0/3</strong></span>
          <span class="stat">SCORE: <strong id="txtMissionScore">0000</strong></span>
          <span class="stat">STEALTH STATUS: <strong id="txtStealthStatus" class="status-green">LOW-OBSERVABLE</strong></span>
        </div>
      </div>

      <!-- Help / Keybindings Modal -->
      <div id="helpModal" class="modal-backdrop hidden">
        <div class="modal-card glass-card">
          <div class="modal-header">
            <h3>FLIGHT CONTROLS & KEYBINDINGS</h3>
            <button id="btnCloseHelp" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <table class="keys-table">
              <tr><td><kbd>W</kbd> / <kbd>S</kbd> or <kbd>↑</kbd> <kbd>↓</kbd></td><td>Pitch Down / Pitch Up (Elevons)</td></tr>
              <tr><td><kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd></td><td>Roll Left / Roll Right (Differential Elevons)</td></tr>
              <tr><td><kbd>Q</kbd> / <kbd>E</kbd></td><td>Yaw Left / Yaw Right (Split Drag Rudders)</td></tr>
              <tr><td><kbd>Shift</kbd> / <kbd>Ctrl</kbd></td><td>Increase / Decrease Throttle</td></tr>
              <tr><td><kbd>Space</kbd></td><td>Release Precision JDAM Bomb</td></tr>
              <tr><td><kbd>B</kbd></td><td>Toggle Weapons Bay Doors</td></tr>
              <tr><td><kbd>G</kbd></td><td>Toggle Landing Gear (Deploy / Retract)</td></tr>
              <tr><td><kbd>F</kbd></td><td>Toggle Split Deceleron Airbrakes</td></tr>
              <tr><td><kbd>H</kbd></td><td>Toggle Autopilot / Level Flight</td></tr>
              <tr><td><kbd>1</kbd> - <kbd>6</kbd></td><td>Switch Camera Modes (Orbit, Chase, Cockpit, etc.)</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.wrapper);
    this.bindEvents();
  }

  bindEvents() {
    // Mode Switcher
    this.wrapper.querySelectorAll('.mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.wrapper.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        this.setAppMode(mode);
      });
    });

    // Camera Switcher
    this.wrapper.querySelectorAll('.cam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.wrapper.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cam = btn.getAttribute('data-cam');
        this.currentCamera = cam;
        if (this.callbacks.onCameraChange) this.callbacks.onCameraChange(cam);
      });
    });

    // Visual Mode (Standard / X-Ray / RCS)
    this.wrapper.querySelectorAll('[data-vismode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.wrapper.querySelectorAll('[data-vismode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const vis = btn.getAttribute('data-vismode');
        this.visualMode = vis;
        if (this.callbacks.onVisualModeChange) this.callbacks.onVisualModeChange(vis);
      });
    });

    // Livery Select
    const liverySelect = this.wrapper.querySelector('#liverySelect');
    liverySelect.addEventListener('change', (e) => {
      this.currentLivery = e.target.value;
      if (this.callbacks.onLiveryChange) this.callbacks.onLiveryChange(e.target.value);
    });

    // Environment Select
    const envSelect = this.wrapper.querySelector('#envSelect');
    envSelect.addEventListener('change', (e) => {
      this.currentEnv = e.target.value;
      if (this.callbacks.onEnvironmentChange) this.callbacks.onEnvironmentChange(e.target.value);
    });

    // Mechanical Subsystem Toggles
    const btnBay = this.wrapper.querySelector('#btnToggleBay');
    btnBay.addEventListener('click', () => {
      this.bayOpen = !this.bayOpen;
      this.wrapper.querySelector('#txtBayState').innerText = this.bayOpen ? 'OPEN' : 'CLOSED';
      if (this.callbacks.onToggleBay) this.callbacks.onToggleBay(this.bayOpen);
    });

    const btnGear = this.wrapper.querySelector('#btnToggleGear');
    btnGear.addEventListener('click', () => {
      this.gearDown = !this.gearDown;
      this.wrapper.querySelector('#txtGearState').innerText = this.gearDown ? 'DEPLOYED' : 'RETRACTED';
      if (this.callbacks.onToggleGear) this.callbacks.onToggleGear(this.gearDown);
    });

    const btnDrop = this.wrapper.querySelector('#btnDropWeapon');
    btnDrop.addEventListener('click', () => {
      if (this.callbacks.onDropWeapon) this.callbacks.onDropWeapon();
    });

    const btnSimDrop = this.wrapper.querySelector('#btnSimDropBomb');
    btnSimDrop.addEventListener('click', () => {
      if (this.callbacks.onDropWeapon) this.callbacks.onDropWeapon();
    });

    const btnSimAirbrake = this.wrapper.querySelector('#btnSimAirbrake');
    btnSimAirbrake.addEventListener('click', () => {
      if (this.callbacks.onToggleAirbrake) this.callbacks.onToggleAirbrake();
    });

    const btnSimAutopilot = this.wrapper.querySelector('#btnSimAutopilot');
    btnSimAutopilot.addEventListener('click', () => {
      this.autopilot = !this.autopilot;
      btnSimAutopilot.classList.toggle('active', this.autopilot);
      if (this.callbacks.onToggleAutopilot) this.callbacks.onToggleAutopilot(this.autopilot);
    });

    // Throttle Slider
    const throttleSlider = this.wrapper.querySelector('#throttleSlider');
    const throttleVal = this.wrapper.querySelector('#throttleValue');
    throttleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      throttleVal.innerText = `${val}%`;
      if (this.callbacks.onThrottleChange) this.callbacks.onThrottleChange(val / 100);
    });

    // Sound Mute Toggle
    const btnSound = this.wrapper.querySelector('#btnSound');
    btnSound.addEventListener('click', () => {
      if (this.callbacks.onToggleSound) {
        this.isMuted = this.callbacks.onToggleSound();
        btnSound.querySelector('.btn-label').innerText = this.isMuted ? 'AUDIO OFF' : 'AUDIO ON';
        btnSound.querySelector('.btn-icon').innerText = this.isMuted ? '🔇' : '🔊';
        btnSound.classList.toggle('muted', this.isMuted);
      }
    });

    // Help Modal
    const btnHelp = this.wrapper.querySelector('#btnHelp');
    const modal = this.wrapper.querySelector('#helpModal');
    const btnCloseHelp = this.wrapper.querySelector('#btnCloseHelp');

    btnHelp.addEventListener('click', () => modal.classList.remove('hidden'));
    btnCloseHelp.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  setAppMode(mode) {
    this.currentMode = mode;

    const inspector = this.wrapper.querySelector('#inspectorPanel');
    const flightOverlay = this.wrapper.querySelector('#flightControlsOverlay');
    const missionBanner = this.wrapper.querySelector('#missionBanner');

    if (mode === 'showcase') {
      inspector.classList.remove('hidden');
      flightOverlay.classList.add('hidden');
      missionBanner.classList.add('hidden');
    } else if (mode === 'flightsim') {
      inspector.classList.add('hidden');
      flightOverlay.classList.remove('hidden');
      missionBanner.classList.add('hidden');
    } else if (mode === 'mission') {
      inspector.classList.add('hidden');
      flightOverlay.classList.remove('hidden');
      missionBanner.classList.remove('hidden');
    }

    if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
  }

  updateMissionStats(targetsDestroyed, totalTargets, score, isDetected) {
    const countEl = this.wrapper.querySelector('#txtDestroyedCount');
    const scoreEl = this.wrapper.querySelector('#txtMissionScore');
    const stealthEl = this.wrapper.querySelector('#txtStealthStatus');

    if (countEl) countEl.innerText = `${targetsDestroyed}/${totalTargets}`;
    if (scoreEl) scoreEl.innerText = score.toString().padStart(4, '0');
    if (stealthEl) {
      if (isDetected) {
        stealthEl.innerText = 'WARNING: DETECTED BY SAM';
        stealthEl.className = 'status-red';
      } else {
        stealthEl.innerText = 'LOW-OBSERVABLE';
        stealthEl.className = 'status-green';
      }
    }
  }
}
