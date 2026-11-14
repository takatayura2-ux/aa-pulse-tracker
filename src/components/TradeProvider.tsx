"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { MAX_TRADE_SLOTS } from "@/lib/trade-utils";
import type { Unit } from "@/types/unit";

export type TradeSide = "offer" | "request";

interface ToastState {
  id: number;
  message: string;
  type: "success" | "warning";
}

interface TradeSlotsState {
  offerSlots: (Unit | null)[];
  requestSlots: (Unit | null)[];
}

interface TradeContextValue {
  offerSlots: (Unit | null)[];
  requestSlots: (Unit | null)[];
  offerCount: number;
  requestCount: number;
  setSlot: (side: TradeSide, index: number, unit: Unit | null) => void;
  addToSide: (side: TradeSide, unit: Unit) => boolean;
  duplicateSlot: (side: TradeSide, index: number) => boolean;
  swapSides: () => void;
  clearSide: (side: TradeSide) => void;
  clearAll: () => void;
  loadSampleTrade: (units: Unit[]) => void;
}

const STORAGE_KEY = "aa-value-tracker-trade-v1";

const createEmptySlots = (): (Unit | null)[] =>
  Array.from({ length: MAX_TRADE_SLOTS }, () => null);

const SERVER_TRADE_SNAPSHOT: TradeSlotsState = {
  offerSlots: createEmptySlots(),
  requestSlots: createEmptySlots(),
};

let clientSnapshot: TradeSlotsState | null = null;
const listeners = new Set<() => void>();

function readSnapshotFromStorage(): TradeSlotsState {
  if (typeof window === "undefined") {
    return SERVER_TRADE_SNAPSHOT;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        offer?: (Unit | null)[];
        request?: (Unit | null)[];
      };
      return {
        offerSlots:
          Array.isArray(parsed.offer) && parsed.offer.length === MAX_TRADE_SLOTS
            ? parsed.offer
            : createEmptySlots(),
        requestSlots:
          Array.isArray(parsed.request) &&
          parsed.request.length === MAX_TRADE_SLOTS
            ? parsed.request
            : createEmptySlots(),
      };
    }
  } catch {
    // Ignore corrupt localStorage
  }
  return {
    offerSlots: createEmptySlots(),
    requestSlots: createEmptySlots(),
  };
}

function getTradeSnapshot(): TradeSlotsState {
  if (typeof window === "undefined") {
    return SERVER_TRADE_SNAPSHOT;
  }
  if (!clientSnapshot) {
    clientSnapshot = readSnapshotFromStorage();
  }
  return clientSnapshot;
}

function getServerTradeSnapshot(): TradeSlotsState {
  return SERVER_TRADE_SNAPSHOT;
}

function updateTradeSnapshot(
  updater: (prev: TradeSlotsState) => TradeSlotsState
) {
  const next = updater(getTradeSnapshot());
  clientSnapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          offer: next.offerSlots,
          request: next.requestSlots,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribeTradeStore(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      clientSnapshot = readSnapshotFromStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const TradeContext = createContext<TradeContextValue | null>(null);

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const { offerSlots, requestSlots } = useSyncExternalStore(
    subscribeTradeStore,
    getTradeSnapshot,
    getServerTradeSnapshot
  );
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "warning" = "success") => {
      const id = Date.now();
      setToast({ id, message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 3200);
    },
    []
  );

  const setSlot = useCallback(
    (side: TradeSide, index: number, unit: Unit | null) => {
      if (index < 0 || index >= MAX_TRADE_SLOTS) return;
      updateTradeSnapshot((prev) => {
        const list =
          side === "offer" ? [...prev.offerSlots] : [...prev.requestSlots];
        list[index] = unit;
        return side === "offer"
          ? { ...prev, offerSlots: list }
          : { ...prev, requestSlots: list };
      });
    },
    []
  );

  const addToSide = useCallback(
    (side: TradeSide, unit: Unit) => {
      const snapshot = getTradeSnapshot();
      const current =
        side === "offer" ? snapshot.offerSlots : snapshot.requestSlots;
      const emptyIndex = current.findIndex((item) => item === null);
      const sideLabel =
        side === "offer" ? "Ваше предложение" : "Их предложение";

      if (emptyIndex === -1) {
        showToast(`Все 9 слотов стороны «${sideLabel}» заняты`, "warning");
        return false;
      }

      updateTradeSnapshot((prev) => {
        const list =
          side === "offer" ? [...prev.offerSlots] : [...prev.requestSlots];
        const idx = list.findIndex((item) => item === null);
        if (idx === -1) return prev;
        list[idx] = unit;
        return side === "offer"
          ? { ...prev, offerSlots: list }
          : { ...prev, requestSlots: list };
      });

      showToast(
        `${unit.name} добавлен в «${sideLabel}» (${emptyIndex + 1}/9)`
      );
      return true;
    },
    [showToast]
  );

  const duplicateSlot = useCallback(
    (side: TradeSide, index: number) => {
      const snapshot = getTradeSnapshot();
      const current =
        side === "offer" ? snapshot.offerSlots : snapshot.requestSlots;
      const sourceUnit = current[index];
      if (!sourceUnit) return false;
      return addToSide(side, sourceUnit);
    },
    [addToSide]
  );

  const swapSides = useCallback(() => {
    updateTradeSnapshot((prev) => ({
      offerSlots: prev.requestSlots,
      requestSlots: prev.offerSlots,
    }));
  }, []);

  const clearSide = useCallback((side: TradeSide) => {
    updateTradeSnapshot((prev) =>
      side === "offer"
        ? { ...prev, offerSlots: createEmptySlots() }
        : { ...prev, requestSlots: createEmptySlots() }
    );
  }, []);

  const clearAll = useCallback(() => {
    updateTradeSnapshot(() => ({
      offerSlots: createEmptySlots(),
      requestSlots: createEmptySlots(),
    }));
  }, []);

  const loadSampleTrade = useCallback((units: Unit[]) => {
    const priced = units.filter((u) => u.value !== null && u.value >= 100);
    if (priced.length < 4) return;
    const targetBig =
      priced.find((u) => u.value! >= 1500 && u.value! <= 2500) ?? priced[0];
    const mediumPool = priced.filter(
      (u) => u.slug !== targetBig.slug && u.value! >= 300 && u.value! <= 950
    );
    const nextOffer = createEmptySlots();
    const nextRequest = createEmptySlots();

    nextOffer[0] = targetBig;
    mediumPool.slice(0, 3).forEach((u, i) => {
      nextRequest[i] = u;
    });

    updateTradeSnapshot(() => ({
      offerSlots: nextOffer,
      requestSlots: nextRequest,
    }));
  }, []);

  const offerCount = useMemo(
    () => offerSlots.filter(Boolean).length,
    [offerSlots]
  );
  const requestCount = useMemo(
    () => requestSlots.filter(Boolean).length,
    [requestSlots]
  );

  const value = useMemo<TradeContextValue>(
    () => ({
      offerSlots,
      requestSlots,
      offerCount,
      requestCount,
      setSlot,
      addToSide,
      duplicateSlot,
      swapSides,
      clearSide,
      clearAll,
      loadSampleTrade,
    }),
    [
      offerSlots,
      requestSlots,
      offerCount,
      requestCount,
      setSlot,
      addToSide,
      duplicateSlot,
      swapSides,
      clearSide,
      clearAll,
      loadSampleTrade,
    ]
  );

  return (
    <TradeContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed right-4 bottom-5 z-50 flex max-w-md items-center gap-3 rounded-xl border border-slate-700/80 bg-[#0d1322]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <span className="line-clamp-2 flex-1">{toast.message}</span>
          <Link
            href="/calculator"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/25"
          >
            Трейд <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </TradeContext.Provider>
  );
}

export function useTrade() {
  const ctx = useContext(TradeContext);
  if (!ctx) {
    throw new Error("useTrade must be used inside TradeProvider");
  }
  return ctx;
}
