import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/data-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";
    const tierFilter = searchParams.get("tier")?.trim().toUpperCase();
    const trendFilter = searchParams.get("trend")?.trim().toLowerCase();
    const query = searchParams.get("q")?.trim().toLowerCase();

    const snapshot = await getMarketSnapshot({ forceRefresh });
    let units = snapshot.units;

    if (tierFilter && tierFilter !== "ALL") {
      units = units.filter((u) => u.tier.toUpperCase() === tierFilter);
    }
    if (trendFilter && trendFilter !== "all") {
      units = units.filter((u) => u.trend.toLowerCase() === trendFilter);
    }
    if (query) {
      units = units.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.gameName.toLowerCase().includes(query) ||
          u.animeName.toLowerCase().includes(query) ||
          u.information.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      ...snapshot,
      units,
      totalFiltered: units.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load market units";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
