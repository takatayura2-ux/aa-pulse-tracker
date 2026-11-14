"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Scale } from "lucide-react";
import {
  formatRerolls,
  getDemandInfo,
  getTierMeta,
} from "@/lib/unit-formatting";
import {
  EstimatedValueBadge,
  ShinyBadge,
  TierBadge,
  TrendBadge,
} from "@/components/UnitBadges";
import { useTrade } from "@/components/TradeProvider";
import type { Unit } from "@/types/unit";

export function UnitCard({ unit }: { unit: Unit }) {
  const { addToSide } = useTrade();
  const tierMeta = getTierMeta(unit.tier, unit.subTier);
  const demandInfo = getDemandInfo(unit.demand);
  const demandPercent = Math.min(100, Math.max(4, unit.demand * 10));

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border bg-[#0c111d]/90 p-4 backdrop-blur-md transition duration-200 ${tierMeta.accentBorder} ${tierMeta.glowClass}`}
    >
      {/* Top Row: Badges */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <TierBadge tier={unit.tier} subTier={unit.subTier} />
            {unit.isShiny && <ShinyBadge compact />}
            {(unit.isUntradable || unit.isEstimatedValue) && (
              <EstimatedValueBadge
                isUntradable={unit.isUntradable}
                compact
              />
            )}
          </div>
          <TrendBadge trend={unit.trend} />
        </div>

        {/* Unit Name */}
        <Link href={`/units/${unit.slug}`} className="block">
          <h3 className="line-clamp-1 text-base font-bold text-white transition group-hover:text-cyan-300">
            {unit.gameName}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-400">
            {unit.animeName !== unit.gameName
              ? unit.animeName
              : unit.sourceTab}
          </p>
        </Link>

        <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-slate-400/90">
          {unit.information}
        </p>
      </div>

      {/* Metrics Block */}
      <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              {unit.isUntradable
                ? "Прогноз Value"
                : unit.isEstimatedValue
                  ? "Рынок (Ориентир)"
                  : "Value"}
            </span>
            <div
              className={`font-mono-num mt-0.5 text-xl font-extrabold tracking-tight ${
                unit.isEstimatedValue ? "text-amber-200" : "text-white"
              }`}
            >
              {unit.valueDisplay}
            </div>
            {unit.estimatedValueRange && (
              <span className="font-mono-num block text-[10px] font-semibold text-violet-300/90">
                Диапазон: {unit.estimatedValueRange}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Эквивалент
            </span>
            <span className="font-mono-num text-xs font-semibold text-cyan-300/90">
              {formatRerolls(unit.value)}
            </span>
          </div>
        </div>

        {/* Demand Meter */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-slate-400">
              Demand{" "}
              <span className={`font-semibold ${demandInfo.colorClass}`}>
                · {demandInfo.shortLabel}
              </span>
            </span>
            <span className="font-mono-num font-bold text-slate-200">
              {unit.demand}/10
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${demandInfo.barColor}`}
              style={{ width: `${demandPercent}%` }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/units/${unit.slug}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-cyan-500/15 hover:text-cyan-200"
          >
            <span>Аналитика</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => addToSide("offer", unit)}
            title="Добавить в Ваше предложение (Калькулятор)"
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-500/35 bg-indigo-500/12 px-2.5 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/60 hover:bg-indigo-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            <Scale className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
