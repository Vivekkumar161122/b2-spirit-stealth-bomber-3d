import * as THREE from 'three';

/**
 * Atmospheric Environments, Procedural Terrain, Clouds, Lightning, and Wind Tunnel
 */
export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.currentEnv = 'stratosphere';

    this.group = new THREE.Group();
    this.group.name = 'EnvironmentGroup';
    this.scene.add(this.group);

    // Sub-components
    this.skyMesh = null;
    this.terrainMesh = null;
    this.cloudLayer = null;
    this.stars = null;
    this.runway = null;
    this.windTunnel = null;
    this.searchlights = [];

    this.lightningTimer = 0;
    this.lightningLight = null;

    this.initEnvironments();
    this.setEnvironment('stratosphere');
  }

  initEnvironments() {
    // 1. Sky Dome with atmospheric gradient shader
    const skyGeo = new THREE.SphereGeometry(15000, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x050814) },
        horizonColor: { value: new THREE.Color(0x1a2d48) },
        bottomColor: { value: new THREE.Color(0x0c111a) },
        offset: { value: 200 },
        exponent: { value: 0.75 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition + offset).y;
          if (h >= 0.0) {
            gl_FragColor = vec4(mix(horizonColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
          } else {
            gl_FragColor = vec4(mix(horizonColor, bottomColor, max(pow(max(-h, 0.0), exponent), 0.0)), 1.0);
          }
        }
      `,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(this.skyMesh);

    // 2. Starfield (3,000 twinkling stars)
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 14000;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // Upper hemisphere
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.85
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.group.add(this.stars);

    // 3. Volumetric Dynamic Cloud Layer (Between 800m and 1400m altitude)
    this.createCloudLayer();

    // 4. Procedural Terrain & Ocean
    this.createTerrain();

    // 5. Military Airbase Runway with Approach Lighting
    this.createRunway();

    // 6. Cyber Wind Tunnel Aerodynamic Streamlines
    this.createWindTunnel();

    // 7. Lightning Light (For stormy night ops)
    this.lightningLight = new THREE.DirectionalLight(0xaad5ff, 0);
    this.lightningLight.position.set(2000, 6000, -2000);
    this.group.add(this.lightningLight);
  }

  createCloudLayer() {
    const cloudGroup = new THREE.Group();
    cloudGroup.name = 'CloudLayer';

    const cloudCount = 120;
    const cloudGeo = new THREE.DodecahedronGeometry(180, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.65
    });

    for (let i = 0; i < cloudCount; i++) {
      const cluster = new THREE.Group();
      const x = (Math.random() - 0.5) * 16000;
      const z = (Math.random() - 0.5) * 16000;
      const y = 900 + (Math.random() - 0.5) * 300;

      // 4-6 puffs per cloud
      const puffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 220
        );
        const s = 0.6 + Math.random() * 0.8;
        puff.scale.set(s * 1.6, s * 0.7, s * 1.6);
        cluster.add(puff);
      }

      cluster.position.set(x, y, z);
      cloudGroup.add(cluster);
    }

    this.cloudLayer = cloudGroup;
    this.group.add(cloudGroup);
  }

  createTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(24000, 24000, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Keep runway & immediate center flat
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 2500) {
        pos.setY(i, 0);
        continue;
      }

      // Procedural mountain ridge elevations
      let elevation = 0;
      const freq1 = 0.0003;
      const freq2 = 0.0008;
      elevation += Math.sin(x * freq1) * Math.cos(z * freq1) * 650;
      elevation += Math.sin(x * freq2 + 1.2) * Math.sin(z * freq2 + 0.8) * 320;
      elevation = Math.max(0, elevation);

      pos.setY(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1d241e,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);
  }

  createRunway() {
    const runwayGroup = new THREE.Group();
    runwayGroup.position.set(0, 0.5, 0);

    // Main Runway Tarmac (3.8 km long x 70 m wide)
    const tarmacGeo = new THREE.PlaneGeometry(70, 3800);
    tarmacGeo.rotateX(-Math.PI / 2);
    const tarmacMat = new THREE.MeshStandardMaterial({
      color: 0x1b1c20,
      roughness: 0.85,
      metalness: 0.15
    });
    const tarmac = new THREE.Mesh(tarmacGeo, tarmacMat);
    runwayGroup.add(tarmac);

    // Centerline Stripes
    const stripeCount = 60;
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < stripeCount; i++) {
      const stripeGeo = new THREE.PlaneGeometry(2.5, 25);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, 0.1, -1800 + i * 60);
      runwayGroup.add(stripe);
    }

    // Runway Edge Lights (Green at threshold, White on runway, Red at end)
    const lightMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const lightMatRed = new THREE.MeshBasicMaterial({ color: 0xff2222 });

    for (let z = -1850; z <= 1850; z += 50) {
      let mat = lightMatWhite;
      if (z < -1750) mat = lightMatGreen;
      else if (z > 1750) mat = lightMatRed;

      [-38, 38].forEach(x => {
        const lightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), tarmacMat);
        lightPillar.position.set(x, 0.6, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat);
        bulb.position.set(x, 1.2, z);
        runwayGroup.add(lightPillar);
        runwayGroup.add(bulb);
      });
    }

    this.runway = runwayGroup;
    this.group.add(runwayGroup);
  }

  createWindTunnel() {
    const tunnelGroup = new THREE.Group();
    tunnelGroup.name = 'CyberWindTunnel';
    tunnelGroup.visible = false;

    // Floor holographic radar grid
    const gridHelper = new THREE.GridHelper(120, 60, 0x00f0ff, 0x0a2233);
    gridHelper.position.y = -2;
    tunnelGroup.add(gridHelper);

    // Aerodynamic Laser Particle Streamlines
    const particleCount = 2000;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    this.streamlineData = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 8 + 0.5;
      const z = Math.random() * 80 - 40;
      const speed = 40 + Math.random() * 30;

      particlePos[i * 3] = x;
      particlePos[i * 3 + 1] = y;
      particlePos[i * 3 + 2] = z;

      this.streamlineData.push({ x, y, z, speed });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.streamlines = new THREE.Points(particleGeo, particleMat);
    tunnelGroup.add(this.streamlines);

    this.windTunnel = tunnelGroup;
    this.group.add(tunnelGroup);
  }

  setEnvironment(envKey, dirLight, hemiLight) {
    this.currentEnv = envKey;

    if (envKey === 'windtunnel') {
      this.windTunnel.visible = true;
      this.terrainMesh.visible = false;
      this.cloudLayer.visible = false;
      this.runway.visible = false;
      this.stars.visible = false;

      this.skyMat.uniforms.topColor.value.setHex(0x03060a);
      this.skyMat.uniforms.horizonColor.value.setHex(0x06121d);
      this.skyMat.uniforms.bottomColor.value.setHex(0x020406);

      if (dirLight) {
        dirLight.color.setHex(0x00f0ff);
        dirLight.intensity = 1.8;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x00e1d9);
        hemiLight.groundColor.setHex(0x02060c);
      }
      return;
    }

    this.windTunnel.visible = false;
    this.terrainMesh.visible = true;
    this.cloudLayer.visible = true;
    this.runway.visible = true;
    this.stars.visible = true;

    if (envKey === 'stratosphere') {
      // Deep blue twilight stratosphere
      this.skyMat.uniforms.topColor.value.setHex(0x020612);
      this.skyMat.uniforms.horizonColor.value.setHex(0x182c4d);
      this.skyMat.uniforms.bottomColor.value.setHex(0x08101a);
      this.terrainMat.color.setHex(0x151b22);

      if (dirLight) {
        dirLight.color.setHex(0xd0e6ff);
        dirLight.intensity = 2.2;
        dirLight.position.set(4000, 8000, 3000);
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x8cb6e8);
        hemiLight.groundColor.setHex(0x0e141c);
      }
    } else if (envKey === 'sunset') {
      // Golden Hour Desert Sunset
      this.skyMat.uniforms.topColor.value.setHex(0x1a0f28);
      this.skyMat.uniforms.horizonColor.value.setHex(0xff6a28);
      this.skyMat.uniforms.bottomColor.value.setHex(0x351410);
      this.terrainMat.color.setHex(0x422416); // Red canyon desert

      if (dirLight) {
        dirLight.color.setHex(0xffaa44);
        dirLight.intensity = 2.8;
        dirLight.position.set(-6000, 2200, -5000);
      }
      if (hemiLight) {
        hemiLight.color.setHex(0xff8844);
        hemiLight.groundColor.setHex(0x281008);
      }
    } else if (envKey === 'stormy') {
      // Stormy Night Ops
      this.skyMat.uniforms.topColor.value.setHex(0x05070a);
      this.skyMat.uniforms.horizonColor.value.setHex(0x0e141c);
      this.skyMat.uniforms.bottomColor.value.setHex(0x040608);
      this.terrainMat.color.setHex(0x0d1217);

      if (dirLight) {
        dirLight.color.setHex(0x607890);
        dirLight.intensity = 0.6;
        dirLight.position.set(1000, 4000, 2000);
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x304050);
        hemiLight.groundColor.setHex(0x06080c);
      }
    }
  }

  update(delta) {
    // 1. Slowly drift clouds
    if (this.cloudLayer && this.cloudLayer.visible) {
      this.cloudLayer.position.z += delta * 15.0;
      if (this.cloudLayer.position.z > 4000) {
        this.cloudLayer.position.z = -4000;
      }
    }

    // 2. Wind Tunnel Streamlines Animation
    if (this.windTunnel && this.windTunnel.visible) {
      const posAttr = this.streamlines.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < this.streamlineData.length; i++) {
        const d = this.streamlineData[i];
        d.z -= d.speed * delta;
        if (d.z < -40) d.z = 40;
        arr[i * 3 + 2] = d.z;
      }
      posAttr.needsUpdate = true;
    }

    // 3. Lightning flash generator for stormy environment
    if (this.currentEnv === 'stormy') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 3.5 + Math.random() * 4.0) {
        this.lightningTimer = 0;
        this.lightningLight.intensity = 8.0;
        setTimeout(() => {
          if (this.lightningLight) this.lightningLight.intensity = 0;
        }, 120);
      }
    }
  }
}
