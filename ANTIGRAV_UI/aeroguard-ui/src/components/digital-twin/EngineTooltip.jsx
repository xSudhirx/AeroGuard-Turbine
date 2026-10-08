import React from 'react';
import RiskIndicator from '../RiskIndicator';

/**
 * EngineTooltip
 * Engineering CAD hover HUD card displaying component details,
 * live telemetry readings, and RUL contribution.
 */
export default function EngineTooltip({
  hoveredComponent,
  engine,
}) {
  if (!hoveredComponent) return null;

  const sensors = engine?.sensor_readings || {};
  const status = engine?.risk_bucket || 'Healthy';

  // Component-specific telemetry mapping from C-MAPSS
  const getComponentTelemetry = (id) => {
    switch (id) {
      case 'fan':
        return [
          { label: 'Fan Speed (Nf)', val: `${(sensors.nf_fan_speed || 2388.08).toFixed(1)} RPM`, nom: '2388.0' },
          { label: 'Inlet Temp (T2)', val: `${(sensors.t2_fan_inlet_temp || 518.67).toFixed(1)} °R`, nom: '518.7' },
          { label: 'Inlet Press (P2)', val: `${(sensors.p2_fan_inlet_press || 14.62).toFixed(2)} psia`, nom: '14.6' },
          { label: 'Material', val: 'Ti-6Al-4V Titanium Alloy', nom: null },
          { label: 'RUL Impact', val: status === 'Critical' ? 'High Aerodynamic Load' : 'Nominal Wear', nom: null },
        ];
      case 'lpc':
        return [
          { label: 'LPC Exit Temp (T24)', val: `${(sensors.t24_lpc_temp || 642.58).toFixed(2)} °R`, nom: '642.5' },
          { label: 'Bypass Press (P15)', val: `${(sensors.p15_bypass_press || 21.61).toFixed(2)} psia`, nom: '21.6' },
          { label: 'Bypass Ratio (BPR)', val: `${(sensors.bpr_bypass_ratio || 8.40).toFixed(2)}`, nom: '8.40' },
          { label: 'Stages', val: '3 Axial Bladed Disks', nom: null },
          { label: 'RUL Impact', val: 'Subsonic Compression Stable', nom: null },
        ];
      case 'hpc':
        return [
          { label: 'HPC Exit Temp (T30)', val: `${(sensors.t30_hpc_temp || 1581.22).toFixed(2)} °R`, nom: '1582.0' },
          { label: 'HPC Press (P30)', val: `${(sensors.p30_hpc_press || 554.42).toFixed(2)} psia`, nom: '554.0' },
          { label: 'Core Speed (Nc)', val: `${(sensors.nc_core_speed || 9056.4).toFixed(1)} RPM`, nom: '9055.0' },
          { label: 'Material', val: 'Inconel 718 Nickel Superalloy', nom: null },
          { label: 'RUL Impact', val: status === 'Critical' ? 'CRITICAL THERMAL STRESS' : status === 'Degrading' ? 'Erosion Detected' : 'Nominal Margin', nom: null },
        ];
      case 'combustor':
        return [
          { label: 'Static Press (Ps30)', val: `${(sensors.ps30_hpc_static_press || 47.23).toFixed(2)} psia`, nom: '47.3' },
          { label: 'Fuel/Air Ratio (phi)', val: `${(sensors.phi_fuel_ratio || 521.79).toFixed(2)}`, nom: '521.8' },
          { label: 'Injector Count', val: '16 Dual-Orifice Nozzles', nom: null },
          { label: 'Liner Thermal Barrier', val: 'Yttria-Stabilized Zirconia', nom: null },
          { label: 'RUL Impact', val: 'Stoichiometric Burn Stable', nom: null },
        ];
      case 'hpt':
        return [
          { label: 'Bleed Enthalpy (htBleed)', val: `${(sensors.ht_bleed || 393.0).toFixed(1)} kJ/kg`, nom: '392.5' },
          { label: 'Coolant Flow (W31)', val: '38.8 lbm/s', nom: '38.8' },
          { label: 'Blade Spec', val: 'Single-Crystal CMSX-4', nom: null },
          { label: 'Turbine Inlet Temp', val: '~2250 °R (Combustion Gas)', nom: null },
          { label: 'RUL Impact', val: status === 'Critical' ? 'CREEP ACCELERATION RISK' : 'Nominal Creep Rate', nom: null },
        ];
      case 'lpt':
        return [
          { label: 'LPT Exit Temp (T50)', val: `${(sensors.t50_lpt_temp || 1398.91).toFixed(2)} °R`, nom: '1400.0' },
          { label: 'Expansion Stages', val: '3 Shrouded Low-Pressure Disks', nom: null },
          { label: 'Spool Drive', val: 'Low Pressure N1 Spool', nom: null },
          { label: 'RUL Impact', val: status === 'Critical' ? 'Exhaust EGT Elevated' : 'Nominal Efficiency', nom: null },
        ];
      case 'shafts':
        return [
          { label: 'LP Shaft (N1)', val: `${(sensors.nf_fan_speed || 2388.08).toFixed(1)} RPM`, nom: '2388.0' },
          { label: 'HP Shaft (N2)', val: `${(sensors.nc_core_speed || 9056.4).toFixed(1)} RPM`, nom: '9055.0' },
          { label: 'Configuration', val: 'Coaxial Dual Concentric Spools', nom: null },
          { label: 'Bearings', val: 'Roller & Ball Thrust Bearings', nom: null },
          { label: 'RUL Impact', val: 'Vibration Envelope Nominal', nom: null },
        ];
      case 'casing':
        return [
          { label: 'Bypass Pressure (P15)', val: `${(sensors.p15_bypass_press || 21.61).toFixed(2)} psia`, nom: '21.6' },
          { label: 'Acoustic Attenuation', val: 'Composite Honeycomb Liner', nom: null },
          { label: 'Configuration', val: 'Dual Clamshell Aerodynamic Cowl', nom: null },
          { label: 'Blade Containment', val: 'Kevlar Ring Enclosure', nom: null },
          { label: 'RUL Impact', val: 'Structural Integrity Intact', nom: null },
        ];
      case 'exhaust':
        return [
          { label: 'Exhaust EGT (T50)', val: `${(sensors.t50_lpt_temp || 1398.91).toFixed(2)} °R`, nom: '1400.0' },
          { label: 'Nozzle Geometry', val: 'Convergent Annular Core Mixer', nom: null },
          { label: 'Tailcone Plug', val: 'Aerodynamic Flow Smoother', nom: null },
          { label: 'RUL Impact', val: status === 'Critical' ? 'Thermal Boundary Alert' : 'Subsonic Jet Expansion', nom: null },
        ];
      default:
        return [
          { label: 'Status', val: 'Nominal', nom: null },
          { label: 'Assembly', val: hoveredComponent.name, nom: null },
        ];
    }
  };

  const metrics = getComponentTelemetry(hoveredComponent.id);

  // Position tooltip safely within bounds or docked near bottom-left of 3D canvas
  return (
    <div
      className="absolute bottom-4 left-4 z-20 pointer-events-none max-w-sm w-full border border-[#1A426F] bg-[#071524]/90 backdrop-blur-md p-3.5 shadow-2xl text-xs font-mono transition-all duration-150"
      style={{
        borderLeft: '3px solid #38BDF8',
      }}
    >
      {/* Title & Station Badge */}
      <div className="flex items-center justify-between border-b border-[#1A426F] pb-2 mb-2">
        <div>
          <div className="text-[10px] text-[#38BDF8] font-bold tracking-wider">
            CAD INSPECTION // {hoveredComponent.station}
          </div>
          <div className="text-[#E8F1F8] font-bold text-sm tracking-tight mt-0.5">
            {hoveredComponent.name}
          </div>
        </div>
        <div className="text-right">
          <RiskIndicator bucket={status} showLabel />
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="space-y-1.5">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex items-baseline justify-between text-[11px]">
            <span className="text-[#7C94AA] truncate mr-2">{m.label}:</span>
            <span className="text-[#E8F1F8] font-medium text-right shrink-0">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Footer prompt */}
      <div className="mt-2.5 pt-1.5 border-t border-[#1A426F]/60 flex items-center justify-between text-[10px] text-[#7C94AA]">
        <span>CLICK TO FOCUS CAMERA</span>
        <span className="text-[#38BDF8] font-semibold">UNIT: {engine?.unit_id}</span>
      </div>
    </div>
  );
}
