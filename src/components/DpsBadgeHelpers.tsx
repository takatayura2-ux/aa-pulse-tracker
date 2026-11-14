"use client";

import React from "react";
import {
  Flame,
  Sparkles,
  Swords,
  Zap,
  Droplets,
  Snowflake,
  Wind,
} from "lucide-react";
import type { DpsTier } from "@/data/dpsTierList";

export function getDpsTierBadgeClass(tier: DpsTier): string {
  switch (tier) {
    case "SS+":
      return "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200";
    case "S+":
      return "border-amber-400/50 bg-amber-500/20 text-amber-200";
    case "S":
      return "border-cyan-400/50 bg-cyan-500/20 text-cyan-200";
    case "A":
      return "border-emerald-400/50 bg-emerald-500/20 text-emerald-200";
    case "B":
      return "border-sky-400/45 bg-sky-500/15 text-sky-200";
    case "C":
    default:
      return "border-slate-600/60 bg-slate-800/80 text-slate-300";
  }
}

export function DpsDeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="font-mono-num inline-flex items-center text-[10px] font-bold text-emerald-400">
        ▲ +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="font-mono-num inline-flex items-center text-[10px] font-bold text-rose-400">
        ▼ {delta}
      </span>
    );
  }
  return (
    <span className="font-mono-num inline-flex items-center text-[10px] font-semibold text-slate-500">
      ▬ 0
    </span>
  );
}

export function DpsElementIcon({
  element,
  hitsAir,
}: {
  element: string;
  hitsAir: boolean;
}) {
  const lower = element.toLowerCase();
  let icon = <Sparkles className="h-3.5 w-3.5 text-violet-300" />;
  if (lower.includes("fire")) {
    icon = <Flame className="h-3.5 w-3.5 text-orange-400" />;
  } else if (lower.includes("storm") || lower.includes("light")) {
    icon = <Zap className="h-3.5 w-3.5 text-amber-300" />;
  } else if (lower.includes("aqua")) {
    icon = <Droplets className="h-3.5 w-3.5 text-cyan-300" />;
  } else if (lower.includes("ice")) {
    icon = <Snowflake className="h-3.5 w-3.5 text-sky-300" />;
  } else if (lower.includes("phys") || lower.includes("true")) {
    icon = <Swords className="h-3.5 w-3.5 text-rose-300" />;
  }

  return (
    <span className="inline-flex items-center gap-1" title={`${element}${hitsAir ? " · Бьёт воздух" : ""}`}>
      {icon}
      {hitsAir && <Wind className="h-3 w-3 text-sky-400" />}
    </span>
  );
}
