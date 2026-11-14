"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Gem,
  Search,
  Sparkles,
  Swords,
  TrendingUp,
  ArrowUpRight,
  X,
} from "lucide-react";
import {
  COLLECTOR_EXCLUSIVES_DPS,
  DPS_TIER_LIST,
  SUMMER_UPDATE_21_DPS,
  formatDpsNumber,
  getBestUniqueRank,
  getDpsPerValueInfo,
  getDpsProfileSlug,
  getEffectiveUnitValue,
  getUniquePlacementMath,
  matchesDpsProfileQuery,
  toSyntheticUnitFromDpsProfile,
  type DpsTier,
  type UnitDpsProfile,
} from "@/data/dpsTierList";
import {
  DpsDeltaBadge,
  DpsElementIcon,
  getDpsTierBadgeClass,
} from "@/components/DpsBadgeHelpers";
import type { AiUnitAnalysis } from "@/types/unit";

type DpsMode = "unique" | "divine";
type LadderSort =
  | "rank_asc"
  | "rank_desc"
  | "best_unique"
  | "risers"
  | "dps_per_value";
type TierFilter = "ALL" | "SS+" | "S+" | "S" | "A" | "BC";

interface CompactDpsLadderProps {
  onOpenFullCategory?: () => void;
}

export function CompactDpsLadder({ onOpenFullCategory }: CompactDpsLadderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dpsMode, setDpsMode] = useState<DpsMode>("unique");
  const [sortMode, setSortMode] = useState<LadderSort>("rank_asc");
  const [tierFilter, setTierFilter] = useState<TierFilter>("ALL");
  const [includeExtras, setIncludeExtras] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>("T1:Fused Hero (Vegito)");

  const [aiCache, setAiCache] = useState<Record<string, AiUnitAnalysis>>({});
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiErrorKey, setAiErrorKey] = useState<string | null>(null);

  const items = useMemo(() => {
    const pool: UnitDpsProfile[] = includeExtras
      ? [...DPS_TIER_LIST, ...SUMMER_UPDATE_21_DPS, ...COLLECTOR_EXCLUSIVES_DPS]
      : [...DPS_TIER_LIST];

    const filtered = pool.filter((entry) => {
      if (tierFilter === "BC") {
        if (entry.tier !== "B" && entry.tier !== "C") return false;
      } else if (tierFilter !== "ALL") {
        if (entry.tier !== tierFilter) return false;
      }

      return matchesDpsProfileQuery(entry, searchQuery);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === "rank_asc") {
        return a.rank - b.rank;
      }
      if (sortMode === "rank_desc") {
        return b.rank - a.rank;
      }
      if (sortMode === "best_unique") {
        const valA =
          dpsMode === "unique" ? a.uniqueDpsLv100 : a.divineFullCapDpsLv100;
        const valB =
          dpsMode === "unique" ? b.uniqueDpsLv100 : b.divineFullCapDpsLv100;
        return valB - valA;
      }
      if (sortMode === "risers") {
        if (b.rankDelta !== a.rankDelta) return b.rankDelta - a.rankDelta;
        return b.uniqueDpsLv100 - a.uniqueDpsLv100;
      }
      // dps_per_value
      const ratioA = getDpsPerValueInfo(a)?.ratio ?? -1;
      const ratioB = getDpsPerValueInfo(b)?.ratio ?? -1;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.uniqueDpsLv100 - a.uniqueDpsLv100;
    });

    return sorted;
  }, [includeExtras, searchQuery, tierFilter, sortMode, dpsMode]);

  async function handleRunInlineAi(entry: UnitDpsProfile, key: string) {
    setAiLoadingKey(key);
    setAiErrorKey(null);
    try {
      const res = await fetch("/api/analyze-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: getDpsProfileSlug(entry),
          unit: toSyntheticUnitFromDpsProfile(entry),
          forceRefresh: false,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { analysis: AiUnitAnalysis };
      setAiCache((prev) => ({ ...prev, [key]: data.analysis }));
    } catch {
      setAiErrorKey(key);
    } finally {
      setAiLoadingKey(null);
    }
  }

  return (
    <aside className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-[#0d1323] to-[#090d17] p-4 shadow-[0_14px_38px_rgba(0,0,0,0.45)] xl:sticky xl:top-20 xl:w-[370px] xl:shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/12 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-fuchsia-200 uppercase">
            <Swords className="h-3 w-3 text-fuchsia-300" />
            <span>Update 21 · Meta Top</span>
          </div>
          <h2 className="mt-1.5 text-base font-extrabold tracking-tight text-white">
            DPS Ladder (T1–T35)
          </h2>
          <p className="text-[11px] text-slate-400">
            Уники и Секретки Lv100 · сверху вниз / снизу вверх
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
          aria-expanded={!isCollapsed}
        >
          <span>{isCollapsed ? "Развернуть" : "Свернуть"}</span>
          {isCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-3 space-y-2.5">
          {/* Mode Toggle: Unique vs Divine */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-[#060911] p-1">
            <button
              type="button"
              onClick={() => setDpsMode("unique")}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                dpsMode === "unique"
                  ? "bg-amber-500/20 text-amber-200 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.45)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Unique (1 башня)
            </button>
            <button
              type="button"
              onClick={() => setDpsMode("divine")}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                dpsMode === "divine"
                  ? "bg-cyan-500/20 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.45)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Divine (Все Cap)
            </button>
          </div>

          {/* Direction & Dynamic Sorting */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSortMode("rank_asc")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                sortMode === "rank_asc"
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-white"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              Т1 → Т35
            </button>

            <button
              type="button"
              onClick={() => setSortMode("rank_desc")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                sortMode === "rank_desc"
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-white"
              }`}
            >
              Т35 → Т1
            </button>

            <button
              type="button"
              onClick={() => setSortMode("best_unique")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                sortMode === "best_unique"
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-white"
              }`}
              title="Чистая сортировка от #1 лучшего DPS до последнего"
            >
              <Flame className="h-3 w-3 text-amber-400" />
              Топ DPS №1→↓
            </button>

            <button
              type="button"
              onClick={() => setSortMode("risers")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                sortMode === "risers"
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              ▲ Лидеры роста
            </button>

            <button
              type="button"
              onClick={() => setSortMode("dps_per_value")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                sortMode === "dps_per_value"
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-white"
              }`}
            >
              <Gem className="h-3 w-3 text-violet-300" />
              DPS / 1 Value
            </button>
          </div>

          {/* Tier Pills + Extras Toggle */}
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: "ALL", label: "Все" },
                { id: "SS+", label: "SS+" },
                { id: "S+", label: "S+" },
                { id: "S", label: "S" },
                { id: "A", label: "A" },
                { id: "BC", label: "B–C" },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTierFilter(pill.id)}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition ${
                  tierFilter === pill.id
                    ? "border-cyan-400/55 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white"
                }`}
              >
                {pill.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIncludeExtras((v) => !v)}
              className={`ml-auto rounded-md border px-2 py-0.5 text-[10px] font-bold transition ${
                includeExtras
                  ? "border-fuchsia-400/55 bg-fuchsia-500/20 text-fuchsia-200"
                  : "border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white"
              }`}
              title="Добавить секретки Update 21 и коллекционные эксклюзивы"
            >
              {includeExtras ? "+ U21/Экскл ✓" : "+ U21/Экскл"}
            </button>
          </div>

          {/* Compact Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск: Vegito, Рукия, Aizen, Ainz, Kansai..."
              className="w-full rounded-xl border border-slate-800 bg-[#060911] py-1.5 pr-7 pl-8 text-xs text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Очистить поиск"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scrollable Compact List (max-h-[540px]) */}
          <div className="max-h-[540px] space-y-1.5 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4 text-center text-xs text-slate-400">
                По фильтру юниты не найдены
              </div>
            ) : (
              items.map((entry) => {
                const rowKey = `${entry.rankCode}:${entry.name}`;
                const isExpanded = expandedKey === rowKey;
                const displayDps =
                  dpsMode === "unique"
                    ? entry.uniqueDpsLv100
                    : entry.divineFullCapDpsLv100;
                const ratioInfo = getDpsPerValueInfo(entry);
                const effectiveValue = getEffectiveUnitValue(entry);
                const detailSlug = getDpsProfileSlug(entry);
                const capMath = getUniquePlacementMath(entry.cap);
                const aiResult = aiCache[rowKey];
                const isAiLoading = aiLoadingKey === rowKey;
                const bestUniqueRank = getBestUniqueRank(entry);

                return (
                  <div
                    key={rowKey}
                    className={`rounded-xl border transition ${
                      isExpanded
                        ? "border-cyan-500/45 bg-[#0a1223]"
                        : "border-slate-800/80 bg-[#070b14]/90 hover:border-slate-700"
                    }`}
                  >
                    {/* Compact ~44px row button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedKey((prev) =>
                          prev === rowKey ? null : rowKey
                        )
                      }
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
                    >
                      {/* Left: Rank & Delta */}
                      <div className="flex shrink-0 flex-col items-start">
                        <span className="font-mono-num rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-300">
                          {sortMode === "best_unique"
                            ? `#${bestUniqueRank}`
                            : entry.rankCode}
                        </span>
                        <div className="mt-0.5">
                          <DpsDeltaBadge delta={entry.rankDelta} />
                        </div>
                      </div>

                      {/* Center: Name + Tier + Cap + Element */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-white">
                          {entry.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                          <span
                            className={`rounded border px-1 py-0 text-[9px] font-extrabold ${getDpsTierBadgeClass(
                              entry.tier as DpsTier
                            )}`}
                          >
                            {entry.tier}
                          </span>
                          <span className="font-mono-num">Cap {entry.cap}</span>
                          <DpsElementIcon
                            element={entry.element}
                            hitsAir={entry.hitsAir}
                          />
                        </div>
                      </div>

                      {/* Right: Tabular DPS + Value / Ratio */}
                      <div className="shrink-0 text-right">
                        <div className="font-mono-num tabular-nums text-xs font-extrabold text-amber-300">
                          {formatDpsNumber(displayDps)}
                        </div>
                        <div className="font-mono-num tabular-nums text-[10px] text-slate-400">
                          {sortMode === "dps_per_value" && ratioInfo !== null ? (
                            <span
                              className={`font-semibold ${
                                ratioInfo.isEstimated
                                  ? "text-amber-300"
                                  : "text-violet-300"
                              }`}
                            >
                              {ratioInfo.isEstimated ? "~" : ""}
                              {formatDpsNumber(ratioInfo.ratio)} /Val
                            </span>
                          ) : effectiveValue.value > 0 ? (
                            effectiveValue.isEstimated ? (
                              <span
                                className="font-semibold text-violet-300"
                                title="Примерная прогнозная цена (Без трейда)"
                              >
                                ~{effectiveValue.value.toLocaleString("en-US")} Val*
                              </span>
                            ) : (
                              `${effectiveValue.value.toLocaleString("en-US")} Val`
                            )
                          ) : (
                            <span className="text-slate-500">No Trade</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expandable Mini-Accordion */}
                    {isExpanded && (
                      <div className="space-y-2 border-t border-slate-800/80 px-3 py-2.5 text-[11px]">
                        <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                          <div className="rounded-lg bg-[#060911] px-2 py-1">
                            <span className="text-slate-500">SPA / Range: </span>
                            <strong className="font-mono-num text-white">
                              {entry.spa}s / {entry.range}
                            </strong>
                          </div>
                          <div className="rounded-lg bg-[#060911] px-2 py-1">
                            <span className="text-slate-500">Прокачка: </span>
                            <strong className="font-mono-num text-white">
                              {entry.costYen.toLocaleString("ru-RU")}¥
                            </strong>
                          </div>
                          <div className="col-span-2 rounded-lg bg-[#060911] px-2 py-1">
                            <span className="text-slate-500">AoE: </span>
                            <strong className="text-slate-200">
                              {entry.aoeType}
                            </strong>
                            {ratioInfo !== null && (
                              <span className="ml-2 font-semibold text-violet-300">
                                · {ratioInfo.isEstimated ? "~" : ""}
                                {formatDpsNumber(ratioInfo.ratio)} DPS / 1 Val
                              </span>
                            )}
                          </div>
                        </div>

                        {effectiveValue.isEstimated && effectiveValue.value > 0 && (
                          <div className="rounded-lg border border-violet-500/35 bg-violet-500/12 px-2 py-1.5 text-[10px] leading-relaxed text-violet-100">
                            <span className="font-bold text-amber-200">
                              Без трейда · Прогноз ~{effectiveValue.value.toLocaleString("en-US")} Val
                              {effectiveValue.range ? ` (${effectiveValue.range})` : ""}:
                            </span>{" "}
                            {effectiveValue.note}
                          </div>
                        )}

                        {entry.uniquePeakDpsLv100 && (
                          <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-semibold text-fuchsia-200">
                            Пик под баффами и жертвой 2551%:{" "}
                            <span className="font-mono-num">
                              {formatDpsNumber(entry.uniquePeakDpsLv100)} DPS
                            </span>
                          </div>
                        )}

                        <p className="leading-relaxed text-slate-300">
                          {entry.passiveSummary}
                        </p>

                        <p className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-2 py-1 text-[10px] text-amber-200">
                          {capMath.headline}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => void handleRunInlineAi(entry, rowKey)}
                            disabled={isAiLoading}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1.5 text-[11px] font-bold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-60"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                            <span>
                              {isAiLoading
                                ? "Анализ..."
                                : "Полный AI-разбор Gemini"}
                            </span>
                          </button>

                          <Link
                            href={`/units/${detailSlug}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-200"
                          >
                            <span>Карточка</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>

                        {aiErrorKey === rowKey && (
                          <p className="text-[10px] text-rose-300">
                            Не удалось получить разбор — попробуйте позже.
                          </p>
                        )}

                        {aiResult && (
                          <div className="space-y-1.5 rounded-xl border border-violet-500/30 bg-[#060911] p-2.5 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-violet-200">
                                {aiResult.verdictLabel}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                <Cpu className="h-3 w-3" />
                                {aiResult.source === "gemini"
                                  ? "Gemini"
                                  : "AI Fallback"}
                              </span>
                            </div>
                            {aiResult.dpsAnalysis && (
                              <>
                                <p className="text-slate-300">
                                  <strong className="text-amber-300">
                                    Unique:
                                  </strong>{" "}
                                  {aiResult.dpsAnalysis.uniqueEfficiency}
                                </p>
                                <p className="text-slate-300">
                                  <strong className="text-emerald-300">
                                    DPS/Value:
                                  </strong>{" "}
                                  {aiResult.dpsAnalysis.dpsToValueVerdict}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer quick link to dedicated Unique DPS Tier List category */}
          {onOpenFullCategory && (
            <button
              type="button"
              onClick={onOpenFullCategory}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <span>Открыть полный Unique DPS Tier List (№1 → до конца)</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
