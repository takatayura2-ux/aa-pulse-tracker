"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Flame,
  Sparkles,
  LayoutGrid,
  Table2,
  SlidersHorizontal,
  ArrowUpRight,
  Plus,
  X,
  Database,
  Swords,
} from "lucide-react";
import {
  formatRerolls,
  getDemandInfo,
} from "@/lib/unit-formatting";
import { ShinyBadge, TierBadge, TrendBadge } from "@/components/UnitBadges";
import { UnitCard } from "@/components/UnitCard";
import { useTrade } from "@/components/TradeProvider";
import { CompactDpsLadder } from "@/components/CompactDpsLadder";
import { DpsTierListFullView } from "@/components/DpsTierListFullView";
import { ALL_DPS_PROFILES } from "@/data/dpsTierList";
import type { MarketSnapshot, Tier, Unit } from "@/types/unit";

type TrackerTab = "all" | "rising" | "dropping" | "new" | "dps_top";
type DemandFilter = "all" | "very_high" | "high" | "average_plus" | "low";
type SortOption =
  | "rank"
  | "value_desc"
  | "value_asc"
  | "demand_desc"
  | "name_asc";

export function UnitTrackerDashboard({
  initialSnapshot,
}: {
  initialSnapshot: MarketSnapshot;
}) {
  const { addToSide } = useTrade();
  const [snapshot, setSnapshot] = useState<MarketSnapshot>(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TrackerTab>("all");
  const [strictRisingOnly, setStrictRisingOnly] = useState(false);
  const [strictDroppingOnly, setStrictDroppingOnly] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [demandFilter, setDemandFilter] = useState<DemandFilter>("all");
  const [shinyOnly, setShinyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  async function handleRefreshCsv() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/units?refresh=1");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const next = (await res.json()) as MarketSnapshot;
      setSnapshot(next);
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : "Не удалось обновить CSV"
      );
    } finally {
      setRefreshing(false);
    }
  }

  const risingMomentumCount =
    snapshot.stats.risingCount + snapshot.stats.hypedCount;
  const droppingWatchCount =
    snapshot.stats.decliningCount +
    snapshot.stats.overpricedCount +
    snapshot.stats.unstableCount;
  const newUnitsCount = useMemo(
    () => snapshot.units.filter((u) => u.tier === "New").length,
    [snapshot.units]
  );

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = snapshot.units.filter((u) => {
      // Tab filter
      if (activeTab === "rising") {
        if (strictRisingOnly) {
          if (u.trend !== "Rising") return false;
        } else {
          if (u.trend !== "Rising" && u.trend !== "Hyped") return false;
        }
      } else if (activeTab === "dropping") {
        if (strictDroppingOnly) {
          if (u.trend !== "Declining") return false;
        } else {
          if (
            u.trend !== "Declining" &&
            u.trend !== "Overpriced" &&
            u.trend !== "Unstable"
          ) {
            return false;
          }
        }
      } else if (activeTab === "new") {
        if (u.tier !== "New") return false;
      }

      // Tier filter
      if (tierFilter !== "ALL" && u.tier !== tierFilter) {
        return false;
      }

      // Shiny filter
      if (shinyOnly && !u.isShiny) {
        return false;
      }

      // Demand filter
      if (demandFilter === "very_high" && u.demand < 8.5) return false;
      if (demandFilter === "high" && u.demand < 6.5) return false;
      if (demandFilter === "average_plus" && u.demand < 5.0) return false;
      if (demandFilter === "low" && u.demand >= 4.5) return false;

      // Search
      if (q) {
        const hay = `${u.name} ${u.gameName} ${u.animeName} ${u.subTier} ${u.trend} ${u.information}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...matches];
    sorted.sort((a, b) => {
      if (activeTab === "rising" && sortBy === "rank") {
        const score = (u: Unit) => (u.trend === "Rising" ? 2 : 1);
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        if (b.demand !== a.demand) return b.demand - a.demand;
        return (b.value ?? 999999) - (a.value ?? 999999);
      }
      if (activeTab === "dropping" && sortBy === "rank") {
        const score = (u: Unit) =>
          u.trend === "Declining" ? 3 : u.trend === "Overpriced" ? 2 : 1;
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return (b.value ?? 999999) - (a.value ?? 999999);
      }

      switch (sortBy) {
        case "value_desc":
          return (b.value ?? 9999999) - (a.value ?? 9999999);
        case "value_asc":
          return (a.value ?? 9999999) - (b.value ?? 9999999);
        case "demand_desc":
          return b.demand - a.demand || (b.value ?? 0) - (a.value ?? 0);
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "rank":
        default:
          return a.rank - b.rank;
      }
    });

    return sorted;
  }, [
    snapshot.units,
    activeTab,
    strictRisingOnly,
    strictDroppingOnly,
    tierFilter,
    shinyOnly,
    demandFilter,
    searchQuery,
    sortBy,
  ]);

  function resetFilters() {
    setSearchQuery("");
    setTierFilter("ALL");
    setDemandFilter("all");
    setShinyOnly(false);
    setSortBy("rank");
    setStrictRisingOnly(false);
    setStrictDroppingOnly(false);
  }

  return (
    <div className="space-y-6">
      {/* Hero + Market Telemetry */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-[#0c1222] via-[#090d18] to-[#110c21] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              <Database className="h-3.5 w-3.5" />
              <span>
                Live CSV Sync ·{" "}
                {snapshot.lastSheetUpdate
                  ? `Обновлено в таблице: ${snapshot.lastSheetUpdate}`
                  : "Синхронизация с Google Таблицей"}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              Мониторинг{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                Value &amp; Demand
              </span>{" "}
              Anime Adventures
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300/90 sm:text-base">
              Живой парсер публичного прайс-листа, графики истории цены, AI-разбор
              от Gemini и калькулятор выгодности трейдов W / F / L на 9 слотов.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshCsv}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>{refreshing ? "Обновление CSV..." : "Обновить из CSV"}</span>
            </button>
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(6,182,212,0.3)] transition hover:brightness-110"
            >
              <span>Калькулятор W/F/L</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {refreshError && (
          <p className="mt-3 text-xs text-rose-400">
            Ошибка обновления: {refreshError}
          </p>
        )}

        {/* KPI Cards */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800/80 bg-[#080c16]/80 p-3.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Персонажей в базе
            </span>
            <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-extrabold text-white">
              {snapshot.stats.totalUnits}
              <span className="text-xs font-medium text-amber-300">
                {snapshot.stats.shinyCount} Shiny
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#080c16]/80 p-3.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Средний Demand
            </span>
            <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-extrabold text-cyan-300">
              {snapshot.stats.averageDemand.toFixed(2)}
              <span className="text-xs font-medium text-slate-400">/ 10</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-[#080c16]/80 p-3.5">
            <span className="text-[11px] font-semibold tracking-wider text-emerald-300/80 uppercase">
              Рост / Хайп
            </span>
            <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-extrabold text-emerald-300">
              {risingMomentumCount}
              <span className="text-xs font-medium text-slate-400">
                Rising {snapshot.stats.risingCount} · Hyped{" "}
                {snapshot.stats.hypedCount}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-[#080c16]/80 p-3.5">
            <span className="text-[11px] font-semibold tracking-wider text-rose-300/80 uppercase">
              Спад / Перегрев
            </span>
            <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-extrabold text-rose-300">
              {droppingWatchCount}
              <span className="text-xs font-medium text-slate-400">
                1 RR ≈ 20 Value
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Market Tabs */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "all"
                ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(6,182,212,0.15)]"
                : "border-slate-800 bg-[#0c111d] text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span>Все персонажи</span>
            <span className="font-mono-num rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
              {snapshot.stats.totalUnits}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rising")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "rising"
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.18)]"
                : "border-slate-800 bg-[#0c111d] text-slate-300 hover:border-emerald-500/30 hover:text-emerald-200"
            }`}
          >
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span>Топ роста (Rising)</span>
            <span className="font-mono-num rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-200">
              {risingMomentumCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dropping")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "dropping"
                ? "border-rose-400/50 bg-rose-500/15 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.18)]"
                : "border-slate-800 bg-[#0c111d] text-slate-300 hover:border-rose-500/30 hover:text-rose-200"
            }`}
          >
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span>Падают в цене (Dropping)</span>
            <span className="font-mono-num rounded-md bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-200">
              {droppingWatchCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "new"
                ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                : "border-slate-800 bg-[#0c111d] text-slate-300 hover:border-violet-500/30 hover:text-violet-200"
            }`}
          >
            <Flame className="h-4 w-4 text-violet-400" />
            <span>Новые юниты</span>
            <span className="font-mono-num rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
              {newUnitsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dps_top")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === "dps_top"
                ? "border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/15 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.16)]"
                : "border-slate-800 bg-[#0c111d] text-slate-300 hover:border-amber-500/35 hover:text-amber-200"
            }`}
          >
            <Swords className="h-4 w-4 text-amber-400" />
            <span>Unique DPS Топ</span>
            <span className="font-mono-num rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-amber-200">
              {ALL_DPS_PROFILES.length}
            </span>
          </button>
        </div>

        {/* View Mode Switcher */}
        {activeTab !== "dps_top" && (
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <div className="inline-flex rounded-xl border border-slate-800 bg-[#0c111d] p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Карточки</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "table"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                <span>Таблица</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === "dps_top" ? (
        <DpsTierListFullView />
      ) : (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            {/* Sub-banner for Rising / Dropping clarity */}
      {activeTab === "rising" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-xs text-emerald-100">
          <p>
            Показаны юниты с восходящим импульсом:{" "}
            <strong>Rising ({snapshot.stats.risingCount})</strong> и{" "}
            <strong>Hyped ({snapshot.stats.hypedCount})</strong> (активный спрос
            и оверпеи в таблице).
          </p>
          <button
            type="button"
            onClick={() => setStrictRisingOnly((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 font-semibold transition ${
              strictRisingOnly
                ? "border-emerald-400 bg-emerald-500/25 text-white"
                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
          >
            {strictRisingOnly
              ? "Показан только статус Rising"
              : "Только точный статус Rising"}
          </button>
        </div>
      )}

      {activeTab === "dropping" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-xs text-rose-100">
          <p>
            Зона риска и снижения цены:{" "}
            <strong>Declining ({snapshot.stats.decliningCount})</strong>,{" "}
            <strong>Overpriced ({snapshot.stats.overpricedCount})</strong>{" "}
            (перегретая цена) и{" "}
            <strong>Unstable ({snapshot.stats.unstableCount})</strong>{" "}
            (волатильность).
          </p>
          <button
            type="button"
            onClick={() => setStrictDroppingOnly((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 font-semibold transition ${
              strictDroppingOnly
                ? "border-rose-400 bg-rose-500/25 text-white"
                : "border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            }`}
          >
            {strictDroppingOnly
              ? "Показан только статус Declining"
              : "Только точный статус Declining"}
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0b101b]/95 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Live Search */}
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Живой поиск: Aizen, Dio, Alucard, SSS, Tournament..."
              className="w-full rounded-xl border border-slate-700/80 bg-[#060911] py-2.5 pr-9 pl-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Demand Filter */}
          <div className="md:col-span-3">
            <select
              value={demandFilter}
              onChange={(e) => setDemandFilter(e.target.value as DemandFilter)}
              aria-label="Фильтр по Demand"
              className="w-full rounded-xl border border-slate-700/80 bg-[#060911] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-cyan-400"
            >
              <option value="all">Demand: Любой (0–10)</option>
              <option value="very_high">Very High (8.5 – 10)</option>
              <option value="high">High (6.5+)</option>
              <option value="average_plus">Average+ (5.0+)</option>
              <option value="low">Low (&lt; 4.5)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Сортировка"
              className="w-full rounded-xl border border-slate-700/80 bg-[#060911] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-cyan-400"
            >
              <option value="rank">По тиру (SSS → C-)</option>
              <option value="value_desc">Value: дороже → дешевле</option>
              <option value="value_asc">Value: дешевле → дороже</option>
              <option value="demand_desc">Demand: высокий → низкий</option>
              <option value="name_asc">По имени (A → Z)</option>
            </select>
          </div>

          {/* Shiny Toggle */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShinyOnly((v) => !v)}
              className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                shinyOnly
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-200"
                  : "border-slate-700/80 bg-[#060911] text-slate-300 hover:border-slate-600 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Только Shiny</span>
            </button>
          </div>
        </div>

        {/* Tier Pills + Result Counter */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Tier:
            </span>
            {(["ALL", "New", "S", "A", "B", "C"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                  tierFilter === tier
                    ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {tier === "ALL" ? "Все тиры" : `${tier} Tier`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Найдено:{" "}
              <strong className="font-mono-num text-white">
                {filteredUnits.length}
              </strong>
            </span>
            {(searchQuery ||
              tierFilter !== "ALL" ||
              demandFilter !== "all" ||
              shinyOnly ||
              strictRisingOnly ||
              strictDroppingOnly) && (
              <button
                type="button"
                onClick={resetFilters}
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Empty State */}
      {filteredUnits.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0b101b] p-10 text-center">
          <p className="text-base font-semibold text-slate-200">
            По заданным фильтрам персонажи не найдены
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Попробуйте ослабить фильтр Demand, сменить вкладку или сбросить поиск.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.slug} unit={unit} />
          ))}
        </div>
      ) : (
        /* Pro Esports Table View */
        <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0b101b]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-[#070a12] text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Персонаж</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Rerolls</th>
                  <th className="px-4 py-3">Demand</th>
                  <th className="px-4 py-3">Тренд</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredUnits.map((unit) => {
                  const dInfo = getDemandInfo(unit.demand);
                  return (
                    <tr
                      key={unit.slug}
                      className="transition hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3">
                        <TierBadge tier={unit.tier} subTier={unit.subTier} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/units/${unit.slug}`}
                            className="font-bold text-white hover:text-cyan-300"
                          >
                            {unit.gameName}
                          </Link>
                          {unit.isShiny && <ShinyBadge compact />}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {unit.animeName !== unit.gameName
                            ? `${unit.animeName} · `
                            : ""}
                          <span className="text-slate-500">
                            {unit.information}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono-num px-4 py-3 font-bold text-white">
                        {unit.valueDisplay}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-xs font-semibold text-cyan-300">
                        {formatRerolls(unit.value)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono-num text-xs font-bold ${dInfo.colorClass}`}
                          >
                            {unit.demand}/10
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${dInfo.barColor}`}
                              style={{
                                width: `${Math.min(100, Math.max(5, unit.demand * 10))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TrendBadge trend={unit.trend} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => addToSide("offer", unit)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25"
                          >
                            <Plus className="h-3 w-3" />В трейд
                          </button>
                          <Link
                            href={`/units/${unit.slug}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-200"
                          >
                            Разбор
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
          </div>

          <CompactDpsLadder onOpenFullCategory={() => setActiveTab("dps_top")} />
        </div>
      )}
    </div>
  );
}
