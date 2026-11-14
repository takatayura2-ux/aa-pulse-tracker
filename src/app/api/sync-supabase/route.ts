import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/data-repository";
import { getSupabaseConfig } from "@/lib/env";
import { syncSnapshotToSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.SYNC_SECRET_TOKEN?.trim();
  if (secret) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig.isAdminConfigured) {
    return NextResponse.json(
      {
        error:
          "Supabase не настроен. Заполните NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local.",
      },
      { status: 400 }
    );
  }

  try {
    const snapshot = await getMarketSnapshot({ forceRefresh: true });
    const result = await syncSnapshotToSupabase(snapshot);
    return NextResponse.json({
      ok: true,
      syncedAt: snapshot.fetchedAt,
      lastSheetUpdate: snapshot.lastSheetUpdate,
      ...result,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ошибка синхронизации с Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
