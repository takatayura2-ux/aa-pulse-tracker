export const DEFAULT_GOOGLE_SHEET_ID =
  "1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0";

export function getGoogleSheetId(): string {
  return process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_GOOGLE_SHEET_ID;
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== null;
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
  return {
    url,
    anonKey,
    serviceRoleKey,
    isPublicConfigured: Boolean(url && anonKey),
    isAdminConfigured: Boolean(url && serviceRoleKey),
  };
}
