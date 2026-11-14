import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-44 animate-pulse rounded-3xl border border-slate-800 bg-[#0b101b]" />
      <div className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-[#0b101b]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-60 animate-pulse rounded-2xl border border-slate-800 bg-[#0b101b]"
          />
        ))}
      </div>
    </div>
  );
}
