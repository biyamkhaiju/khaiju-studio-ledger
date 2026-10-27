import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
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
const KEY = "khaiju-studio-data-v1";
interface Store {
  data: Data;
  set: (fn: (d: Data) => Data) => void;
  log: (text: string) => void;
  reset: () => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(seedData);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, loaded]);
  const value = useMemo<Store>(
    () => ({
      data,
      set: (fn) => setData((d) => fn(d)),
      log: (text) => setData((d) => ({ ...d, activity: [{ id: uid(), text, date: new Date().toISOString() }, ...d.activity].slice(0, 50) })),
      reset: () => setData(seedData()),
    }),
    [data],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
