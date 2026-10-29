import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyLedger, LEDGER_KEY, readLocalLedger } from "./local-ledger";

export type Division = "wedding" | "website" | "ml";
export type ProjectStatus = "planning" | "in_progress" | "in_review" | "completed" | "on_hold" | "cancelled";

export interface Client {
  id: string;
  name: string;
  kind: "wedding" | "business" | "internal";
  email: string;
  phone: string;
  location: string;
  createdAt: string;
}
export interface Milestone { id: string; title: string; done: boolean }
export interface Project {
  id: string;
  name: string;
  division: Division;
  clientId: string;
  status: ProjectStatus;
  budget: number;
  startDate: string;
  deadline: string;
  description: string;
  milestones: Milestone[];
  manualProgress: number;
}
export interface Payment { id: string; projectId: string; amount: number; date: string; note: string }
export interface Expense { id: string; projectId: string | null; category: string; amount: number; date: string; note: string }
export interface Activity { id: string; text: string; date: string }

export interface Data {
  clients: Client[];
  projects: Project[];
  payments: Payment[];
  expenses: Expense[];
  activity: Activity[];
}

export const DIVISIONS: Record<Division, { label: string; short: string }> = {
  wedding: { label: "Wedding Invitations", short: "Wedding" },
  website: { label: "Websites & Business", short: "Website" },
  ml: { label: "ML / DL Projects", short: "ML/DL" },
};
export const STATUSES: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export const uid = () => Math.random().toString(36).slice(2, 10);
// ---------- calculations ----------
export const progressOf = (p: Project) =>
  p.milestones.length ? Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100) : p.manualProgress;

export const paidFor = (d: Data, projectId: string) =>
  d.payments.filter((x) => x.projectId === projectId).reduce((s, x) => s + x.amount, 0);

export const outstandingFor = (d: Data, p: Project) =>
  p.status === "cancelled" ? 0 : Math.max(0, p.budget - paidFor(d, p.id));

export const isOverdue = (p: Project) =>
  p.status !== "completed" && p.status !== "cancelled" && p.deadline < new Date().toISOString().slice(0, 10);

export const daysUntil = (date: string) =>
  Math.ceil((new Date(date + "T00:00:00").getTime() - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime()) / 86400e3);

export type RangeKey = "week" | "month" | "quarter" | "year";
export function rangeStart(r: RangeKey): string {
  const d = new Date();
  if (r === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (r === "month") d.setDate(1);
  if (r === "quarter") { d.setMonth(Math.floor(d.getMonth() / 3) * 3); d.setDate(1); }
  if (r === "year") { d.setMonth(0); d.setDate(1); }
  return d.toISOString().slice(0, 10);
}

export const npr = (n: number) => "NPR " + n.toLocaleString("en-IN");

// ---------- store ----------
interface Store {
  data: Data;
  set: (fn: (d: Data) => Data) => void;
  log: (text: string) => void;
  storageError: string | null;
  loaded: boolean;
  retry: () => void;
  downloadOriginal: () => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyLedger);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const dirty = useRef(false);
  useEffect(() => {
    try {
      const result = readLocalLedger(localStorage.getItem(LEDGER_KEY));
      if (result.data) setData(result.data);
      setStorageError(result.error);
    } catch {
      setStorageError("Browser storage is unavailable. Saving is paused; your existing records have not been replaced.");
    }
    setLoaded(true);
  }, [attempt]);
  useEffect(() => {
    if (!loaded || storageError || !dirty.current) return;
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(data));
      dirty.current = false;
    } catch {
      setStorageError("Your changes could not be saved in this browser. Saving is paused. Download your current records before leaving.");
    }
  }, [data, loaded, storageError]);
  const value = useMemo<Store>(
    () => ({
      data, loaded, storageError,
      set: (fn) => { if (!loaded || storageError) return; dirty.current = true; setData(fn); },
      log: (text) => { if (!loaded || storageError) return; dirty.current = true; setData((d) => ({ ...d, activity: [{ id: uid(), text, date: new Date().toISOString() }, ...d.activity] })); },
      retry: () => {
        if (dirty.current) {
          try { localStorage.setItem(LEDGER_KEY, JSON.stringify(data)); dirty.current = false; setStorageError(null); } catch { /* Retain unsaved changes and visible error. */ }
          return;
        }
        setAttempt((n) => n + 1);
      },
      downloadOriginal: () => {
        try {
          const raw = localStorage.getItem(LEDGER_KEY);
          if (raw === null) return;
          const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
          const a = document.createElement("a"); a.href = url; a.download = "khaiju-original-browser-records.json"; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setStorageError("The original browser copy cannot be accessed. Please allow browser storage and retry."); }
      },
    }),
    [data, loaded, storageError],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
