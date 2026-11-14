export type Tier = "New" | "S" | "A" | "B" | "C";

export type SubTier =
  | "New"
  | "SSS"
  | "SS"
  | "S+"
  | "S"
  | "S-"
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-";

export type TrendStatus =
  | "Rising"
  | "Hyped"
  | "Stable"
  | "Unstable"
  | "Declining"
  | "Overpriced";

export interface Unit {
  id: string;
  slug: string;
  name: string;
  gameName: string;
  animeName: string;
  isShiny: boolean;
  value: number | null;
  valueDisplay: string;
  demand: number;
  trend: TrendStatus;
  rawTrend: string;
  tier: Tier;
  subTier: SubTier;
  information: string;
  sourceTab: string;
  rank: number;
}

export interface MarketStats {
  totalUnits: number;
  pricedUnits: number;
  averageDemand: number;
  risingCount: number;
  hypedCount: number;
  decliningCount: number;
  overpricedCount: number;
  unstableCount: number;
  shinyCount: number;
}

export interface MarketSnapshot {
  units: Unit[];
  lastSheetUpdate: string | null;
  fetchedAt: string;
  source: "google-sheets-live" | "supabase-cache" | "fallback";
  stats: MarketStats;
}

export interface PriceHistoryPoint {
  date: string;
  label: string;
  value: number;
  demand: number;
  isSimulated: boolean;
}

export type AnalysisVerdict = "BUY" | "HOLD" | "SELL" | "CAUTION";

export interface DpsAnalysisBreakdown {
  combatRank: string;
  uniqueEfficiency: string;
  dpsToValueVerdict: string;
  uniqueDpsLv100?: number;
  divineFullCapDpsLv100?: number;
  placementCap?: number;
  bestUniqueRank?: number;
}

export interface AiUnitAnalysis {
  whyThisPrice: string;
  currentMeta: string;
  growthForecast: string;
  verdict: AnalysisVerdict;
  verdictLabel: string;
  confidence: number;
  keyDrivers: string[];
  dpsAnalysis?: DpsAnalysisBreakdown;
  source: "gemini" | "heuristic";
  model?: string;
  generatedAt: string;
}

export type TradeVerdict = "WIN" | "FAIR" | "LOSE" | "EMPTY";

export interface TradeSideSummary {
  slotsCount: number;
  totalValue: number;
  averageDemand: number;
  rerollsEquivalent: number;
  hasUnpricedUnit: boolean;
  hasOverpricedUnit: boolean;
  hasHighDemandUnit: boolean;
}

export interface TradeEvaluation {
  verdict: TradeVerdict;
  verdictLabel: string;
  verdictDescription: string;
  offer: TradeSideSummary;
  request: TradeSideSummary;
  valueDiff: number;
  valueDiffPercent: number;
  demandDiff: number;
  rerollDiff: number;
  warnings: string[];
}
