import React from 'react';

/**
 * Reusable small colored risk-state indicator.
 * Strictly adheres to blueprint drafting specs:
 * - Not a pill badge
 * - Healthy: #4ADE80
 * - Degrading: #E8893C
 * - Critical: #FFB020
 */
export default function RiskIndicator({ bucket = 'Healthy', showLabel = false, className = '' }) {
  const normalized = String(bucket).toLowerCase();

  let color = '#4ADE80';
  let label = 'Healthy';

  if (normalized.includes('crit')) {
    color = '#FFB020';
    label = 'Critical';
  } else if (normalized.includes('deg')) {
    color = '#E8893C';
    label = 'Degrading';
  } else {
    color = '#4ADE80';
    label = 'Healthy';
  }

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      title={`Risk status: ${label}`}
    >
      <span
        className="inline-block w-2 h-2 flex-shrink-0"
        style={{
          backgroundColor: color,
        }}
        aria-hidden="true"
      />
      {showLabel && (
        <span
          className="font-mono text-xs leading-none"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
