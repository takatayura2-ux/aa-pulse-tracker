import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";
import { computeMarketStats } from "@/lib/sheets-parser";
import type {
  AiUnitAnalysis,
  MarketSnapshot,
  PriceHistoryPoint,
  SubTier,
  Tier,
  TrendStatus,
  Unit,
} from "@/types/unit";

let cachedPublicClient: SupabaseClient | null = null;
let cachedAdminClient: SupabaseClient | null = null;

export function getSupabasePublicClient(): SupabaseClient | null {
  const { url, anonKey, isPublicConfigured } = getSupabaseConfig();
  if (!isPublicConfigured || !url || !anonKey) return null;
  if (!cachedPublicClient) {
    cachedPublicClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return cachedPublicClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey, isAdminConfigured } = getSupabaseConfig();
  if (!isAdminConfigured || !url || !serviceRoleKey) return null;
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return cachedAdminClient;
}

interface DbUnitRow {
  slug: string;
  name: string;
  game_name: string;
  anime_name: string;
  is_shiny: boolean;
  value: number | null;
  value_display: string;
  demand: number;
  trend: TrendStatus;
  raw_trend: string;
  tier: Tier;
  sub_tier: SubTier;
  information: string;
  source_tab: string;
  rank: number;
}

export async function fetchUnitsFromSupabase(): Promise<MarketSnapshot | null> {
  const client = getSupabasePublicClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("units")
      .select("*")
      .order("rank", { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    const { data: metaRows } = await client
      .from("market_metadata")
      .select("key, value")
      .in("key", ["last_sheet_update", "last_synced_at"]);

    const metaMap = new Map(
      (metaRows ?? []).map((row) => [row.key as string, row.value as string])
    );

    const units: Unit[] = (data as DbUnitRow[]).map((row) => ({
      id: row.slug,
      slug: row.slug,
      name: row.name,
      gameName: row.game_name,
      animeName: row.anime_name,
      isShiny: row.is_shiny,
      value: row.value,
      valueDisplay: row.value_display,
      demand: Number(row.demand),
      trend: row.trend,
      rawTrend: row.raw_trend,
      tier: row.tier,
      subTier: row.sub_tier,
      information: row.information,
      sourceTab: row.source_tab,
      rank: row.rank,
    }));

    return {
      units,
      lastSheetUpdate: metaMap.get("last_sheet_update") ?? null,
      fetchedAt: metaMap.get("last_synced_at") ?? new Date().toISOString(),
      source: "supabase-cache",
      stats: computeMarketStats(units),
    };
  } catch {
    return null;
  }
}

export async function fetchUnitHistoryFromSupabase(
  slug: string
): Promise<PriceHistoryPoint[]> {
  const client = getSupabasePublicClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("unit_price_history")
      .select("recorded_at, value, demand")
      .eq("unit_slug", slug)
      .order("recorded_at", { ascending: true })
      .limit(120);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) => {
      const d = new Date(row.recorded_at as string);
      return {
        date: row.recorded_at as string,
        label: d.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
        }),
        value: Number(row.value),
        demand: Number(row.demand),
        isSimulated: false,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchAiAnalysisFromSupabase(
  slug: string
): Promise<AiUnitAnalysis | null> {
  const client = getSupabasePublicClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("unit_ai_analyses")
      .select("*")
      .eq("unit_slug", slug)
      .single();

    if (error || !data) return null;

    // Expire cached AI analysis after 24 hours
    const generatedAt = new Date(data.generated_at as string);
    if (Date.now() - generatedAt.getTime() > 24 * 60 * 60 * 1000) {
      return null;
    }

    return {
      whyThisPrice: data.why_this_price as string,
      currentMeta: data.current_meta as string,
      growthForecast: data.growth_forecast as string,
      verdict: data.verdict as AiUnitAnalysis["verdict"],
      verdictLabel: data.verdict_label as string,
      confidence: Number(data.confidence),
      keyDrivers: Array.isArray(data.key_drivers)
        ? (data.key_drivers as string[])
        : [],
      source: "gemini",
      model: (data.model as string | null) ?? undefined,
      generatedAt: data.generated_at as string,
    };
  } catch {
    return null;
  }
}

export async function saveAiAnalysisToSupabase(
  slug: string,
  analysis: AiUnitAnalysis
): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin || analysis.source !== "gemini") return;

  try {
    await admin.from("unit_ai_analyses").upsert({
      unit_slug: slug,
      why_this_price: analysis.whyThisPrice,
      current_meta: analysis.currentMeta,
      growth_forecast: analysis.growthForecast,
      verdict: analysis.verdict,
      verdict_label: analysis.verdictLabel,
      confidence: analysis.confidence,
      key_drivers: analysis.keyDrivers,
      model: analysis.model ?? null,
      generated_at: analysis.generatedAt,
    });
  } catch {
    // Non-fatal cache write failure
  }
}

export async function syncSnapshotToSupabase(
  snapshot: MarketSnapshot
): Promise<{ syncedUnits: number; historySnapshots: number }> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error(
      "Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) are not configured"
    );
  }

  const unitRows = snapshot.units.map((u) => ({
    slug: u.slug,
    name: u.name,
    game_name: u.gameName,
    anime_name: u.animeName,
    is_shiny: u.isShiny,
    value: u.value,
    value_display: u.valueDisplay,
    demand: u.demand,
    trend: u.trend,
    raw_trend: u.rawTrend,
    tier: u.tier,
    sub_tier: u.subTier,
    information: u.information,
    source_tab: u.sourceTab,
    rank: u.rank,
    updated_at: snapshot.fetchedAt,
  }));

  const { error: unitsErr } = await admin
    .from("units")
    .upsert(unitRows, { onConflict: "slug" });
  if (unitsErr) {
    throw new Error(`Supabase units upsert error: ${unitsErr.message}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const historyRows = snapshot.units
    .filter((u) => u.value !== null)
    .map((u) => ({
      unit_slug: u.slug,
      recorded_at: today,
      value: u.value as number,
      demand: u.demand,
      trend: u.trend,
    }));

  if (historyRows.length > 0) {
    const { error: histErr } = await admin
      .from("unit_price_history")
      .upsert(historyRows, { onConflict: "unit_slug,recorded_at" });
    if (histErr) {
      throw new Error(`Supabase history upsert error: ${histErr.message}`);
    }
  }

  await admin.from("market_metadata").upsert([
    {
      key: "last_sheet_update",
      value: snapshot.lastSheetUpdate ?? "",
      updated_at: snapshot.fetchedAt,
    },
    {
      key: "last_synced_at",
      value: snapshot.fetchedAt,
      updated_at: snapshot.fetchedAt,
    },
  ]);

  return {
    syncedUnits: unitRows.length,
    historySnapshots: historyRows.length,
  };
}
