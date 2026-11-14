import {
  computeMarketStats,
  fetchMarketSnapshotFromSheets,
} from "@/lib/sheets-parser";
import { fetchUnitsFromSupabase } from "@/lib/supabase";
import type { MarketSnapshot, Unit } from "@/types/unit";

const CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache: {
  snapshot: MarketSnapshot;
  expiresAt: number;
} | null = null;

const EMERGENCY_FALLBACK_UNITS: Unit[] = [
  {
    id: "jio-over-heaven-dio",
    slug: "jio-over-heaven-dio",
    name: "Jio (Over Heaven) / Dio",
    gameName: "Jio (Over Heaven)",
    animeName: "Dio",
    isShiny: false,
    value: 38500,
    valueDisplay: "38,500",
    demand: 7,
    trend: "Stable",
    rawTrend: "Stable",
    tier: "S",
    subTier: "SS",
    information: "Christmas Update Secret Unit from Frozen Stars",
    sourceTab: "S Tier",
    rank: 1,
  },
  {
    id: "illusionist-aizen",
    slug: "illusionist-aizen",
    name: "Illusionist / Aizen",
    gameName: "Illusionist",
    animeName: "Aizen",
    isShiny: false,
    value: 1800,
    valueDisplay: "1,800",
    demand: 9,
    trend: "Hyped",
    rawTrend: "Hyped",
    tier: "S",
    subTier: "S-",
    information: "Christmas Secret Capsule/Banner Unit",
    sourceTab: "S Tier",
    rank: 2,
  },
  {
    id: "dracula-alucard-shiny",
    slug: "dracula-alucard-shiny",
    name: "Dracula / Alucard (SHINY)",
    gameName: "Dracula",
    animeName: "Alucard",
    isShiny: true,
    value: 24000,
    valueDisplay: "24,000",
    demand: 8,
    trend: "Overpriced",
    rawTrend: "Overpriced",
    tier: "S",
    subTier: "S+",
    information: "Halloween 2023 Update Secret Unit from Spooky Capsules",
    sourceTab: "S Tier",
    rank: 3,
  },
];

export async function getMarketSnapshot(options?: {
  forceRefresh?: boolean;
}): Promise<MarketSnapshot> {
  const now = Date.now();
  if (!options?.forceRefresh && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.snapshot;
  }

  try {
    const live = await fetchMarketSnapshotFromSheets();
    memoryCache = {
      snapshot: live,
      expiresAt: now + CACHE_TTL_MS,
    };
    return live;
  } catch (err) {
    console.warn("[DataRepository] Live Google Sheets fetch failed:", err);

    if (memoryCache) {
      return memoryCache.snapshot;
    }

    const supabaseSnapshot = await fetchUnitsFromSupabase();
    if (supabaseSnapshot) {
      memoryCache = {
        snapshot: supabaseSnapshot,
        expiresAt: now + 60 * 1000,
      };
      return supabaseSnapshot;
    }

    return {
      units: EMERGENCY_FALLBACK_UNITS,
      lastSheetUpdate: null,
      fetchedAt: new Date().toISOString(),
      source: "fallback",
      stats: computeMarketStats(EMERGENCY_FALLBACK_UNITS),
    };
  }
}

export async function getUnitBySlug(slug: string): Promise<{
  unit: Unit | null;
  snapshot: MarketSnapshot;
}> {
  const snapshot = await getMarketSnapshot();
  const unit = snapshot.units.find((u) => u.slug === slug) ?? null;
  return { unit, snapshot };
}
