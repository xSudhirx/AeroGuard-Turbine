import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import RiskIndicator from './RiskIndicator';

/**
 * Custom Technical Tooltip for Model Comparison Error Chart
 */
function ModelErrorTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const baselineItem = payload.find((p) => p.dataKey === 'baseline_error');
  const lstmItem = payload.find((p) => p.dataKey === 'lstm_error');
  const unitItem = payload[0]?.payload;

  return (
    <div className="bg-[#0B1E33] border border-[#1A426F] p-3 text-xs font-mono shadow-none">
      <div className="text-[#7C94AA] border-b border-[#1A426F] pb-1 mb-2">
        {unitItem?.unit_id || label} (Actual RUL: {unitItem?.actual_rul} cyc)
      </div>
      <div className="space-y-1">
        {baselineItem && (
          <div className="flex justify-between gap-4">
            <span className="text-[#7C94AA]">Baseline error:</span>
            <span className="text-[#7C94AA]">
              {(baselineItem.value > 0 ? '+' : '') + Number(baselineItem.value).toFixed(1)} cyc
            </span>
          </div>
        )}
        {lstmItem && (
          <div className="flex justify-between gap-4">
            <span className="text-[#4ADE80]">LSTM error:</span>
            <span className="font-semibold text-[#4ADE80]">
              {(lstmItem.value > 0 ? '+' : '') + Number(lstmItem.value).toFixed(1)} cyc
            </span>
          </div>
        )}
        {unitItem && (
          <div className="flex justify-between gap-4 pt-1.5 border-t border-[#1A426F] text-[11px]">
            <span className="text-[#7C94AA]">Delta (LSTM vs Base):</span>
            <span className="text-[#E8F1F8]">
              {(Math.abs(unitItem.lstm_error) < Math.abs(unitItem.baseline_error))
                ? 'LSTM closer by ' + (Math.abs(unitItem.baseline_error) - Math.abs(unitItem.lstm_error)).toFixed(1) + ' cyc'
                : 'Baseline closer'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ModelComparison Component
 * Overlays Phase 1 baseline (XGBoost) vs Phase 2 LSTM prediction error
 * over test units and cycles.
 */
export default function ModelComparison({
  engines = [],
  onSelectUnit,
  onOpenDetail,
}) {
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'
  const [errorMetric, setErrorMetric] = useState('residual'); // 'residual' | 'abs'

  // Prepare chart dataset from the engine units
  const chartData = engines.map((e) => {
    const bErr = e.baseline_error ?? (e.baseline_rul - e.actual_rul);
    const lErr = e.lstm_error ?? (e.predicted_rul - e.actual_rul);

    return {
      unit_id: e.unit_id,
      actual_rul: e.actual_rul,
      baseline_rul: e.baseline_rul,
      lstm_rul: e.predicted_rul,
      baseline_error: errorMetric === 'abs' ? Math.abs(bErr) : bErr,
      lstm_error: errorMetric === 'abs' ? Math.abs(lErr) : lErr,
      risk_bucket: e.risk_bucket,
    };
  });

  // Authentic benchmark metrics from NASA C-MAPSS FD001 evaluation pipeline
  const benchmarkMetrics = {
    baseline: {
      name: 'Baseline (XGBoost)',
      phase: 'Phase 1',
      rmse: 18.796,
      phm08: 1013.45,
      critical_recall: 0.846,
      degrading_recall: 0.719,
      healthy_recall: 0.945,
    },
    lstm: {
      name: 'Bidirectional LSTM',
      phase: 'Phase 2',
      rmse: 17.638,
      phm08: 412.83,
      critical_recall: 0.846,
      degrading_recall: 0.781,
      healthy_recall: 0.927,
    },
  };

  return (
    <div className="space-y-6" aria-label="Model Comparison View">
      {/* View Header */}
      <div className="border border-[#1A426F] bg-[#0B1E33] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-[#E8F1F8] m-0">
              Model performance &amp; prediction error comparison
            </h1>
            <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
              Phase 1 gradient-boosted tree baseline vs Phase 2 deep bidirectional LSTM network
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#7C94AA]">View mode:</span>
            <button
              type="button"
              onClick={() => setErrorMetric('residual')}
              className={`px-2.5 py-1 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                errorMetric === 'residual'
                  ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8]'
                  : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8]'
              }`}
            >
              Residual (pred &minus; true)
            </button>
            <button
              type="button"
              onClick={() => setErrorMetric('abs')}
              className={`px-2.5 py-1 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                errorMetric === 'abs'
                  ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8]'
                  : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8]'
              }`}
            >
              Absolute error |e|
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark Metric Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1A426F] border border-[#1A426F]">
        {/* Metric 1: RMSE */}
        <div className="bg-[#0B1E33] p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#7C94AA] border-b border-[#1A426F] pb-2 mb-3">
            <span>ROOT MEAN SQUARE ERROR (RMSE)</span>
            <span className="text-[#4ADE80]">&minus;6.2% improvement</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">XGBoost Baseline</span>
              <span className="text-xl font-mono font-bold text-[#7C94AA] mt-1 block">
                {benchmarkMetrics.baseline.rmse.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">cycles</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">Bidirectional LSTM</span>
              <span className="text-xl font-mono font-bold text-[#4ADE80] mt-1 block">
                {benchmarkMetrics.lstm.rmse.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">cycles</span>
            </div>
          </div>
        </div>

        {/* Metric 2: PHM08 Score (Key domain metric) */}
        <div className="bg-[#0B1E33] p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#7C94AA] border-b border-[#1A426F] pb-2 mb-3">
            <span>PHM08 ASYMMETRIC SCORE</span>
            <span className="text-[#4ADE80]">&minus;59.3% reduction</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">XGBoost Baseline</span>
              <span className="text-xl font-mono font-bold text-[#7C94AA] mt-1 block">
                {benchmarkMetrics.baseline.phm08.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">penalty units</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">Bidirectional LSTM</span>
              <span className="text-xl font-mono font-bold text-[#4ADE80] mt-1 block">
                {benchmarkMetrics.lstm.phm08.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">penalty units</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Critical Recall */}
        <div className="bg-[#0B1E33] p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#7C94AA] border-b border-[#1A426F] pb-2 mb-3">
            <span>CRITICAL RECALL (&lt;20 CYCLES)</span>
            <span className="text-[#E8F1F8]">Key QA Safety Target</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">XGBoost Baseline</span>
              <span className="text-xl font-mono font-bold text-[#7C94AA] mt-1 block">
                {(benchmarkMetrics.baseline.critical_recall * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">11 / 13 caught</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#7C94AA] block">Bidirectional LSTM</span>
              <span className="text-xl font-mono font-bold text-[#4ADE80] mt-1 block">
                {(benchmarkMetrics.lstm.critical_recall * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-[#7C94AA]">11 / 13 caught</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Prediction Error Comparison Chart */}
      <div className="border border-[#1A426F] bg-[#0B1E33]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#1A426F] bg-[#13365C]/40">
          <div>
            <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
              Test set prediction error overlay
            </h2>
            <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
              Residual error (e = predicted &minus; actual) across test engine units
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#7C94AA]">
              <span className="w-3 h-0.5 border-t border-dashed border-[#7C94AA] inline-block" />
              <span>Baseline (XGB) error</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#4ADE80]">
              <span className="w-3 h-0.5 bg-[#4ADE80] inline-block" />
              <span>LSTM error</span>
            </span>

            <div className="flex items-center gap-1 border-l border-[#1A426F] pl-3">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2 py-0.5 border text-[11px] ${
                  chartType === 'line'
                    ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8]'
                    : 'border-[#1A426F] text-[#7C94AA]'
                }`}
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2 py-0.5 border text-[11px] ${
                  chartType === 'bar'
                    ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8]'
                    : 'border-[#1A426F] text-[#7C94AA]'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-3">
          <ResponsiveContainer width="100%" height={340}>
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 24, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="#1A426F" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="unit_id"
                  stroke="#7C94AA"
                  tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#1A426F' }}
                  axisLine={{ stroke: '#1A426F' }}
                />
                <YAxis
                  stroke="#7C94AA"
                  tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#1A426F' }}
                  axisLine={{ stroke: '#1A426F' }}
                  unit=" cyc"
                />
                <Tooltip content={<ModelErrorTooltip />} />
                <ReferenceLine
                  y={0}
                  stroke="#E8F1F8"
                  strokeWidth={1}
                  label={{
                    value: '0 error (exact target)',
                    fill: '#7C94AA',
                    fontSize: 10,
                    position: 'insideBottomRight',
                    fontFamily: 'monospace',
                  }}
                />
                {errorMetric === 'residual' && (
                  <>
                    <ReferenceLine y={10} stroke="#1A426F" strokeDasharray="2 2" />
                    <ReferenceLine y={-10} stroke="#1A426F" strokeDasharray="2 2" />
                  </>
                )}

                <Line
                  type="monotone"
                  dataKey="baseline_error"
                  stroke="#7C94AA"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{ r: 3, fill: '#7C94AA' }}
                  name="Baseline Error"
                  isAnimationActive={false}
                />

                <Line
                  type="monotone"
                  dataKey="lstm_error"
                  stroke="#4ADE80"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#4ADE80', stroke: '#0B1E33' }}
                  name="LSTM Error"
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 20, right: 24, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="#1A426F" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="unit_id"
                  stroke="#7C94AA"
                  tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#1A426F' }}
                  axisLine={{ stroke: '#1A426F' }}
                />
                <YAxis
                  stroke="#7C94AA"
                  tick={{ fill: '#7C94AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#1A426F' }}
                  axisLine={{ stroke: '#1A426F' }}
                  unit=" cyc"
                />
                <Tooltip content={<ModelErrorTooltip />} />
                <ReferenceLine y={0} stroke="#E8F1F8" strokeWidth={1} />
                <Bar dataKey="baseline_error" fill="#7C94AA" name="Baseline Error" isAnimationActive={false} />
                <Bar dataKey="lstm_error" fill="#4ADE80" name="LSTM Error" isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Note on Domain Asymmetry */}
        <div className="px-4 py-2.5 bg-[#071524] border-t border-[#1A426F] text-[11px] font-mono text-[#7C94AA]">
          <span className="text-[#E8F1F8] font-semibold">Note on PHM08 Asymmetry:</span> Over-estimating RUL (late prediction) is penalized exponentially heavier than under-estimating RUL (early alert) to protect against catastrophic in-flight failure. The LSTM significantly avoids late predictions in the critical zone.
        </div>
      </div>

      {/* Unit-by-Unit Model Prediction Ledger */}
      <div className="border border-[#1A426F] bg-[#0B1E33]">
        <div className="px-4 py-3 border-b border-[#1A426F] bg-[#13365C]/40 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E8F1F8] m-0">
            Unit test prediction ledger &amp; error comparison
          </h2>
          <span className="text-xs font-mono text-[#7C94AA]">
            SAMPLES: {engines.length} UNITS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse" role="table">
            <thead>
              <tr className="border-b border-[#1A426F] bg-[#071524] text-[#7C94AA] text-[11px]">
                <th className="py-2.5 px-4 font-normal">Unit ID</th>
                <th className="py-2.5 px-4 font-normal">True RUL</th>
                <th className="py-2.5 px-4 font-normal">Risk Class</th>
                <th className="py-2.5 px-4 font-normal">Baseline Pred</th>
                <th className="py-2.5 px-4 font-normal">Baseline Error</th>
                <th className="py-2.5 px-4 font-normal">LSTM Pred</th>
                <th className="py-2.5 px-4 font-normal">LSTM Error</th>
                <th className="py-2.5 px-4 font-normal text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A426F]/60">
              {chartData.map((row) => {
                const bErr = row.baseline_error;
                const lErr = row.lstm_error;
                const lstmWins = Math.abs(lErr) <= Math.abs(bErr);

                return (
                  <tr
                    key={row.unit_id}
                    className="hover:bg-[#13365C]/30 transition-colors cursor-pointer"
                    onClick={() => {
                      const matched = engines.find((e) => e.unit_id === row.unit_id);
                      if (matched && onSelectUnit && onOpenDetail) {
                        onSelectUnit(matched);
                        onOpenDetail(matched);
                      }
                    }}
                  >
                    <td className="py-2.5 px-4 font-bold text-[#E8F1F8]">{row.unit_id}</td>
                    <td className="py-2.5 px-4 text-[#E8F1F8]">{row.actual_rul.toFixed(1)} cyc</td>
                    <td className="py-2.5 px-4">
                      <RiskIndicator bucket={row.risk_bucket} showLabel />
                    </td>
                    <td className="py-2.5 px-4 text-[#7C94AA]">{row.baseline_rul.toFixed(1)} cyc</td>
                    <td className="py-2.5 px-4 text-[#7C94AA]">
                      {(bErr > 0 ? '+' : '') + bErr.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#4ADE80]">
                      {row.lstm_rul.toFixed(1)} cyc
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#4ADE80]">
                      <span className="flex items-center gap-1.5">
                        <span>{(lErr > 0 ? '+' : '') + lErr.toFixed(1)}</span>
                        {lstmWins && (
                          <span className="text-[9px] text-[#4ADE80] font-normal" title="LSTM error within lower bound">
                            &bull;
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-[#7C94AA] hover:text-[#E8F1F8] text-[11px]">
                        Inspect &rarr;
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
