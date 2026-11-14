"use client";

import React from "react";
import Link from "next/link";
import { Plus, Scale, ArrowRight } from "lucide-react";
import { useTrade } from "@/components/TradeProvider";
import type { Unit } from "@/types/unit";

export function UnitDetailActions({ unit }: { unit: Unit }) {
  const { addToSide } = useTrade();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => addToSide("offer", unit)}
        className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/25"
      >
        <Plus className="h-4 w-4" />
        <span>В Ваше предложение</span>
      </button>
      <button
        type="button"
        onClick={() => addToSide("request", unit)}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3.5 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-500/25"
      >
        <Plus className="h-4 w-4" />
        <span>В Их предложение</span>
      </button>
      <Link
        href="/calculator"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/70 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
      >
        <Scale className="h-4 w-4" />
        <span>Открыть калькулятор</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
