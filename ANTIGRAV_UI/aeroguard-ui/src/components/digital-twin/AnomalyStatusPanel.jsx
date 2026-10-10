import React, { useMemo, useState } from 'react';
import demo from '../../data/anomalyDemo.json';

const SENSOR_LABELS = {
  sensor_2: 'T24 °R',
  sensor_3: 'T30 °R',
  sensor_4: 'T50 °R',
  sensor_6: 'P15 psia',
  sensor_7: 'P30 psia',
  sensor_8: 'Nf rpm',
  sensor_9: 'Nc rpm',
  sensor_11: 'Ps30 psia',
};

/**
 * Local demonstration panel for Isolation Forest sensor anomaly scores.
 * Uses a precomputed JSON snapshot — not a live turbine or inference API.
 */
export default function AnomalyStatusPanel() {
  const scenarios = demo.scenarios || [];
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id || 'healthy_nasa');

  const selected = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) || scenarios[0],
    [scenarioId, scenarios]
  );

  if (!selected) {
    return null;
  }

  const anomalous = Boolean(selected.is_anomaly);
  const previewKeys = Object.keys(SENSOR_LABELS).filter(
    (key) => selected.sensors && selected.sensors[key] != null
  );

  return (
    <section
      className="border border-[#1A426F] bg-[#071524] px-4 py-3 text-xs font-mono"
      aria-label="Sensor anomaly demonstration panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#38BDF8] font-bold tracking-wider">
            <span>SENSOR ANOMALY STATUS</span>
            <span className="text-[10px] font-normal text-[#E8893C] border border-[#E8893C]/50 px-1.5 py-0.5">
              {selected.is_simulated ? 'SIMULATED FAULT' : 'NASA FD001 SAMPLE'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#7C94AA] max-w-3xl leading-relaxed">
            {demo.disclaimer}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-[11px] text-[#7C94AA]">
          Demo scenario
          <select
            value={selected.id}
            onChange={(e) => setScenarioId(e.target.value)}
            className="bg-[#0B1E33] border border-[#1A426F] text-[#E8F1F8] px-2 py-1 min-w-[16rem] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
            aria-label="Select synthetic or NASA demo scenario"
          >
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-[#1A426F] bg-[#0B1E33] p-3">
          <div className="text-[10px] text-[#7C94AA] uppercase tracking-wider">Status</div>
          <div
            className={`mt-1 text-sm font-semibold ${
              anomalous ? 'text-[#FFB020]' : 'text-[#4ADE80]'
            }`}
          >
            {anomalous ? 'ANOMALOUS' : 'NORMAL'}
          </div>
          <div className="text-[11px] text-[#7C94AA] mt-1">
            Isolation Forest or |z| &ge; 6 (not a failure probability)
          </div>
        </div>

        <div className="border border-[#1A426F] bg-[#0B1E33] p-3">
          <div className="text-[10px] text-[#7C94AA] uppercase tracking-wider">Anomaly score</div>
          <div className="mt-1 text-sm text-[#E8F1F8] font-semibold">
            {Number(selected.anomaly_score).toFixed(4)}
          </div>
          <div
            className="mt-2 h-1.5 bg-[#13365C] overflow-hidden"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Math.max(0, Math.min(1, Number(selected.anomaly_score)))}
            aria-label="Relative anomaly score indicator"
          >
            <div
              className={`h-full ${anomalous ? 'bg-[#FFB020]' : 'bg-[#4ADE80]'}`}
              style={{
                width: `${Math.max(6, Math.min(100, (Number(selected.anomaly_score) + 0.15) * 180))}%`,
              }}
            />
          </div>
          <div className="text-[11px] text-[#7C94AA] mt-1">
            Higher = more unusual vs training envelope
            {selected.max_abs_z != null ? ` · max |z| ${Number(selected.max_abs_z).toFixed(2)}` : ''}
          </div>
        </div>

        <div className="border border-[#1A426F] bg-[#0B1E33] p-3">
          <div className="text-[10px] text-[#7C94AA] uppercase tracking-wider">Source</div>
          <div className="mt-1 text-[#E8F1F8]">{selected.source}</div>
          <div className="text-[11px] text-[#7C94AA] mt-1 leading-relaxed">
            {selected.description}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#7C94AA]">
        {previewKeys.map((key) => (
          <span key={key}>
            {SENSOR_LABELS[key]}:{' '}
            <span className="text-[#E8F1F8]">{Number(selected.sensors[key]).toFixed(2)}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
