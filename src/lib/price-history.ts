import type { PriceHistoryPoint, TrendStatus, Unit } from "@/types/unit";

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}

function roundPrice(val: number, anchor: number): number {
  if (anchor >= 10000) return Math.max(5, Math.round(val / 50) * 50);
  if (anchor >= 1000) return Math.max(5, Math.round(val / 25) * 25);
  if (anchor >= 200) return Math.max(5, Math.round(val / 5) * 5);
  return Math.max(1, Math.round(val));
}

function getTrendCurveConfig(trend: TrendStatus): {
  startMultiplier: number;
  volatility: number;
  lateSpike: number;
} {
  switch (trend) {
    case "Rising":
      return { startMultiplier: 0.78, volatility: 0.03, lateSpike: 0.06 };
    case "Hyped":
      return { startMultiplier: 0.72, volatility: 0.045, lateSpike: 0.12 };
    case "Overpriced":
      return { startMultiplier: 0.68, volatility: 0.075, lateSpike: 0.16 };
    case "Declining":
      return { startMultiplier: 1.24, volatility: 0.035, lateSpike: -0.07 };
    case "Unstable":
      return { startMultiplier: 0.96, volatility: 0.095, lateSpike: 0 };
    case "Stable":
    default:
      return { startMultiplier: 0.97, volatility: 0.022, lateSpike: 0 };
  }
}

/**
 * Generates deterministic 90-day price & demand trajectory converging
 * smoothly to the live Google Sheet price. Used when Supabase historical
 * snapshots have not accumulated yet.
 */
export function buildUnitPriceHistory(
  unit: Unit,
  supabasePoints: PriceHistoryPoint[] = [],
  days = 90
): PriceHistoryPoint[] {
  if (supabasePoints.length >= 2) {
    return supabasePoints;
  }

  const baseValue = unit.value ?? getEstimatedCollectorBase(unit);
  const rng = createRng(hashString(unit.slug));
  const { startMultiplier, volatility, lateSpike } = getTrendCurveConfig(
    unit.trend
  );

  const points: PriceHistoryPoint[] = [];
  const today = new Date();
  let wave = 0;

  for (let i = days - 1; i >= 0; i--) {
    const progress = (days - 1 - i) / Math.max(1, days - 1);
    const pointDate = new Date(today);
    pointDate.setDate(today.getDate() - i);

    const drift = startMultiplier + (1 - startMultiplier) * Math.pow(progress, 1.15);
    const spikeTerm =
      progress > 0.72 ? lateSpike * Math.sin(((progress - 0.72) / 0.28) * Math.PI * 0.5) : 0;

    wave = wave * 0.65 + (rng() - 0.5) * 2 * volatility;
    const damping = 1 - Math.pow(progress, 4);

    const multiplier =
      i === 0 ? 1 : Math.max(0.45, drift + spikeTerm + wave * damping);
    const rawVal = baseValue * multiplier;
    const value = i === 0 ? baseValue : roundPrice(rawVal, baseValue);

    const demandDrift =
      unit.trend === "Hyped" || unit.trend === "Rising"
        ? -0.9 * (1 - progress)
        : unit.trend === "Declining"
          ? 0.8 * (1 - progress)
          : 0;
    const demandNoise = i === 0 ? 0 : (rng() - 0.5) * 0.6 * damping;
    const demand =
      i === 0
        ? unit.demand
        : Math.max(0, Math.min(10, Math.round((unit.demand + demandDrift + demandNoise) * 10) / 10));

    points.push({
      date: pointDate.toISOString().slice(0, 10),
      label: formatDateLabel(pointDate),
      value,
      demand,
      isSimulated: true,
    });
  }

  return points;
}

function getEstimatedCollectorBase(unit: Unit): number {
  if (unit.subTier === "SSS") return 55000;
  if (unit.subTier === "SS") return 42000;
  return 1000;
}
