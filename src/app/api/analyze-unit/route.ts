import { NextResponse } from "next/server";
import {
  ALL_DPS_PROFILES,
  findUnitDpsProfile,
  toSyntheticUnitFromDpsProfile,
} from "@/data/dpsTierList";
import { analyzeUnitWithGemini } from "@/lib/ai-analyzer";
import { getUnitBySlug } from "@/lib/data-repository";
import { isGeminiConfigured } from "@/lib/env";
import type { Unit } from "@/types/unit";

export const dynamic = "force-dynamic";

interface AnalyzeRequestBody {
  slug?: string;
  unit?: Unit;
  forceRefresh?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    let targetUnit: Unit | null = null;

    if (body.slug) {
      const { unit } = await getUnitBySlug(body.slug);
      targetUnit = unit;
      if (!targetUnit) {
        const dpsMatch = ALL_DPS_PROFILES.find(
          (entry) =>
            entry.unitSlug === body.slug ||
            `dps-${entry.rankCode.toLowerCase()}` === body.slug
        );
        if (dpsMatch) {
          targetUnit = toSyntheticUnitFromDpsProfile(dpsMatch);
        }
      }
    }

    if (!targetUnit && body.unit && body.unit.name) {
      targetUnit = body.unit;
    }

    if (!targetUnit) {
      return NextResponse.json(
        { error: "Персонаж не найден (передайте корректный slug или объект unit)." },
        { status: 404 }
      );
    }

    const dpsProfile = findUnitDpsProfile(targetUnit);
    const analysis = await analyzeUnitWithGemini(targetUnit, {
      forceRefresh: Boolean(body.forceRefresh),
    });

    return NextResponse.json({
      unitSlug: targetUnit.slug,
      geminiConfigured: isGeminiConfigured(),
      dpsProfile,
      analysis,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ошибка при анализе персонажа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
