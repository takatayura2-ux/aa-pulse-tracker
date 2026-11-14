import React from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto my-16 max-w-lg rounded-3xl border border-slate-800 bg-[#0b101b] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-300">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-white">
        Персонаж или страница не найдены
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Возможно, персонаж был переименован в Google Таблице или ссылка
        устарела.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Вернуться к каталогу</span>
      </Link>
    </div>
  );
}
