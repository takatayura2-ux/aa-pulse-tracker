import React from "react";
import { TradeCalculator } from "@/components/TradeCalculator";
import { getUntradableCatalogUnits } from "@/data/dpsTierList";
import { getMarketSnapshot } from "@/lib/data-repository";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const snapshot = await getMarketSnapshot();
  const untradableEstimated = getUntradableCatalogUnits();
  const allUnits = [...snapshot.units, ...untradableEstimated];

  return <TradeCalculator units={allUnits} />;
}
