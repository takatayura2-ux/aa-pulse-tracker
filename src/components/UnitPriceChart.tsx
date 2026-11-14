"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Info } from "lucide-react";
import { formatValue, getTrendMeta } from "@/lib/unit-formatting";
import type { PriceHistoryPoint, TrendStatus } from "@/types/unit";

type RangeOption = 7 | 30 | 90;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PriceHistoryPoint;
  }>;
  isCollectorUnpriced: boolean;
}

function ChartTooltip({
  active,
  payload,
  isCollectorUnpriced,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-700/90 bg-[#070b14]/95 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-md">
      <div className="mb-1.5 font-semibold text-slate-300">{point.date}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">
            {isCollectorUnpriced ? "Оценочный индекс:" : "Value:"}
          </span>
          <span className="font-mono-num font-bold text-cyan-300">
            {formatValue(point.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Demand:</span>
          <span className="font-mono-num font-bold text-emerald-300">
            {point.demand} / 10
          </span>
        </div>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

export function UnitPriceChart({
  history,
  trend,
  isCollectorUnpriced,
}: {
  history: PriceHistoryPoint[];
  trend: TrendStatus;
  isCollectorUnpriced: boolean;
}) {
  const [range, setRange] = useState<RangeOption>(30);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const sliced = useMemo(() => {
    if (history.length <= range) return history;
    return history.slice(history.length - range);
  }, [history, range]);

  const stats = useMemo(() => {
    if (sliced.length === 0) {
      return { min: 0, max: 0, delta: 0, deltaPct: 0 };
    }
    const values = sliced.map((p) => p.value);
    const first = values[0];
    const last = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const delta = last - first;
    const deltaPct = first > 0 ? Math.round((delta / first) * 1000) / 10 : 0;
    return { min, max, delta, deltaPct };
  }, [sliced]);

  const trendMeta = getTrendMeta(trend);
  const strokeColor = trendMeta.accentHex;
  const isSimulated = sliced.some((p) => p.isSimulated);
  const gradientId = `aa-chart-grad-${trend.toLowerCase()}`;

  return (
    <section className="rounded-3xl border border-slate-800/90 bg-[#0b101b]/95 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              История изменения цены (Value)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isCollectorUnpriced
              ? "У юнита договорная цена (N/A) — показан ориентировочный индекс коллекционной редкости."
              : isSimulated
                ? "Траектория сведена к актуальному Value из таблицы (подключите Supabase для записи ежедневных снимков)."
                : "Исторические данные из снимков базы Supabase."}
          </p>
        </div>

        <div className="inline-flex self-start rounded-xl border border-slate-800 bg-[#060911] p-1">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days)}
              className={`font-mono-num rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                range === days
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {days}Д
            </button>
          ))}
        </div>
      </div>

      {/* Period summary KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800/70 bg-[#070b14] px-3.5 py-2.5">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Минимум ({range}д)
          </span>
          <span className="font-mono-num mt-0.5 block text-sm font-bold text-slate-200">
            {formatValue(stats.min)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-[#070b14] px-3.5 py-2.5">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Максимум ({range}д)
          </span>
          <span className="font-mono-num mt-0.5 block text-sm font-bold text-slate-200">
            {formatValue(stats.max)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-[#070b14] px-3.5 py-2.5">
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Изменение
          </span>
          <span
            className={`font-mono-num mt-0.5 block text-sm font-bold ${
              stats.delta > 0
                ? "text-emerald-400"
                : stats.delta < 0
                  ? "text-rose-400"
                  : "text-slate-300"
            }`}
          >
            {stats.delta > 0 ? "+" : ""}
            {formatValue(stats.delta)} ({stats.deltaPct > 0 ? "+" : ""}
            {stats.deltaPct}%)
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="mt-5 h-[290px] w-full min-w-0">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900/60" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sliced}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.38} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={58}
                domain={["auto", "auto"]}
                tickFormatter={(val: number) =>
                  val >= 1000
                    ? `${(val / 1000).toFixed(1).replace(/\.0$/, "")}k`
                    : `${val}`
                }
              />
              <Tooltip
                content={
                  <ChartTooltip isCollectorUnpriced={isCollectorUnpriced} />
                }
                cursor={{
                  stroke: "rgba(148, 163, 184, 0.3)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#06080f",
                  fill: strokeColor,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {isSimulated && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            Для реальной дневной истории настройте Supabase (`supabase/schema.sql`)
            и вызывайте синхронизацию `/api/sync-supabase`.
          </span>
        </div>
      )}
    </section>
  );
}
