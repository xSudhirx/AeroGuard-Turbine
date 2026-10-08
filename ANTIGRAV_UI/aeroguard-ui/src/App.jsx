import React, { useState } from 'react';
import mockEngineData from './data/mockEngineData.json';
import EngineSchematic from './components/EngineSchematic';
import EngineDigitalTwin from './components/digital-twin/EngineDigitalTwin';
import FleetTable from './components/FleetTable';
import EngineDetail from './components/EngineDetail';
import ModelComparison from './components/ModelComparison';
import RiskIndicator from './components/RiskIndicator';

/**
 * AeroGuard Turbine Dashboard Application
 * Single-page app with view-switching:
 * - 'fleet': Fleet Overview (3D Digital Twin Hero + Manifest Table)
 * - 'detail': Engine Detail (RUL Chart, Sensor Deck, Risk-Bucket History)
 * - 'models': Model Comparison (Baseline XGBoost vs LSTM Error Analysis)
 */
export default function App() {
  // Clean data architecture: can be directly swapped with an API fetch
  const [engines] = useState(mockEngineData);
  const [currentView, setCurrentView] = useState('fleet'); // 'fleet' | 'detail' | 'models'
  const [engineViewMode, setEngineViewMode] = useState('3d'); // '3d' | '2d'
  const [selectedEngineId, setSelectedEngineId] = useState(
    mockEngineData[0]?.unit_id || null
  );

  const selectedEngine =
    engines.find((e) => e.unit_id === selectedEngineId) || engines[0];

  // Count risk buckets for status header
  const counts = {
    critical: engines.filter((e) => e.risk_bucket === 'Critical').length,
    degrading: engines.filter((e) => e.risk_bucket === 'Degrading').length,
    healthy: engines.filter((e) => e.risk_bucket === 'Healthy').length,
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngineId(engine.unit_id);
  };

  const handleOpenDetail = (engine) => {
    setSelectedEngineId(engine.unit_id);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-[#0B1E33] text-[#E8F1F8] flex flex-col blueprint-grid-canvas">
      {/* Top Engineering Drawing Chrome / System Header */}
      <header className="border-b border-[#1A426F] bg-[#071524]">
        {/* Upper Metadata Ticker */}
        <div className="px-4 py-1.5 border-b border-[#1A426F] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#7C94AA]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#4ADE80] inline-block" />
              <span className="text-[#E8F1F8]">SYSTEM ONLINE</span>
            </span>
            <span className="text-[#1A426F]">/</span>
            <span>SPEC: NASA C-MAPSS FD001</span>
            <span className="text-[#1A426F]">/</span>
            <span>TELEMETRY SAMPLE RATE: 1 HZ</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <RiskIndicator bucket="Critical" />
              <span>Critical: <strong className="text-[#FFB020]">{counts.critical}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <RiskIndicator bucket="Degrading" />
              <span>Degrading: <strong className="text-[#E8893C]">{counts.degrading}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <RiskIndicator bucket="Healthy" />
              <span>Healthy: <strong className="text-[#4ADE80]">{counts.healthy}</strong></span>
            </span>
          </div>
        </div>

        {/* Primary Title & Navigation Bar */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* System Emblem */}
            <div className="w-8 h-8 border border-[#1A426F] bg-[#13365C] flex items-center justify-center font-mono font-bold text-xs text-[#E8F1F8]">
              AG
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#E8F1F8] m-0">
                AeroGuard Turbine
              </h1>
              <p className="text-xs font-mono text-[#7C94AA] mt-0.5">
                Remaining Useful Life Prognosis &amp; QA Verification Suite
              </p>
            </div>
          </div>

          {/* View Switcher Controls */}
          <nav className="flex items-center gap-1 text-xs font-mono" aria-label="Main Navigation">
            <button
              type="button"
              onClick={() => setCurrentView('fleet')}
              className={`px-3.5 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                currentView === 'fleet'
                  ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8] font-semibold'
                  : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8] bg-[#0B1E33]'
              }`}
              aria-current={currentView === 'fleet' ? 'page' : undefined}
            >
              Fleet Overview
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('detail')}
              className={`px-3.5 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                currentView === 'detail'
                  ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8] font-semibold'
                  : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8] bg-[#0B1E33]'
              }`}
              aria-current={currentView === 'detail' ? 'page' : undefined}
            >
              Engine Detail ({selectedEngine?.unit_id || 'None'})
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('models')}
              className={`px-3.5 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8F1F8] ${
                currentView === 'models'
                  ? 'border-[#E8F1F8] bg-[#13365C] text-[#E8F1F8] font-semibold'
                  : 'border-[#1A426F] text-[#7C94AA] hover:text-[#E8F1F8] bg-[#0B1E33]'
              }`}
              aria-current={currentView === 'models' ? 'page' : undefined}
            >
              Model Comparison (Phase 1 vs 2)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Drafting Sheet Content Canvas */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* VIEW 1: FLEET OVERVIEW */}
        {currentView === 'fleet' && (
          <div className="space-y-6">
            {/* Hero Section: Interactive 3D Turbofan Digital Twin or 2D Blueprint */}
            {engineViewMode === '3d' ? (
              <EngineDigitalTwin
                selectedEngine={selectedEngine}
                onSelectUnit={handleSelectEngine}
                allEngines={engines}
                onOpenDetail={handleOpenDetail}
                onToggle2D3D={() => setEngineViewMode('2d')}
                viewMode="3d"
              />
            ) : (
              <EngineSchematic
                selectedEngine={selectedEngine}
                onSelectUnit={handleSelectEngine}
                allEngines={engines}
                onOpenDetail={handleOpenDetail}
                onToggle2D3D={() => setEngineViewMode('3d')}
                viewMode="2d"
              />
            )}

            {/* Below Hero: Engine Fleet Manifest */}
            <FleetTable
              engines={engines}
              selectedEngineId={selectedEngineId}
              onSelectEngine={handleSelectEngine}
              onOpenDetail={handleOpenDetail}
            />
          </div>
        )}

        {/* VIEW 2: ENGINE DETAIL */}
        {currentView === 'detail' && (
          <EngineDetail
            engine={selectedEngine}
            allEngines={engines}
            onBackToFleet={() => setCurrentView('fleet')}
            onSelectEngine={handleSelectEngine}
            onOpenModelComparison={() => setCurrentView('models')}
          />
        )}

        {/* VIEW 3: MODEL COMPARISON */}
        {currentView === 'models' && (
          <ModelComparison
            engines={engines}
            onSelectUnit={handleSelectEngine}
            onOpenDetail={handleOpenDetail}
          />
        )}
      </main>

      {/* Engineering Drawing Title Block / Footer */}
      <footer className="border-t border-[#1A426F] bg-[#071524] text-xs font-mono text-[#7C94AA] mt-auto">
        <div className="max-w-[1600px] mx-auto p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[#E8F1F8] font-semibold">
              DWG SHEET AG-FD001 // REV 4.2
            </span>
            <span className="text-[#1A426F]">|</span>
            <span>NASA C-MAPSS SIMULATED TURBOFAN RUN-TO-FAILURE</span>
            <span className="text-[#1A426F]">|</span>
            <span>PHASE 1 (XGBOOST) &amp; PHASE 2 (LSTM)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>DESIGN LANGUAGE: BLUEPRINT LINELINE</span>
            <span className="text-[#1A426F]">|</span>
            <span>REDUCED-MOTION: COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
