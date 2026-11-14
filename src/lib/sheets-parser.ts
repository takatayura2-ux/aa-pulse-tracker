import { parseCsv } from "@/lib/csv";
import { getGoogleSheetId } from "@/lib/env";
import { createSlug, formatValue } from "@/lib/unit-formatting";
import type {
  MarketSnapshot,
  MarketStats,
  SubTier,
  Tier,
  TrendStatus,
  Unit,
} from "@/types/unit";

interface SheetTabTarget {
  name: string;
  gid: string;
  tier: Tier;
  defaultSubTier: SubTier;
}

const FALLBACK_UNIT_TABS: SheetTabTarget[] = [
  { name: "New Units", gid: "2018062423", tier: "New", defaultSubTier: "New" },
  { name: "S Tier", gid: "1902639631", tier: "S", defaultSubTier: "SSS" },
  { name: "A Tier", gid: "883691415", tier: "A", defaultSubTier: "A+" },
  { name: "B Tier", gid: "1594979378", tier: "B", defaultSubTier: "B+" },
  { name: "C Tier", gid: "2118153850", tier: "C", defaultSubTier: "C+" },
];

const FALLBACK_INFO_GID = "1572670724";

const HEADERS_USER_AGENT =
  "Mozilla/5.0 (compatible; AAValueTracker/1.0; +https://localhost)";

function mapTabNameToTierConfig(
  tabName: string
): { tier: Tier; defaultSubTier: SubTier } | null {
  const normalized = tabName.trim().toLowerCase();
  if (normalized === "new units" || normalized === "new") {
    return { tier: "New", defaultSubTier: "New" };
  }
  if (normalized === "s tier" || normalized === "s") {
    return { tier: "S", defaultSubTier: "SSS" };
  }
  if (normalized === "a tier" || normalized === "a") {
    return { tier: "A", defaultSubTier: "A+" };
  }
  if (normalized === "b tier" || normalized === "b") {
    return { tier: "B", defaultSubTier: "B+" };
  }
  if (normalized === "c tier" || normalized === "c") {
    return { tier: "C", defaultSubTier: "C+" };
  }
  return null;
}

async function discoverSheetTabs(sheetId: string): Promise<{
  unitTabs: SheetTabTarget[];
  infoGid: string;
}> {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`,
      {
        headers: { "User-Agent": HEADERS_USER_AGENT },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      return { unitTabs: FALLBACK_UNIT_TABS, infoGid: FALLBACK_INFO_GID };
    }
    const html = await res.text();
    const regex = /items\.push\(\{name:\s*"([^"]+)",.*?gid:\s*"([^"]+)"/g;
    const discoveredUnits: SheetTabTarget[] = [];
    let infoGid = FALLBACK_INFO_GID;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const name = match[1].trim();
      const gid = match[2].trim();
      if (name.toLowerCase() === "info") {
        infoGid = gid;
        continue;
      }
      const config = mapTabNameToTierConfig(name);
      if (config) {
        discoveredUnits.push({
          name,
          gid,
          tier: config.tier,
          defaultSubTier: config.defaultSubTier,
        });
      }
    }

    return {
      unitTabs:
        discoveredUnits.length >= 4 ? discoveredUnits : FALLBACK_UNIT_TABS,
      infoGid,
    };
  } catch {
    return { unitTabs: FALLBACK_UNIT_TABS, infoGid: FALLBACK_INFO_GID };
  }
}

async function fetchTabCsv(sheetId: string, gid: string): Promise<string> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  try {
    const gvizRes = await fetch(gvizUrl, {
      headers: { "User-Agent": HEADERS_USER_AGENT },
      cache: "no-store",
    });
    if (gvizRes.ok) {
      const text = await gvizRes.text();
      if (text.trim().length > 0 && !text.trimStart().startsWith("<!DOCTYPE")) {
        return text;
      }
    }
  } catch {
    // Fall through to /export endpoint
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const exportRes = await fetch(exportUrl, {
    headers: { "User-Agent": HEADERS_USER_AGENT },
    cache: "no-store",
  });
  if (!exportRes.ok) {
    throw new Error(
      `Google Sheets CSV request failed (${exportRes.status}) for gid=${gid}`
    );
  }
  return await exportRes.text();
}

function extractSubTier(text: string, isHeaderRow = false): SubTier | null {
  let target = text.trim();
  if (!target) return null;

  if (isHeaderRow) {
    const nameIdx = target.search(/\bName\b/i);
    if (nameIdx === -1) return null;
    target = target.slice(nameIdx + 4).trim();
    if (!target) return null;
  }

  const slashParts = target.split("/");
  const tail = slashParts[slashParts.length - 1]?.trim();
  const validSubTiers: SubTier[] = [
    "SSS",
    "SS",
    "S+",
    "S",
    "S-",
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "New",
  ];

  for (const sub of validSubTiers) {
    if (tail === sub) {
      return sub;
    }
  }

  const match = target.match(
    /\b(SSS|SS|S\+|S-|S|A\+|A-|A|B\+|B-|B|C\+|C-|C)\b/
  );
  if (match) {
    const token = match[1] as SubTier;
    if (validSubTiers.includes(token)) {
      return token;
    }
  }

  return null;
}

function normalizeTrend(raw: string): TrendStatus {
  const lower = raw.trim().toLowerCase();
  if (!lower) return "Stable";
  if (lower.includes("rising") || lower.includes("rise")) return "Rising";
  if (lower.includes("hype")) return "Hyped";
  if (
    lower.includes("declin") ||
    lower.includes("drop") ||
    lower.includes("fall") ||
    lower.includes("down")
  ) {
    return "Declining";
  }
  if (lower.includes("overpric")) return "Overpriced";
  if (lower.includes("unstab") || lower.includes("fluct")) return "Unstable";
  return "Stable";
}

function parseNumericValue(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "n/a") {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parseDemand(raw: string): number {
  const cleaned = raw.replace(",", ".").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(10, Math.round(num * 100) / 100);
}

function parseUnitName(rawName: string): {
  displayName: string;
  gameName: string;
  animeName: string;
  isShiny: boolean;
} {
  let clean = rawName.replace(/\s+/g, " ").trim();
  const isShiny = /\(?\s*sh[iu]?ny\s*\)?/i.test(clean);

  // Normalize minor typos like "(SHNY)" or "SHINY)" to "(SHINY)" for clean display
  clean = clean
    .replace(/\s*\(?\s*sh[iu]?ny\s*\)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const slashIdx = clean.indexOf("/");
  let gameName = clean;
  let animeName = clean;

  if (slashIdx !== -1) {
    gameName = clean.slice(0, slashIdx).trim();
    animeName = clean.slice(slashIdx + 1).trim() || gameName;
  }

  const baseDisplay =
    slashIdx !== -1 ? `${gameName} / ${animeName}` : gameName;
  const displayName = isShiny ? `${baseDisplay} (SHINY)` : baseDisplay;

  return {
    displayName,
    gameName,
    animeName,
    isShiny,
  };
}

function parseInfoLastUpdate(csvText: string): string | null {
  const rows = parseCsv(csvText);
  for (const row of rows) {
    for (const cell of row) {
      const match = cell.match(/LAST\s+UPDATE:\s*([0-9./-]+)/i);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }
  return null;
}

function parseUnitTabRows(
  csvText: string,
  tab: SheetTabTarget,
  startingRank: number,
  usedSlugs: Set<string>
): Unit[] {
  const rows = parseCsv(csvText);
  const units: Unit[] = [];
  let currentSubTier: SubTier = tab.defaultSubTier;
  let rank = startingRank;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const col0 = (row[0] ?? "").trim();
    const col1 = (row[1] ?? "").trim();
    const col2 = (row[2] ?? "").trim();
    const col3 = (row[3] ?? "").trim();
    const col4 = (row[4] ?? "").trim();

    if (!col0) continue;

    // Header row in the sheet starts with DISCLAIMER... and may contain the initial sub-tier (e.g. "Highest Tier / SSS")
    if (
      rowIndex === 0 ||
      col0.toUpperCase().startsWith("DISCLAIMER:") ||
      col1.toLowerCase().startsWith("value")
    ) {
      const headerSub = extractSubTier(col0, true);
      if (headerSub) {
        currentSubTier = headerSub;
      }
      continue;
    }

    // Section divider row inside a tier tab (e.g., "Top S Tier / SS", "Mid A Tier / A")
    if (!col1 && !col2 && !col3) {
      const sectionSub = extractSubTier(col0, false);
      if (sectionSub) {
        currentSubTier = sectionSub;
      }
      continue;
    }

    const parsedName = parseUnitName(col0);
    if (!parsedName.gameName) continue;

    const value = parseNumericValue(col1);
    const demand = parseDemand(col2);
    const rawTrend = col3 || "Stable";
    const trend = normalizeTrend(rawTrend);

    const baseSlug = createSlug(parsedName.displayName) || `unit-${rank}`;
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${tab.tier.toLowerCase()}`;
    }
    let counter = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    usedSlugs.add(slug);

    units.push({
      id: slug,
      slug,
      name: parsedName.displayName,
      gameName: parsedName.gameName,
      animeName: parsedName.animeName,
      isShiny: parsedName.isShiny,
      value,
      valueDisplay: formatValue(value),
      demand,
      trend,
      rawTrend,
      tier: tab.tier,
      subTier: currentSubTier,
      information: col4 || "Ограниченный персонаж Anime Adventures",
      sourceTab: tab.name,
      rank: rank++,
    });
  }

  return units;
}

export function computeMarketStats(units: Unit[]): MarketStats {
  const totalUnits = units.length;
  const pricedUnits = units.filter((u) => u.value !== null).length;
  const demandSum = units.reduce((acc, u) => acc + u.demand, 0);
  const averageDemand =
    totalUnits > 0 ? Math.round((demandSum / totalUnits) * 100) / 100 : 0;

  return {
    totalUnits,
    pricedUnits,
    averageDemand,
    risingCount: units.filter((u) => u.trend === "Rising").length,
    hypedCount: units.filter((u) => u.trend === "Hyped").length,
    decliningCount: units.filter((u) => u.trend === "Declining").length,
    overpricedCount: units.filter((u) => u.trend === "Overpriced").length,
    unstableCount: units.filter((u) => u.trend === "Unstable").length,
    shinyCount: units.filter((u) => u.isShiny).length,
  };
}

export async function fetchMarketSnapshotFromSheets(
  sheetId = getGoogleSheetId()
): Promise<MarketSnapshot> {
  const { unitTabs, infoGid } = await discoverSheetTabs(sheetId);

  const [infoCsv, ...tabCsvs] = await Promise.all([
    fetchTabCsv(sheetId, infoGid).catch(() => ""),
    ...unitTabs.map((tab) => fetchTabCsv(sheetId, tab.gid)),
  ]);

  const lastSheetUpdate = infoCsv ? parseInfoLastUpdate(infoCsv) : null;
  const usedSlugs = new Set<string>();
  const allUnits: Unit[] = [];
  let rank = 1;

  for (let i = 0; i < unitTabs.length; i++) {
    const parsed = parseUnitTabRows(
      tabCsvs[i],
      unitTabs[i],
      rank,
      usedSlugs
    );
    allUnits.push(...parsed);
    rank += parsed.length;
  }

  if (allUnits.length === 0) {
    throw new Error("Parsed 0 units from Google Sheets CSV");
  }

  return {
    units: allUnits,
    lastSheetUpdate,
    fetchedAt: new Date().toISOString(),
    source: "google-sheets-live",
    stats: computeMarketStats(allUnits),
  };
}
