import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  AlertTriangle,
  Activity,
  Minus,
  Sparkles,
  Lock,
} from "lucide-react";
import { getTierMeta, getTrendMeta } from "@/lib/unit-formatting";
import type { SubTier, Tier, TrendStatus } from "@/types/unit";

export function TierBadge({
  tier,
  subTier,
}: {
  tier: Tier;
  subTier?: SubTier;
}) {
  const meta = getTierMeta(tier, subTier);
  return (
    <span
      className={`font-mono-num inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-bold tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function ShinyBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300/40 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-fuchsia-500/20 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-200 uppercase shadow-[0_0_12px_rgba(251,191,36,0.16)]">
      <Sparkles className="h-3 w-3 text-amber-300" />
      {compact ? "SHINY" : "SHINY"}
    </span>
  );
}

export function TrendBadge({ trend }: { trend: TrendStatus }) {
  const meta = getTrendMeta(trend);

  const Icon =
    trend === "Rising"
      ? TrendingUp
      : trend === "Hyped"
        ? Flame
        : trend === "Declining"
          ? TrendingDown
          : trend === "Overpriced"
            ? AlertTriangle
            : trend === "Unstable"
              ? Activity
              : Minus;

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}

export function EstimatedValueBadge({
  isUntradable = false,
  compact = false,
}: {
  isUntradable?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      title={
        isUntradable
          ? "Персонаж ещё не передаётся в трейде — показана ориентировочная цена по аналогам"
          : "Коллекционный ориентир договорной цены"
      }
      className="inline-flex items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-200 uppercase"
    >
      <Lock className="h-2.5 w-2.5 shrink-0 text-violet-300" />
      <span>
        {compact
          ? isUntradable
            ? "Прогноз"
            : "Ориентир"
          : isUntradable
            ? "Прогноз · Без трейда"
            : "Ориентир OC"}
      </span>
    </span>
  );
}
