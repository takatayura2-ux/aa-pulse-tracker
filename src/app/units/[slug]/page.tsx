import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Info,
  Layers,
  TrendingUp,
  Coins,
  Repeat,
  Swords,
  Wind,
} from "lucide-react";
import { GeminiAnalysisPanel } from "@/components/GeminiAnalysisPanel";
import { ShinyBadge, TierBadge, TrendBadge } from "@/components/UnitBadges";
import { UnitCard } from "@/components/UnitCard";
import { UnitDetailActions } from "@/components/UnitDetailActions";
import { UnitPriceChart } from "@/components/UnitPriceChart";
import {
  findUnitDpsProfile,
  formatDpsNumber,
  getBestUniqueRank,
  getUniquePlacementMath,
} from "@/data/dpsTierList";
import { getUnitBySlug } from "@/lib/data-repository";
import { buildUnitPriceHistory } from "@/lib/price-history";
import { fetchUnitHistoryFromSupabase } from "@/lib/supabase";
import {
  formatRerolls,
  getDemandInfo,
  getTrendMeta,
} from "@/lib/unit-formatting";

export const dynamic = "force-dynamic";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { unit, snapshot } = await getUnitBySlug(slug);

  if (!unit) {
    notFound();
  }

  const supabaseHistory = await fetchUnitHistoryFromSupabase(unit.slug);
  const priceHistory = buildUnitPriceHistory(unit, supabaseHistory, 90);
  const demandInfo = getDemandInfo(unit.demand);
  const trendMeta = getTrendMeta(unit.trend);
  const dpsProfile = findUnitDpsProfile(unit);
  const placementMath = dpsProfile ? getUniquePlacementMath(dpsProfile.cap) : null;
  const bestUniqueRank = dpsProfile ? getBestUniqueRank(dpsProfile) : null;

  // Closest units in the same tier for quick comparison
  const relatedUnits = snapshot.units
    .filter((u) => u.slug !== unit.slug && u.tier === unit.tier)
    .sort((a, b) => {
      const aDiff = Math.abs((a.value ?? 50000) - (unit.value ?? 50000));
      const bDiff = Math.abs((b.value ?? 50000) - (unit.value ?? 50000));
      return aDiff - bDiff;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0b101b] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Назад к каталогу персонажей</span>
        </Link>

        <span className="font-mono-num text-xs text-slate-500">
          Вкладка таблицы: {unit.sourceTab} · Позиция #{unit.rank}
        </span>
      </div>

      {/* Hero Unit Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-[#0d1323] via-[#0a0f1c] to-[#120d22] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-cyan-500/12 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TierBadge tier={unit.tier} subTier={unit.subTier} />
              {unit.isShiny && <ShinyBadge />}
              <TrendBadge trend={unit.trend} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                {unit.gameName}
              </h1>
              {unit.animeName !== unit.gameName && (
                <p className="mt-1 text-sm font-medium text-slate-400">
                  Оригинал / Аниме-прототип:{" "}
                  <span className="text-slate-200">{unit.animeName}</span>
                </p>
              )}
            </div>

            <div className="inline-flex max-w-2xl items-start gap-2 rounded-xl border border-slate-800/90 bg-[#070b14]/80 px-3.5 py-2.5 text-xs leading-relaxed text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <span>{unit.information}</span>
            </div>
          </div>

          <div className="shrink-0">
            <UnitDetailActions unit={unit} />
          </div>
        </div>

        {/* 4 Key Telemetry Tiles */}
        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-[#070b14]/90 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <span>Текущее Value</span>
              <Coins className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="font-mono-num mt-2 text-2xl font-extrabold text-white">
              {unit.valueDisplay}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {unit.value === null
                ? "Коллекционная договорная цена"
                : "Оценка по прайс-листу"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#070b14]/90 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <span>Эквивалент Rerolls</span>
              <Repeat className="h-4 w-4 text-violet-400" />
            </div>
            <div className="font-mono-num mt-2 text-2xl font-extrabold text-cyan-300">
              {formatRerolls(unit.value)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Базовый курс листа: ~20 Value = 1 RR
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#070b14]/90 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <span>Спрос (Demand)</span>
              <Layers className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono-num text-2xl font-extrabold text-white">
                {unit.demand}
                <span className="text-sm font-medium text-slate-400"> / 10</span>
              </span>
              <span className={`text-xs font-bold ${demandInfo.colorClass}`}>
                {demandInfo.label}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${demandInfo.barColor}`}
                style={{
                  width: `${Math.min(100, Math.max(5, unit.demand * 10))}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#070b14]/90 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <span>Тренд рынка</span>
              <TrendingUp className="h-4 w-4 text-fuchsia-400" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-extrabold text-white">
                {trendMeta.ruLabel}
              </span>
              <TrendBadge trend={unit.trend} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {trendMeta.description}
            </p>
          </div>
        </div>

        {/* Combat DPS Strip when unit is in Update 21 DPS database */}
        {dpsProfile && placementMath && (
          <div className="relative mt-4 rounded-2xl border border-amber-500/25 bg-[#070b14]/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                  <Swords className="h-4 w-4" />
                  Профиль DPS (Update 21):
                </span>
                <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 font-extrabold text-cyan-200">
                  {dpsProfile.rankCode} · {dpsProfile.tier} Tier · #{bestUniqueRank} по Unique DPS
                </span>
                {dpsProfile.hitsAir && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/35 bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-200">
                    <Wind className="h-3 w-3" />
                    Бьёт воздух (Hybrid/Air)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Unique DPS (Lv100): </span>
                  <strong className="font-mono-num text-amber-300">
                    {formatDpsNumber(dpsProfile.uniqueDpsLv100)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">
                    {dpsProfile.cap}× Divine:{" "}
                  </span>
                  <strong className="font-mono-num text-slate-200">
                    {formatDpsNumber(dpsProfile.divineFullCapDpsLv100)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">SPA / Range: </span>
                  <strong className="font-mono-num text-white">
                    {dpsProfile.spa}s / {dpsProfile.range}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Cap: </span>
                  <strong className="font-mono-num text-white">
                    {dpsProfile.cap}
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-cyan-300">
                {placementMath.headline}:
              </span>{" "}
              {dpsProfile.passiveSummary}
            </p>
          </div>
        )}
      </section>

      {/* Recharts Price History */}
      <UnitPriceChart
        history={priceHistory}
        trend={unit.trend}
        isCollectorUnpriced={unit.value === null}
      />

      {/* Gemini AI Market Analytics */}
      <GeminiAnalysisPanel unit={unit} />

      {/* Comparable Tier Alternatives */}
      {relatedUnits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Похожие персонажи из {unit.tier} Tier
            </h2>
            <Link
              href="/"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Весь список →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedUnits.map((rel) => (
              <UnitCard key={rel.slug} unit={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
