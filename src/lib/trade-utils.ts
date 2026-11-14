import { REROLL_VALUE_RATE } from "@/lib/unit-formatting";
import type { TradeEvaluation, TradeSideSummary, Unit } from "@/types/unit";

export const MAX_TRADE_SLOTS = 9;

function summarizeSide(units: Unit[]): TradeSideSummary {
  if (units.length === 0) {
    return {
      slotsCount: 0,
      totalValue: 0,
      averageDemand: 0,
      rerollsEquivalent: 0,
      hasUnpricedUnit: false,
      hasOverpricedUnit: false,
      hasHighDemandUnit: false,
    };
  }

  const totalValue = units.reduce((sum, u) => sum + (u.value ?? 0), 0);
  const demandSum = units.reduce((sum, u) => sum + u.demand, 0);
  const averageDemand = Math.round((demandSum / units.length) * 100) / 100;

  return {
    slotsCount: units.length,
    totalValue,
    averageDemand,
    rerollsEquivalent: Math.round((totalValue / REROLL_VALUE_RATE) * 10) / 10,
    hasUnpricedUnit: units.some((u) => u.value === null),
    hasOverpricedUnit: units.some((u) => u.trend === "Overpriced"),
    hasHighDemandUnit: units.some((u) => u.demand >= 7.5),
  };
}

export function evaluateTrade(
  offerUnits: Unit[],
  requestUnits: Unit[]
): TradeEvaluation {
  const offer = summarizeSide(offerUnits);
  const request = summarizeSide(requestUnits);
  const warnings: string[] = [];

  if (offer.hasUnpricedUnit || request.hasUnpricedUnit) {
    warnings.push(
      "В сделке есть коллекционный юнит со статусом N/A (цена договорная и не учтена в сумме)."
    );
  }
  if (
    offerUnits.some((u) => u.isUntradable || u.isEstimatedValue) ||
    requestUnits.some((u) => u.isUntradable || u.isEstimatedValue)
  ) {
    warnings.push(
      "В сделке участвует непередаваемый персонаж с примерной прогнозной ценой (~Value до открытия трейда)."
    );
  }
  if (offer.hasOverpricedUnit || request.hasOverpricedUnit) {
    warnings.push(
      "Одна из сторон содержит юнита со статусом Overpriced — рыночная цена может быть временно завышена."
    );
  }

  if (offer.slotsCount === 0 && request.slotsCount === 0) {
    return {
      verdict: "EMPTY",
      verdictLabel: "Добавьте персонажей",
      verdictDescription:
        "Выберите до 9 персонажей с каждой стороны, чтобы рассчитать выгоду трейда.",
      offer,
      request,
      valueDiff: 0,
      valueDiffPercent: 0,
      demandDiff: 0,
      rerollDiff: 0,
      warnings,
    };
  }

  // Positive valueDiff means you receive more Value than you give (WIN)
  const valueDiff = request.totalValue - offer.totalValue;
  const baseline = Math.max(offer.totalValue, request.totalValue, 1);
  const valueDiffPercent = Math.round((valueDiff / baseline) * 1000) / 10;
  const demandDiff =
    Math.round((request.averageDemand - offer.averageDemand) * 100) / 100;
  const rerollDiff =
    Math.round(((request.totalValue - offer.totalValue) / REROLL_VALUE_RATE) * 10) /
    10;

  const fairTolerance = Math.max(25, Math.round(baseline * 0.05));

  if (offer.slotsCount === 0 || request.slotsCount === 0) {
    return {
      verdict: "FAIR",
      verdictLabel: "Ожидание второй стороны",
      verdictDescription:
        "Заполните обе стороны трейда, чтобы получить точный вердикт Win / Fair / Lose.",
      offer,
      request,
      valueDiff,
      valueDiffPercent,
      demandDiff,
      rerollDiff,
      warnings,
    };
  }

  if (Math.abs(valueDiff) <= fairTolerance) {
    const demandHint =
      demandDiff >= 1
        ? " При этом спрос на получаемых персонажей заметно выше — отличный трейд по ликвидности."
        : demandDiff <= -1
          ? " Однако ваш средний Demand выше — можно попросить небольшую доплату (adds)."
          : " Оба предложения сбалансированы по Value и ликвидности.";

    return {
      verdict: "FAIR",
      verdictLabel: "FAIR — Равный трейд",
      verdictDescription: `Разница укладывается в допустимый диапазон ±5% (${valueDiff >= 0 ? "+" : ""}${valueDiff.toLocaleString("en-US")} Value).${demandHint}`,
      offer,
      request,
      valueDiff,
      valueDiffPercent,
      demandDiff,
      rerollDiff,
      warnings,
    };
  }

  if (valueDiff > 0) {
    const upgradeNote =
      offer.slotsCount > request.slotsCount && request.hasHighDemandUnit
        ? " Отличный апгрейд (multiple small -> high value)."
        : "";
    return {
      verdict: "WIN",
      verdictLabel: "WIN — Выгодный трейд",
      verdictDescription: `Вы получаете на ${valueDiff.toLocaleString("en-US")} Value (+${Math.abs(valueDiffPercent)}%) больше.${upgradeNote}`,
      offer,
      request,
      valueDiff,
      valueDiffPercent,
      demandDiff,
      rerollDiff,
      warnings,
    };
  }

  return {
    verdict: "LOSE",
    verdictLabel: "LOSE — Переплата",
    verdictDescription: `Вы отдаёте на ${Math.abs(valueDiff).toLocaleString("en-US")} Value (${Math.abs(valueDiffPercent)}%) больше. Просите доплату или замените слоты.`,
    offer,
    request,
    valueDiff,
    valueDiffPercent,
    demandDiff,
    rerollDiff,
    warnings,
  };
}
