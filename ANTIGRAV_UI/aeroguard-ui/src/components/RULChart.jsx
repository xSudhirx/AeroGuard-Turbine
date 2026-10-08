import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

/**
 * Custom Technical Drafting Tooltip
 */
function BlueprintTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const actualItem = payload.find((p) => p.dataKey === 'actual_rul');
  const lstmItem = payload.find((p) => p.dataKey === 'lstm_rul');
  const baselineItem = payload.find((p) => p.dataKey === 'baseline_rul');

  const actual = actualItem ? actualItem.value : null;
  const lstm = lstmItem ? lstmItem.value : null;
  const baseline = baselineItem ? baselineItem.value : null;

  return (
    <div className="bg-[#0B1E33] border border-[#1A426F] p-3 shadow-none text-xs font-mono">
      <div className="text-[#7C94AA] border-b border-[#1A426F] pb-1 mb-2">
        CYCLE: {label}
      </div>
      <div className="space-y-1">
        {actual !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-[#E8F1F8]">Actual RUL:</span>
            <span className="font-semibold text-[#E8F1F8]">{actual.toFixed(1)}</span>
          </div>
        )}
        {lstm !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-[#4ADE80]">LSTM Pred:</span>
            <span className="font-semibold text-[#4ADE80]">{lstm.toFixed(1)}</span>
          </div>
        )}
        {baseline !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-[#7C94AA]">Baseline (XGB):</span>
            <span className="text-[#7C94AA]">{baseline.toFixed(1)}</span>
          </div>
        )}
        {actual !== null && lstm !== null && (
          <div className="flex justify-between gap-4 pt-1.5 border-t border-[#1A426F] text-[11px]">
            <span className="text-[#7C94AA]">LSTM Error:</span>
            <span className={lstm - actual >= 0 ? 'text-[#E8F1F8]' : 'text-[#FFB020]'}>
              {(lstm - actual > 0 ? '+' : '') + (lstm - actual).toFixed(1)} cyc
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * RULChart Component
 * Renders actual vs predicted RUL line chart over operating cycles.
 */
export default function RULChart({ data = [], unitId = '', height = 320 }) {
  const [showBaseline, setShowBaseline] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#7C94AA] font-mono border border-[#1A426F]">
        No telemetry history available for unit {unitId || ''}.
      </div>
    );
  }

  const latest = data[data.length - 1];

  return (
    <div className="border border-[#1A426F] bg-[#0B1E33]">
      {/* Chart Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1A426F] bg-[#13365C]/40 text-xs font-mono">
        <div className="flex items-center gap-4 text-[#7C94AA]">
          <span>
            TELEMETRY WINDOW:{' '}
            <span className="text-[#E8F1F8]">
              {data[0]?.cycle} &ndash; {latest?.cycle} CYCLES
            </span>
          </span>
          <span className="hidden sm:inline text-[#1A426F]">|</span>
          <span className="hidden sm:inline">
            SAMPLES: <span className="text-[#E8F1F8]">{data.length}</span>
          </span>
        </div>

        {/* Legend / Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#E8F1F8] hover:text-white select-none">
            <span className="w-3 h-0.5 bg-[#E8F1F8] inline-block" />
            <span className="text-[11px]">Actual RUL</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-[#4ADE80] select-none">
            <span className="w-3 h-0.5 bg-[#4ADE80] inline-block" />
            <span className="text-[11px]">LSTM Pred</span>
          </label>

          <button
            type="button"
            onClick={() => setShowBaseline(!showBaseline)}
            className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 border ${
              showBaseline
                ? 'border-[#7C94AA] text-[#E8F1F8] bg-[#13365C]'
                : 'border-[#1A426F] text-[#7C94AA] opacity-60'
            } transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]`}
            aria-pressed={showBaseline}
          >
            <span className="w-3 h-0.5 border-t border-dashed border-[#7C94AA] inline-block" />
            <span>Baseline (XGB)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowThresholds(!showThresholds)}
            className={`text-[11px] px-2 py-0.5 border ${
              showThresholds
                ? 'border-[#1A426F] text-[#E8F1F8] bg-[#13365C]'
                : 'border-[#1A426F] text-[#7C94AA] opacity-60'
            } transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8]`}
            aria-pressed={showThresholds}
          >
            Thresholds
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 16, right: 24, left: -10, bottom: 8 }}>
            <CartesianGrid stroke="#1A426F" strokeDasharray="2 4" vertical={false} />

            <XAxis
              dataKey="cycle"
              stroke="#7C94AA"
              tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#1A426F' }}
              axisLine={{ stroke: '#1A426F' }}
              tickFormatter={(v) => `C-${v}`}
            />

            <YAxis
              stroke="#7C94AA"
              tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#1A426F' }}
              axisLine={{ stroke: '#1A426F' }}
              domain={[0, 'auto']}
              unit=" cyc"
            />

            <Tooltip content={<BlueprintTooltip />} />

            {/* NASA C-MAPSS Risk Boundary Reference Lines */}
            {showThresholds && (
              <>
                <ReferenceLine
                  y={80}
                  stroke="#E8893C"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: '80 (Degrading)',
                    fill: '#E8893C',
                    fontSize: 10,
                    position: 'insideTopRight',
                    fontFamily: 'monospace',
                  }}
                />
                <ReferenceLine
                  y={20}
                  stroke="#FFB020"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: '20 (Critical QA)',
                    fill: '#FFB020',
                    fontSize: 10,
                    position: 'insideTopRight',
                    fontFamily: 'monospace',
                  }}
                />
              </>
            )}

            {/* Actual RUL: Solid cyan-white linework */}
            <Line
              type="monotone"
              dataKey="actual_rul"
              stroke="#E8F1F8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#E8F1F8', stroke: '#0B1E33', strokeWidth: 2 }}
              name="Actual RUL"
              isAnimationActive={false}
            />

            {/* LSTM Prediction: High-visibility signal line */}
            <Line
              type="monotone"
              dataKey="lstm_rul"
              stroke="#4ADE80"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, fill: '#4ADE80', stroke: '#0B1E33', strokeWidth: 2 }}
              name="LSTM Pred"
              isAnimationActive={false}
            />

            {/* Baseline (XGBoost): Dashed muted reference */}
            {showBaseline && (
              <Line
                type="monotone"
                dataKey="baseline_rul"
                stroke="#7C94AA"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 3, fill: '#7C94AA', stroke: '#0B1E33' }}
                name="Baseline (XGB)"
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Readout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1A426F] border-t border-[#1A426F] text-xs font-mono">
        <div className="bg-[#0B1E33] p-2.5">
          <span className="text-[#7C94AA] block text-[10px]">CURRENT CYCLE</span>
          <span className="text-[#E8F1F8] text-sm font-semibold">{latest?.cycle}</span>
        </div>
        <div className="bg-[#0B1E33] p-2.5">
          <span className="text-[#7C94AA] block text-[10px]">ACTUAL RUL</span>
          <span className="text-[#E8F1F8] text-sm font-semibold">{latest?.actual_rul} cyc</span>
        </div>
        <div className="bg-[#0B1E33] p-2.5">
          <span className="text-[#7C94AA] block text-[10px]">LSTM PREDICTED RUL</span>
          <span className="text-[#4ADE80] text-sm font-semibold">{latest?.lstm_rul} cyc</span>
        </div>
        <div className="bg-[#0B1E33] p-2.5">
          <span className="text-[#7C94AA] block text-[10px]">LSTM DELTA / ERROR</span>
          <span
            className={`text-sm font-semibold ${
              (latest?.lstm_rul - latest?.actual_rul) >= 0 ? 'text-[#E8F1F8]' : 'text-[#FFB020]'
            }`}
          >
            {(latest?.lstm_rul - latest?.actual_rul > 0 ? '+' : '') +
              (latest?.lstm_rul - latest?.actual_rul).toFixed(1)}{' '}
            cyc
          </span>
        </div>
      </div>
    </div>
  );
}
