import React from 'react';
import RULChart from './RULChart';
import RiskIndicator from './RiskIndicator';

/**
 * EngineDetail Component
 * Selected-engine deep-dive view:
 * - RUL trend chart over cycles (actual vs predicted, two lines)
 * - Sensor readings panel (grid of monospace readouts)
 * - Risk-bucket history strip
 */
export default function EngineDetail({
  engine,
  allEngines = [],
  onBackToFleet,
  onSelectEngine,
  onOpenModelComparison,
}) {
  if (!engine) {
    return (
      <div className="border border-[#1A426F] p-8 text-center bg-[#0B1E33]">
        <p className="text-sm font-mono text-[#7C94AA]">No engine unit selected.</p>
        <button
          type="button"
          onClick={onBackToFleet}
          className="mt-4 px-3 py-1.5 border border-[#1A426F] bg-[#13365C] text-xs font-mono text-[#E8F1F8] hover:bg-[#1A426F]"
        >
          &larr; Return to fleet overview
        </button>
      </div>
    );
  }

  const sensors = engine.sensor_readings || {};
  const history = engine.rul_history || [];

  // Group cycles into risk bucket segments for the risk-bucket history strip
  const historySegments = [];
  if (history.length > 0) {
    let currentBucket = history[0].risk_bucket;
    let startCycle = history[0].cycle;
    let count = 1;

    for (let i = 1; i < history.length; i++) {
      if (history[i].risk_bucket === currentBucket) {
        count++;
      } else {
        historySegments.push({
          bucket: currentBucket,
          startCycle,
          endCycle: history[i - 1].cycle,
          count,
        });
        currentBucket = history[i].risk_bucket;
        startCycle = history[i].cycle;
        count = 1;
      }
    }
    historySegments.push({
      bucket: currentBucket,
      startCycle,
      endCycle: history[history.length - 1].cycle,
      count,
    });
  }

  // Sensor specifications catalog
  const sensorCatalog = [
    {
      id: 't24',
      name: 'T24 — LPC outlet total temp',
      val: sensors.t24_lpc_temp,
      unit: '°R',
      nominal: '642.0 – 643.5',
      status: (sensors.t24_lpc_temp > 643.5) ? 'Elevated' : 'Nominal',
    },
    {
      id: 't30',
      name: 'T30 — HPC outlet total temp',
      val: sensors.t30_hpc_temp,
      unit: '°R',
      nominal: '1580.0 – 1595.0',
      status: (sensors.t30_hpc_temp > 1598.0) ? 'Thermal stress' : 'Nominal',
    },
    {
      id: 't50',
      name: 'T50 — LPT outlet total temp',
      val: sensors.t50_lpt_temp,
      unit: '°R',
      nominal: '1395.0 – 1415.0',
      status: (sensors.t50_lpt_temp > 1420.0) ? 'High EGT' : 'Nominal',
    },
    {
      id: 'p30',
      name: 'P30 — HPC outlet total press',
      val: sensors.p30_hpc_press,
      unit: 'psia',
      nominal: '552.5 – 555.0',
      status: (sensors.p30_hpc_press < 552.0) ? 'Pressure loss' : 'Nominal',
    },
    {
      id: 'ps30',
      name: 'Ps30 — HPC static pressure',
      val: sensors.ps30_hpc_static_press,
      unit: 'psia',
      nominal: '47.0 – 47.8',
      status: 'Nominal',
    },
    {
      id: 'nf',
      name: 'Nf — Physical fan speed',
      val: sensors.nf_fan_speed,
      unit: 'RPM',
      nominal: '2387.9 – 2388.3',
      status: 'Nominal',
    },
    {
      id: 'nc',
      name: 'Nc — Physical core speed',
      val: sensors.nc_core_speed,
      unit: 'RPM',
      nominal: '9045.0 – 9070.0',
      status: (sensors.nc_core_speed > 9080.0) ? 'Overspeed' : 'Nominal',
    },
    {
      id: 'bpr',
      name: 'BPR — Bypass ratio',
      val: sensors.bpr_bypass_ratio,
      unit: '',
      nominal: '8.38 – 8.44',
      status: 'Nominal',
    },
    {
      id: 'htbleed',
      name: 'htBleed — Bleed enthalpy',
      val: sensors.ht_bleed,
      unit: 'kJ/kg',
      nominal: '391.0 – 394.0',
      status: 'Nominal',
    },
    {
      id: 'phi',
      name: 'phi — Fuel/air ratio to Ps30',
      val: sensors.phi_fuel_ratio,
      unit: 'pps/psi',
      nominal: '521.0 – 523.0',
      status: 'Nominal',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="border border-[#1A426F] bg-[#0B1E33] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToFleet}
            className="border border-[#1A426F] bg-[#13365C] hover:bg-[#1A426F] text-[#E8F1F8] px-3 py-1.5 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]"
          >
            &larr; Back to fleet manifest
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-[#E8F1F8] m-0">
                Engine unit {engine.unit_id} telemetry &amp; prognosis
              </h1>
              <RiskIndicator bucket={engine.risk_bucket} showLabel />
            </div>
            <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
              NASA C-MAPSS FD001 verification log // Current operating cycle: {engine.current_cycle}
            </p>
          </div>
        </div>

        {/* Quick Switcher & Model Comparison Link */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#7C94AA]">Switch unit:</span>
          <select
            value={engine.unit_id}
            onChange={(e) => {
              const next = allEngines.find((item) => item.unit_id === e.target.value);
              if (next && onSelectEngine) onSelectEngine(next);
            }}
            aria-label="Select Unit to View"
            className="bg-[#0B1E33] border border-[#1A426F] text-[#E8F1F8] text-xs px-2.5 py-1.5 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]"
          >
            {allEngines.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.unit_id} &mdash; {u.risk_bucket} (RUL {u.predicted_rul})
              </option>
            ))}
          </select>

          {onOpenModelComparison && (
            <button
              type="button"
              onClick={onOpenModelComparison}
              className="border border-[#1A426F] bg-[#071524] hover:bg-[#13365C] text-[#7C94AA] hover:text-[#E8F1F8] px-3 py-1.5 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]"
            >
              Model comparison &rarr;
            </button>
          )}
        </div>
      </div>

      {/* KPI Instrumentation Deck */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1A426F] border border-[#1A426F]">
        <div className="bg-[#0B1E33] p-3.5">
          <span className="text-[11px] font-mono text-[#7C94AA] block">CURRENT CYCLE COUNT</span>
          <span className="text-xl font-mono font-bold text-[#E8F1F8] mt-1 block">
            {engine.current_cycle}
          </span>
          <span className="text-[10px] font-mono text-[#7C94AA]">Recorded run cycles</span>
        </div>

        <div className="bg-[#0B1E33] p-3.5">
          <span className="text-[11px] font-mono text-[#7C94AA] block">PREDICTED RUL (LSTM)</span>
          <span
            className={`text-xl font-mono font-bold mt-1 block ${
              engine.risk_bucket === 'Critical'
                ? 'text-[#FFB020]'
                : engine.risk_bucket === 'Degrading'
                ? 'text-[#E8893C]'
                : 'text-[#4ADE80]'
            }`}
          >
            {engine.predicted_rul.toFixed(1)} <span className="text-xs font-normal">cycles</span>
          </span>
          <span className="text-[10px] font-mono text-[#7C94AA]">Primary QA model estimate</span>
        </div>

        <div className="bg-[#0B1E33] p-3.5">
          <span className="text-[11px] font-mono text-[#7C94AA] block">ACTUAL RUL (GROUND TRUTH)</span>
          <span className="text-xl font-mono font-bold text-[#E8F1F8] mt-1 block">
            {engine.actual_rul.toFixed(1)} <span className="text-xs font-normal">cycles</span>
          </span>
          <span className="text-[10px] font-mono text-[#7C94AA]">True end-of-life residual</span>
        </div>

        <div className="bg-[#0B1E33] p-3.5">
          <span className="text-[11px] font-mono text-[#7C94AA] block">BASELINE ESTIMATE (XGB)</span>
          <span className="text-xl font-mono font-bold text-[#7C94AA] mt-1 block">
            {engine.baseline_rul.toFixed(1)} <span className="text-xs font-normal">cycles</span>
          </span>
          <span className="text-[10px] font-mono text-[#7C94AA]">Phase 1 regression tree</span>
        </div>
      </div>

      {/* Risk-Bucket History Strip */}
      <div className="border border-[#1A426F] bg-[#0B1E33] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
              Risk-bucket history strip
            </h2>
            <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
              Cycle progression across QA thresholds (Healthy &gt; 80 &rarr; Degrading 20–80 &rarr; Critical &lt; 20)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#4ADE80] inline-block" />
              <span className="text-[#7C94AA]">Healthy (&gt;80)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#E8893C] inline-block" />
              <span className="text-[#7C94AA]">Degrading (20-80)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#FFB020] inline-block" />
              <span className="text-[#7C94AA]">Critical (&lt;20)</span>
            </span>
          </div>
        </div>

        {/* Visual Progression Strip */}
        <div className="w-full flex h-6 border border-[#1A426F] bg-[#071524] overflow-hidden" role="progressbar" aria-label="Risk-Bucket History Strip">
          {historySegments.map((seg, idx) => {
            const widthPct = (seg.count / history.length) * 100;
            let bgColor = '#4ADE80';
            if (seg.bucket === 'Critical') bgColor = '#FFB020';
            else if (seg.bucket === 'Degrading') bgColor = '#E8893C';

            return (
              <div
                key={idx}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: bgColor,
                }}
                title={`${seg.bucket}: Cycles ${seg.startCycle}–${seg.endCycle} (${seg.count} cycles)`}
                className="h-full border-r border-[#0B1E33] last:border-r-0 transition-opacity hover:opacity-80"
              />
            );
          })}
        </div>

        {/* Axis markers for the strip */}
        <div className="flex justify-between items-center text-[10px] font-mono text-[#7C94AA] mt-1.5 px-0.5">
          <span>Cycle {history[0]?.cycle || 1}</span>
          <span>Current: Cycle {engine.current_cycle} (State: {engine.risk_bucket})</span>
        </div>
      </div>

      {/* Primary RUL Trend Chart (Actual vs Predicted) */}
      <div>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
            Remaining useful life trajectory
          </h2>
          <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
            Observed actual degradation path vs bidirectional LSTM neural predictions over cycles
          </p>
        </div>
        <RULChart data={history} unitId={engine.unit_id} height={360} />
      </div>

      {/* Sensor Readings Panel (Grid of Monospace Readouts) */}
      <div className="border border-[#1A426F] bg-[#0B1E33]">
        <div className="px-4 py-3 border-b border-[#1A426F] bg-[#13365C]/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
              Sensor readings instrumentation panel
            </h2>
            <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
              Live telemetry at cycle {engine.current_cycle} compared against nominal baseline bounds
            </p>
          </div>
          <span className="text-xs font-mono text-[#7C94AA]">
            SENSORS SAMPLED: {sensorCatalog.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-px bg-[#1A426F]">
          {sensorCatalog.map((sensor) => {
            const isWarn = sensor.status !== 'Nominal';
            return (
              <div
                key={sensor.id}
                className="bg-[#0B1E33] p-3.5 hover:bg-[#13365C]/30 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#1A426F]/60 pb-1 mb-2">
                  <span className="text-xs font-mono text-[#7C94AA] truncate" title={sensor.name}>
                    {sensor.name.split('—')[0].trim()}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      isWarn ? 'text-[#FFB020]' : 'text-[#4ADE80]'
                    }`}
                  >
                    {sensor.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-lg font-mono font-bold text-[#E8F1F8]">
                    {typeof sensor.val === 'number' ? sensor.val.toFixed(2) : sensor.val || '&mdash;'}
                  </span>
                  <span className="text-xs font-mono text-[#7C94AA] ml-1">{sensor.unit}</span>
                </div>

                <div className="text-[11px] font-mono text-[#7C94AA] pt-1.5 border-t border-[#1A426F]/40 flex justify-between">
                  <span>Nominal:</span>
                  <span className="text-[#E8F1F8]">{sensor.nominal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subsystem Degradation Assessment */}
      <div className="border border-[#1A426F] bg-[#0B1E33] p-4">
        <h2 className="text-sm font-semibold text-[#E8F1F8] m-0 mb-3">
          Subsystem failure mode analysis
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="border border-[#1A426F] bg-[#071524] p-3">
            <span className="text-[#7C94AA] block text-[11px]">FAN &amp; INLET</span>
            <span className="text-[#E8F1F8] font-semibold mt-1 block">
              {engine.subsystem_status?.fan || 'Nominal'}
            </span>
            <span className="text-[#7C94AA] text-[10px] block mt-1">Nf fan speed: {sensors.nf_fan_speed?.toFixed(1)} RPM</span>
          </div>

          <div className="border border-[#1A426F] bg-[#071524] p-3">
            <span className="text-[#7C94AA] block text-[11px]">COMPRESSOR (HPC)</span>
            <span
              className={`font-semibold mt-1 block ${
                engine.risk_bucket === 'Critical'
                  ? 'text-[#FFB020]'
                  : engine.risk_bucket === 'Degrading'
                  ? 'text-[#E8893C]'
                  : 'text-[#E8F1F8]'
              }`}
            >
              {engine.subsystem_status?.compressor || 'Nominal'}
            </span>
            <span className="text-[#7C94AA] text-[10px] block mt-1">T30 temp: {sensors.t30_hpc_temp?.toFixed(1)} °R</span>
          </div>

          <div className="border border-[#1A426F] bg-[#071524] p-3">
            <span className="text-[#7C94AA] block text-[11px]">COMBUSTOR / BURNER</span>
            <span className="text-[#E8F1F8] font-semibold mt-1 block">
              {engine.subsystem_status?.combustor || 'Nominal'}
            </span>
            <span className="text-[#7C94AA] text-[10px] block mt-1">phi fuel ratio: {sensors.phi_fuel_ratio?.toFixed(1)}</span>
          </div>

          <div className="border border-[#1A426F] bg-[#071524] p-3">
            <span className="text-[#7C94AA] block text-[11px]">TURBINE (HPT/LPT)</span>
            <span
              className={`font-semibold mt-1 block ${
                engine.risk_bucket === 'Critical'
                  ? 'text-[#FFB020]'
                  : engine.risk_bucket === 'Degrading'
                  ? 'text-[#E8893C]'
                  : 'text-[#E8F1F8]'
              }`}
            >
              {engine.subsystem_status?.turbine || 'Nominal'}
            </span>
            <span className="text-[#7C94AA] text-[10px] block mt-1">T50 temp: {sensors.t50_lpt_temp?.toFixed(1)} °R</span>
          </div>
        </div>
      </div>
    </div>
  );
}
