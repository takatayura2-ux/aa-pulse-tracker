"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Gem,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  ALL_DPS_PROFILES,
  COLLECTOR_EXCLUSIVES_DPS,
  DPS_TIER_LIST,
  SUMMER_UPDATE_21_DPS,
  formatDpsNumber,
  getBestUniqueRank,
  getDpsPerValue,
  getUniquePlacementMath,
  type DpsCategory,
  type DpsTier,
  type UnitDpsProfile,
} from "@/data/dpsTierList";
import {
  DpsDeltaBadge,
  DpsElementIcon,
  getDpsTierBadgeClass,
} from "@/components/DpsBadgeHelpers";

type DpsSegment = "all_unique" | "combat_ladder" | "summer_u21" | "collector_exclusive";
type FullSort =
  | "unique_desc"
  | "unique_asc"
  | "meta_rank"
  | "divine_desc"
  | "dps_per_value"
  | "risers";

export function DpsTierListFullView() {
  const [segment, setSegment] = useState<DpsSegment>("all_unique");
  const [sortBy, setSortBy] = useState<FullSort>("unique_desc");
  const [tierFilter, setTierFilter] = useState<"ALL" | DpsTier>("ALL");
  const [airOnly, setAirOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => {
    const basePool: UnitDpsProfile[] =
      segment === "combat_ladder"
        ? DPS_TIER_LIST
        : segment === "summer_u21"
          ? SUMMER_UPDATE_21_DPS
          : segment === "collector_exclusive"
            ? COLLECTOR_EXCLUSIVES_DPS
            : ALL_DPS_PROFILES;

    const q = searchQuery.trim().toLowerCase();

    const filtered = basePool.filter((item) => {
      if (tierFilter !== "ALL" && item.tier !== tierFilter) return false;
      if (airOnly && !item.hitsAir) return false;
      if (q) {
        const hay = `${item.rankCode} ${item.name} ${item.rarity} ${item.element} ${item.aoeType} ${item.passiveSummary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === "unique_desc") {
        return b.uniqueDpsLv100 - a.uniqueDpsLv100;
      }
      if (sortBy === "unique_asc") {
        return a.uniqueDpsLv100 - b.uniqueDpsLv100;
      }
      if (sortBy === "meta_rank") {
        return a.rank - b.rank;
      }
      if (sortBy === "divine_desc") {
        return b.divineFullCapDpsLv100 - a.divineFullCapDpsLv100;
      }
      if (sortBy === "risers") {
        if (b.rankDelta !== a.rankDelta) return b.rankDelta - a.rankDelta;
        return b.uniqueDpsLv100 - a.uniqueDpsLv100;
      }
      const ratioA = getDpsPerValue(a) ?? -1;
      const ratioB = getDpsPerValue(b) ?? -1;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.uniqueDpsLv100 - a.uniqueDpsLv100;
    });

    return sorted;
  }, [segment, sortBy, tierFilter, airOnly, searchQuery]);

  function getCategoryLabel(cat: DpsCategory): string {
    if (cat === "summer_u21") return "Update 21 Summer";
    if (cat === "collector_exclusive") return "Коллекционный";
    return "Боевой Топ";
  }

  return (
    <div className="space-y-5">
      {/* Math & Update 21 Meta Summary */}
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#131024] via-[#0b101d] to-[#080d18] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/12 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-200 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Update 21 · Heaven&apos;s Storm (Ноябрь 2026)</span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Полный Unique DPS Tier List — от №1 до последнего места
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Рейтинг объединяет <strong className="text-white">35 боевых уников и секреток (T1–T35)</strong>,{" "}
              <strong className="text-cyan-300">3 летние секретки Update 21</strong> (Explosion Mage, Sky God, Phoenix) и{" "}
              <strong className="text-amber-300">18 коллекционных эксклюзивов</strong> из таблицы стоимости с расчётом{" "}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-cyan-200">
                DPS_Unique = ((DMG_Lv1 × 9.204065) / (SPA × 0.9)) × 4.0 × M_passive
              </code>
              .
            </p>
          </div>
        </div>

        {/* Placement Cap Formula Cards */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-[#070b14]/90 p-3">
            <div className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              1-Cap (+344.4% чистого DPS)
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Illusionist (Transcended), Supreme Being, JIO: Unique даёт 4.444× урона без потери слотов.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-3">
            <div className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
              2-Cap (+122.2% чистого DPS)
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Elyssia (Abyssal), Skeleton Knight: 1× Unique (4.444×) обходит 2× Divine (2.667×) на +66.7%.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/25 bg-[#070b14]/90 p-3">
            <div className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              3-Cap (+48.1% / +11.1% к Divine)
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Большинство керри (Vegito — исключение с Double Unique): 1× Unique (4.44×) сильнее 3× Divine (4.0×) в 3× дешевле по ¥.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/25 bg-[#070b14]/90 p-3">
            <div className="text-[11px] font-bold tracking-wider text-rose-300 uppercase">
              4-Cap (Divine 5.33× &gt; Unique 4.44×)
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Kansai, Gazu, Saka, AAA: 4 копии с Divine дают больше урона в Infinite, но 1× Unique быстрее качается в Story.
            </p>
          </div>
        </div>
      </section>

      {/* Sub-segments & Filters */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0b101b]/95 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  id: "all_unique",
                  label: `Все юниты Топ 1→${ALL_DPS_PROFILES.length}`,
                },
                { id: "combat_ladder", label: `Боевые T1–T35 (${DPS_TIER_LIST.length})` },
                { id: "summer_u21", label: `Update 21 Summer (${SUMMER_UPDATE_21_DPS.length})` },
                {
                  id: "collector_exclusive",
                  label: `Коллекционные эксклюзивы (${COLLECTOR_EXCLUSIVES_DPS.length})`,
                },
              ] as const
            ).map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSegment(seg.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  segment === seg.id
                    ? "border-amber-400/55 bg-amber-500/20 text-amber-200"
                    : "border-slate-800 bg-[#060911] text-slate-400 hover:text-white"
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Показано:{" "}
            <strong className="font-mono-num text-white">{rows.length}</strong>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск: Vegito, Aizen, Griffin, JIO, Chihiro, Megumin..."
              className="w-full rounded-xl border border-slate-700/80 bg-[#060911] py-2 pr-8 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as FullSort)}
              aria-label="Сортировка Unique DPS Tier List"
              className="w-full rounded-xl border border-slate-700/80 bg-[#060911] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400 sm:text-sm"
            >
              <option value="unique_desc">Лучший Unique DPS (№1 → до последнего)</option>
              <option value="unique_asc">Худший → Лучший Unique DPS</option>
              <option value="meta_rank">Мета-рейтинг Update 21 (T1 → T35)</option>
              <option value="divine_desc">Максимум Divine (Все Cap)</option>
              <option value="dps_per_value">Лучшая выгода: DPS / 1 Value</option>
              <option value="risers">Лидеры роста ранга (▲)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() => setAirOnly((v) => !v)}
              className={`flex h-full w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                airOnly
                  ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                  : "border-slate-700/80 bg-[#060911] text-slate-300 hover:text-white"
              }`}
            >
              <span>Только бьющие воздух (Air/Hybrid)</span>
            </button>
          </div>
        </div>

        {/* Tier Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-3">
          {(["ALL", "SS+", "S+", "S", "A", "B", "C"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                tierFilter === tier
                  ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
                  : "border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white"
              }`}
            >
              {tier === "ALL" ? "Все тиры" : `${tier} Tier`}
            </button>
          ))}
        </div>
      </section>

      {/* Complete Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0b101b]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-800 bg-[#070a12] text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <tr>
                <th className="px-3.5 py-3">№ Unique / Meta</th>
                <th className="px-3.5 py-3">Персонаж</th>
                <th className="px-3.5 py-3">Cap / Стоимость</th>
                <th className="px-3.5 py-3">Base → Unique DPS (Lv100)</th>
                <th className="px-3.5 py-3">Divine (All Cap)</th>
                <th className="px-3.5 py-3">Value · DPS/Val</th>
                <th className="px-3.5 py-3 text-right">Разбор</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((entry) => {
                const bestRank = getBestUniqueRank(entry);
                const ratio = getDpsPerValue(entry);
                const capMath = getUniquePlacementMath(entry.cap);

                return (
                  <tr
                    key={`${entry.rankCode}:${entry.name}`}
                    className="transition hover:bg-slate-900/60"
                  >
                    <td className="px-3.5 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-num rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-extrabold text-amber-200">
                          #{bestRank}
                        </span>
                        <span className="font-mono-num rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">
                          {entry.rankCode}
                        </span>
                        <DpsDeltaBadge delta={entry.rankDelta} />
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-extrabold ${getDpsTierBadgeClass(
                            entry.tier
                          )}`}
                        >
                          {entry.tier}
                        </span>
                      </div>
                    </td>

                    <td className="max-w-xs px-3.5 py-3 align-top">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{entry.name}</span>
                        <DpsElementIcon
                          element={entry.element}
                          hitsAir={entry.hitsAir}
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {entry.rarity} · {entry.aoeType} · {getCategoryLabel(entry.category)}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                        {entry.passiveSummary}
                      </p>
                    </td>

                    <td className="px-3.5 py-3 align-top">
                      <div className="font-mono-num font-bold text-white">
                        Cap {entry.cap}
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-400">
                        {entry.costYen.toLocaleString("ru-RU")}¥
                      </div>
                      <div className="font-mono-num mt-0.5 text-[10px] text-slate-500">
                        SPA {entry.spa}s · Rng {entry.range}
                      </div>
                      <span className="mt-1 inline-block text-[10px] font-semibold text-cyan-300">
                        {capMath.verdict === "prefer_divine_ceiling"
                          ? "4× Divine > Unique"
                          : `+${capMath.netGainVsUnenchantedPercent}% Unique`}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 align-top">
                      <div className="font-mono-num text-sm font-extrabold text-amber-300">
                        {formatDpsNumber(entry.uniqueDpsLv100)}
                      </div>
                      {entry.uniquePeakDpsLv100 && (
                        <div className="font-mono-num text-[11px] font-bold text-fuchsia-300">
                          до {formatDpsNumber(entry.uniquePeakDpsLv100)}
                        </div>
                      )}
                      <div className="font-mono-num mt-0.5 text-[11px] text-slate-400">
                        Base {formatDpsNumber(entry.baseDpsLv100)} → Eff{" "}
                        {formatDpsNumber(entry.effectiveDpsLv100)}
                      </div>
                    </td>

                    <td className="px-3.5 py-3 align-top">
                      <div className="font-mono-num font-bold text-cyan-200">
                        {formatDpsNumber(entry.divineFullCapDpsLv100)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {entry.cap}× Divine (1.333×)
                      </div>
                    </td>

                    <td className="px-3.5 py-3 align-top">
                      <div className="font-mono-num font-bold text-white">
                        {entry.marketValue > 0
                          ? `${entry.marketValue.toLocaleString("en-US")} Val`
                          : "Untradable"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Demand {entry.demand}/10
                      </div>
                      {ratio !== null && (
                        <div className="font-mono-num mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-violet-300">
                          <Gem className="h-3 w-3" />
                          {formatDpsNumber(ratio)} /Val
                        </div>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-right align-top">
                      {entry.unitSlug ? (
                        <Link
                          href={`/units/${entry.unitSlug}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-200"
                        >
                          <span>Карточка</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-400">
                          <TrendingUp className="h-3 w-3 text-slate-500" />
                          No Trade
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
