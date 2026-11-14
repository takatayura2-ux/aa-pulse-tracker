import React from "react";
import { UnitTrackerDashboard } from "@/components/UnitTrackerDashboard";
import { getMarketSnapshot } from "@/lib/data-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getMarketSnapshot();

  return <UnitTrackerDashboard initialSnapshot={snapshot} />;
}
