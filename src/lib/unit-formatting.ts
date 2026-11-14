import type { SubTier, Tier, TrendStatus } from "@/types/unit";

export const REROLL_VALUE_RATE = 20;

export function formatValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return value.toLocaleString("en-US");
}

export function formatRerolls(value: number | null): string {
  if (value === null || value <= 0) return "—";
  const rr = value / REROLL_VALUE_RATE;
  return rr >= 100
    ? `${Math.round(rr).toLocaleString("en-US")} RR`
    : `${rr.toFixed(1).replace(/\.0$/, "")} RR`;
}

export function getDemandInfo(demand: number): {
  label: string;
  shortLabel: string;
  colorClass: string;
  barColor: string;
} {
  if (demand >= 8.5) {
    return {
      label: "Очень высокий",
      shortLabel: "Very High",
      colorClass: "text-emerald-300",
      barColor: "bg-gradient-to-r from-emerald-400 to-cyan-400",
    };
  }
  if (demand >= 6.5) {
    return {
      label: "Высокий",
      shortLabel: "High",
      colorClass: "text-cyan-300",
      barColor: "bg-gradient-to-r from-cyan-400 to-sky-400",
    };
  }
  if (demand >= 5.5) {
    return {
      label: "Выше среднего",
      shortLabel: "Above Avg",
      colorClass: "text-sky-300",
      barColor: "bg-sky-400",
    };
  }
  if (demand >= 4.5) {
    return {
      label: "Средний",
      shortLabel: "Average",
      colorClass: "text-slate-200",
      barColor: "bg-indigo-400",
    };
  }
  if (demand >= 3) {
    return {
      label: "Низкий",
      shortLabel: "Low",
      colorClass: "text-amber-300",
      barColor: "bg-amber-400",
    };
  }
  return {
    label: "Очень низкий",
    shortLabel: "Very Low",
    colorClass: "text-rose-300",
    barColor: "bg-rose-500",
  };
}

export function getTrendMeta(trend: TrendStatus): {
  label: string;
  ruLabel: string;
  badgeClass: string;
  accentHex: string;
  description: string;
} {
  switch (trend) {
    case "Rising":
      return {
        label: "Rising",
        ruLabel: "Растёт",
        badgeClass:
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
        accentHex: "#10b981",
        description: "Цена стабильно растёт на рынке",
      };
    case "Hyped":
      return {
        label: "Hyped",
        ruLabel: "Хайп / Спрос",
        badgeClass:
          "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.2)]",
        accentHex: "#e879f9",
        description: "Высокая популярность и активные оверпеи",
      };
    case "Declining":
      return {
        label: "Declining",
        ruLabel: "Падает",
        badgeClass:
          "border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
        accentHex: "#f43f5e",
        description: "Стоимость снижается, низкая защита цены",
      };
    case "Overpriced":
      return {
        label: "Overpriced",
        ruLabel: "Переоценён",
        badgeClass:
          "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.18)]",
        accentHex: "#f59e0b",
        description: "Цена раздута выше реальной ценности",
      };
    case "Unstable":
      return {
        label: "Unstable",
        ruLabel: "Нестабильный",
        badgeClass:
          "border-violet-500/40 bg-violet-500/15 text-violet-300",
        accentHex: "#a78bfa",
        description: "Волатильный курс, цена часто колеблется",
      };
    case "Stable":
    default:
      return {
        label: "Stable",
        ruLabel: "Стабилен",
        badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
        accentHex: "#22d3ee",
        description: "Уверенно удерживает текущую стоимость",
      };
  }
}

export function getTierMeta(tier: Tier, subTier?: SubTier): {
  badgeClass: string;
  glowClass: string;
  accentBorder: string;
  label: string;
} {
  if (subTier === "SSS" || subTier === "SS") {
    return {
      badgeClass:
        "border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/25 text-amber-200",
      glowClass: "hover:shadow-[0_0_28px_rgba(245,158,11,0.18)]",
      accentBorder: "border-amber-500/30 hover:border-amber-400/60",
      label: subTier,
    };
  }
  switch (tier) {
    case "New":
      return {
        badgeClass:
          "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
        glowClass: "hover:shadow-[0_0_24px_rgba(16,185,129,0.16)]",
        accentBorder: "border-emerald-500/30 hover:border-emerald-400/60",
        label: subTier || "New",
      };
    case "S":
      return {
        badgeClass:
          "border-rose-400/45 bg-rose-500/15 text-rose-200",
        glowClass: "hover:shadow-[0_0_24px_rgba(244,63,94,0.15)]",
        accentBorder: "border-rose-500/25 hover:border-rose-400/50",
        label: subTier || "S",
      };
    case "A":
      return {
        badgeClass:
          "border-cyan-400/45 bg-cyan-500/15 text-cyan-200",
        glowClass: "hover:shadow-[0_0_24px_rgba(6,182,212,0.15)]",
        accentBorder: "border-cyan-500/25 hover:border-cyan-400/50",
        label: subTier || "A",
      };
    case "B":
      return {
        badgeClass:
          "border-indigo-400/45 bg-indigo-500/15 text-indigo-200",
        glowClass: "hover:shadow-[0_0_20px_rgba(99,102,241,0.14)]",
        accentBorder: "border-indigo-500/25 hover:border-indigo-400/50",
        label: subTier || "B",
      };
    case "C":
    default:
      return {
        badgeClass:
          "border-slate-500/40 bg-slate-700/30 text-slate-300",
        glowClass: "hover:shadow-[0_0_16px_rgba(148,163,184,0.1)]",
        accentBorder: "border-slate-700/60 hover:border-slate-500/60",
        label: subTier || "C",
      };
  }
}

export function createSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(?\s*shny\s*\)?/gi, "shiny")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
