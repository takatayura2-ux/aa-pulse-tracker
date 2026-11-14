import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { TradeProvider } from "@/components/TradeProvider";
import { getGoogleSheetId } from "@/lib/env";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AA Pulse — Трекер Value и Demand Anime Adventures",
  description:
    "Мониторинг Value, Demand и трендов персонажей Roblox Anime Adventures из Google Таблицы, графики цен на Recharts, AI-аналитика Gemini и калькулятор трейдов W/F/L.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sheetId = getGoogleSheetId();

  return (
    <html
      lang="ru"
      className={`dark ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#06080f] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-100">
        <div className="bg-cyber-grid bg-hero-glow fixed inset-0 -z-10" />
        <TradeProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar sheetId={sheetId} />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </main>
            <footer className="border-t border-slate-800/80 bg-[#05070e]/90 py-6 text-xs text-slate-500">
              <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6">
                <p>
                  AA Pulse · Неофициальный трекер стоимости персонажей Anime
                  Adventures. Данные синхронизируются через публичный CSV-экспорт
                  Google Таблицы.
                </p>
                <p className="font-mono-num text-slate-400">
                  1 Reroll ≈ 20 Value · Next.js App Router + Recharts + Gemini AI
                </p>
              </div>
            </footer>
          </div>
        </TradeProvider>
      </body>
    </html>
  );
}
