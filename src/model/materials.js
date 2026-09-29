import * as THREE from 'three';

/**
 * Ultra-High Fidelity Procedural PBR Textures & Stealth Materials for B-2 Spirit
 */
export class MaterialManager {
  constructor() {
    this.proceduralTextures = this.generateHighResTextures();
    this.currentLivery = 'spirit_missouri';
    this.liveries = {
      spirit_missouri: {
        name: 'Spirit of Missouri (USAF)',
        tag: 'AF 88-0329 / 509TH BW',
        bodyColor: 0x1f2228,
        roughness: 0.72,
        metalness: 0.22,
        panelColor: 0x16181d,
        accentColor: 0x333942,
        glowColor: 0x00f0ff
      },
      night_spectre: {
        name: 'Night Spectre (SpecOps)',
        tag: 'BLACK PROJECT / CLASSIFIED',
        bodyColor: 0x0a0b0d,
        roughness: 0.88,
        metalness: 0.28,
        panelColor: 0x050608,
        accentColor: 0x881111,
        glowColor: 0xff2a4b
      },
      white_hawk: {
        name: 'White Hawk (Anti-Flash Prototype)',
        tag: 'AV-1 PROTOTYPE / EDWARDS AFB',
        bodyColor: 0xededed,
        roughness: 0.4,
        metalness: 0.18,
        panelColor: 0xd0d0d0,
        accentColor: 0x444444,
        glowColor: 0x00e1d9
      },
      ghost_hex: {
        name: 'Ghost Hex (Active Camo)',
        tag: 'NEXT-GEN TESTBED / DARPA',
        bodyColor: 0x1e252e,
        roughness: 0.6,
        metalness: 0.38,
        panelColor: 0x141920,
        accentColor: 0x3b4c5e,
        glowColor: 0x39ff14
      },
      desert_mirage: {
        name: 'Desert Mirage (Low-Obs)',
        tag: 'AL UDEID / CENTCOM',
        bodyColor: 0x3d352b,
        roughness: 0.8,
        metalness: 0.15,
        panelColor: 0x2e271e,
        accentColor: 0x584d3e,
        glowColor: 0xffaa00
      }
    };

    this.materials = this.initMaterials();
  }

  generateHighResTextures() {
    // 1. High-Resolution RAM Panel & Composite Surface Texture (2048x2048)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Base carbon-composite dark matte tone
    ctx.fillStyle = '#22252c';
    ctx.fillRect(0, 0, 2048, 2048);

    // Fine carbon fiber weave micro-texture
    const imgData = ctx.getImageData(0, 0, 2048, 2048);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const px = (i / 4) % 2048;
      const py = Math.floor((i / 4) / 2048);
      const weave = ((px % 4 < 2) === (py % 4 < 2)) ? 8 : -8;
      const noise = (Math.random() - 0.5) * 12;
      const val = weave + noise;

      data[i] = Math.max(0, Math.min(255, data[i] + val));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + val));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + val + 2));
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw Stealth RAM Tape Zigzag Seams (33.05-degree angled sawteeth)
    ctx.strokeStyle = 'rgba(12, 14, 18, 0.85)';
    ctx.lineWidth = 3.5;
    const angle = Math.tan(33.05 * Math.PI / 180);

    for (let x = -1000; x < 3000; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 2048 * angle, 2048);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 2048 * angle, 2048);
      ctx.stroke();
    }

    // Sawtooth RAM tape border lines
    ctx.strokeStyle = 'rgba(30, 34, 42, 0.9)';
    ctx.lineWidth = 2;
    for (let y = 300; y < 1800; y += 180) {
      ctx.beginPath();
      for (let x = 200; x < 1848; x += 40) {
        ctx.lineTo(x, y + ((x / 40) % 2 === 0 ? 12 : -12));
      }
      ctx.stroke();
    }

    // Flush Air Data Pitot Sensors & Access Hatches
    ctx.fillStyle = 'rgba(45, 52, 64, 0.7)';
    ctx.strokeStyle = 'rgba(10, 12, 16, 0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 48; i++) {
      const px = 100 + Math.random() * 1848;
      const py = 100 + Math.random() * 1848;
      const pw = 30 + Math.random() * 60;
      const ph = 20 + Math.random() * 40;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);

      // Fastener dots along perimeter
      ctx.fillStyle = 'rgba(70, 80, 95, 0.8)';
      for (let fx = px + 4; fx < px + pw; fx += 12) {
        ctx.fillRect(fx, py + 2, 2, 2);
        ctx.fillRect(fx, py + ph - 4, 2, 2);
      }
    }

    // USAF Low-Visibility Insignia & Walkway Stencils
    ctx.strokeStyle = 'rgba(80, 90, 105, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(350, 250, 1348, 1548);
    ctx.setLineDash([]);

    // Stencil Text
    ctx.fillStyle = 'rgba(110, 125, 145, 0.75)';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('NO STEP', 400, 300);
    ctx.fillText('NO STEP', 1540, 300);
    ctx.fillText('RESCUE ➡', 960, 180);
    ctx.fillText('DANGER - JET INTAKE', 760, 480);
    ctx.fillText('DANGER - JET INTAKE', 1140, 480);
    ctx.fillText('US AIR FORCE 88-0329', 930, 1680);
    ctx.fillText('SPIRIT OF MISSOURI', 940, 1720);

    const bodyTexture = new THREE.CanvasTexture(canvas);
    bodyTexture.wrapS = THREE.RepeatWrapping;
    bodyTexture.wrapT = THREE.RepeatWrapping;

    // 2. High-Precision Normal Map for 3D Panel Seams & Rivets
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 1024;
    normCanvas.height = 1024;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff';
    nctx.fillRect(0, 0, 1024, 1024);

    // Diagonal panel seams in normal map
    nctx.strokeStyle = '#6868e0';
    nctx.lineWidth = 2.5;
    for (let x = -500; x < 1500; x += 65) {
      nctx.beginPath();
      nctx.moveTo(x, 0);
      nctx.lineTo(x + 1024 * angle, 1024);
      nctx.stroke();

      nctx.beginPath();
      nctx.moveTo(x, 0);
      nctx.lineTo(x - 1024 * angle, 1024);
      nctx.stroke();
    }
    const normalTexture = new THREE.CanvasTexture(normCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;

    // 3. Roughness / Specular Map
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rctx = roughCanvas.getContext('2d');
    rctx.fillStyle = '#b5b5b5';
    rctx.fillRect(0, 0, 512, 512);

    rctx.fillStyle = '#656565'; // Specular sheen on RAM tape
    for (let i = 0; i < 40; i++) {
      rctx.fillRect(Math.random() * 480, Math.random() * 480, Math.random() * 50 + 10, Math.random() * 30 + 5);
    }
    const roughnessTexture = new THREE.CanvasTexture(roughCanvas);

    // 4. Burnished Titanium & Ceramic Heat Shield Tiles
    const exhaustCanvas = document.createElement('canvas');
    exhaustCanvas.width = 512;
    exhaustCanvas.height = 512;
    const ectx = exhaustCanvas.getContext('2d');

    // Gradient showing heat bluing / burnished metal
    const grad = ectx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1c1c22');
    grad.addColorStop(0.25, '#2e2620');
    grad.addColorStop(0.45, '#3d2518');
    grad.addColorStop(0.65, '#262438'); // Heat bluing
    grad.addColorStop(0.85, '#1e2430');
    grad.addColorStop(1, '#111218');
    ectx.fillStyle = grad;
    ectx.fillRect(0, 0, 512, 512);

    // Hexagonal / Square heat tiles
    ectx.strokeStyle = 'rgba(10, 10, 15, 0.85)';
    ectx.lineWidth = 1.8;
    for (let y = 0; y < 512; y += 14) {
      ectx.beginPath(); ectx.moveTo(0, y); ectx.lineTo(512, y); ectx.stroke();
    }
    for (let x = 0; x < 512; x += 14) {
      ectx.beginPath(); ectx.moveTo(x, 0); ectx.lineTo(x, 512); ectx.stroke();
    }
    const exhaustTexture = new THREE.CanvasTexture(exhaustCanvas);

    // 5. Hexagon Camo for Ghost Hex Livery
    const hexCanvas = document.createElement('canvas');
    hexCanvas.width = 512;
    hexCanvas.height = 512;
    const hctx = hexCanvas.getContext('2d');
    hctx.fillStyle = '#1c2228';
    hctx.fillRect(0, 0, 512, 512);
    hctx.strokeStyle = '#2d3844';
    hctx.lineWidth = 2;
    const r = 24;
    const h = r * Math.sqrt(3);
    for (let y = 0; y < 550; y += h) {
      for (let x = 0; x < 550; x += r * 3) {
        const drawHex = (cx, cy) => {
          hctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const rad = a * Math.PI / 3;
            const px = cx + r * Math.cos(rad);
            const py = cy + r * Math.sin(rad);
            if (a === 0) hctx.moveTo(px, py);
            else hctx.lineTo(px, py);
          }
          hctx.closePath();
          if (Math.random() > 0.7) {
            hctx.fillStyle = Math.random() > 0.5 ? '#24303b' : '#141a20';
            hctx.fill();
          }
          hctx.stroke();
        };
        drawHex(x, y);
        drawHex(x + 1.5 * r, y + h / 2);
      }
    }
    const hexTexture = new THREE.CanvasTexture(hexCanvas);
    hexTexture.wrapS = THREE.RepeatWrapping;
    hexTexture.wrapT = THREE.RepeatWrapping;
    hexTexture.repeat.set(4, 4);

    return {
      body: bodyTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      exhaust: exhaustTexture,
      hex: hexTexture
    };
  }

  initMaterials() {
    const livery = this.liveries[this.currentLivery];

    // Main Stealth Airframe Skin
    const bodyMat = new THREE.MeshStandardMaterial({
      color: livery.bodyColor,
      map: this.proceduralTextures.body,
      normalMap: this.proceduralTextures.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: this.proceduralTextures.roughness,
      roughness: livery.roughness,
      metalness: livery.metalness,
      side: THREE.DoubleSide
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: livery.panelColor,
      roughness: 0.88,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    // Cockpit Canopy (Gold/Amber tinted dielectric anti-radar coating with Fresnel reflection)
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0xdaa520, // Golden amber dichroic tint
      roughness: 0.06,
      metalness: 0.9,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      ior: 1.68,
      reflectivity: 0.98,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide
    });

    const canopyFrameMat = new THREE.MeshStandardMaterial({
      color: 0x101216,
      roughness: 0.9,
      metalness: 0.1
    });

    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x14171b,
      roughness: 0.85,
      metalness: 0.15
    });

    const mfdMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

    const intakeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0e,
      roughness: 0.98,
      metalness: 0.02
    });

    const turbineMat = new THREE.MeshStandardMaterial({
      color: 0x444950,
      roughness: 0.25,
      metalness: 0.9
    });

    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x302a24,
      map: this.proceduralTextures.exhaust,
      roughness: 0.7,
      metalness: 0.6
    });

    const bayInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xedf0f4,
      roughness: 0.45,
      metalness: 0.25
    });

    const rotaryMat = new THREE.MeshStandardMaterial({
      color: 0x58606a,
      roughness: 0.35,
      metalness: 0.75
    });

    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x687262,
      roughness: 0.55,
      metalness: 0.35
    });

    const weaponAccMat = new THREE.MeshStandardMaterial({
      color: 0xf5b000,
      roughness: 0.35,
      metalness: 0.1
    });

    const strutChromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.98
    });

    const gearBodyMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.35,
      metalness: 0.35
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x161618,
      roughness: 0.95,
      metalness: 0.05
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc8cdd4,
      roughness: 0.3,
      metalness: 0.85
    });

    const exhaustGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    const formationLightMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const strobeLightRed = new THREE.MeshBasicMaterial({ color: 0xff1122 });
    const strobeLightWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Aerodynamic Wing Condensation Vapor Sheet Material
    const vaporSheetMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    // Wingtip Vortex Ribbon Material
    const vortexMat = new THREE.LineBasicMaterial({
      color: 0xddf5ff,
      transparent: true,
      opacity: 0.75
    });

    // X-Ray / Structural Wireframe Material
    const xrayMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });

    // RCS Heatmap Shader Material
    const rcsHeatmapMat = new THREE.ShaderMaterial({
      uniforms: {
        radarDir: { value: new THREE.Vector3(0, 0, 1) },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 radarDir;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        vec3 getHeatmapColor(float val) {
          if (val < 0.25) return mix(vec3(0.02, 0.05, 0.2), vec3(0.0, 0.5, 0.9), val * 4.0);
          if (val < 0.6) return mix(vec3(0.0, 0.5, 0.9), vec3(0.1, 0.9, 0.2), (val - 0.25) / 0.35);
          if (val < 0.85) return mix(vec3(0.1, 0.9, 0.2), vec3(1.0, 0.8, 0.0), (val - 0.6) / 0.25);
          return mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 0.05, 0.05), (val - 0.85) / 0.15);
        }

        void main() {
          vec3 n = normalize(vNormal);
          vec3 rDir = normalize(radarDir);
          float directReturn = pow(max(0.0, dot(n, rDir)), 8.0);
          float wave = sin(dot(vWorldPosition, rDir) * 1.5 - time * 6.0) * 0.5 + 0.5;
          float intensity = clamp(directReturn * 0.85 + wave * 0.15, 0.0, 1.0);
          vec3 col = getHeatmapColor(intensity);
          gl_FragColor = vec4(col, 0.92);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    return {
      body: bodyMat,
      edge: edgeMat,
      canopy: canopyMat,
      canopyFrame: canopyFrameMat,
      interior: interiorMat,
      mfd: mfdMat,
      intake: intakeMat,
      turbine: turbineMat,
      exhaust: exhaustMat,
      bayInterior: bayInteriorMat,
      rotary: rotaryMat,
      weapon: weaponMat,
      weaponAcc: weaponAccMat,
      strutChrome: strutChromeMat,
      gearBody: gearBodyMat,
      tire: tireMat,
      rim: rimMat,
      exhaustGlow: exhaustGlowMat,
      formationLight: formationLightMat,
      strobeRed: strobeLightRed,
      strobeWhite: strobeLightWhite,
      vaporSheet: vaporSheetMat,
      vortex: vortexMat,
      xray: xrayMat,
      rcsHeatmap: rcsHeatmapMat
    };
  }

  setLivery(liveryKey) {
    if (!this.liveries[liveryKey]) return;
    this.currentLivery = liveryKey;
    const livery = this.liveries[liveryKey];

    this.materials.body.color.setHex(livery.bodyColor);
    this.materials.body.roughness = livery.roughness;
    this.materials.body.metalness = livery.metalness;

    if (liveryKey === 'ghost_hex') {
      this.materials.body.map = this.proceduralTextures.hex;
    } else {
      this.materials.body.map = this.proceduralTextures.body;
    }
    this.materials.body.needsUpdate = true;

    this.materials.edge.color.setHex(livery.panelColor);
    this.materials.edge.needsUpdate = true;
  }
}
