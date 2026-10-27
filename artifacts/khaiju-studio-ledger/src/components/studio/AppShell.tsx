import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Heart, Globe, BrainCircuit, FlaskConical, Users, Wallet, Image, CalendarDays, Settings,
  ChevronDown, Search, Bell, Plus, Menu, X, Mountain,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { QuickCreateDialog, type CreateKind } from "./QuickCreate";
import { useStore, isOverdue, daysUntil } from "@/lib/store";
import { cn } from "@/lib/utils";

type Item = { label: string; to: string; search?: Record<string, string> };
type Group = { label: string; icon: typeof Heart; to?: string; items?: Item[] };

const soon = (m: string): Item["to"] => `/soon/${m}`;
const NAV: Group[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Wedding Invitations", icon: Heart, items: [
    { label: "All Projects", to: "/projects", search: { division: "wedding" } },
    { label: "Templates", to: soon("templates") }, { label: "Orders", to: soon("orders") },
  ]},
  { label: "Websites & Business", icon: Globe, items: [
    { label: "All Projects", to: "/projects", search: { division: "website" } },
    { label: "Domains & Hosting", to: soon("domains") }, { label: "Maintenance", to: soon("maintenance") },
  ]},
  { label: "ML / DL Projects", icon: BrainCircuit, items: [
    { label: "Projects", to: "/projects", search: { division: "ml" } },
    { label: "Models & Experiments", to: soon("experiments") }, { label: "Datasets", to: soon("datasets") },
  ]},
  { label: "Internal R&D", icon: FlaskConical, items: [
    { label: "Research Projects", to: soon("research") }, { label: "Learning Roadmap", to: soon("roadmap") },
  ]},
  { label: "Client Management", icon: Users, items: [
    { label: "All Clients", to: "/clients" }, { label: "Leads", to: soon("leads") }, { label: "Meetings", to: soon("meetings") },
  ]},
  { label: "Finance & Invoices", icon: Wallet, items: [
    { label: "Financial Overview", to: "/finance" }, { label: "Invoices", to: soon("invoices") },
  ]},
  { label: "Content & Media", icon: Image, to: soon("media") },
  { label: "Tasks & Calendar", icon: CalendarDays, to: soon("calendar") },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const QCtx = createContext<(k: CreateKind) => void>(() => {});
export const useQuickCreate = () => useContext(QCtx);

export function AppShell({ children }: { children: ReactNode }) {
  const [create, setCreate] = useState<CreateKind | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.href });
  useEffect(() => setMobileOpen(false), [path]);

  return (
    <QCtx.Provider value={setCreate}>
      <div className="flex min-h-screen w-full">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}>
          <Sidebar onClose={() => setMobileOpen(false)} />
        </aside>
        {mobileOpen && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setMobileOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMobileOpen(true)} onCreate={setCreate} />
          <main className="flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto mb-5 flex max-w-[1400px] items-center gap-2 rounded-lg border border-border/70 bg-panel/70 px-3 py-2 text-xs text-muted-foreground">
              <span className="shrink-0 font-medium text-foreground">Preview mode</span>
              <span>Sample records are stored only in this browser and are not shared real data.</span>
            </div>
            {children}
          </main>
        </div>
      </div>
      <QuickCreateDialog kind={create} onClose={() => setCreate(null)} />
    </QCtx.Provider>
  );
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const loc = useRouterState({ select: (s) => s.location });
  const division = (loc.search as Record<string, string>)["division"];
  const isActive = (it: { to?: string; search?: Record<string, string> }) =>
    it.to === "/" ? loc.pathname === "/" : !!it.to && loc.pathname === it.to && (!it.search || it.search["division"] === division);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Mountain className="h-5 w-5" /></span>
        <div className="flex-1">
          <div className="text-sm font-bold tracking-wide">KHAIJU STUDIO</div>
          <div className="text-[11px] text-muted-foreground">Build • Create • Grow</div>
        </div>
        <button className="lg:hidden" onClick={onClose} aria-label="Close menu"><X className="h-4 w-4" /></button>
      </div>
      <nav className="space-y-0.5">
        {NAV.map((g) => {
          const Icon = g.icon;
          if (!g.items) {
            return (
              <Link key={g.label} to={g.to!} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/60", isActive(g) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")}>
                <Icon className="h-4 w-4" /> {g.label}
              </Link>
            );
          }
          const childActive = g.items.some(isActive);
          const isOpen = open[g.label] ?? childActive;
          return (
            <div key={g.label}>
              <button onClick={() => setOpen({ ...open, [g.label]: !isOpen })} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/60", childActive && "text-sidebar-accent-foreground")}>
                <Icon className="h-4 w-4" /> <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="ml-5 border-l border-sidebar-border py-1 pl-3">
                  {g.items.map((it) => (
                    <Link key={it.label} to={it.to} search={it.search as never} className={cn("block rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground", isActive(it) && "bg-sidebar-accent/70 text-foreground")}>
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-sidebar-border bg-panel p-4 text-xs italic text-muted-foreground">
        "Discipline today, freedom tomorrow."
      </div>
    </div>
  );
}

function TopBar({ onMenu, onCreate }: { onMenu: () => void; onCreate: (k: CreateKind) => void }) {
  const { data } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return [
      ...data.projects.filter((p) => p.name.toLowerCase().includes(t)).map((p) => ({ id: p.id, label: p.name, kind: "Project" as const })),
      ...data.clients.filter((c) => c.name.toLowerCase().includes(t)).map((c) => ({ id: c.id, label: c.name, kind: "Client" as const })),
    ].slice(0, 8);
  }, [q, data]);
  const alerts = data.projects.filter((p) => isOverdue(p) || (p.status !== "completed" && daysUntil(p.deadline) >= 0 && daysUntil(p.deadline) <= 3));

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
      <button className="lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder="Search projects, clients…" className="h-10 w-full rounded-lg border border-border bg-panel pl-9 pr-16 text-sm outline-none focus:border-ring" />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-[11px] text-muted-foreground sm:block">Ctrl K</kbd>
        {focus && results.length > 0 && (
          <div className="absolute inset-x-0 top-12 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
            {results.map((r) => (
              <button key={r.id} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => { setQ(""); r.kind === "Project" ? navigate({ to: "/projects/$projectId", params: { projectId: r.id } }) : navigate({ to: "/clients" }); }}>
                {r.label}<span className="text-xs text-muted-foreground">{r.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-lg p-2 hover:bg-accent" aria-label="Notifications">
              <Bell className="h-4.5 w-4.5" />
              {alerts.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {alerts.length === 0 && <div className="p-3 text-sm text-muted-foreground">All caught up.</div>}
            {alerts.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}>
                <span className={isOverdue(p) ? "text-danger" : "text-warning"}>{isOverdue(p) ? "Overdue" : `Due in ${daysUntil(p.deadline)}d`}</span>
                <span className="truncate">{p.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onCreate("wedding")}>Wedding project</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreate("website")}>Website project</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreate("ml")}>ML/DL project</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreate("client")}>Client</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreate("payment")}>Payment</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreate("expense")}>Expense</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link to="/settings" className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">BK</span>
          <span className="hidden text-left leading-tight md:block"><span className="block text-sm">Biyam Khaiju</span><span className="block text-[11px] text-muted-foreground">Founder</span></span>
        </Link>
      </div>
    </header>
  );
}
