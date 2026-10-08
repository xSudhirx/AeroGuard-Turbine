import * as THREE from 'three';

/**
 * EngineGeometryBuilder
 * Generates procedural aerospace CAD geometry for a high-bypass 2-spool turbofan engine.
 * Represents all major assemblies:
 * - Fan Module (STA 1.0)
 * - Nacelle & Bypass Cowling (Split clamshell casing)
 * - Low Pressure Compressor (LPC - STA 2.0)
 * - Core Splitter Island
 * - High Pressure Compressor (HPC - STA 3.0)
 * - Annular Combustor & Fuel Injectors (STA 4.0)
 * - High Pressure Turbine (HPT - STA 4.5)
 * - Low Pressure Turbine (LPT - STA 5.0)
 * - Coaxial Shafts & Bearing Housings (LP & HP Spools)
 * - Exhaust Nozzle & Centerbody Tailcone
 */

export class EngineGeometryBuilder {
  constructor() {
    // Shared PBR Materials
    this.materials = this.createMaterials();
    // Assemblies collection
    this.assemblies = {};
    // Rotatable elements: { lp: [], hp: [] }
    this.rotatables = { lp: [], hp: [] };
    // Interactive mesh registry for raycasting: mesh -> assemblyId
    this.interactiveMeshes = [];
  }

  createMaterials() {
    return {
      // Titanium Fan & Blisks (satin aerospace titanium)
      titanium: new THREE.MeshStandardMaterial({
        color: 0x9fb3c8,
        metalness: 0.88,
        roughness: 0.24,
      }),
      // High-temperature Nickel-Chromium superalloy (HPC & Turbines)
      superalloy: new THREE.MeshStandardMaterial({
        color: 0x6e7f96,
        metalness: 0.85,
        roughness: 0.35,
      }),
      // Polished Shaft Chrome Steel
      shaftSteel: new THREE.MeshStandardMaterial({
        color: 0xd8e2ed,
        metalness: 0.95,
        roughness: 0.15,
      }),
      // Nacelle Outer Casing (aerospace deep navy composite shell)
      casingOuter: new THREE.MeshPhysicalMaterial({
        color: 0x12365c,
        metalness: 0.45,
        roughness: 0.35,
        transmission: 0.65,
        opacity: 0.85,
        transparent: true,
        ior: 1.4,
        roughnessMap: null,
      }),
      // Casing Internal Acoustic Lining / Honeycomb
      casingLiner: new THREE.MeshStandardMaterial({
        color: 0x1a4570,
        metalness: 0.6,
        roughness: 0.5,
      }),
      // Ceramic Thermal Barrier Coating (Combustor & HPT Vanes)
      thermalCeramic: new THREE.MeshStandardMaterial({
        color: 0xd97736,
        metalness: 0.2,
        roughness: 0.65,
      }),
      // Combustor Fuel Manifold & Nozzles (Brass/Gold alloy)
      fuelManifold: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.3,
      }),
      // Internal Combustor Core Glow
      combustorGlow: new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4500,
        emissiveIntensity: 0.6,
        roughness: 0.8,
        metalness: 0.1,
      }),
      // Exhaust Tailcone (Dark heat-treated titanium)
      exhaustTitanium: new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.9,
        roughness: 0.3,
      }),
      // Wireframe CAD Overlay
      wireframeCad: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      }),
    };
  }

  /**
   * Builds the entire engine root group
   */
  build() {
    const root = new THREE.Group();
    root.name = 'Turbofan_Root';

    // 1. Fan Assembly (STA 1.0)
    const fanGroup = this.buildFan();
    root.add(fanGroup);
    this.assemblies.fan = {
      id: 'fan',
      name: 'Fan & Inlet Module',
      station: 'STA 1.0',
      group: fanGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(-6.5, 0, 0),
      sensorStation: 't2_fan_inlet_temp',
      anchorOffset: new THREE.Vector3(-7.5, 3.2, 0),
    };

    // 2. Nacelle & Cowling Casing (Split upper & lower)
    const casingGroup = this.buildNacelle();
    root.add(casingGroup);
    this.assemblies.casing = {
      id: 'casing',
      name: 'Nacelle & Bypass Casing',
      station: 'SYS-COWL',
      group: casingGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(0, 0, 0), // Upper moves +Y, Lower moves -Y
      isCasing: true,
      upper: casingGroup.userData.upper,
      lower: casingGroup.userData.lower,
      anchorOffset: new THREE.Vector3(-3.5, 4.5, 0),
    };

    // 3. Low Pressure Compressor (LPC - STA 2.0)
    const lpcGroup = this.buildLPC();
    root.add(lpcGroup);
    this.assemblies.lpc = {
      id: 'lpc',
      name: 'Low Pressure Compressor (LPC)',
      station: 'STA 2.0 - 2.5',
      group: lpcGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(-3.2, 0, 0),
      sensorStation: 't24_lpc_temp',
      anchorOffset: new THREE.Vector3(-4.8, 2.4, 0),
    };

    // 4. High Pressure Compressor (HPC - STA 3.0)
    const hpcGroup = this.buildHPC();
    root.add(hpcGroup);
    this.assemblies.hpc = {
      id: 'hpc',
      name: 'High Pressure Compressor (HPC)',
      station: 'STA 3.0',
      group: hpcGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(-0.8, 0, 0),
      sensorStation: 't30_hpc_temp',
      anchorOffset: new THREE.Vector3(-1.8, 2.2, 0),
    };

    // 5. Annular Combustor Chamber (STA 4.0)
    const combustorGroup = this.buildCombustor();
    root.add(combustorGroup);
    this.assemblies.combustor = {
      id: 'combustor',
      name: 'Annular Combustor & Injectors',
      station: 'STA 4.0',
      group: combustorGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(1.2, 0, 0),
      sensorStation: 'ps30_hpc_static_press',
      anchorOffset: new THREE.Vector3(1.5, 2.2, 0),
    };

    // 6. High Pressure Turbine (HPT - STA 4.5)
    const hptGroup = this.buildHPT();
    root.add(hptGroup);
    this.assemblies.hpt = {
      id: 'hpt',
      name: 'High Pressure Turbine (HPT)',
      station: 'STA 4.5',
      group: hptGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(3.2, 0, 0),
      sensorStation: 'ht_bleed',
      anchorOffset: new THREE.Vector3(3.0, 2.2, 0),
    };

    // 7. Low Pressure Turbine (LPT - STA 5.0)
    const lptGroup = this.buildLPT();
    root.add(lptGroup);
    this.assemblies.lpt = {
      id: 'lpt',
      name: 'Low Pressure Turbine (LPT)',
      station: 'STA 5.0',
      group: lptGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(5.6, 0, 0),
      sensorStation: 't50_lpt_temp',
      anchorOffset: new THREE.Vector3(5.2, 2.3, 0),
    };

    // 8. Coaxial Drive Shafts & Bearing Housings
    const shaftGroup = this.buildShafts();
    root.add(shaftGroup);
    this.assemblies.shafts = {
      id: 'shafts',
      name: 'Dual Coaxial Drive Spools',
      station: 'SYS-SHAFT',
      group: shaftGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(0, -1.2, 0),
      sensorStation: 'nc_core_speed',
      anchorOffset: new THREE.Vector3(0, -1.8, 0),
    };

    // 9. Exhaust Nozzle & Tailcone
    const exhaustGroup = this.buildExhaust();
    root.add(exhaustGroup);
    this.assemblies.exhaust = {
      id: 'exhaust',
      name: 'Exhaust Nozzle & Plug',
      station: 'STA 6.0',
      group: exhaustGroup,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedOffset: new THREE.Vector3(8.5, 0, 0),
      sensorStation: 't50_lpt_temp',
      anchorOffset: new THREE.Vector3(8.2, 2.0, 0),
    };

    // Register all meshes with user data for raycasting
    Object.values(this.assemblies).forEach((assembly) => {
      assembly.group.traverse((child) => {
        if (child.isMesh) {
          child.userData.assemblyId = assembly.id;
          child.userData.assemblyName = assembly.name;
          child.userData.station = assembly.station;
          this.interactiveMeshes.push(child);
        }
      });
    });

    return {
      root,
      assemblies: this.assemblies,
      rotatables: this.rotatables,
      interactiveMeshes: this.interactiveMeshes,
    };
  }

  // ==============================================================
  // 1. FAN MODULE
  // ==============================================================
  buildFan() {
    const group = new THREE.Group();
    group.name = 'Assembly_Fan';

    // Rotating Fan Rotor Group
    const rotor = new THREE.Group();
    rotor.name = 'Fan_Rotor';
    rotor.position.x = -7.2;

    // Spinner Nose Cone
    const spinnerGeom = new THREE.ConeGeometry(0.85, 2.2, 32);
    spinnerGeom.rotateZ(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeom, this.materials.titanium);
    spinner.position.x = -1.1;
    rotor.add(spinner);

    // Decorative spiral line on spinner (engineering white/cyan)
    const spiralPts = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const angle = t * Math.PI * 4;
      const r = (1 - t) * 0.75 + 0.05;
      const x = -1.1 + (t - 0.5) * 1.8;
      spiralPts.push(new THREE.Vector3(x, Math.sin(angle) * r, Math.cos(angle) * r));
    }
    const spiralGeom = new THREE.BufferGeometry().setFromPoints(spiralPts);
    const spiralLine = new THREE.Line(
      spiralGeom,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    );
    rotor.add(spiralLine);

    // Fan Hub Disk
    const hubGeom = new THREE.CylinderGeometry(1.2, 1.25, 0.9, 32);
    hubGeom.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeom, this.materials.titanium);
    rotor.add(hub);

    // Fan Blades (24 wide-chord titanium blades with aerodynamic twist)
    const bladeCount = 24;
    const bladeHeight = 2.4;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      const bladeGeom = new THREE.BoxGeometry(0.5, bladeHeight, 0.08);
      // Aerodynamic curve/twist
      const posAttr = bladeGeom.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        const y = posAttr.getY(j);
        const factor = (y + bladeHeight / 2) / bladeHeight;
        posAttr.setZ(j, posAttr.getZ(j) + factor * 0.18);
        posAttr.setX(j, posAttr.getX(j) - factor * 0.12);
      }
      bladeGeom.computeVertexNormals();

      const blade = new THREE.Mesh(bladeGeom, this.materials.titanium);
      blade.position.set(0, (bladeHeight / 2 + 1.1) * Math.cos(angle), (bladeHeight / 2 + 1.1) * Math.sin(angle));
      blade.rotation.x = angle;
      blade.rotation.y = 0.35; // Angle of attack
      blade.rotation.z = -0.05;
      rotor.add(blade);
    }

    group.add(rotor);
    this.rotatables.lp.push(rotor);

    // Static Fan Containment Ring & Outlet Guide Vanes (OGV)
    const fanCasingGeom = new THREE.CylinderGeometry(3.7, 3.8, 1.4, 48, 1, true);
    fanCasingGeom.rotateZ(Math.PI / 2);
    const fanCasing = new THREE.Mesh(fanCasingGeom, this.materials.titanium);
    fanCasing.position.x = -7.2;
    group.add(fanCasing);

    // 16 Outlet Guide Vanes (OGV stator vanes behind fan)
    const ogvGroup = new THREE.Group();
    ogvGroup.position.x = -6.4;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const vaneGeom = new THREE.BoxGeometry(0.3, 2.3, 0.05);
      const vane = new THREE.Mesh(vaneGeom, this.materials.superalloy);
      vane.position.set(0, (1.15 + 1.2) * Math.cos(angle), (1.15 + 1.2) * Math.sin(angle));
      vane.rotation.x = angle;
      vane.rotation.y = -0.2;
      ogvGroup.add(vane);
    }
    group.add(ogvGroup);

    return group;
  }

  // ==============================================================
  // 2. NACELLE & BYPASS COWLING
  // ==============================================================
  buildNacelle() {
    const group = new THREE.Group();
    group.name = 'Assembly_Nacelle';

    // Upper Cowl Clamshell (moves +Y in exploded view)
    const upperCowl = new THREE.Group();
    upperCowl.name = 'Upper_Cowl';

    // Lower Cowl Clamshell (moves -Y in exploded view)
    const lowerCowl = new THREE.Group();
    lowerCowl.name = 'Lower_Cowl';

    // Upper Half Shell (sweep PI radians from 0 to PI)
    const upperGeom = new THREE.CylinderGeometry(3.8, 3.9, 7.8, 48, 1, true, 0, Math.PI);
    upperGeom.rotateZ(Math.PI / 2);
    const upperMesh = new THREE.Mesh(upperGeom, this.materials.casingOuter);
    upperMesh.position.x = -4.0;
    upperCowl.add(upperMesh);

    // Upper Nacelle Lip / Inlet Cowl
    const upperLipGeom = new THREE.TorusGeometry(3.85, 0.25, 16, 32, Math.PI);
    upperLipGeom.rotateY(Math.PI / 2);
    const upperLip = new THREE.Mesh(upperLipGeom, this.materials.titanium);
    upperLip.position.x = -7.9;
    upperCowl.add(upperLip);

    // Upper Cad Accent Lines
    const upperEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(upperGeom, 40),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    upperEdges.position.x = -4.0;
    upperCowl.add(upperEdges);

    // Lower Half Shell (sweep PI radians from PI to 2PI)
    const lowerGeom = new THREE.CylinderGeometry(3.8, 3.9, 7.8, 48, 1, true, Math.PI, Math.PI);
    lowerGeom.rotateZ(Math.PI / 2);
    const lowerMesh = new THREE.Mesh(lowerGeom, this.materials.casingOuter);
    lowerMesh.position.x = -4.0;
    lowerCowl.add(lowerMesh);

    // Lower Nacelle Lip
    const lowerLipGeom = new THREE.TorusGeometry(3.85, 0.25, 16, 32, Math.PI);
    lowerLipGeom.rotateY(-Math.PI / 2);
    const lowerLip = new THREE.Mesh(lowerLipGeom, this.materials.titanium);
    lowerLip.position.x = -7.9;
    lowerCowl.add(lowerLip);

    // Lower Cad Accent Lines
    const lowerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(lowerGeom, 40),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    lowerEdges.position.x = -4.0;
    lowerCowl.add(lowerEdges);

    // Inner Core Splitter Cowling (Aerodynamic splitter separating core and bypass)
    const splitterGeom = new THREE.CylinderGeometry(2.35, 2.5, 4.2, 32, 1, true);
    splitterGeom.rotateZ(Math.PI / 2);
    const splitterMesh = new THREE.Mesh(splitterGeom, this.materials.casingLiner);
    splitterMesh.position.x = -3.8;
    group.add(splitterMesh);

    group.add(upperCowl);
    group.add(lowerCowl);
    group.userData.upper = upperCowl;
    group.userData.lower = lowerCowl;

    return group;
  }

  // ==============================================================
  // 3. LOW PRESSURE COMPRESSOR (LPC)
  // ==============================================================
  buildLPC() {
    const group = new THREE.Group();
    group.name = 'Assembly_LPC';

    // Rotating LPC Drum & 3 Stages of Bladed Disks
    const lpcRotor = new THREE.Group();
    lpcRotor.name = 'LPC_Rotor';

    // Central drum shaft
    const drumGeom = new THREE.CylinderGeometry(1.0, 1.15, 1.8, 32);
    drumGeom.rotateZ(Math.PI / 2);
    const drum = new THREE.Mesh(drumGeom, this.materials.titanium);
    drum.position.x = -4.8;
    lpcRotor.add(drum);

    // 3 Stages of LPC blades
    const stages = [
      { x: -5.3, radius: 2.1, count: 20, bladeH: 1.0 },
      { x: -4.8, radius: 1.95, count: 22, bladeH: 0.85 },
      { x: -4.3, radius: 1.8, count: 24, bladeH: 0.72 },
    ];

    stages.forEach((stg) => {
      // Disk ring
      const diskGeom = new THREE.CylinderGeometry(stg.radius - stg.bladeH, stg.radius - stg.bladeH, 0.22, 24);
      diskGeom.rotateZ(Math.PI / 2);
      const disk = new THREE.Mesh(diskGeom, this.materials.titanium);
      disk.position.x = stg.x;
      lpcRotor.add(disk);

      // Radial blades
      for (let i = 0; i < stg.count; i++) {
        const angle = (i / stg.count) * Math.PI * 2;
        const bGeom = new THREE.BoxGeometry(0.18, stg.bladeH, 0.04);
        const blade = new THREE.Mesh(bGeom, this.materials.titanium);
        const rPos = stg.radius - stg.bladeH / 2;
        blade.position.set(stg.x, rPos * Math.cos(angle), rPos * Math.sin(angle));
        blade.rotation.x = angle;
        blade.rotation.y = 0.25;
        lpcRotor.add(blade);
      }
    });

    group.add(lpcRotor);
    this.rotatables.lp.push(lpcRotor);

    // Outer LPC Stator Casing Ring
    const statCasingGeom = new THREE.CylinderGeometry(2.15, 2.25, 1.8, 32, 1, true);
    statCasingGeom.rotateZ(Math.PI / 2);
    const statCasing = new THREE.Mesh(statCasingGeom, this.materials.superalloy);
    statCasing.position.x = -4.8;
    group.add(statCasing);

    return group;
  }

  // ==============================================================
  // 4. HIGH PRESSURE COMPRESSOR (HPC)
  // ==============================================================
  buildHPC() {
    const group = new THREE.Group();
    group.name = 'Assembly_HPC';

    // Rotating HPC Drum with 5 Converging Blisk Stages
    const hpcRotor = new THREE.Group();
    hpcRotor.name = 'HPC_Rotor';

    // Converging Core Drum
    const drumGeom = new THREE.CylinderGeometry(0.85, 0.95, 2.8, 32);
    drumGeom.rotateZ(Math.PI / 2);
    const drum = new THREE.Mesh(drumGeom, this.materials.superalloy);
    drum.position.x = -1.6;
    hpcRotor.add(drum);

    // 5 Converging Rotor Stages (radii decreasing towards combustor)
    const hpcStages = [
      { x: -2.7, radius: 1.68, count: 24, bladeH: 0.72 },
      { x: -2.15, radius: 1.55, count: 26, bladeH: 0.62 },
      { x: -1.6, radius: 1.42, count: 28, bladeH: 0.52 },
      { x: -1.05, radius: 1.32, count: 30, bladeH: 0.44 },
      { x: -0.5, radius: 1.22, count: 32, bladeH: 0.36 },
    ];

    hpcStages.forEach((stg) => {
      // Blisk rotor disk
      const diskGeom = new THREE.CylinderGeometry(stg.radius - stg.bladeH, stg.radius - stg.bladeH, 0.16, 24);
      diskGeom.rotateZ(Math.PI / 2);
      const disk = new THREE.Mesh(diskGeom, this.materials.superalloy);
      disk.position.x = stg.x;
      hpcRotor.add(disk);

      // Precision nickel alloy blades
      for (let i = 0; i < stg.count; i++) {
        const angle = (i / stg.count) * Math.PI * 2;
        const bGeom = new THREE.BoxGeometry(0.14, stg.bladeH, 0.035);
        const blade = new THREE.Mesh(bGeom, this.materials.superalloy);
        const rPos = stg.radius - stg.bladeH / 2;
        blade.position.set(stg.x, rPos * Math.cos(angle), rPos * Math.sin(angle));
        blade.rotation.x = angle;
        blade.rotation.y = 0.3;
        hpcRotor.add(blade);
      }
    });

    group.add(hpcRotor);
    this.rotatables.hp.push(hpcRotor);

    // HPC Casing & Variable Stator Vane (VSV) Actuator Rings
    const hpcCasingGeom = new THREE.CylinderGeometry(1.35, 1.8, 2.9, 32, 1, true);
    hpcCasingGeom.rotateZ(Math.PI / 2);
    const hpcCasing = new THREE.Mesh(hpcCasingGeom, this.materials.superalloy);
    hpcCasing.position.x = -1.6;
    group.add(hpcCasing);

    // Actuator unison rings (external mechanical rings)
    [-2.4, -1.8, -1.2].forEach((xPos) => {
      const ringGeom = new THREE.TorusGeometry(1.68, 0.04, 8, 32);
      ringGeom.rotateY(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, this.materials.titanium);
      ring.position.x = xPos;
      group.add(ring);
    });

    return group;
  }

  // ==============================================================
  // 5. ANNULAR COMBUSTOR (BURNER)
  // ==============================================================
  buildCombustor() {
    const group = new THREE.Group();
    group.name = 'Assembly_Combustor';

    // Outer & Inner Combustor Liners (with perforated cooling holes appearance)
    const outerLinerGeom = new THREE.CylinderGeometry(1.52, 1.45, 1.6, 32, 1, true);
    outerLinerGeom.rotateZ(Math.PI / 2);
    const outerLiner = new THREE.Mesh(outerLinerGeom, this.materials.thermalCeramic);
    outerLiner.position.x = 1.0;
    group.add(outerLiner);

    const innerLinerGeom = new THREE.CylinderGeometry(0.85, 0.88, 1.6, 32, 1, true);
    innerLinerGeom.rotateZ(Math.PI / 2);
    const innerLiner = new THREE.Mesh(innerLinerGeom, this.materials.thermalCeramic);
    innerLiner.position.x = 1.0;
    group.add(innerLiner);

    // Core Combustion Zone Heat Glow Ring
    const flameRingGeom = new THREE.CylinderGeometry(1.18, 1.18, 1.2, 24, 1, true);
    flameRingGeom.rotateZ(Math.PI / 2);
    const flameRing = new THREE.Mesh(flameRingGeom, this.materials.combustorGlow);
    flameRing.position.x = 1.05;
    group.add(flameRing);

    // Fuel Manifold Circular Distribution Pipe
    const manifoldGeom = new THREE.TorusGeometry(1.58, 0.05, 12, 32);
    manifoldGeom.rotateY(Math.PI / 2);
    const manifold = new THREE.Mesh(manifoldGeom, this.materials.fuelManifold);
    manifold.position.x = 0.3;
    group.add(manifold);

    // 16 Dual-Orifice Fuel Injector Nozzles
    const nozzleCount = 16;
    for (let i = 0; i < nozzleCount; i++) {
      const angle = (i / nozzleCount) * Math.PI * 2;
      const nozzleStemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8);
      const nozzleTipGeom = new THREE.SphereGeometry(0.08, 8, 8);

      const stem = new THREE.Mesh(nozzleStemGeom, this.materials.fuelManifold);
      stem.position.set(0.35, 1.4 * Math.cos(angle), 1.4 * Math.sin(angle));
      stem.rotation.x = angle;
      group.add(stem);

      const tip = new THREE.Mesh(nozzleTipGeom, this.materials.fuelManifold);
      tip.position.set(0.5, 1.25 * Math.cos(angle), 1.25 * Math.sin(angle));
      group.add(tip);
    }

    return group;
  }

  // ==============================================================
  // 6. HIGH PRESSURE TURBINE (HPT)
  // ==============================================================
  buildHPT() {
    const group = new THREE.Group();
    group.name = 'Assembly_HPT';

    // Stationary Nozzle Guide Vanes (NGV - Station 4.1)
    const ngvGroup = new THREE.Group();
    ngvGroup.position.x = 2.1;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const vaneGeom = new THREE.BoxGeometry(0.18, 0.58, 0.04);
      const vane = new THREE.Mesh(vaneGeom, this.materials.thermalCeramic);
      vane.position.set(0, 1.15 * Math.cos(angle), 1.15 * Math.sin(angle));
      vane.rotation.x = angle;
      vane.rotation.y = -0.32;
      ngvGroup.add(vane);
    }
    group.add(ngvGroup);

    // Rotating HPT Bladed Rotor Disk (Connected to HP Spool)
    const hptRotor = new THREE.Group();
    hptRotor.name = 'HPT_Rotor';
    hptRotor.position.x = 2.6;

    // Turbine rotor disk
    const diskGeom = new THREE.CylinderGeometry(0.9, 0.9, 0.25, 24);
    diskGeom.rotateZ(Math.PI / 2);
    const disk = new THREE.Mesh(diskGeom, this.materials.superalloy);
    hptRotor.add(disk);

    // Single-crystal nickel alloy turbine blades with serpentine cooling passages
    const bladeCount = 24;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      const bGeom = new THREE.BoxGeometry(0.2, 0.52, 0.04);
      const blade = new THREE.Mesh(bGeom, this.materials.superalloy);
      blade.position.set(0, 1.16 * Math.cos(angle), 1.16 * Math.sin(angle));
      blade.rotation.x = angle;
      blade.rotation.y = 0.35;
      hptRotor.add(blade);
    }

    group.add(hptRotor);
    this.rotatables.hp.push(hptRotor);

    // HPT Casing Ring with Coolant Bleed Ports
    const casingGeom = new THREE.CylinderGeometry(1.5, 1.48, 0.8, 32, 1, true);
    casingGeom.rotateZ(Math.PI / 2);
    const casing = new THREE.Mesh(casingGeom, this.materials.superalloy);
    casing.position.x = 2.4;
    group.add(casing);

    return group;
  }

  // ==============================================================
  // 7. LOW PRESSURE TURBINE (LPT)
  // ==============================================================
  buildLPT() {
    const group = new THREE.Group();
    group.name = 'Assembly_LPT';

    // Rotating LPT 3-Stage Rotor Assembly (Connected to LP Spool / Fan)
    const lptRotor = new THREE.Group();
    lptRotor.name = 'LPT_Rotor';

    // Expanding LPT Rotor Stages
    const stages = [
      { x: 3.5, radius: 1.55, count: 24, bladeH: 0.65 },
      { x: 4.3, radius: 1.72, count: 26, bladeH: 0.78 },
      { x: 5.1, radius: 1.9, count: 28, bladeH: 0.92 },
    ];

    stages.forEach((stg) => {
      // Rotor disk
      const diskGeom = new THREE.CylinderGeometry(stg.radius - stg.bladeH, stg.radius - stg.bladeH, 0.22, 24);
      diskGeom.rotateZ(Math.PI / 2);
      const disk = new THREE.Mesh(diskGeom, this.materials.superalloy);
      disk.position.x = stg.x;
      lptRotor.add(disk);

      // Expanding shroud blades
      for (let i = 0; i < stg.count; i++) {
        const angle = (i / stg.count) * Math.PI * 2;
        const bGeom = new THREE.BoxGeometry(0.18, stg.bladeH, 0.04);
        const blade = new THREE.Mesh(bGeom, this.materials.superalloy);
        const rPos = stg.radius - stg.bladeH / 2;
        blade.position.set(stg.x, rPos * Math.cos(angle), rPos * Math.sin(angle));
        blade.rotation.x = angle;
        blade.rotation.y = 0.32;
        lptRotor.add(blade);
      }
    });

    group.add(lptRotor);
    this.rotatables.lp.push(lptRotor);

    // Expanding LPT Stator Casing & Interstage Vanes
    const lptCasingGeom = new THREE.CylinderGeometry(2.05, 1.58, 2.3, 32, 1, true);
    lptCasingGeom.rotateZ(Math.PI / 2);
    const lptCasing = new THREE.Mesh(lptCasingGeom, this.materials.superalloy);
    lptCasing.position.x = 4.3;
    group.add(lptCasing);

    return group;
  }

  // ==============================================================
  // 8. COAXIAL SHAFTS & BEARINGS
  // ==============================================================
  buildShafts() {
    const group = new THREE.Group();
    group.name = 'Assembly_Shafts';

    // LP Inner Solid Spool (Extends through entire engine from Fan to LPT)
    const lpShaftGeom = new THREE.CylinderGeometry(0.24, 0.24, 13.5, 24);
    lpShaftGeom.rotateZ(Math.PI / 2);
    const lpShaft = new THREE.Mesh(lpShaftGeom, this.materials.shaftSteel);
    lpShaft.position.x = -0.5;
    group.add(lpShaft);
    this.rotatables.lp.push(lpShaft);

    // HP Outer Concentric Sleeve Spool (Connects HPC to HPT)
    const hpShaftGeom = new THREE.CylinderGeometry(0.42, 0.42, 6.2, 24, 1, true);
    hpShaftGeom.rotateZ(Math.PI / 2);
    const hpShaft = new THREE.Mesh(hpShaftGeom, this.materials.shaftSteel);
    hpShaft.position.x = 0.4;
    group.add(hpShaft);
    this.rotatables.hp.push(hpShaft);

    // Main Bearing Housing Assemblies & Support Struts
    const bearingLocations = [-6.2, -3.2, 2.9, 5.8];
    bearingLocations.forEach((xPos) => {
      const bRingGeom = new THREE.TorusGeometry(0.55, 0.08, 12, 24);
      bRingGeom.rotateY(Math.PI / 2);
      const bRing = new THREE.Mesh(bRingGeom, this.materials.shaftSteel);
      bRing.position.x = xPos;
      group.add(bRing);
    });

    return group;
  }

  // ==============================================================
  // 9. EXHAUST SYSTEM & PLUG
  // ==============================================================
  buildExhaust() {
    const group = new THREE.Group();
    group.name = 'Assembly_Exhaust';

    // Aerodynamic Exhaust Centerbody Tailcone / Plug
    const plugGeom = new THREE.ConeGeometry(1.2, 3.8, 32);
    plugGeom.rotateZ(-Math.PI / 2);
    const plug = new THREE.Mesh(plugGeom, this.materials.exhaustTitanium);
    plug.position.x = 7.6;
    group.add(plug);

    // Primary Core Exhaust Nozzle Cowl
    const nozzleGeom = new THREE.CylinderGeometry(1.6, 2.1, 2.4, 32, 1, true);
    nozzleGeom.rotateZ(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeom, this.materials.exhaustTitanium);
    nozzle.position.x = 6.8;
    group.add(nozzle);

    // 6 Structural Exhaust Struts
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const strutGeom = new THREE.BoxGeometry(0.2, 0.8, 0.06);
      const strut = new THREE.Mesh(strutGeom, this.materials.superalloy);
      strut.position.set(6.2, 1.4 * Math.cos(angle), 1.4 * Math.sin(angle));
      strut.rotation.x = angle;
      group.add(strut);
    }

    return group;
  }

  /**
   * Applies continuous rotation to LP and HP spools
   * @param {number} delta - Frame delta time in seconds
   * @param {number} lpSpeed - LP rotational speed in rad/s
   * @param {number} hpSpeed - HP rotational speed in rad/s
   */
  updateRotations(delta, lpSpeed = 1.2, hpSpeed = 2.6) {
    this.rotatables.lp.forEach((obj) => {
      obj.rotation.x += delta * lpSpeed;
    });
    this.rotatables.hp.forEach((obj) => {
      obj.rotation.x += delta * hpSpeed;
    });
  }

  /**
   * Interpolates exploded view state
   * @param {number} progress - 0.0 (assembled) to 1.0 (exploded)
   */
  updateExplosion(progress) {
    // Easing curve: smooth cubic ease-in-out
    const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    Object.values(this.assemblies).forEach((assembly) => {
      if (assembly.isCasing) {
        // Casing halves split radially +Y and -Y, and increase transparency
        const yOffset = 4.8 * t;
        if (assembly.upper) assembly.upper.position.y = yOffset;
        if (assembly.lower) assembly.lower.position.y = -yOffset;
        // Adjust opacity
        this.materials.casingOuter.opacity = 0.85 - t * 0.72; // Transitions down to 0.13
        this.materials.casingOuter.transmission = 0.65 + t * 0.3;
      } else {
        // Linear translation along X thrust axis
        const targetX = assembly.basePos.x + assembly.explodedOffset.x * t;
        const targetY = assembly.basePos.y + assembly.explodedOffset.y * t;
        const targetZ = assembly.basePos.z + assembly.explodedOffset.z * t;
        assembly.group.position.set(targetX, targetY, targetZ);
      }
    });
  }

  /**
   * Highlight/glow an assembly by ID
   * @param {string|null} activeId - Assembly ID to highlight, or null to clear
   * @param {string} status - 'Nominal', 'Degrading', 'Critical'
   */
  setHighlight(activeId, status = 'Nominal') {
    let glowColor = 0x38bdf8; // Default aerospace cyan
    if (status === 'Critical') glowColor = 0xffb020;
    else if (status === 'Degrading') glowColor = 0xe8893c;

    Object.values(this.assemblies).forEach((assembly) => {
      const isTarget = assembly.id === activeId;
      assembly.group.traverse((child) => {
        if (child.isMesh && child.material) {
          if (isTarget) {
            child.material.emissive = new THREE.Color(glowColor);
            child.material.emissiveIntensity = 0.45;
          } else {
            // Restore default emissive
            if (child.material === this.materials.combustorGlow) {
              child.material.emissive = new THREE.Color(0xff4500);
              child.material.emissiveIntensity = 0.6;
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        }
      });
    });
  }

  /**
   * Clean up WebGL resources
   */
  dispose() {
    Object.values(this.materials).forEach((mat) => mat.dispose());
  }
}
