import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { AuthScreen } from "@/components/studio/AuthScreen";
import { loadWorkspace, loadWorkspaceData, persistDataDiff, type WorkspaceInfo } from "./data-sync";
import { createSupabaseClient, isSupabaseConfigured } from "./supabase";

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
  createdBy?: string;
}
export interface Milestone { id: string; title: string; done: boolean; createdBy?: string }
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
  createdBy?: string;
}
export interface Payment { id: string; projectId: string; amount: number; date: string; note: string; createdBy?: string }
export interface Expense { id: string; projectId: string | null; category: string; amount: number; date: string; note: string; createdBy?: string }
export interface Activity { id: string; text: string; date: string; createdBy?: string }

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

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 14);

export function todayInNepal(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const day = (offset: number) => {
  const [year, month, date] = todayInNepal().split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, date + offset));
  return d.toISOString().slice(0, 10);
};
const ms = (titles: string[], doneCount: number): Milestone[] =>
  titles.map((t, i) => ({ id: uid(), title: t, done: i < doneCount }));

const WED = ["Requirements gathered", "Design draft", "Couple review", "Revisions", "Final delivery"];
const WEB = ["Discovery", "Wireframes", "UI design", "Development", "Testing", "Launch"];
const ML = ["Problem definition", "Data collection", "Preprocessing", "Model training", "Evaluation", "Deployment"];

export function seedData(): Data {
  const clients: Client[] = [
    { id: "c1", name: "Ramesh & Sunita Sharma", kind: "wedding", email: "ramesh.sharma@gmail.com", phone: "+977 9841000001", location: "Kathmandu", createdAt: day(-40) },
    { id: "c2", name: "Bikram Thapa — Himalayan Cafe", kind: "business", email: "bikram@himalayancafe.com.np", phone: "+977 9851000002", location: "Pokhara", createdAt: day(-55) },
    { id: "c3", name: "Rai Family", kind: "wedding", email: "rai.family@gmail.com", phone: "+977 9861000003", location: "Dharan", createdAt: day(-30) },
    { id: "c4", name: "Aadarsh Shrestha", kind: "business", email: "aadarsh@shrestha.dev", phone: "+977 9801000004", location: "Lalitpur", createdAt: day(-20) },
    { id: "c5", name: "Khaiju Studio (Internal)", kind: "internal", email: "studio@khaiju.com", phone: "", location: "Bhaktapur", createdAt: day(-120) },
    { id: "c6", name: "Everest Treks Pvt. Ltd.", kind: "business", email: "info@everesttreks.com.np", phone: "+977 9811000006", location: "Kathmandu", createdAt: day(-8) },
  ];
  const projects: Project[] = [
    { id: "p1", name: "Sharma Wedding Invitation", division: "wedding", clientId: "c1", status: "in_progress", budget: 25000, startDate: day(-25), deadline: day(4), description: "Animated invitation website with RSVP and venue map.", milestones: ms(WED, 3), manualProgress: 0 },
    { id: "p2", name: "The Himalayan Cafe Website", division: "website", clientId: "c2", status: "in_progress", budget: 60000, startDate: day(-40), deadline: day(12), description: "Restaurant site with menu, reservations and gallery.", milestones: ms(WEB, 4), manualProgress: 0 },
    { id: "p3", name: "Trekking Risk Prediction Model", division: "ml", clientId: "c6", status: "in_progress", budget: 80000, startDate: day(-35), deadline: day(20), description: "Predict altitude-sickness risk from trek itinerary and weather data.", milestones: ms(ML, 2), manualProgress: 0 },
    { id: "p4", name: "Rai Family Invitation Card", division: "wedding", clientId: "c3", status: "completed", budget: 18000, startDate: day(-30), deadline: day(-6), description: "Digital invitation card in Nepali and English.", milestones: ms(WED, 5), manualProgress: 0 },
    { id: "p5", name: "Portfolio Website", division: "website", clientId: "c4", status: "in_review", budget: 15000, startDate: day(-18), deadline: day(2), description: "Personal developer portfolio.", milestones: ms(WEB, 5), manualProgress: 0 },
    { id: "p6", name: "Nepali Handwriting OCR", division: "ml", clientId: "c5", status: "planning", budget: 0, startDate: day(-5), deadline: day(45), description: "Internal R&D: Devanagari handwriting recognition.", milestones: ms(ML, 1), manualProgress: 0 },
    { id: "p7", name: "Everest Treks Booking Site", division: "website", clientId: "c6", status: "planning", budget: 90000, startDate: day(-2), deadline: day(-1), description: "Booking platform with package catalogue.", milestones: ms(WEB, 0), manualProgress: 0 },
  ];
  const payments: Payment[] = [
    { id: uid(), projectId: "p1", amount: 12500, date: day(-20), note: "50% advance" },
    { id: uid(), projectId: "p2", amount: 30000, date: day(-35), note: "Advance" },
    { id: uid(), projectId: "p2", amount: 10000, date: day(-3), note: "Milestone payment" },
    { id: uid(), projectId: "p3", amount: 40000, date: day(-30), note: "Advance" },
    { id: uid(), projectId: "p4", amount: 18000, date: day(-6), note: "Full payment" },
    { id: uid(), projectId: "p5", amount: 7500, date: day(-15), note: "Advance" },
  ];
  const expenses: Expense[] = [
    { id: uid(), projectId: "p2", category: "Hosting", amount: 4500, date: day(-10), note: "Annual hosting" },
    { id: uid(), projectId: "p3", category: "Cloud GPU", amount: 12000, date: day(-12), note: "Training runs" },
    { id: uid(), projectId: null, category: "Software", amount: 3200, date: day(-4), note: "Design tool subscription" },
    { id: uid(), projectId: "p1", category: "Domain", amount: 1500, date: day(-22), note: ".com domain" },
  ];
  const activity: Activity[] = [
    { id: uid(), text: "Payment received — NPR 10,000 from Himalayan Cafe", date: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: uid(), text: "Portfolio Website moved to In Review", date: new Date(Date.now() - 5 * 3600e3).toISOString() },
    { id: uid(), text: "New client registered: Everest Treks Pvt. Ltd.", date: new Date(Date.now() - 26 * 3600e3).toISOString() },
  ];
  return { clients, projects, payments, expenses, activity };
}

// ---------- calculations ----------
export const progressOf = (p: Project) =>
  p.milestones.length ? Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100) : p.manualProgress;

export const paidFor = (d: Data, projectId: string) =>
  d.payments.filter((x) => x.projectId === projectId).reduce((s, x) => s + x.amount, 0);

export const outstandingFor = (d: Data, p: Project) =>
  p.status === "cancelled" ? 0 : Math.max(0, p.budget - paidFor(d, p.id));

export const isOverdue = (p: Project) =>
  p.status !== "completed" && p.status !== "cancelled" && p.deadline < todayInNepal();

export const daysUntil = (date: string) =>
  Math.ceil((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayInNepal()}T00:00:00Z`)) / 86400e3);

export type RangeKey = "week" | "month" | "quarter" | "year";
export function rangeStart(r: RangeKey): string {
  const [year, month, date] = todayInNepal().split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, date));
  if (r === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (r === "month") d.setUTCDate(1);
  if (r === "quarter") { d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3); d.setUTCDate(1); }
  if (r === "year") { d.setUTCMonth(0); d.setUTCDate(1); }
  return d.toISOString().slice(0, 10);
}

export const npr = (n: number) => "NPR " + n.toLocaleString("en-IN");

// ---------- store ----------
const KEY = "khaiju-studio-preview-data-v1";
const emptyData = (): Data => ({ clients: [], projects: [], payments: [], expenses: [], activity: [] });

export interface SignedInUser {
  id: string;
  email: string;
  fullName: string;
}

interface Store {
  data: Data;
  set: (fn: (d: Data) => Data) => void;
  log: (text: string) => void;
  reset: () => void;
  mode: "preview" | "remote";
  user: SignedInUser | null;
  workspace: WorkspaceInfo | null;
  syncError: string;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [data, setData] = useState<Data>(emptyData);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const dataRef = useRef<Data>(emptyData());
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    setClient(supabase);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (nextSession) setPreviewMode(false);
    });
    void supabase.auth.getSession().then(({ data: result, error }) => {
      if (error) setAuthError(error.message);
      setSession(result.session);
      setAuthReady(true);
    }).catch((error: unknown) => {
      setAuthError(error instanceof Error ? error.message : "Could not check your sign-in session.");
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setWorkspace(null);
      setLoadingWorkspace(false);
      if (!previewMode) {
        const empty = emptyData();
        dataRef.current = empty;
        setData(empty);
      }
      return;
    }
    if (!client || previewMode) return;

    let active = true;
    setLoadingWorkspace(true);
    setLoadError("");
    setSyncError("");
    setWorkspace(null);
    const empty = emptyData();
    dataRef.current = empty;
    setData(empty);

    void (async () => {
      try {
        const nextWorkspace = await loadWorkspace(client);
        const nextData = await loadWorkspaceData(client, nextWorkspace.id);
        if (!active) return;
        setWorkspace(nextWorkspace);
        dataRef.current = nextData;
        setData(nextData);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Could not load your workspace.");
      } finally {
        if (active) setLoadingWorkspace(false);
      }
    })();
    return () => { active = false; };
  }, [client, session?.user.id, previewMode, reloadCount]);

  const enterPreview = () => {
    let next = seedData();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Data;
        if (Array.isArray(parsed.clients) && Array.isArray(parsed.projects)) next = parsed;
      }
    } catch {
      next = seedData();
    }
    dataRef.current = next;
    setData(next);
    setWorkspace(null);
    setSyncError("");
    setPreviewMode(true);
  };

  const commit = (next: Data) => {
    const previous = dataRef.current;
    dataRef.current = next;
    setData(next);

    if (previewMode) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        setSyncError("");
      } catch {
        setSyncError("This browser could not save the preview data.");
      }
      return;
    }

    if (!client || !session || !workspace) return;
    const userId = session.user.id;
    const workspaceId = workspace.id;
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => persistDataDiff(client, workspaceId, userId, previous, next))
      .then(() => setSyncError(""))
      .catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : "Could not save changes to Supabase.");
      });
  };

  const user: SignedInUser | null = session
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        fullName: String(session.user.user_metadata?.full_name ?? ""),
      }
    : null;

  const value: Store = {
    data,
    set: (fn) => commit(fn(dataRef.current)),
    log: (text) => commit({
      ...dataRef.current,
      activity: [{ id: uid(), text, date: new Date().toISOString() }, ...dataRef.current.activity].slice(0, 100),
    }),
    reset: () => {
      if (previewMode) commit(seedData());
    },
    mode: previewMode ? "preview" : "remote",
    user,
    workspace,
    syncError,
    signOut: async () => {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) setSyncError(error.message);
      setPreviewMode(false);
    },
  };

  if (!isSupabaseConfigured) {
    return (
      <StatusScreen title="Supabase setup needed">
        Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values to this app's Replit Secrets, then restart the preview.
      </StatusScreen>
    );
  }
  if (!client || !authReady) {
    return <StatusScreen title="Connecting to Khaiju Studio">Checking your sign-in session…</StatusScreen>;
  }
  if (authError && !session) {
    return (
      <StatusScreen title="Could not connect to Supabase">
        {authError}
      </StatusScreen>
    );
  }
  if (!session && !previewMode) {
    return <AuthScreen client={client} onPreview={enterPreview} />;
  }
  if (session && loadingWorkspace) {
    return <StatusScreen title="Opening your workspace">Loading your private studio records…</StatusScreen>;
  }
  if (session && loadError) {
    return (
      <StatusScreen title="Finish setting up the database">
        <p>{loadError}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Run <span className="font-mono text-foreground">supabase/migrations/20261027_initial_schema.sql</span> in your Supabase SQL Editor, then retry.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          <Button variant="secondary" onClick={() => void value.signOut()}>Sign out</Button>
        </div>
      </StatusScreen>
    );
  }
  if (session && !workspace) {
    return <StatusScreen title="Opening your workspace">Loading workspace details…</StatusScreen>;
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function StatusScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-panel p-7 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <span className="text-lg font-bold">K</span>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </section>
    </main>
  );
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore outside provider");
  return store;
}
