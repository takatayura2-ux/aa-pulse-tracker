"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Layers,
  Cpu,
  AlertCircle,
  Swords,
  Zap,
  Scale,
} from "lucide-react";
import { formatDpsNumber } from "@/data/dpsTierList";
import type { AiUnitAnalysis, AnalysisVerdict, Unit } from "@/types/unit";

function getVerdictStyle(verdict: AnalysisVerdict) {
  switch (verdict) {
    case "BUY":
      return {
        box: "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
        bar: "bg-emerald-400",
      };
    case "SELL":
      return {
        box: "border-rose-500/40 bg-rose-500/12 text-rose-200",
        bar: "bg-rose-400",
      };
    case "CAUTION":
      return {
        box: "border-amber-500/40 bg-amber-500/12 text-amber-200",
        bar: "bg-amber-400",
      };
    case "HOLD":
    default:
      return {
        box: "border-cyan-500/40 bg-cyan-500/12 text-cyan-200",
        bar: "bg-cyan-400",
      };
  }
}

export function GeminiAnalysisPanel({ unit }: { unit: Unit }) {
  const [analysis, setAnalysis] = useState<AiUnitAnalysis | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/analyze-unit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: unit.slug,
        unit,
        forceRefresh: false,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Ошибка сервера (${res.status})`);
        }
        return (await res.json()) as {
          analysis: AiUnitAnalysis;
          geminiConfigured: boolean;
        };
      })
      .then((data) => {
        setAnalysis(data.analysis);
        setGeminiConfigured(data.geminiConfigured);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить AI-аналитику"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [unit]);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: unit.slug,
          unit,
          forceRefresh: true,
        }),
      });
      if (!res.ok) {
        throw new Error(`Ошибка сервера (${res.status})`);
      }
      const data = (await res.json()) as {
        analysis: AiUnitAnalysis;
        geminiConfigured: boolean;
      };
      setAnalysis(data.analysis);
      setGeminiConfigured(data.geminiConfigured);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить AI-аналитику"
      );
    } finally {
      setLoading(false);
    }
  }

  const verdictStyle = analysis
    ? getVerdictStyle(analysis.verdict)
    : getVerdictStyle("HOLD");

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-[#0e1324] via-[#0b101b] to-[#130d24] p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />

      {/* Header */}
      <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.25)]">
            <Sparkles className="h-5 w-5 text-violet-200" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              AI Аналитика рынка от Gemini
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>API: /api/analyze-unit</span>
              <span>·</span>
              {analysis?.source === "gemini" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                  <Cpu className="h-3 w-3" />
                  Live Gemini ({analysis.model || "gemini-2.5-flash"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-amber-300">
                  <Cpu className="h-3 w-3" />
                  {geminiConfigured
                    ? "Fallback-режим"
                    : "Умный локальный разбор (добавьте GEMINI_API_KEY в .env.local)"}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-violet-400/35 bg-violet-500/15 px-3.5 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>{loading ? "Анализируем..." : "Обновить AI разбор"}</span>
        </button>
      </div>

      {/* Content */}
      {loading && !analysis ? (
        <div className="mt-6 space-y-3">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-800/60" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-2xl bg-slate-800/50" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-800/50" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-800/50" />
          </div>
        </div>
      ) : error ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : analysis ? (
        <div className="relative mt-5 space-y-4">
          {/* Verdict & Key Drivers */}
          <div
            className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${verdictStyle.box}`}
          >
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">
                Торговый сигнал
              </span>
              <div className="mt-0.5 text-lg font-extrabold">
                {analysis.verdictLabel}
              </div>
              {analysis.keyDrivers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.keyDrivers.map((driver) => (
                    <span
                      key={driver}
                      className="rounded-md border border-white/15 bg-black/25 px-2 py-0.5 text-[11px] font-medium"
                    >
                      {driver}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-[140px]">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span>Уверенность</span>
                <span className="font-mono-num">{analysis.confidence}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/35">
                <div
                  className={`h-full rounded-full ${verdictStyle.bar}`}
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3 Structured Analysis Sections */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300 uppercase">
                <Layers className="h-4 w-4" />
                <span>Почему такая цена</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {analysis.whyThisPrice}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-violet-300 uppercase">
                <ShieldAlert className="h-4 w-4" />
                <span>Текущая мета</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {analysis.currentMeta}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-300 uppercase">
                <TrendingUp className="h-4 w-4" />
                <span>Прогноз роста</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {analysis.growthForecast}
              </p>
            </div>
          </div>

          {/* Combat DPS & Unique Cap Breakdown */}
          {analysis.dpsAnalysis && (
            <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300 uppercase">
                  <Swords className="h-4 w-4" />
                  <span>Боевой DPS-разбор (Update 21)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg border border-cyan-500/35 bg-cyan-500/12 px-2.5 py-0.5 font-bold text-cyan-200">
                    {analysis.dpsAnalysis.combatRank}
                  </span>
                  {typeof analysis.dpsAnalysis.uniqueDpsLv100 === "number" && (
                    <span className="font-mono-num rounded-lg border border-amber-500/35 bg-amber-500/12 px-2.5 py-0.5 font-bold text-amber-200">
                      Unique: {formatDpsNumber(analysis.dpsAnalysis.uniqueDpsLv100)} DPS
                    </span>
                  )}
                  {typeof analysis.dpsAnalysis.divineFullCapDpsLv100 === "number" &&
                    typeof analysis.dpsAnalysis.placementCap === "number" && (
                      <span className="font-mono-num rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-semibold text-slate-300">
                        {analysis.dpsAnalysis.placementCap}× Divine:{" "}
                        {formatDpsNumber(analysis.dpsAnalysis.divineFullCapDpsLv100)}
                      </span>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800/80 bg-[#0b101b] p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Эффективность Unique и Placement Cap</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {analysis.dpsAnalysis.uniqueEfficiency}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-[#0b101b] p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                    <Scale className="h-3.5 w-3.5" />
                    <span>Окупаемость DPS к цене (Value)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {analysis.dpsAnalysis.dpsToValueVerdict}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
