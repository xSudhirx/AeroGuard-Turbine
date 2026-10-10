import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EngineGeometryBuilder } from './EngineGeometryBuilder';
import { SpaceBackground } from './SpaceBackground';

/**
 * Engine3DScene
 * Manages the Three.js WebGL canvas, camera choreography, OrbitControls,
 * lighting, raycaster hover detection, continuous rotation loop,
 * airflow particles, and 3D-to-2D screen projection for engineering HUD annotations.
 */
export class Engine3DScene {
  constructor({
    container,
    onHover,
    onClick,
    onSceneReady,
  }) {
    this.container = container;
    this.onHover = onHover;
    this.onClick = onClick;
    this.onSceneReady = onSceneReady;

    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 500;

    // State flags
    this.autoRotate = false;
    this.isDisposed = false;
    this.explodedProgress = 0.0;
    this.targetExplodedProgress = 0.0;
    this.activeHoveredId = null;
    this.hoverLocked = false;

    // Telemetry sensor rates (scaled for smooth visual spin)
    this.lpSpeed = 1.2;
    this.hpSpeed = 2.8;

    // Initialize core components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLighting();
    this.initControls();
    this.initGridAndEnvironment();
    this.initParticles();
    this.initEngineModel();
    this.initRaycaster();

    // Clock
    this.clock = new THREE.Clock();

    // Start render loop
    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);

    // Resize handling
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);

    if (this.onSceneReady) {
      this.onSceneReady(this);
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010409); // Deep space cosmic black
    // Linear fog: starts at 36 units so engine and central drafting grid remain 100% crisp,
    // while distant boundaries gently dissolve into cosmic blackness
    this.scene.fog = new THREE.Fog(0x010409, 36, 120);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      42,
      this.width / this.height,
      0.1,
      260 // Extended far plane to accommodate deep-field stars & celestial dome
    );
    // Engineering 3/4 isometric perspective looking at intake and side profile
    this.defaultCamPos = new THREE.Vector3(-12, 6.5, 17);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);

    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultTarget);

    // Target positions for smooth camera interpolation
    this.targetCamPos = this.defaultCamPos.clone();
    this.targetCamLookAt = this.defaultTarget.clone();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    // 1. Soft aerospace ambient light (calibrated so dark titanium facets remain legible)
    const ambientLight = new THREE.AmbientLight(0x102946, 1.25);
    this.scene.add(ambientLight);

    // 2. Primary key directional light (top-front-left)
    const keyLight = new THREE.DirectionalLight(0xe8f4ff, 2.3);
    keyLight.position.set(-15, 20, 15);
    this.scene.add(keyLight);

    // 3. Technical rim light (cyan backlight outlining titanium blade edges)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.9);
    rimLight.position.set(15, -10, -15);
    this.scene.add(rimLight);

    // 4. Cool-blue celestial rim light (top-rear outline silhouetting nacelle against space)
    const celestialRimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    celestialRimLight.position.set(-10, 16, -16);
    this.scene.add(celestialRimLight);

    // 5. Secondary soft fill light (front-right)
    const fillLight = new THREE.DirectionalLight(0x7c94aa, 0.95);
    fillLight.position.set(10, 8, 12);
    this.scene.add(fillLight);

    // 6. Internal combustor heat point light
    this.burnerPointLight = new THREE.PointLight(0xff7700, 1.5, 12, 1.5);
    this.burnerPointLight.position.set(1.0, 0, 0);
    this.scene.add(this.burnerPointLight);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.15; // Prevent flipping below ground plane
    this.controls.target.copy(this.defaultTarget);

    // Disables default right-click context menu on canvas
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  initGridAndEnvironment() {
    // 1. Procedural deep-space celestial dome & multi-layer starfield
    this.spaceBackground = new SpaceBackground(this.scene, this.camera);

    // 2. Engineering drafting coordinate floor grid (orbital datum platform)
    const gridHelper = new THREE.GridHelper(38, 38, 0x1b4470, 0x0c2542);
    gridHelper.position.y = -4.5;
    if (gridHelper.material) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.55;
    }
    this.scene.add(gridHelper);

    // 3. Centerline datum plane
    const datumGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-14, 0, 0),
      new THREE.Vector3(16, 0, 0),
    ]);
    const datumMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.8,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.45,
    });
    const datumLine = new THREE.Line(datumGeom, datumMat);
    datumLine.computeLineDistances();
    this.scene.add(datumLine);
  }

  initParticles() {
    // Airflow & telemetry particle stream (drifting from intake to exhaust)
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const radii = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const x = -10 + Math.random() * 22;
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 3.2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = Math.cos(angle) * r;

      velocities[i * 3] = 4.5 + Math.random() * 5.0; // Forward velocity along X
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      radii[i] = r;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particlesData = { positions, velocities, radii, count: particleCount };
    this.scene.add(this.particles);
  }

  initEngineModel() {
    this.builder = new EngineGeometryBuilder();
    const { root, assemblies, rotatables, interactiveMeshes } = this.builder.build();
    this.engineRoot = root;
    this.assemblies = assemblies;
    this.rotatables = rotatables;
    this.interactiveMeshes = interactiveMeshes;

    this.scene.add(this.engineRoot);
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);

    this.onPointerMove = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkRaycast(event.clientX, event.clientY);
    };

    this.onPointerLeave = () => {
      this.mouse.set(-1000, -1000);
      if (this.activeHoveredId) {
        this.activeHoveredId = null;
        this.builder.setHighlight(null);
        if (this.onHover) this.onHover(null);
        this.renderer.domElement.style.cursor = 'default';
      }
    };

    this.onPointerClick = (_event) => {
      if (this.activeHoveredId && this.onClick) {
        this.onClick(this.assemblies[this.activeHoveredId]);
      }
    };

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('click', this.onPointerClick);
  }

  checkRaycast(screenX, screenY) {
    if (!this.interactiveMeshes || this.interactiveMeshes.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const assemblyId = hitMesh.userData.assemblyId;

      if (assemblyId && this.activeHoveredId !== assemblyId) {
        this.activeHoveredId = assemblyId;
        const assembly = this.assemblies[assemblyId];
        this.builder.setHighlight(assemblyId, this.engineStatus || 'Nominal');
        this.renderer.domElement.style.cursor = 'pointer';

        if (this.onHover) {
          this.onHover({
            ...assembly,
            screenX,
            screenY,
          });
        }
      }
    } else {
      if (this.activeHoveredId) {
        this.activeHoveredId = null;
        this.builder.setHighlight(null);
        this.renderer.domElement.style.cursor = 'default';
        if (this.onHover) this.onHover(null);
      }
    }
  }

  /**
   * Sets current telemetry speeds for continuous spool rotation
   */
  updateTelemetry(engineData) {
    if (!engineData) return;
    this.currentEngine = engineData;
    this.engineStatus = engineData.risk_bucket || 'Nominal';

    const sensors = engineData.sensor_readings || {};
    // Map RPMs: Fan nominal ~2388 RPM -> ~1.2 rad/s, Core nominal ~9055 RPM -> ~2.8 rad/s
    if (sensors.nf_fan_speed) {
      this.lpSpeed = (sensors.nf_fan_speed / 2388) * 1.25;
    }
    if (sensors.nc_core_speed) {
      this.hpSpeed = (sensors.nc_core_speed / 9055) * 2.85;
    }
  }

  /**
   * Set target exploded view progress (0.0 to 1.0)
   */
  setExplosionProgress(progress) {
    this.targetExplodedProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Smoothly interpolate camera towards a specific engine assembly or view preset
   */
  focusStation(stationId) {
    const assembly = this.assemblies[stationId];
    if (!assembly) return;

    const currentX = assembly.group.position.x + (assembly.anchorOffset ? assembly.anchorOffset.x : 0);
    this.targetCamLookAt.set(currentX * 0.7, 0, 0);
    this.targetCamPos.set(currentX - 5, 4.5, 12);
  }

  resetCamera() {
    this.targetCamPos.copy(this.defaultCamPos);
    this.targetCamLookAt.copy(this.defaultTarget);
    this.controls.target.copy(this.defaultTarget);
  }

  setPresetView(viewName) {
    if (viewName === 'assembled') {
      this.setExplosionProgress(0.0);
      this.resetCamera();
    } else if (viewName === 'exploded') {
      this.setExplosionProgress(1.0);
      this.targetCamPos.set(-2, 7.5, 23);
      this.targetCamLookAt.set(1.5, 0, 0);
    } else if (viewName === 'core') {
      this.setExplosionProgress(0.5);
      this.targetCamPos.set(0, 3.8, 14);
      this.targetCamLookAt.set(0, 0, 0);
    }
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.0;
    return this.autoRotate;
  }

  /**
   * Get 2D projected screen positions for engineering HUD annotations
   */
  getProjectedAnchors() {
    if (!this.assemblies || !this.camera) return [];

    const anchors = [];
    const t = this.explodedProgress;

    Object.values(this.assemblies).forEach((assembly) => {
      // Calculate world position of anchor
      const worldPos = new THREE.Vector3();
      if (assembly.isCasing) {
        worldPos.set(-3.5, 4.2 + 4.8 * t, 0);
      } else {
        const x = assembly.basePos.x + assembly.explodedOffset.x * t;
        const y = assembly.basePos.y + assembly.explodedOffset.y * t + (assembly.anchorOffset ? assembly.anchorOffset.y : 2.0);
        worldPos.set(x, y, 0);
      }

      // Project to normalized device coordinates
      const projected = worldPos.clone().project(this.camera);

      // Check if in front of camera
      const isVisible = projected.z < 1;
      const screenX = ((projected.x + 1) / 2) * this.width;
      const screenY = ((-projected.y + 1) / 2) * this.height;

      anchors.push({
        id: assembly.id,
        name: assembly.name,
        station: assembly.station,
        screenX,
        screenY,
        worldX: worldPos.x,
        isVisible,
        sensorStation: assembly.sensorStation,
      });
    });

    return anchors;
  }

  handleResize() {
    if (!this.container || this.isDisposed) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    if (this.isDisposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 0. Update space background (celestial dome centering, starfield drift, camera parallax)
    if (this.spaceBackground) {
      this.spaceBackground.update(delta, elapsedTime);
    }

    // 1. Smooth interpolation of exploded view
    this.explodedProgress += (this.targetExplodedProgress - this.explodedProgress) * 0.08;
    this.builder.updateExplosion(this.explodedProgress);

    // 2. Smooth continuous spool rotations
    this.builder.updateRotations(delta, this.lpSpeed, this.hpSpeed);

    // 3. Update airflow particles
    if (this.particles) {
      const posAttr = this.particles.geometry.attributes.position;
      const { velocities, count } = this.particlesData;
      for (let i = 0; i < count; i++) {
        let x = posAttr.getX(i) + velocities[i * 3] * delta;
        // Wrap around when past exhaust
        if (x > 12.0) {
          x = -11.0;
        }
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Subtle burner light pulse
    if (this.burnerPointLight) {
      this.burnerPointLight.intensity = 1.3 + 0.35 * Math.sin(elapsedTime * 6);
    }

    // 5. Smooth camera interpolation when transitioning target
    if (this.targetCamPos && !this.controls.state) {
      this.camera.position.lerp(this.targetCamPos, 0.04);
      this.controls.target.lerp(this.targetCamLookAt, 0.04);
    }

    // 6. Update OrbitControls
    this.controls.update();

    // 7. Render
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);

    window.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) this.resizeObserver.disconnect();

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
      this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
      this.renderer.domElement.removeEventListener('click', this.onPointerClick);

      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    if (this.controls) this.controls.dispose();
    if (this.builder) this.builder.dispose();
    if (this.spaceBackground) {
      this.spaceBackground.dispose();
      this.spaceBackground = null;
    }
  }
}
