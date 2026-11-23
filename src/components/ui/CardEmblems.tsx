import React from 'react';

export function GarudaPancasilaIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4L28 14H38L30 20L33 30L24 24L15 30L18 20L10 14H20L24 4Z"
        fill="#EAB308"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="22" r="5" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      <path d="M21 22L24 19L27 22L24 25L21 22Z" fill="#FEF08A" />
    </svg>
  );
}

export function SmartChipSim({ className = 'w-7 h-5' }: { className?: string }) {
  return (
    <div
      className={`${className} rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-700/50 relative overflow-hidden shadow-2xs shrink-0`}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-800/40" />
      <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-800/40" />
      <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-800/40" />
      <div className="absolute inset-1 border border-amber-800/20 rounded-xs pointer-events-none" />
    </div>
  );
}

export function PitaMerahPutih({ className = 'h-6' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden flex flex-col ${className}`}>
      <div className="h-1/2 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
      <div className="h-1/2 w-full bg-gradient-to-r from-slate-100 via-white to-slate-200 border-t border-slate-300/40" />
    </div>
  );
}
