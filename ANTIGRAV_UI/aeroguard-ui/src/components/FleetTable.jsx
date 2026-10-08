import React, { useState } from 'react';
import RiskIndicator from './RiskIndicator';

/**
 * Inline SVG Sparkline for compact RUL trend visualization
 */
function RulSparkline({ history = [], bucket = 'Healthy' }) {
  if (!history || history.length < 2) {
    return <span className="text-[#7C94AA] text-xs font-mono">&mdash;</span>;
  }

  const width = 84;
  const height = 22;
  const padding = 2;

  const ruls = history.map((h) => h.lstm_rul ?? h.actual_rul);
  const minVal = Math.min(...ruls);
  const maxVal = Math.max(...ruls);
  const range = maxVal - minVal || 1;

  const points = ruls
    .map((val, idx) => {
      const x = padding + (idx / (ruls.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  let strokeColor = '#4ADE80';
  if (bucket === 'Critical') strokeColor = '#FFB020';
  else if (bucket === 'Degrading') strokeColor = '#E8893C';

  return (
    <svg
      width={width}
      height={height}
      className="inline-block overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/**
 * FleetTable Component
 * Dense technical manifest-style engine list with keyboard navigation and sparklines.
 */
export default function FleetTable({
  engines = [],
  selectedEngineId = null,
  onSelectEngine,
  onOpenDetail,
}) {
  const [filterBucket, setFilterBucket] = useState('ALL');
  const [sortBy, setSortBy] = useState('unit_id');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter
  const filtered = engines.filter((e) => {
    if (filterBucket === 'ALL') return true;
    return e.risk_bucket?.toUpperCase() === filterBucket;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'unit_id') {
      aVal = parseInt(a.unit_id.replace(/\D/g, ''), 10);
      bVal = parseInt(b.unit_id.replace(/\D/g, ''), 10);
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleRowClick = (engine) => {
    if (onSelectEngine) onSelectEngine(engine);
    if (onOpenDetail) onOpenDetail(engine);
  };

  const handleKeyDown = (e, engine) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(engine);
    }
  };

  const handleSortChange = (column) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  return (
    <section
      className="border border-[#1A426F] bg-[#0B1E33]"
      aria-label="Engine Fleet Overview Manifest"
    >
      {/* Manifest Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#1A426F] bg-[#13365C]/40">
        <div>
          <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
            Engine fleet status manifest
          </h2>
          <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
            NASA C-MAPSS FD001 verification log // {engines.length} active units indexed
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[#7C94AA] mr-1 hidden sm:inline">Filter:</span>
          {['ALL', 'CRITICAL', 'DEGRADING', 'HEALTHY'].map((filter) => {
            const count =
              filter === 'ALL'
                ? engines.length
                : engines.filter((e) => e.risk_bucket?.toUpperCase() === filter).length;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setFilterBucket(filter)}
                className={`px-2 py-1 text-xs border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                  filterBucket === filter
                    ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8]'
                    : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8] bg-[#0B1E33]'
                }`}
                aria-pressed={filterBucket === filter}
              >
                {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}{' '}
                <span className="text-[#7C94AA]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manifest Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse" role="table">
          <thead>
            <tr className="border-b border-[#1A426F] bg-[#071524] text-[#7C94AA] text-[11px]">
              <th
                scope="col"
                className="py-2.5 px-4 font-normal cursor-pointer select-none hover:text-[#E8F1F8]"
                onClick={() => handleSortChange('unit_id')}
              >
                Unit ID {sortBy === 'unit_id' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                scope="col"
                className="py-2.5 px-4 font-normal cursor-pointer select-none hover:text-[#E8F1F8]"
                onClick={() => handleSortChange('current_cycle')}
              >
                Cycle {sortBy === 'current_cycle' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                scope="col"
                className="py-2.5 px-4 font-normal cursor-pointer select-none hover:text-[#E8F1F8]"
                onClick={() => handleSortChange('predicted_rul')}
              >
                Pred RUL (LSTM) {sortBy === 'predicted_rul' && (sortAsc ? '▲' : '▼')}
              </th>
              <th scope="col" className="py-2.5 px-4 font-normal hidden md:table-cell">
                Baseline RUL
              </th>
              <th scope="col" className="py-2.5 px-4 font-normal">
                Risk status
              </th>
              <th scope="col" className="py-2.5 px-4 font-normal hidden lg:table-cell">
                HPC Temp (T30)
              </th>
              <th scope="col" className="py-2.5 px-4 font-normal hidden sm:table-cell">
                RUL trend
              </th>
              <th scope="col" className="py-2.5 px-4 font-normal text-right">
                Inspection
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A426F]/60">
            {sorted.map((engine) => {
              const isSelected = selectedEngineId === engine.unit_id;
              const sensors = engine.sensor_readings || {};

              return (
                <tr
                  key={engine.unit_id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open details for engine ${engine.unit_id}, risk ${engine.risk_bucket}, predicted RUL ${engine.predicted_rul} cycles`}
                  onClick={() => handleRowClick(engine)}
                  onKeyDown={(e) => handleKeyDown(e, engine)}
                  className={`group cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                    isSelected
                      ? 'bg-[#13365C]/80'
                      : 'hover:bg-[#13365C]/40 bg-[#0B1E33]'
                  }`}
                >
                  {/* Unit ID */}
                  <td className="py-3 px-4 font-bold text-[#E8F1F8]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A426F] group-hover:bg-[#E8F1F8] transition-colors" />
                      <span>{engine.unit_id}</span>
                    </div>
                  </td>

                  {/* Current Cycle */}
                  <td className="py-3 px-4 text-[#7C94AA]">
                    <span className="text-[#E8F1F8] font-medium">{engine.current_cycle}</span>
                    <span className="text-[10px] text-[#7C94AA] ml-1">cyc</span>
                  </td>

                  {/* Predicted RUL */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-sm font-bold ${
                        engine.risk_bucket === 'Critical'
                          ? 'text-[#FFB020]'
                          : engine.risk_bucket === 'Degrading'
                          ? 'text-[#E8893C]'
                          : 'text-[#4ADE80]'
                      }`}
                    >
                      {engine.predicted_rul.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-[#7C94AA] ml-1">cyc</span>
                  </td>

                  {/* Baseline RUL */}
                  <td className="py-3 px-4 text-[#7C94AA] hidden md:table-cell">
                    {engine.baseline_rul?.toFixed(1) || '&mdash;'} cyc
                  </td>

                  {/* Risk Bucket (Marker, not a pill badge) */}
                  <td className="py-3 px-4">
                    <RiskIndicator bucket={engine.risk_bucket} showLabel />
                  </td>

                  {/* HPC Temp */}
                  <td className="py-3 px-4 text-[#7C94AA] hidden lg:table-cell">
                    <span className="text-[#E8F1F8]">
                      {sensors.t30_hpc_temp ? `${sensors.t30_hpc_temp.toFixed(1)} °R` : '&mdash;'}
                    </span>
                  </td>

                  {/* Sparkline */}
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <RulSparkline history={engine.rul_history} bucket={engine.risk_bucket} />
                  </td>

                  {/* Action Link */}
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[#7C94AA] group-hover:text-[#E8F1F8] text-[11px] transition-colors">
                      View detail &rarr;
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Manifest Footer */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-[#1A426F] bg-[#071524] text-[11px] font-mono text-[#7C94AA]">
        <span>
          Showing {sorted.length} of {engines.length} fleet units
        </span>
        <span className="hidden sm:inline">
          Click row or press Enter to inspect full telemetry &amp; prognosis
        </span>
      </div>
    </section>
  );
}
