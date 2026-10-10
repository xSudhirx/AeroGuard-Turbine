import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Engine3DScene } from './Engine3DScene';
import EngineLoadingScreen from './EngineLoadingScreen';
import EngineTooltip from './EngineTooltip';
import EngineHUDOverlay from './EngineHUDOverlay';
import RiskIndicator from '../RiskIndicator';

/**
 * EngineDigitalTwin Component
 * Centerpiece 3D aerospace engineering digital twin:
 * - Real-time WebGL rendering of high-bypass turbofan
 * - Scroll-driven exploded view choreography (0% to 100%)
 * - OrbitControls for rotate/pan/zoom
 * - Raycaster hover inspection with live NASA C-MAPSS telemetry tooltips
 * - 2D CAD HUD annotations with leader lines
 * - CAD controls: Assembled, Core, Exploded, Turntable, Reset
 * - Responsive viewport with sticky scroll container
 */
export default function EngineDigitalTwin({
  selectedEngine,
  onSelectUnit,
  allEngines = [],
  onOpenDetail,
  onToggle2D3D,
  viewMode = '3d',
}) {
  const containerRef = useRef(null);
  const scrollWrapperRef = useRef(null);
  const sceneInstanceRef = useRef(null);

  const [sceneInstance, setSceneInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explodedProgress, setExplodedProgress] = useState(0.0);
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeStage, setActiveStage] = useState(null);

  // Fallback nominal telemetry if engine is missing
  const engine = selectedEngine || (allEngines.length > 0 ? allEngines[0] : null);
  const sensors = engine?.sensor_readings || {
    t2_fan_inlet_temp: 518.67,
    t24_lpc_temp: 642.58,
    t30_hpc_temp: 1581.22,
    t50_lpt_temp: 1398.91,
    p2_fan_inlet_press: 14.62,
    p15_bypass_press: 21.61,
    p30_hpc_press: 554.42,
    ps30_hpc_static_press: 47.23,
    nf_fan_speed: 2388.08,
    nc_core_speed: 9056.4,
    bpr_bypass_ratio: 8.4024,
    ht_bleed: 393.0,
    phi_fuel_ratio: 521.79,
  };

  // Set explosion manually via HUD controls
  const handleSetExplosion = useCallback((val) => {
    setExplodedProgress(val);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setExplosionProgress(val);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.resetCamera();
    }
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    if (sceneInstanceRef.current) {
      const active = sceneInstanceRef.current.toggleAutoRotate();
      setAutoRotate(active);
    }
  }, []);

  const handleFocusStation = useCallback((stationId) => {
    setActiveStage(stationId);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.focusStation(stationId);
    }
  }, []);

  const handleFocusStationRef = useRef(handleFocusStation);
  useEffect(() => {
    handleFocusStationRef.current = handleFocusStation;
  }, [handleFocusStation]);

  // Station definitions matching NASA C-MAPSS instrumentation
  const stages = [
    {
      id: 'fan',
      name: 'Fan & Inlet Stage',
      station: 'STA 1.0 - 2.0',
      items: [
        { label: 'Nf (Fan Speed)', val: `${sensors.nf_fan_speed.toFixed(1)} RPM`, nominal: '2388.0' },
        { label: 'T2 (Inlet Temp)', val: `${sensors.t2_fan_inlet_temp.toFixed(1)} °R`, nominal: '518.7' },
        { label: 'P2 (Inlet Press)', val: `${sensors.p2_fan_inlet_press.toFixed(2)} psia`, nominal: '14.6' },
      ],
      status: engine?.subsystem_status?.fan || 'Nominal',
    },
    {
      id: 'lpc',
      name: 'LPC & Bypass Duct',
      station: 'STA 2.1 - 2.5',
      items: [
        { label: 'T24 (LPC Exit)', val: `${sensors.t24_lpc_temp.toFixed(2)} °R`, nominal: '642.5' },
        { label: 'P15 (Bypass P)', val: `${sensors.p15_bypass_press.toFixed(2)} psia`, nominal: '21.6' },
        { label: 'BPR (Bypass)', val: sensors.bpr_bypass_ratio.toFixed(2), nominal: '8.40' },
      ],
      status: 'Nominal',
    },
    {
      id: 'hpc',
      name: 'HPC (Core Compressor)',
      station: 'STA 3.0',
      items: [
        { label: 'T30 (HPC Exit Temp)', val: `${sensors.t30_hpc_temp.toFixed(2)} °R`, nominal: '1582.0' },
        { label: 'P30 (HPC Exit Press)', val: `${sensors.p30_hpc_press.toFixed(2)} psia`, nominal: '554.0' },
        { label: 'Nc (Core Speed)', val: `${sensors.nc_core_speed.toFixed(1)} RPM`, nominal: '9055.0' },
      ],
      status: engine?.subsystem_status?.compressor || 'Nominal',
    },
    {
      id: 'combustor',
      name: 'Combustor & Fuel Injectors',
      station: 'STA 3.5 - 4.0',
      items: [
        { label: 'Ps30 (Static P)', val: `${sensors.ps30_hpc_static_press.toFixed(2)} psia`, nominal: '47.3' },
        { label: 'phi (Fuel Ratio)', val: `${sensors.phi_fuel_ratio.toFixed(2)}`, nominal: '521.8' },
      ],
      status: engine?.subsystem_status?.combustor || 'Nominal',
    },
    {
      id: 'hpt',
      name: 'HPT & Coolant Bleed',
      station: 'STA 4.1',
      items: [
        { label: 'htBleed (Bleed Enthalpy)', val: `${sensors.ht_bleed.toFixed(1)} kJ/kg`, nominal: '392.5' },
        { label: 'Coolant W31', val: '38.8 lbm/s', nominal: '38.8' },
      ],
      status: engine?.subsystem_status?.turbine || 'Nominal',
    },
    {
      id: 'lpt',
      name: 'LPT & Exhaust Stage',
      station: 'STA 5.0',
      items: [
        { label: 'T50 (LPT Exit Temp)', val: `${sensors.t50_lpt_temp.toFixed(2)} °R`, nominal: '1400.0' },
        { label: 'Exhaust Status', val: 'Subsonic Exp.', nominal: 'Nominal' },
      ],
      status: engine?.risk_bucket === 'Critical' ? 'Exhaust EGT Exceeded' : 'Nominal',
    },
  ];

  const engineRef = useRef(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Engine3DScene({
      container: containerRef.current,
      onHover: (comp) => setHoveredComponent(comp),
      onClick: (comp) => {
        if (comp && comp.id && handleFocusStationRef.current) {
          handleFocusStationRef.current(comp.id);
        }
      },
      onSceneReady: (sc) => {
        sceneInstanceRef.current = sc;
        setSceneInstance(sc);
        sc.updateTelemetry(engineRef.current);
      },
    });

    return () => {
      scene.dispose();
      sceneInstanceRef.current = null;
      setSceneInstance(null);
    };
  }, []); // Run once on mount

  // Update telemetry when selected engine changes
  useEffect(() => {
    if (sceneInstanceRef.current && engine) {
      sceneInstanceRef.current.updateTelemetry(engine);
    }
  }, [engine]);

  // Scroll listener: Calculates normalized scroll progress through scrollWrapperRef
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollWrapperRef.current) return;

      const rect = scrollWrapperRef.current.getBoundingClientRect();
      const wrapperHeight = scrollWrapperRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      // Scrollable distance within the container
      const totalScrollable = wrapperHeight - windowHeight;
      if (totalScrollable <= 0) return;

      // Progress from 0.0 to 1.0
      const currentScroll = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, currentScroll / totalScrollable));

      setExplodedProgress(rawProgress);

      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.setExplosionProgress(rawProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={scrollWrapperRef}
      className="relative w-full"
      style={{ minHeight: '190vh' }}
    >
      {/* Sticky Digital Twin Viewport */}
      <div className="sticky top-2 sm:top-4 z-10 w-full space-y-3">
        {/* Aerospace Sheet Header & Controls */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 border border-[#1A426F] bg-[#071524] text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[#38BDF8] font-bold tracking-wider">
              CAD NO. AG-FD001-3D
            </span>
            <span className="text-[#1A426F]">/</span>
            <span className="text-[#E8F1F8] font-semibold">
              HIGH-BYPASS TURBOFAN DIGITAL TWIN (INTERACTIVE 3D CAD)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {engine && (
              <div className="flex items-center gap-2">
                <span className="text-[#7C94AA]">ACTIVE TELEMETRY:</span>
                <span className="text-[#E8F1F8] font-bold">{engine.unit_id}</span>
                <RiskIndicator bucket={engine.risk_bucket} showLabel />
              </div>
            )}

            {allEngines.length > 0 && (
              <select
                value={engine?.unit_id || ''}
                onChange={(e) => {
                  const found = allEngines.find((item) => item.unit_id === e.target.value);
                  if (found && onSelectUnit) onSelectUnit(found);
                }}
                aria-label="Select Engine Unit"
                className="bg-[#0B1E33] border border-[#1A426F] text-[#E8F1F8] text-xs px-2 py-1 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
              >
                {allEngines.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.unit_id} ({u.risk_bucket} - RUL {u.predicted_rul})
                  </option>
                ))}
              </select>
            )}

            {engine && onOpenDetail && (
              <button
                type="button"
                onClick={() => onOpenDetail(engine)}
                className="border border-[#1A426F] bg-[#13365C] hover:bg-[#1A426F] text-[#E8F1F8] px-2.5 py-1 text-xs font-mono transition-colors"
              >
                Open unit detail &rarr;
              </button>
            )}

            {/* View Mode Toggle: 3D Twin <-> 2D Blueprint */}
            {onToggle2D3D && (
              <button
                type="button"
                onClick={onToggle2D3D}
                className="border border-[#38BDF8] bg-[#071524] hover:bg-[#13365C] text-[#38BDF8] px-2.5 py-1 text-xs font-mono font-bold transition-colors"
                title="Switch to 2D Technical Schematic Cross-Section"
              >
                VIEW 2D BLUEPRINT
              </button>
            )}
          </div>
        </div>

        {/* 3D Canvas Box: Orbital Visualization Chamber */}
        <section
          className="relative border border-[#1A426F] bg-[#010409] overflow-hidden shadow-2xl"
          style={{ height: '68vh', minHeight: '520px', maxHeight: '780px' }}
          aria-label="3D Turbofan Digital Twin Visualization"
        >
          {/* Three.js Canvas Container */}
          <div ref={containerRef} className="w-full h-full relative" />

          {/* Deep-Space Orbital Vignette Overlay (focuses attention on turbine, pointer-events pass through) */}
          <div
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(1, 4, 10, 0.35) 75%, rgba(1, 4, 10, 0.85) 100%)',
              boxShadow: 'inset 0 0 54px rgba(1, 4, 10, 0.75)',
            }}
          />

          {/* Technical Corner Framing Reticles */}
          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-[#38BDF8]/40 pointer-events-none z-10" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-[#38BDF8]/40 pointer-events-none z-10" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-[#38BDF8]/40 pointer-events-none z-10" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-[#38BDF8]/40 pointer-events-none z-10" />

          {/* Aerospace Loading Screen */}
          {isLoading && (
            <EngineLoadingScreen onComplete={() => setIsLoading(false)} />
          )}

          {/* 2D Engineering HUD Overlay with leader lines & CAD controls */}
          <EngineHUDOverlay
            scene={sceneInstance}
            engine={engine}
            explodedProgress={explodedProgress}
            onSetExplosion={handleSetExplosion}
            onResetView={handleResetView}
            onToggleAutoRotate={handleToggleAutoRotate}
            autoRotate={autoRotate}
            onFocusStation={handleFocusStation}
            onToggle2D3D={onToggle2D3D}
            viewMode={viewMode}
          />

          {/* CAD Hover Tooltip */}
          <EngineTooltip
            hoveredComponent={hoveredComponent}
            engine={engine}
          />

          {/* Scroll Stage Milestone Indicator along Left Edge */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 z-10 pointer-events-none text-[9px] font-mono">
            <div className={`flex items-center gap-1.5 transition-colors ${explodedProgress < 0.25 ? 'text-[#38BDF8] font-bold' : 'text-[#7C94AA]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${explodedProgress < 0.25 ? 'bg-[#38BDF8]' : 'bg-[#1A426F]'}`} />
              <span>0% ASSEMBLED</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${explodedProgress >= 0.25 && explodedProgress < 0.5 ? 'text-[#38BDF8] font-bold' : 'text-[#7C94AA]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${explodedProgress >= 0.25 && explodedProgress < 0.5 ? 'bg-[#38BDF8]' : 'bg-[#1A426F]'}`} />
              <span>35% CASING X-RAY</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${explodedProgress >= 0.5 && explodedProgress < 0.8 ? 'text-[#38BDF8] font-bold' : 'text-[#7C94AA]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${explodedProgress >= 0.5 && explodedProgress < 0.8 ? 'bg-[#38BDF8]' : 'bg-[#1A426F]'}`} />
              <span>65% SPOOL SEPARATION</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${explodedProgress >= 0.8 ? 'text-[#38BDF8] font-bold' : 'text-[#7C94AA]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${explodedProgress >= 0.8 ? 'bg-[#38BDF8]' : 'bg-[#1A426F]'}`} />
              <span>100% CAD EXPLODED VIEW</span>
            </div>
          </div>
        </section>

        {/* Subsystem Telemetry Deck (Preserved & Enhanced with 3D Focus Interaction) */}
        <div className="border border-[#1A426F] bg-[#0B1E33]">
          <div className="px-4 py-2 bg-[#13365C]/40 border-b border-[#1A426F] text-xs font-mono text-[#7C94AA] flex items-center justify-between">
            <span>INSTRUMENTATION READOUT DECK // REAL-TIME SUBSYSTEM TELEMETRY</span>
            <span className="text-[11px] text-[#38BDF8]">
              CLICK STAGE TO FOCUS 3D CAMERA // UNITS: °R, PSIA, RPM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-[#1A426F]">
            {stages.map((stage) => {
              const isCritical = stage.id === 'hpc' && engine?.risk_bucket === 'Critical';
              const isDegrading = stage.id === 'hpc' && engine?.risk_bucket === 'Degrading';
              const isActive = activeStage === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`p-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#13365C] ring-1 ring-[#38BDF8]'
                      : 'bg-[#0B1E33] hover:bg-[#13365C]/50'
                  }`}
                  onClick={() => handleFocusStation(stage.id)}
                >
                  <div className="flex items-center justify-between border-b border-[#1A426F] pb-1.5 mb-2">
                    <span className="text-xs font-mono font-semibold text-[#E8F1F8] truncate">
                      {stage.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#38BDF8]">
                      {stage.station}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {stage.items.map((item, idx) => (
                      <div key={idx} className="flex items-baseline justify-between text-xs font-mono">
                        <span className="text-[#7C94AA] text-[11px] truncate">{item.label}:</span>
                        <span className="text-[#E8F1F8] font-medium ml-2">{item.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-1.5 border-t border-[#1A426F]/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#7C94AA]">Status:</span>
                    <span
                      className={
                        isCritical
                          ? 'text-[#FFB020] font-semibold'
                          : isDegrading
                          ? 'text-[#E8893C]'
                          : 'text-[#4ADE80]'
                      }
                    >
                      {isCritical ? 'ALERT' : isDegrading ? 'STRESS' : stage.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
