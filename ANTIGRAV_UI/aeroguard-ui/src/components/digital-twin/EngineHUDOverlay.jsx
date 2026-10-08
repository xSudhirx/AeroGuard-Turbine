import React, { useState, useEffect } from 'react';
import RiskIndicator from '../RiskIndicator';

/**
 * EngineHUDOverlay
 * 2D Screen-space aerospace engineering CAD annotations,
 * technical leader lines with anchor dots,
 * and high-precision CAD view controls.
 */
export default function EngineHUDOverlay({
  scene,
  engine,
  explodedProgress,
  onSetExplosion,
  onResetView,
  onToggleAutoRotate,
  autoRotate,
  onFocusStation,
  onToggle2D3D,
  viewMode = '3d', // '3d' | '2d'
}) {
  const [anchors, setAnchors] = useState([]);

  // Continuously query projected 3D anchors from the scene
  useEffect(() => {
    let animId;
    const updateAnchors = () => {
      if (scene && scene.getProjectedAnchors) {
        const projected = scene.getProjectedAnchors();
        setAnchors(projected);
      }
      animId = requestAnimationFrame(updateAnchors);
    };
    animId = requestAnimationFrame(updateAnchors);
    return () => cancelAnimationFrame(animId);
  }, [scene]);

  // Labels become visible as exploded view develops (progress > 0.30)
  const labelsOpacity = Math.max(0, Math.min(1, (explodedProgress - 0.30) / 0.40));

  // Filter assemblies for clean annotation presentation
  const majorStations = [
    { id: 'fan', label: 'FAN MODULE', station: 'STA 1.0', offsetTop: -45 },
    { id: 'lpc', label: 'LP COMPRESSOR', station: 'STA 2.0', offsetTop: -55 },
    { id: 'hpc', label: 'HP COMPRESSOR', station: 'STA 3.0', offsetTop: -40 },
    { id: 'combustor', label: 'ANNULAR COMBUSTOR', station: 'STA 4.0', offsetTop: -50 },
    { id: 'hpt', label: 'HP TURBINE', station: 'STA 4.5', offsetTop: -40 },
    { id: 'lpt', label: 'LP TURBINE', station: 'STA 5.0', offsetTop: -55 },
    { id: 'exhaust', label: 'EXHAUST PLUG', station: 'STA 6.0', offsetTop: -40 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
      {/* 1. SVG Leader Lines connecting 3D components to aerospace labels */}
      {labelsOpacity > 0.05 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: labelsOpacity }}
        >
          <defs>
            <filter id="hudGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {majorStations.map((stationItem) => {
            const anchor = anchors.find((a) => a.id === stationItem.id);
            if (!anchor || !anchor.isVisible) return null;

            const ax = anchor.screenX;
            const ay = anchor.screenY;
            const labelY = ay + stationItem.offsetTop;

            return (
              <g key={stationItem.id} className="transition-all duration-75">
                {/* 3D Component Anchor Reticle */}
                <circle
                  cx={ax}
                  cy={ay}
                  r="3.5"
                  fill="#38BDF8"
                  stroke="#071524"
                  strokeWidth="1.5"
                  filter="url(#hudGlow)"
                />
                <circle
                  cx={ax}
                  cy={ay}
                  r="7"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="0.75"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />

                {/* Thin technical leader line */}
                <polyline
                  points={`${ax},${ay} ${ax},${labelY} ${ax + 24},${labelY}`}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  opacity="0.75"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* 2. Floating Engineering Labels positioned via screen coordinates */}
      {labelsOpacity > 0.05 &&
        majorStations.map((stationItem) => {
          const anchor = anchors.find((a) => a.id === stationItem.id);
          if (!anchor || !anchor.isVisible) return null;

          const labelX = anchor.screenX + 26;
          const labelY = anchor.screenY + stationItem.offsetTop - 14;

          return (
            <div
              key={stationItem.id}
              className="absolute pointer-events-auto cursor-pointer group"
              style={{
                left: `${labelX}px`,
                top: `${labelY}px`,
                opacity: labelsOpacity,
                transform: 'translateY(-50%)',
              }}
              onClick={() => onFocusStation(stationItem.id)}
            >
              <div className="bg-[#071524]/85 border border-[#1A426F] hover:border-[#38BDF8] px-2 py-1 text-[10px] font-mono shadow-lg transition-colors">
                <div className="text-[#38BDF8] text-[9px] font-bold tracking-wider">
                  {stationItem.station}
                </div>
                <div className="text-[#E8F1F8] font-semibold tracking-tight whitespace-nowrap">
                  {stationItem.label}
                </div>
              </div>
            </div>
          );
        })}

      {/* 3. Top-Right CAD Viewport Controls & Explosion Scrubber */}
      <div className="absolute top-3 right-3 pointer-events-auto flex flex-col items-end gap-2 text-xs font-mono">
        {/* View Mode & Preset Buttons */}
        <div className="flex items-center gap-1.5 bg-[#071524]/90 border border-[#1A426F] p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => onSetExplosion(0.0)}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              explodedProgress < 0.15
                ? 'border-[#38BDF8] bg-[#13365C] text-[#E8F1F8] font-bold'
                : 'border-transparent text-[#7C94AA] hover:text-[#E8F1F8]'
            }`}
            title="Assemble engine"
          >
            ASSEMBLED
          </button>

          <button
            type="button"
            onClick={() => onSetExplosion(0.5)}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              explodedProgress >= 0.15 && explodedProgress <= 0.85
                ? 'border-[#38BDF8] bg-[#13365C] text-[#E8F1F8] font-bold'
                : 'border-transparent text-[#7C94AA] hover:text-[#E8F1F8]'
            }`}
            title="Inspect inner core"
          >
            CORE VIEW
          </button>

          <button
            type="button"
            onClick={() => onSetExplosion(1.0)}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              explodedProgress > 0.85
                ? 'border-[#38BDF8] bg-[#13365C] text-[#E8F1F8] font-bold'
                : 'border-transparent text-[#7C94AA] hover:text-[#E8F1F8]'
            }`}
            title="Full exploded technical breakdown"
          >
            EXPLODED
          </button>

          <span className="w-px h-4 bg-[#1A426F] mx-1" />

          {/* Auto rotate toggle */}
          <button
            type="button"
            onClick={onToggleAutoRotate}
            className={`px-2 py-1 text-[11px] border transition-colors ${
              autoRotate
                ? 'border-[#4ADE80] bg-[#13365C] text-[#4ADE80] font-bold'
                : 'border-transparent text-[#7C94AA] hover:text-[#E8F1F8]'
            }`}
            title="Toggle 360 degree turntable rotation"
          >
            TURNTABLE
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={onResetView}
            className="px-2 py-1 text-[11px] border border-transparent text-[#7C94AA] hover:text-[#E8F1F8] hover:border-[#1A426F] transition-colors"
            title="Reset CAD camera to default"
          >
            RESET
          </button>

          {/* Toggle between 3D Digital Twin and 2D CAD Schematic */}
          {onToggle2D3D && (
            <>
              <span className="w-px h-4 bg-[#1A426F] mx-1" />
              <button
                type="button"
                onClick={onToggle2D3D}
                className="px-2.5 py-1 text-[11px] border border-[#1A426F] bg-[#0B1E33] hover:bg-[#13365C] text-[#38BDF8] font-bold transition-colors"
                title="Switch between 3D Digital Twin and 2D Blueprint Schematic"
              >
                {viewMode === '3d' ? '2D BLUEPRINT' : '3D TWIN'}
              </button>
            </>
          )}
        </div>

        {/* Explosion Range Scrubber Slider */}
        <div className="bg-[#071524]/90 border border-[#1A426F] px-3 py-2 shadow-xl flex items-center gap-3 w-64">
          <span className="text-[10px] text-[#7C94AA] whitespace-nowrap">EXPLOSION:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(explodedProgress * 100)}
            onChange={(e) => onSetExplosion(Number(e.target.value) / 100)}
            className="w-full accent-[#38BDF8] h-1.5 bg-[#13365C] rounded cursor-pointer"
            aria-label="Exploded View Progress"
          />
          <span className="text-[11px] text-[#38BDF8] font-bold w-10 text-right">
            {Math.round(explodedProgress * 100)}%
          </span>
        </div>
      </div>

      {/* 4. Top-Left Digital Twin Title Block */}
      <div className="absolute top-3 left-3 pointer-events-auto bg-[#071524]/90 border border-[#1A426F] p-3 text-xs font-mono shadow-xl max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
          <span className="text-[#38BDF8] font-bold tracking-wider text-[11px]">
            AEROGUARD DIGITAL TWIN
          </span>
        </div>
        <div className="text-[#E8F1F8] font-bold text-sm">
          {engine?.unit_id || 'UNIT-001'} TURBOFAN
        </div>
        <div className="flex items-center gap-2 text-[11px] mt-1 text-[#7C94AA]">
          <span>STATUS:</span>
          <RiskIndicator bucket={engine?.risk_bucket || 'Healthy'} showLabel />
          <span>/</span>
          <span>RUL: <strong className="text-[#E8F1F8]">{engine?.predicted_rul || 0} cyc</strong></span>
        </div>
        <div className="text-[10px] text-[#7C94AA] mt-1.5 pt-1.5 border-t border-[#1A426F]/60">
          Scroll down page to trigger axial component separation. Drag to orbit, wheel to zoom.
        </div>
      </div>

      {/* 5. Bottom Interactive Engineering Station Ribbon */}
      <div className="absolute bottom-3 right-3 pointer-events-auto hidden sm:flex items-center gap-1 bg-[#071524]/90 border border-[#1A426F] p-1 shadow-xl">
        {majorStations.map((stg) => (
          <button
            key={stg.id}
            type="button"
            onClick={() => onFocusStation(stg.id)}
            className="px-2 py-1 text-[10px] font-mono border border-transparent hover:border-[#38BDF8] text-[#7C94AA] hover:text-[#E8F1F8] bg-[#0B1E33] transition-colors"
          >
            {stg.station}
          </button>
        ))}
      </div>
    </div>
  );
}
