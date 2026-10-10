import * as THREE from 'three';

/**
 * SpaceBackground
 * Renders a premium, cinematic deep-space orbital environment behind the 3D turbofan engine:
 * - Procedural celestial atmosphere dome with deep midnight tones, soft cyan/indigo haze gradients
 * - 3-tier multi-depth starfield with natural astronomical scattering and spectral color variation
 * - Procedurally generated soft starlight textures with Gaussian falloff (no heavy assets)
 * - Multiplane parallax responsive to OrbitControls camera movement
 * - Dignified, ultra-slow celestial drift respecting prefers-reduced-motion
 * - Strict render ordering and depth settings to ensure it never obstructs engine geometry
 */
export class SpaceBackground {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'SpaceBackgroundRoot';

    // Reduced motion preference listener
    this.prefersReducedMotion = false;
    this.setupReducedMotion();

    // Textures
    this.starTexture = this.createStarTexture();
    this.brightStarTexture = this.createBrightStarTexture();

    // Visual layers
    this.initCelestialDome();
    this.initStarLayers();

    this.scene.add(this.rootGroup);
  }

  setupReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.motionQuery.matches;
      this.handleMotionChange = (e) => {
        this.prefersReducedMotion = e.matches;
      };
      this.motionQuery.addEventListener('change', this.handleMotionChange);
    }
  }

  /**
   * Procedural circular starlight sprite with smooth Gaussian falloff
   */
  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(224, 242, 254, 0.95)');
    grad.addColorStop(0.42, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.72, 'rgba(14, 116, 144, 0.12)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  /**
   * Procedural luminous reference star sprite with subtle diffraction glow
   */
  createBrightStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Soft outer celestial halo
    const haloGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    haloGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    haloGrad.addColorStop(0.15, 'rgba(216, 240, 255, 0.9)');
    haloGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.4)');
    haloGrad.addColorStop(0.65, 'rgba(30, 64, 175, 0.15)');
    haloGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = haloGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle technical diffraction spikes (cross halation)
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(64, 108);
    ctx.moveTo(20, 64);
    ctx.lineTo(108, 64);
    ctx.stroke();

    // Intense central starlight core
    const coreGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 12);
    coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(52, 52, 24, 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  /**
   * Procedural celestial atmospheric dome with deep space gradients and soft haze
   */
  initCelestialDome() {
    this.domeGeometry = new THREE.SphereGeometry(190, 32, 24);

    this.domeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHazeIntensity: { value: 0.14 },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform float uHazeIntensity;

        void main() {
          vec3 dir = vWorldDir;

          // Deep space midnight tones (Astra minimal dark palette)
          vec3 deepVoid = vec3(0.006, 0.014, 0.028);     // #010307 - cosmic black
          vec3 zenithNavy = vec3(0.012, 0.026, 0.052);    // #03070d - upper midnight space
          vec3 nadirFloor = vec3(0.005, 0.012, 0.024);    // #010306 - bottom abyss

          // Vertical elevation blend
          float elev = dir.y;
          vec3 baseTone = mix(deepVoid, zenithNavy, smoothstep(-0.25, 0.85, elev));
          baseTone = mix(baseTone, nadirFloor, smoothstep(0.0, -0.85, elev));

          // Restrained atmospheric limb / orbital twilight horizon arc
          // Tilted at a natural 24-degree celestial inclination
          vec3 orbitalPole = normalize(vec3(0.35, 0.92, 0.18));
          float horizonDist = abs(dot(dir, orbitalPole) - 0.12);
          float atmosphericLimb = smoothstep(0.55, 0.0, horizonDist);
          vec3 limbColor = vec3(0.025, 0.088, 0.155); // Restrained cool blue/cyan

          // Subtle deep-space nebula harmonic lobes (low-frequency cosmic washes)
          vec3 lobe1Dir = normalize(vec3(-0.62, 0.35, -0.68));
          float lobe1 = pow(max(0.0, dot(dir, lobe1Dir)), 3.2) * 0.075;

          vec3 lobe2Dir = normalize(vec3(0.72, -0.18, 0.65));
          float lobe2 = pow(max(0.0, dot(dir, lobe2Dir)), 3.6) * 0.055;

          vec3 nebulaWash = vec3(0.028, 0.098, 0.175) * lobe1 + vec3(0.022, 0.045, 0.125) * lobe2;

          vec3 finalColor = baseTone + (limbColor * atmosphericLimb * uHazeIntensity) + nebulaWash;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });

    this.domeMesh = new THREE.Mesh(this.domeGeometry, this.domeMaterial);
    this.domeMesh.renderOrder = -100; // Render behind everything in the scene
    this.rootGroup.add(this.domeMesh);
  }

  /**
   * Initializes 3 distinct procedural starfield layers for genuine depth & parallax
   */
  initStarLayers() {
    this.starGroup = new THREE.Group();
    this.starGroup.name = 'StarfieldDriftGroup';

    // Layer 1: Distant micro-stars (vast celestial background)
    this.distantLayer = this.buildStarLayer({
      count: 750,
      minRadius: 130,
      maxRadius: 175,
      size: 1.1,
      opacity: 0.65,
      texture: this.starTexture,
      renderOrder: -90,
    });
    this.starGroup.add(this.distantLayer);

    // Layer 2: Mid-field stars (apparent depth & parallax layer)
    this.midLayer = this.buildStarLayer({
      count: 280,
      minRadius: 95,
      maxRadius: 130,
      size: 1.8,
      opacity: 0.82,
      texture: this.starTexture,
      renderOrder: -80,
    });
    this.starGroup.add(this.midLayer);

    // Layer 3: Prominent reference navigational stars (bright guide stars)
    this.nearLayer = this.buildStarLayer({
      count: 36,
      minRadius: 75,
      maxRadius: 105,
      size: 3.2,
      opacity: 0.95,
      texture: this.brightStarTexture,
      renderOrder: -70,
    });
    this.starGroup.add(this.nearLayer);

    this.rootGroup.add(this.starGroup);
  }

  /**
   * Builds an individual procedural star layer with natural spectral coloring
   */
  buildStarLayer({ count, minRadius, maxRadius, size, opacity, texture, renderOrder }) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Astronomical spectral color palettes (O/B/A hot white-blue, F/G yellow-white, K amber)
    const spectralPalettes = [
      new THREE.Color(0xdbeafe), // Crisp icy starlight white
      new THREE.Color(0x93c5fd), // Soft cyan-blue
      new THREE.Color(0xbfdbfe), // Cool celestial blue
      new THREE.Color(0xf8fafc), // Pure luminous white
      new THREE.Color(0x7dd3fc), // Technical starlight cyan
      new THREE.Color(0xfde68a), // Rare subtle warm amber (approx 5% of stars)
    ];

    for (let i = 0; i < count; i++) {
      // Natural uniform spherical distribution using inverse transform sampling
      const theta = 2 * Math.PI * Math.random();
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u); // 0 to PI

      // Depth radius
      const r = minRadius + Math.pow(Math.random(), 0.75) * (maxRadius - minRadius);

      // Spherical coordinates to Cartesian
      const sinPhi = Math.sin(phi);
      let x = r * sinPhi * Math.cos(theta);
      let y = r * Math.cos(phi);
      let z = r * sinPhi * Math.sin(theta);

      // Slight celestial inclination bias (mimicking natural galactic equator concentration)
      if (Math.random() < 0.35) {
        y *= 0.55; // Flatten slightly towards equatorial band
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Select spectral color
      let chosenColor;
      const colorRoll = Math.random();
      if (colorRoll < 0.45) {
        chosenColor = spectralPalettes[0]; // Icy white
      } else if (colorRoll < 0.70) {
        chosenColor = spectralPalettes[1]; // Cyan-blue
      } else if (colorRoll < 0.85) {
        chosenColor = spectralPalettes[2]; // Cool blue
      } else if (colorRoll < 0.95) {
        chosenColor = spectralPalettes[3]; // Pure white
      } else {
        chosenColor = spectralPalettes[5]; // Warm amber
      }

      // Vary brightness magnitude
      const brightness = 0.55 + Math.random() * 0.45;
      colors[i * 3] = chosenColor.r * brightness;
      colors[i * 3 + 1] = chosenColor.g * brightness;
      colors[i * 3 + 2] = chosenColor.b * brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false, // Ensure stars are never occluded by scene fog
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = renderOrder;
    return points;
  }

  /**
   * Animation update: maintains camera centering, slow celestial drift, and parallax
   */
  update(delta, elapsedTime) {
    if (!this.camera) return;

    // 1. Keep the celestial dome centered on the camera so it behaves like an infinite skybox
    if (this.domeMesh) {
      this.domeMesh.position.copy(this.camera.position);
    }

    // 2. Camera translation multiplane parallax
    // Stars at different layers shift subtly with camera position to enhance perceived depth
    const camPos = this.camera.position;
    if (this.midLayer) {
      this.midLayer.position.set(camPos.x * 0.05, camPos.y * 0.05, camPos.z * 0.05);
    }
    if (this.nearLayer) {
      this.nearLayer.position.set(camPos.x * 0.10, camPos.y * 0.10, camPos.z * 0.10);
    }

    // 3. Very slow celestial drift (disabled if prefers-reduced-motion is active)
    if (!this.prefersReducedMotion && this.starGroup) {
      // Steady, tranquil drift: ~1 full rotation per 40 minutes (0.0025 rad/s)
      this.starGroup.rotation.y += delta * 0.0025;
      this.starGroup.rotation.z = Math.sin(elapsedTime * 0.02) * 0.005;
    }
  }

  dispose() {
    if (this.motionQuery && this.handleMotionChange) {
      this.motionQuery.removeEventListener('change', this.handleMotionChange);
    }

    if (this.domeGeometry) this.domeGeometry.dispose();
    if (this.domeMaterial) this.domeMaterial.dispose();

    if (this.starTexture) this.starTexture.dispose();
    if (this.brightStarTexture) this.brightStarTexture.dispose();

    const disposeLayer = (layer) => {
      if (layer) {
        if (layer.geometry) layer.geometry.dispose();
        if (layer.material) layer.material.dispose();
      }
    };

    disposeLayer(this.distantLayer);
    disposeLayer(this.midLayer);
    disposeLayer(this.nearLayer);

    if (this.rootGroup && this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}
