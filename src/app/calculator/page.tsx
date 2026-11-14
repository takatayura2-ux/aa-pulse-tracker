import React from "react";
import { TradeCalculator } from "@/components/TradeCalculator";
import { getMarketSnapshot } from "@/lib/data-repository";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const snapshot = await getMarketSnapshot();

  return <TradeCalculator units={snapshot.units} />;
}
