"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Copy,
  ArrowLeftRight,
  Trash2,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Wand2,
} from "lucide-react";
import { evaluateTrade, MAX_TRADE_SLOTS } from "@/lib/trade-utils";
import { formatValue, getDemandInfo } from "@/lib/unit-formatting";
import { ShinyBadge, TierBadge } from "@/components/UnitBadges";
import { useTrade, type TradeSide } from "@/components/TradeProvider";
import type { Tier, Unit } from "@/types/unit";

interface PickerTarget {
  side: TradeSide;
  slotIndex: number;
}

export function TradeCalculator({ units }: { units: Unit[] }) {
  const {
    offerSlots,
    requestSlots,
    setSlot,
    duplicateSlot,
    swapSides,
    clearSide,
    clearAll,
    loadSampleTrade,
  } = useTrade();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTier, setPickerTier] = useState<"ALL" | Tier>("ALL");
  const [pickerShinyOnly, setPickerShinyOnly] = useState(false);

  const offerUnits = useMemo(
    () => offerSlots.filter((u): u is Unit => u !== null),
    [offerSlots]
  );
  const requestUnits = useMemo(
    () => requestSlots.filter((u): u is Unit => u !== null),
    [requestSlots]
  );

  const evaluation = useMemo(
    () => evaluateTrade(offerUnits, requestUnits),
    [offerUnits, requestUnits]
  );

  const pickerFiltered = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return units.filter((u) => {
      if (pickerTier !== "ALL" && u.tier !== pickerTier) return false;
      if (pickerShinyOnly && !u.isShiny) return false;
      if (q) {
        const hay = `${u.name} ${u.gameName} ${u.animeName} ${u.subTier}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [units, pickerSearch, pickerTier, pickerShinyOnly]);

  const totalCombined =
    evaluation.offer.totalValue + evaluation.request.totalValue;
  const offerBarPct =
    totalCombined > 0
      ? Math.round((evaluation.offer.totalValue / totalCombined) * 100)
      : 50;
  const requestBarPct = 100 - offerBarPct;

  const verdictStyles = {
    WIN: {
      border: "border-emerald-500/50",
      bg: "bg-gradient-to-r from-emerald-500/18 via-emerald-500/8 to-cyan-500/12",
      badge: "bg-emerald-500 text-slate-950",
      text: "text-emerald-300",
    },
    FAIR: {
      border: "border-cyan-500/45",
      bg: "bg-gradient-to-r from-cyan-500/15 via-slate-900/40 to-indigo-500/15",
      badge: "bg-cyan-400 text-slate-950",
      text: "text-cyan-300",
    },
    LOSE: {
      border: "border-rose-500/50",
      bg: "bg-gradient-to-r from-rose-500/18 via-rose-500/8 to-amber-500/10",
      badge: "bg-rose-500 text-white",
      text: "text-rose-300",
    },
    EMPTY: {
      border: "border-slate-800",
      bg: "bg-[#0b101b]",
      badge: "bg-slate-700 text-slate-200",
      text: "text-slate-300",
    },
  }[evaluation.verdict];

  function handleSelectUnit(unit: Unit) {
    if (!pickerTarget) return;
    setSlot(pickerTarget.side, pickerTarget.slotIndex, unit);
    setPickerTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <Scale className="h-3.5 w-3.5" />
            <span>9 × 9 Trade Simulator</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Калькулятор трейдов{" "}
            <span className="text-cyan-400">Win / Fair / Lose</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            До 9 слотов с каждой стороны · автоматический подсчёт суммарного Value,
            эквивалента в рероллах и среднего Demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadSampleTrade(units)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3.5 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/25"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>Пример трейда</span>
          </button>
          <button
            type="button"
            onClick={swapSides}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-white"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Поменять стороны</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Очистить всё</span>
          </button>
        </div>
      </div>

      {/* Verdict Banner */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 transition ${verdictStyles.border} ${verdictStyles.bg}`}
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono-num rounded-lg px-3 py-1 text-xs font-black tracking-widest uppercase ${verdictStyles.badge}`}
              >
                {evaluation.verdict}
              </span>
              <h2 className={`text-xl font-extrabold ${verdictStyles.text}`}>
                {evaluation.verdictLabel}
              </h2>
            </div>
            <p className="text-sm text-slate-200">
              {evaluation.verdictDescription}
            </p>
          </div>

          {/* Diff pills */}
          <div className="grid grid-cols-3 gap-2.5 sm:min-w-[340px]">
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Разница Value
              </span>
              <span
                className={`font-mono-num mt-0.5 block text-sm font-extrabold ${
                  evaluation.valueDiff > 0
                    ? "text-emerald-300"
                    : evaluation.valueDiff < 0
                      ? "text-rose-300"
                      : "text-slate-200"
                }`}
              >
                {evaluation.valueDiff > 0 ? "+" : ""}
                {formatValue(evaluation.valueDiff)}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Отклонение
              </span>
              <span
                className={`font-mono-num mt-0.5 block text-sm font-extrabold ${
                  evaluation.valueDiffPercent > 0
                    ? "text-emerald-300"
                    : evaluation.valueDiffPercent < 0
                      ? "text-rose-300"
                      : "text-slate-200"
                }`}
              >
                {evaluation.valueDiffPercent > 0 ? "+" : ""}
                {evaluation.valueDiffPercent}%
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Δ Ср. Demand
              </span>
              <span
                className={`font-mono-num mt-0.5 block text-sm font-extrabold ${
                  evaluation.demandDiff > 0
                    ? "text-emerald-300"
                    : evaluation.demandDiff < 0
                      ? "text-rose-300"
                      : "text-slate-200"
                }`}
              >
                {evaluation.demandDiff > 0 ? "+" : ""}
                {evaluation.demandDiff.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Progress Bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-slate-400">
            <span>
              Ваше предложение ({offerBarPct}%)
            </span>
            <span>
              Их предложение ({requestBarPct}%)
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-900/90 p-0.5">
            <div
              className="h-full rounded-l-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300"
              style={{ width: `${offerBarPct}%` }}
            />
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${requestBarPct}%` }}
            />
          </div>
        </div>

        {/* Warnings */}
        {evaluation.warnings.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {evaluation.warnings.map((warn) => (
              <div
                key={warn}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Two-Sided 9-Slot Trade Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TradeSidePanel
          title="Ваше предложение (You Offer)"
          accent="cyan"
          side="offer"
          slots={offerSlots}
          summary={evaluation.offer}
          onSlotClick={(idx) =>
            setPickerTarget({ side: "offer", slotIndex: idx })
          }
          onRemove={(idx) => setSlot("offer", idx, null)}
          onDuplicate={(idx) => duplicateSlot("offer", idx)}
          onClearSide={() => clearSide("offer")}
        />

        <TradeSidePanel
          title="Их предложение (They Offer)"
          accent="violet"
          side="request"
          slots={requestSlots}
          summary={evaluation.request}
          onSlotClick={(idx) =>
            setPickerTarget({ side: "request", slotIndex: idx })
          }
          onRemove={(idx) => setSlot("request", idx, null)}
          onDuplicate={(idx) => duplicateSlot("request", idx)}
          onClearSide={() => clearSide("request")}
        />
      </div>

      {/* Unit Picker Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700/90 bg-[#090d18] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Выбрать персонажа ·{" "}
                  <span className="text-cyan-300">
                    {pickerTarget.side === "offer"
                      ? "Ваше предложение"
                      : "Их предложение"}{" "}
                    (Слот #{pickerTarget.slotIndex + 1})
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 border-b border-slate-800/80 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Поиск по имени, аниме или тиру..."
                  className="w-full rounded-xl border border-slate-700 bg-[#050811] py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(["ALL", "New", "S", "A", "B", "C"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setPickerTier(tier)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        pickerTier === tier
                          ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tier === "ALL" ? "Все" : tier}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerShinyOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                    pickerShinyOnly
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-200"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Только Shiny</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {pickerFiltered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Никого не найдено по запросу
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pickerFiltered.map((unit) => (
                    <button
                      key={unit.slug}
                      type="button"
                      onClick={() => handleSelectUnit(unit)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#0d1322] p-3 text-left transition hover:border-cyan-400/60 hover:bg-cyan-500/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <TierBadge tier={unit.tier} subTier={unit.subTier} />
                          {unit.isShiny && <ShinyBadge compact />}
                        </div>
                        <div className="mt-1.5 truncate text-sm font-bold text-white">
                          {unit.gameName}
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {unit.animeName !== unit.gameName
                            ? unit.animeName
                            : unit.information}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono-num text-sm font-extrabold text-cyan-300">
                          {unit.valueDisplay}
                        </div>
                        <div className="font-mono-num text-[11px] text-slate-400">
                          Dem: {unit.demand}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TradeSidePanel({
  title,
  accent,
  slots,
  summary,
  onSlotClick,
  onRemove,
  onDuplicate,
  onClearSide,
}: {
  title: string;
  accent: "cyan" | "violet";
  side: TradeSide;
  slots: (Unit | null)[];
  summary: ReturnType<typeof evaluateTrade>["offer"];
  onSlotClick: (idx: number) => void;
  onRemove: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onClearSide: () => void;
}) {
  const accentBorder =
    accent === "cyan" ? "border-cyan-500/30" : "border-violet-500/30";
  const accentText = accent === "cyan" ? "text-cyan-300" : "text-violet-300";
  const demandMeta = getDemandInfo(summary.averageDemand);

  return (
    <section
      className={`rounded-3xl border bg-[#0b101b]/95 p-4 sm:p-5 ${accentBorder}`}
    >
      {/* Header + Totals */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 pb-4">
        <div>
          <h2 className={`text-base font-bold ${accentText}`}>{title}</h2>
          <p className="text-xs text-slate-400">
            Заполнено слотов:{" "}
            <span className="font-mono-num font-bold text-white">
              {summary.slotsCount} / {MAX_TRADE_SLOTS}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClearSide}
          disabled={summary.slotsCount === 0}
          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-slate-700 hover:text-white disabled:opacity-40"
        >
          Очистить сторону
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-3">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Суммарное Value
          </span>
          <span className="font-mono-num mt-1 block text-lg font-extrabold text-white">
            {formatValue(summary.totalValue)}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-3">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Средний Demand
          </span>
          <span
            className={`font-mono-num mt-1 block text-lg font-extrabold ${
              summary.slotsCount > 0 ? demandMeta.colorClass : "text-slate-400"
            }`}
          >
            {summary.slotsCount > 0
              ? `${summary.averageDemand.toFixed(2)} / 10`
              : "0.00 / 10"}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-3">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            В рероллах
          </span>
          <span className="font-mono-num mt-1 block text-lg font-extrabold text-cyan-300">
            {summary.rerollsEquivalent} RR
          </span>
        </div>
      </div>

      {/* 3x3 Slot Grid (9 Slots) */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {slots.map((unit, idx) => {
          if (!unit) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSlotClick(idx)}
                className="group flex min-h-[126px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-700/80 bg-[#070b14]/60 p-3 text-slate-500 transition hover:border-cyan-400/60 hover:bg-cyan-500/8 hover:text-cyan-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 transition group-hover:border-cyan-500/40">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold">
                  Слот {idx + 1}
                </span>
              </button>
            );
          }

          return (
            <div
              key={`${unit.slug}-${idx}`}
              className="relative flex min-h-[126px] flex-col justify-between rounded-2xl border border-slate-700/90 bg-[#0e1424] p-2.5 transition hover:border-slate-500"
            >
              <div className="flex items-start justify-between gap-1">
                <TierBadge tier={unit.tier} subTier={unit.subTier} />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDuplicate(idx)}
                    title="Дублировать в свободный слот"
                    className="rounded-md bg-slate-800/90 p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    title="Удалить из слота"
                    className="rounded-md bg-rose-500/15 p-1 text-rose-300 hover:bg-rose-500/30"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSlotClick(idx)}
                className="my-1.5 text-left"
                title="Нажмите, чтобы заменить персонажа"
              >
                <div className="line-clamp-2 text-xs leading-snug font-bold text-white hover:text-cyan-300">
                  {unit.gameName}
                </div>
                {unit.isShiny && (
                  <span className="mt-0.5 inline-block text-[10px] font-bold text-amber-300">
                    ✦ SHINY
                  </span>
                )}
              </button>

              <div className="flex items-center justify-between border-t border-slate-800/90 pt-1.5 text-[11px]">
                <span className="font-mono-num font-bold text-cyan-300">
                  {unit.valueDisplay}
                </span>
                <span className="font-mono-num text-slate-400">
                  D:{unit.demand}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick tip */}
      {summary.slotsCount > 0 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
            Нажмите на карточку внутри слота для замены персонажа
          </span>
          <Link href="/" className="text-cyan-400 hover:underline">
            К каталогу →
          </Link>
        </div>
      )}
    </section>
  );
}
