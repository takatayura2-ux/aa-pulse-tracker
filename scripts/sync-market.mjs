/**
 * Standalone market sync script for GitHub Actions (.github/workflows/market-sync.yml)
 * and manual CLI execution (`node scripts/sync-market.mjs`).
 *
 * Usage:
 *   node scripts/sync-market.mjs             # Fetch Google Sheet CSV & upsert into Supabase
 *   node scripts/sync-market.mjs --dry-run   # Fetch & parse CSV only (verify parser health)
 */

import { createClient } from "@supabase/supabase-js";

const SHEET_ID =
  process.env.GOOGLE_SHEET_ID?.trim() ||
  "1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0";
const DRY_RUN = process.argv.includes("--dry-run");

const FALLBACK_TABS = [
  { name: "New Units", gid: "2018062423", tier: "New", defaultSubTier: "New" },
  { name: "S Tier", gid: "1902639631", tier: "S", defaultSubTier: "SSS" },
  { name: "A Tier", gid: "883691415", tier: "A", defaultSubTier: "A+" },
  { name: "B Tier", gid: "1594979378", tier: "B", defaultSubTier: "B+" },
  { name: "C Tier", gid: "2118153850", tier: "C", defaultSubTier: "C+" },
];

const USER_AGENT =
  "Mozilla/5.0 (compatible; AAValueTrackerSync/1.0; +https://github.com)";

function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function createSlug(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(?\s*shny\s*\)?/gi, "shiny")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractSubTier(text, isHeaderRow = false) {
  let target = text.trim();
  if (!target) return null;
  if (isHeaderRow) {
    const idx = target.search(/\bName\b/i);
    if (idx === -1) return null;
    target = target.slice(idx + 4).trim();
    if (!target) return null;
  }
  const valid = [
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
  const tail = target.split("/").pop()?.trim();
  if (tail && valid.includes(tail)) return tail;
  const match = target.match(
    /\b(SSS|SS|S\+|S-|S|A\+|A-|A|B\+|B-|B|C\+|C-|C)\b/
  );
  return match && valid.includes(match[1]) ? match[1] : null;
}

function normalizeTrend(raw) {
  const lower = raw.trim().toLowerCase();
  if (!lower) return "Stable";
  if (lower.includes("rising") || lower.includes("rise")) return "Rising";
  if (lower.includes("hype")) return "Hyped";
  if (
    lower.includes("declin") ||
    lower.includes("drop") ||
    lower.includes("fall")
  ) {
    return "Declining";
  }
  if (lower.includes("overpric")) return "Overpriced";
  if (lower.includes("unstab") || lower.includes("fluct")) return "Unstable";
  return "Stable";
}

function parseUnitName(rawName) {
  let clean = rawName.replace(/\s+/g, " ").trim();
  const isShiny = /\(?\s*sh[iu]?ny\s*\)?/i.test(clean);
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
  const base = slashIdx !== -1 ? `${gameName} / ${animeName}` : gameName;
  return {
    displayName: isShiny ? `${base} (SHINY)` : base,
    gameName,
    animeName,
    isShiny,
  };
}

async function fetchCsv(gid) {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(gvizUrl, { headers: { "User-Agent": USER_AGENT } });
  if (res.ok) {
    const text = await res.text();
    if (text.trim() && !text.trimStart().startsWith("<!DOCTYPE")) return text;
  }
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const exp = await fetch(exportUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!exp.ok) {
    throw new Error(`Failed CSV fetch for gid=${gid}: HTTP ${exp.status}`);
  }
  return await exp.text();
}

async function discoverTabs() {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!res.ok) return { unitTabs: FALLBACK_TABS, infoGid: "1572670724" };
    const html = await res.text();
    const regex = /items\.push\(\{name:\s*"([^"]+)",.*?gid:\s*"([^"]+)"/g;
    const map = {
      "new units": { tier: "New", defaultSubTier: "New" },
      "s tier": { tier: "S", defaultSubTier: "SSS" },
      "a tier": { tier: "A", defaultSubTier: "A+" },
      "b tier": { tier: "B", defaultSubTier: "B+" },
      "c tier": { tier: "C", defaultSubTier: "C+" },
    };
    const unitTabs = [];
    let infoGid = "1572670724";
    let m;
    while ((m = regex.exec(html)) !== null) {
      const name = m[1].trim();
      const gid = m[2].trim();
      if (name.toLowerCase() === "info") {
        infoGid = gid;
        continue;
      }
      const cfg = map[name.toLowerCase()];
      if (cfg) unitTabs.push({ name, gid, ...cfg });
    }
    return {
      unitTabs: unitTabs.length >= 4 ? unitTabs : FALLBACK_TABS,
      infoGid,
    };
  } catch {
    return { unitTabs: FALLBACK_TABS, infoGid: "1572670724" };
  }
}

async function main() {
  console.log(`[MarketSync] Fetching Google Sheet ${SHEET_ID}...`);
  const { unitTabs, infoGid } = await discoverTabs();
  const [infoCsv, ...tabCsvs] = await Promise.all([
    fetchCsv(infoGid).catch(() => ""),
    ...unitTabs.map((t) => fetchCsv(t.gid)),
  ]);

  let lastSheetUpdate = "";
  for (const row of parseCsv(infoCsv)) {
    for (const cell of row) {
      const m = cell.match(/LAST\s+UPDATE:\s*([0-9./-]+)/i);
      if (m?.[1]) lastSheetUpdate = m[1].trim();
    }
  }

  const usedSlugs = new Set();
  const units = [];
  let rank = 1;

  for (let t = 0; t < unitTabs.length; t++) {
    const tab = unitTabs[t];
    const rows = parseCsv(tabCsvs[t]);
    let subTier = tab.defaultSubTier;

    for (let r = 0; r < rows.length; r++) {
      const col0 = (rows[r][0] ?? "").trim();
      const col1 = (rows[r][1] ?? "").trim();
      const col2 = (rows[r][2] ?? "").trim();
      const col3 = (rows[r][3] ?? "").trim();
      const col4 = (rows[r][4] ?? "").trim();

      if (!col0) continue;
      if (
        r === 0 ||
        col0.toUpperCase().startsWith("DISCLAIMER:") ||
        col1.toLowerCase().startsWith("value")
      ) {
        subTier = extractSubTier(col0, true) ?? subTier;
        continue;
      }
      if (!col1 && !col2 && !col3) {
        subTier = extractSubTier(col0, false) ?? subTier;
        continue;
      }

      const parsed = parseUnitName(col0);
      if (!parsed.gameName) continue;

      const cleanVal = col1.replace(/[,\s]/g, "");
      const numVal = Number(cleanVal);
      const value =
        cleanVal && Number.isFinite(numVal) && numVal >= 0 ? numVal : null;
      const numDem = Number(col2.replace(",", "."));
      const demand =
        Number.isFinite(numDem) && numDem >= 0
          ? Math.min(10, Math.round(numDem * 100) / 100)
          : 0;

      const baseSlug = createSlug(parsed.displayName) || `unit-${rank}`;
      let slug = usedSlugs.has(baseSlug)
        ? `${baseSlug}-${tab.tier.toLowerCase()}`
        : baseSlug;
      let idx = 2;
      while (usedSlugs.has(slug)) slug = `${baseSlug}-${idx++}`;
      usedSlugs.add(slug);

      units.push({
        slug,
        name: parsed.displayName,
        game_name: parsed.gameName,
        anime_name: parsed.animeName,
        is_shiny: parsed.isShiny,
        value,
        value_display: value === null ? "N/A" : value.toLocaleString("en-US"),
        demand,
        trend: normalizeTrend(col3 || "Stable"),
        raw_trend: col3 || "Stable",
        tier: tab.tier,
        sub_tier: subTier,
        information: col4 || "Ограниченный персонаж Anime Adventures",
        source_tab: tab.name,
        rank: rank++,
      });
    }
  }

  console.log(
    `[MarketSync] Parsed ${units.length} units (Sheet LAST UPDATE: ${lastSheetUpdate || "N/A"}).`
  );

  if (units.length === 0) {
    throw new Error("Parsed 0 units from Google Sheet");
  }

  if (DRY_RUN) {
    console.log("[MarketSync] Dry-run completed successfully.");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const unitRows = units.map((u) => ({ ...u, updated_at: nowIso }));
  const { error: uErr } = await supabase
    .from("units")
    .upsert(unitRows, { onConflict: "slug" });
  if (uErr) throw new Error(`units upsert failed: ${uErr.message}`);

  const historyRows = units
    .filter((u) => u.value !== null)
    .map((u) => ({
      unit_slug: u.slug,
      recorded_at: today,
      value: u.value,
      demand: u.demand,
      trend: u.trend,
    }));

  if (historyRows.length > 0) {
    const { error: hErr } = await supabase
      .from("unit_price_history")
      .upsert(historyRows, { onConflict: "unit_slug,recorded_at" });
    if (hErr) throw new Error(`history upsert failed: ${hErr.message}`);
  }

  await supabase.from("market_metadata").upsert([
    { key: "last_sheet_update", value: lastSheetUpdate, updated_at: nowIso },
    { key: "last_synced_at", value: nowIso, updated_at: nowIso },
  ]);

  console.log(
    `[MarketSync] Synced ${unitRows.length} units and ${historyRows.length} history points to Supabase.`
  );
}

main().catch((err) => {
  console.error("[MarketSync] ERROR:", err);
  process.exit(1);
});
