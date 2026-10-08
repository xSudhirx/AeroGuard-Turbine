import React, { useState, useEffect } from 'react';

/**
 * EngineLoadingScreen
 * High-tech aerospace digital-twin boot sequence HUD.
 * Renders an authentic telemetry initialization terminal before unveiling the 3D twin.
 */
const LOGS = [
  'MOUNTING NASA C-MAPSS FD001 PROGNOSTICS KERNEL...',
  'SYNCHRONIZING DUAL-SPOOL TELEMETRY BUS (Nf=2388 RPM, Nc=9056 RPM)...',
  'COMPILING HIGH-BYPASS TURBOMACHINERY PBR SHADERS...',
  'CALIBRATING EXPLODED-VIEW AXIAL MATRICES (STA 1.0 -> STA 5.0)...',
  'DIGITAL TWIN ONLINE // ALL SUBSYSTEMS NOMINAL',
];

export default function EngineLoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(15);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 400);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 22) + 12;
        return next > 100 ? 100 : next;
      });
    }, 150);

    const logTimer = setInterval(() => {
      setLogIndex((prev) => (prev < LOGS.length - 1 ? prev + 1 : prev));
    }, 280);

    return () => {
      clearInterval(timer);
      clearInterval(logTimer);
    };
  }, [onComplete]);

  // Compute block character progress string: [██████████░░░░░░]
  const totalBlocks = 24;
  const filledBlocks = Math.round((progress / 100) * totalBlocks);
  const barString = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, totalBlocks - filledBlocks));

  return (
    <div className="absolute inset-0 z-30 bg-[#071524]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-xs font-mono select-none">
      <div className="w-full max-w-lg border border-[#1A426F] bg-[#0B1E33] p-5 shadow-2xl space-y-4">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#1A426F] pb-2 text-[11px] text-[#7C94AA]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#38BDF8] animate-pulse inline-block" />
            <span className="text-[#E8F1F8] font-bold tracking-wider">AEROGUARD CAD INTERPRETER</span>
          </div>
          <span>SYS.VER 4.2-TWIN</span>
        </div>

        {/* System Title */}
        <div>
          <h3 className="text-sm font-bold text-[#E8F1F8] tracking-wide">
            INITIALIZING 3D ENGINE DIGITAL TWIN
          </h3>
          <p className="text-[11px] text-[#7C94AA] mt-0.5">
            Aerospace High-Bypass Turbofan Exploded-View Model
          </p>
        </div>

        {/* Graphical Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#38BDF8] tracking-widest">[{barString}]</span>
            <span className="text-[#E8F1F8] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1 bg-[#13365C] overflow-hidden">
            <div
              className="h-full bg-[#38BDF8] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live Terminal Diagnostic Logs */}
        <div className="bg-[#071524] border border-[#1A426F]/60 p-2.5 space-y-1 text-[10px] text-[#7C94AA]">
          {LOGS.slice(0, logIndex + 1).map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#38BDF8]">&gt;</span>
              <span className={idx === logIndex ? 'text-[#E8F1F8]' : 'text-[#7C94AA]'}>
                {log}
              </span>
            </div>
          ))}
        </div>

        {/* Subsystem checklist strip */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#7C94AA] pt-1 border-t border-[#1A426F]">
          <div>GEOMETRY: <span className="text-[#4ADE80]">PROCEDURAL CAD</span></div>
          <div>KINEMATICS: <span className="text-[#4ADE80]">DUAL COAXIAL</span></div>
          <div>EXPLODED ENGINE: <span className="text-[#38BDF8]">SCROLL-LINKED</span></div>
          <div>TELEMETRY: <span className="text-[#4ADE80]">C-MAPSS FD001</span></div>
        </div>
      </div>
    </div>
  );
}
