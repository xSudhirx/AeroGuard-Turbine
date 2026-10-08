import React, { useState } from 'react';
import RiskIndicator from './RiskIndicator';

/**
 * Technical turbine cross-section SVG schematic with annotation callouts.
 * Replaces generic hero banner — the diagram itself is the hero.
 * Includes a subtle scan-line animation respecting prefers-reduced-motion.
 */
export default function EngineSchematic({
  selectedEngine,
  onSelectUnit,
  allEngines = [],
  onOpenDetail,
  onToggle2D3D,
  viewMode = '2d',
}) {
  const [activeStage, setActiveStage] = useState(null);

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

  const stages = [
    {
      id: 'fan',
      name: 'Fan & Inlet Stage',
      station: 'STA 1.0 - 2.0',
      x: 145,
      y: 190,
      panelPos: 'top-left',
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
      x: 290,
      y: 155,
      panelPos: 'top-center',
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
      x: 440,
      y: 225,
      panelPos: 'bottom-left',
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
      x: 585,
      y: 160,
      panelPos: 'top-right',
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
      x: 690,
      y: 225,
      panelPos: 'bottom-center',
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
      x: 825,
      y: 190,
      panelPos: 'bottom-right',
      items: [
        { label: 'T50 (LPT Exit Temp)', val: `${sensors.t50_lpt_temp.toFixed(2)} °R`, nominal: '1400.0' },
        { label: 'Exhaust Status', val: 'Subsonic Exp.', nominal: 'Nominal' },
      ],
      status: engine?.risk_bucket === 'Critical' ? 'Exhaust EGT Exceeded' : 'Nominal',
    },
  ];

  return (
    <section
      className="border border-[#1A426F] bg-[#0B1E33] relative overflow-hidden"
      aria-label="Engine Cross-Section Schematic and Stage Telemetry"
    >
      {/* Drafting Sheet Header / Coordinate Strip */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-[#1A426F] bg-[#13365C]/50 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#E8F1F8] font-semibold tracking-wider">
            DWG NO. AG-FD001-TURBINE
          </span>
          <span className="text-[#1A426F]">/</span>
          <span className="text-[#7C94AA]">2-SPOOL HIGH-BYPASS TURBOFAN CROSS-SECTION</span>
          <span className="text-[#1A426F]">/</span>
          <span className="text-[#38BDF8] font-semibold">MODE: {viewMode.toUpperCase()} BLUEPRINT</span>
        </div>

        {/* Selected Unit Switcher & Status */}
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
              className="bg-[#0B1E33] border border-[#1A426F] text-[#E8F1F8] text-xs px-2 py-1 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]"
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
              className="border border-[#1A426F] bg-[#13365C] hover:bg-[#1A426F] text-[#E8F1F8] px-2.5 py-1 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] transition-colors"
            >
              Open unit detail &rarr;
            </button>
          )}

          {onToggle2D3D && (
            <button
              type="button"
              onClick={onToggle2D3D}
              className="border border-[#38BDF8] bg-[#071524] hover:bg-[#13365C] text-[#38BDF8] px-2.5 py-1 text-xs font-mono font-bold transition-colors"
              title="Switch to 3D Turbofan Digital Twin"
            >
              VIEW 3D DIGITAL TWIN
            </button>
          )}
        </div>
      </div>

      {/* Main SVG Schematic Canvas Area */}
      <div className="relative p-2 sm:p-4 blueprint-grid-canvas">
        {/* Subtle Animated Scan Line (scanning for anomalies) */}
        <div
          className="absolute inset-y-0 w-24 pointer-events-none z-10 schematic-scanline opacity-75 scan-line-sweep"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(232, 241, 248, 0.08) 50%, rgba(232, 241, 248, 0.25) 98%, #E8F1F8 100%)',
            borderRight: '1.5px solid #E8F1F8',
          }}
          aria-hidden="true"
        />

        {/* SVG Turbine Blueprint Drafting */}
        <div className="w-full overflow-x-auto pb-2">
          <svg
            viewBox="0 0 980 380"
            className="w-full min-w-[760px] h-auto select-none"
            aria-label="Turbine Schematic Cross-Section"
          >
            <defs>
              {/* Drafting crosshatch pattern */}
              <pattern
                id="draftingHatch"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#1A426F" strokeWidth="0.75" />
              </pattern>
            </defs>

            {/* Coordinate Grid Lines and Rulers */}
            <g stroke="#1A426F" strokeWidth="0.5" strokeDasharray="2 4">
              <line x1="40" y1="30" x2="940" y2="30" />
              <line x1="40" y1="350" x2="940" y2="350" />
              <line x1="40" y1="30" x2="40" y2="350" />
              <line x1="940" y1="30" x2="940" y2="350" />

              {/* Station vertical datum guides */}
              <line x1="180" y1="40" x2="180" y2="340" />
              <line x1="330" y1="40" x2="330" y2="340" />
              <line x1="510" y1="40" x2="510" y2="340" />
              <line x1="650" y1="40" x2="650" y2="340" />
              <line x1="770" y1="40" x2="770" y2="340" />
            </g>

            {/* Station Labels */}
            <g fill="#7C94AA" fontSize="9" fontFamily="monospace">
              <text x="180" y="45" textAnchor="middle">STA 1.0 (FAN)</text>
              <text x="330" y="45" textAnchor="middle">STA 2.0 (LPC)</text>
              <text x="510" y="45" textAnchor="middle">STA 3.0 (HPC)</text>
              <text x="650" y="45" textAnchor="middle">STA 4.0 (BURNER)</text>
              <text x="770" y="45" textAnchor="middle">STA 4.5 (HPT)</text>
              <text x="860" y="45" textAnchor="middle">STA 5.0 (LPT)</text>
            </g>

            {/* Engine Centerline (CL) */}
            <line
              x1="50"
              y1="190"
              x2="930"
              y2="190"
              stroke="#7C94AA"
              strokeWidth="0.9"
              strokeDasharray="12 4 3 4"
            />
            <text x="60" y="185" fill="#7C94AA" fontSize="8" fontFamily="monospace">
              &Phi; CENTERLINE CL
            </text>

            {/* 1. Outer Nacelle / Cowling (Upper & Lower) */}
            <g stroke="#E8F1F8" strokeWidth="1.5" fill="none">
              {/* Upper Cowl */}
              <path d="M 80,105 Q 150,75 280,75 L 560,75 Q 640,78 680,110 L 690,135 L 670,135 Q 630,95 550,92 L 280,92 Q 170,92 100,115 Z" />
              {/* Lower Cowl */}
              <path d="M 80,275 Q 150,305 280,305 L 560,305 Q 640,302 680,270 L 690,245 L 670,245 Q 630,285 550,288 L 280,288 Q 170,288 100,265 Z" />
            </g>

            {/* 2. Core Casing / Splitter (Separating Core Flow from Bypass) */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="none">
              {/* Upper Core Casing */}
              <path d="M 230,130 L 480,140 L 620,145 L 740,150 L 870,165 L 890,175 L 870,180" />
              {/* Lower Core Casing */}
              <path d="M 230,250 L 480,240 L 620,235 L 740,230 L 870,215 L 890,205 L 870,200" />
            </g>

            {/* 3. Spinner Nose Cone */}
            <path
              d="M 80,190 Q 120,165 145,160 L 145,220 Q 120,215 80,190 Z"
              fill="#13365C"
              stroke="#E8F1F8"
              strokeWidth="1.5"
            />
            {/* Concentric spiral drafting line on spinner */}
            <path
              d="M 95,190 Q 115,180 135,172"
              stroke="#7C94AA"
              strokeWidth="0.8"
              fill="none"
            />

            {/* 4. Fan Rotor Blades (Stage 1) */}
            <g stroke="#E8F1F8" strokeWidth="1.5" fill="#13365C">
              {/* Upper Fan Blade */}
              <path d="M 145,160 L 152,85 L 168,85 L 160,160 Z" />
              {/* Lower Fan Blade */}
              <path d="M 145,220 L 152,295 L 168,295 L 160,220 Z" />
              {/* Stator Vane behind fan */}
              <line x1="185" y1="88" x2="182" y2="292" stroke="#7C94AA" strokeWidth="1.2" />
            </g>

            {/* 5. Low Pressure Compressor (LPC) - 3 Stages */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="#13365C">
              {/* Stage 1 */}
              <rect x="235" y="132" width="6" height="30" />
              <rect x="235" y="218" width="6" height="30" />
              {/* Stage 2 */}
              <rect x="255" y="135" width="6" height="26" />
              <rect x="255" y="219" width="6" height="26" />
              {/* Stage 3 */}
              <rect x="275" y="138" width="6" height="22" />
              <rect x="275" y="220" width="6" height="22" />
            </g>

            {/* 6. High Pressure Compressor (HPC) - 5 Converging Stages */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="#13365C">
              {/* HPC 1 */}
              <rect x="340" y="142" width="5" height="20" />
              <rect x="340" y="218" width="5" height="20" />
              {/* HPC 2 */}
              <rect x="365" y="143" width="5" height="18" />
              <rect x="365" y="219" width="5" height="18" />
              {/* HPC 3 */}
              <rect x="390" y="144" width="5" height="16" />
              <rect x="390" y="220" width="5" height="16" />
              {/* HPC 4 */}
              <rect x="415" y="145" width="5" height="14" />
              <rect x="415" y="221" width="5" height="14" />
              {/* HPC 5 (Exit Diffuser) */}
              <rect x="440" y="146" width="5" height="12" />
              <rect x="440" y="222" width="5" height="12" />
            </g>

            {/* 7. Combustor Annular Burner Chamber */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="none">
              {/* Upper Chamber Liner */}
              <path d="M 520,150 C 540,148 570,148 610,152 C 600,165 570,166 535,164 Z" fill="url(#draftingHatch)" />
              {/* Lower Chamber Liner */}
              <path d="M 520,230 C 540,232 570,232 610,228 C 600,215 570,214 535,216 Z" fill="url(#draftingHatch)" />

              {/* Fuel Injectors */}
              <line x1="505" y1="157" x2="535" y2="157" stroke="#FFB020" strokeWidth="1.5" />
              <circle cx="535" cy="157" r="2.5" fill="#FFB020" stroke="#0B1E33" />

              <line x1="505" y1="223" x2="535" y2="223" stroke="#FFB020" strokeWidth="1.5" />
              <circle cx="535" cy="223" r="2.5" fill="#FFB020" stroke="#0B1E33" />
            </g>

            {/* 8. High Pressure Turbine (HPT) Stage */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="#13365C">
              {/* HPT Nozzle Guide Vanes */}
              <path d="M 640,151 L 646,151 L 644,166 L 638,166 Z" fill="#7C94AA" />
              <path d="M 640,229 L 646,229 L 644,214 L 638,214 Z" fill="#7C94AA" />
              {/* HPT Rotor */}
              <rect x="660" y="150" width="7" height="18" fill="#13365C" />
              <rect x="660" y="212" width="7" height="18" fill="#13365C" />
            </g>

            {/* 9. Low Pressure Turbine (LPT) - 3 Stages */}
            <g stroke="#E8F1F8" strokeWidth="1.2" fill="#13365C">
              {/* LPT 1 */}
              <rect x="715" y="152" width="6" height="22" />
              <rect x="715" y="206" width="6" height="22" />
              {/* LPT 2 */}
              <rect x="740" y="155" width="6" height="25" />
              <rect x="740" y="200" width="6" height="25" />
              {/* LPT 3 */}
              <rect x="765" y="158" width="6" height="28" />
              <rect x="765" y="194" width="6" height="28" />
            </g>

            {/* 10. Centerline Exhaust Cone / Plug */}
            <path
              d="M 780,182 L 910,190 L 780,198 Z"
              fill="#13365C"
              stroke="#E8F1F8"
              strokeWidth="1.5"
            />

            {/* 11. Coaxial Drive Shafts */}
            {/* Low Pressure Inner Spool (Fan to LPT) */}
            <rect x="155" y="188" width="630" height="4" fill="#7C94AA" stroke="#E8F1F8" strokeWidth="0.8" />
            {/* High Pressure Outer Spool (HPC to HPT) */}
            <rect x="330" y="184" width="340" height="3" fill="#13365C" stroke="#7C94AA" strokeWidth="0.8" />
            <rect x="330" y="193" width="340" height="3" fill="#13365C" stroke="#7C94AA" strokeWidth="0.8" />

            {/* 12. Technical Leader Lines with Anchor Dots */}
            {/* Leader 1: Fan */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="155" cy="110" r="3" fill="#E8F1F8" />
              <polyline points="155,110 155,60 110,60" />
            </g>

            {/* Leader 2: LPC */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="260" cy="130" r="3" fill="#E8F1F8" />
              <polyline points="260,130 260,60 300,60" />
            </g>

            {/* Leader 3: HPC */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="410" cy="235" r="3" fill="#E8F1F8" />
              <polyline points="410,235 410,320 370,320" />
            </g>

            {/* Leader 4: Combustor */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="560" cy="148" r="3" fill="#E8F1F8" />
              <polyline points="560,148 560,60 590,60" />
            </g>

            {/* Leader 5: HPT */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="665" cy="230" r="3" fill="#E8F1F8" />
              <polyline points="665,230 665,320 630,320" />
            </g>

            {/* Leader 6: LPT / Exhaust */}
            <g stroke="#7C94AA" strokeWidth="1" fill="none">
              <circle cx="750" cy="225" r="3" fill="#E8F1F8" />
              <polyline points="750,225 750,320 780,320" />
            </g>
          </svg>
        </div>

        {/* Technical Title Block in Corner */}
        <div className="hidden md:block absolute bottom-3 right-3 bg-[#0B1E33] border border-[#1A426F] p-2 text-[10px] font-mono z-20">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-[#7C94AA]">SYSTEM:</span>
            <span className="text-[#E8F1F8]">FD001 2-SPOOL</span>
            <span className="text-[#7C94AA]">STATUS:</span>
            <span
              className={
                engine?.risk_bucket === 'Critical'
                  ? 'text-[#FFB020]'
                  : engine?.risk_bucket === 'Degrading'
                  ? 'text-[#E8893C]'
                  : 'text-[#4ADE80]'
              }
            >
              {engine?.risk_bucket || 'ONLINE'}
            </span>
            <span className="text-[#7C94AA]">CYCLE:</span>
            <span className="text-[#E8F1F8]">{engine?.current_cycle || 0}</span>
            <span className="text-[#7C94AA]">PRED RUL:</span>
            <span className="text-[#E8F1F8] font-bold">{engine?.predicted_rul || 0} cyc</span>
          </div>
        </div>
      </div>

      {/* Responsive Station Readout Panels Grid (Dense Instrumentation Deck) */}
      <div className="border-t border-[#1A426F] bg-[#0B1E33]">
        <div className="px-4 py-2 bg-[#13365C]/40 border-b border-[#1A426F] text-xs font-mono text-[#7C94AA] flex items-center justify-between">
          <span>INSTRUMENTATION READOUT DECK // REAL-TIME SUBSYSTEM TELEMETRY</span>
          <span className="text-[11px] text-[#E8F1F8]">UNITS: °R, PSIA, RPM, LBM/S</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-[#1A426F]">
          {stages.map((stage) => {
            const isCritical =
              stage.id === 'hpc' && engine?.risk_bucket === 'Critical';
            const isDegrading =
              stage.id === 'hpc' && engine?.risk_bucket === 'Degrading';
            const isActive = activeStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`p-3 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#13365C] ring-1 ring-[#E8F1F8]'
                    : 'bg-[#0B1E33] hover:bg-[#13365C]/40'
                }`}
                onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
              >
                <div className="flex items-center justify-between border-b border-[#1A426F] pb-1.5 mb-2">
                  <span className="text-xs font-mono font-semibold text-[#E8F1F8] truncate">
                    {stage.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#7C94AA]">
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
    </section>
  );
}
