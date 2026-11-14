"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Scale,
  Sparkles,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useTrade } from "@/components/TradeProvider";

export function Navbar({ sheetId }: { sheetId: string }) {
  const pathname = usePathname();
  const { offerCount, requestCount } = useTrade();
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalTradeItems = offerCount + requestCount;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  const navItems = [
    {
      href: "/",
      label: "Маркет персонажей",
      icon: Activity,
      active: pathname === "/" || pathname.startsWith("/units"),
    },
    {
      href: "/calculator",
      label: "Калькулятор трейдов",
      icon: Scale,
      active: pathname.startsWith("/calculator"),
      badge: totalTradeItems > 0 ? `${offerCount}:${requestCount}` : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060911]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-fuchsia-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition group-hover:border-cyan-400/70">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-wider text-white uppercase">
                AA <span className="text-cyan-400">Pulse</span>
              </span>
              <span className="hidden rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase sm:inline-block">
                Tracker
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Anime Adventures Value &amp; Demand
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  item.active
                    ? "border border-cyan-500/35 bg-cyan-500/12 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                    : "border border-transparent text-slate-300 hover:border-slate-800 hover:bg-slate-900/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="font-mono-num rounded-md bg-cyan-500/25 px-1.5 py-0.5 text-[11px] font-bold text-cyan-200">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>Google Sheets CSV</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:text-white md:hidden"
          aria-label="Открыть меню"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-800/80 bg-[#070a12] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                    item.active
                      ? "border border-cyan-500/35 bg-cyan-500/12 text-cyan-200"
                      : "border border-slate-800/70 bg-slate-900/50 text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="font-mono-num rounded-md bg-cyan-500/25 px-2 py-0.5 text-xs font-bold text-cyan-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/40 px-3.5 py-2 text-xs text-slate-300"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Источник: Google Таблица CSV
              </span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
