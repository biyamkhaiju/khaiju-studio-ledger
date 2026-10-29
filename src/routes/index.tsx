import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FolderKanban, Wallet, AlertCircle, Users, ChevronRight, Heart, Globe, BrainCircuit, UserPlus, Receipt, CreditCard } from "lucide-react";
import { DIVISIONS, useStore, progressOf, paidFor, outstandingFor, isOverdue, daysUntil, rangeStart, npr, type Division, type RangeKey } from "@/lib/store";
import { DivIcon, ProgressBar, StatusBadge, DIV_STYLE } from "@/components/studio/ui";
import { useQuickCreate } from "@/components/studio/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Khaiju Studio" },
      { name: "description", content: "Khaiju Studio command center: projects, progress, revenue and deadlines at a glance." },
      { property: "og:title", content: "Dashboard — Khaiju Studio" },
      { property: "og:description", content: "Khaiju Studio command center: projects, progress, revenue and deadlines at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const RANGES: { k: RangeKey; l: string }[] = [
  { k: "week", l: "This week" }, { k: "month", l: "This month" }, { k: "quarter", l: "This quarter" }, { k: "year", l: "This year" },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { data } = useStore();
  const quick = useQuickCreate();
  const [range, setRange] = useState<RangeKey>("month");
  const [tab, setTab] = useState<Division | "all">("all");
  const start = rangeStart(range);
  const divOf = (pid: string) => data.projects.find((p) => p.id === pid)?.division;

  const active = data.projects.filter((p) => !["completed", "cancelled"].includes(p.status));
  const received = data.payments.filter((x) => x.date >= start).reduce((s, x) => s + x.amount, 0);
  const spent = data.expenses.filter((x) => x.date >= start).reduce((s, x) => s + x.amount, 0);
  const outstanding = data.projects.reduce((s, p) => s + outstandingFor(data, p), 0);
  const overdue = data.projects.filter(isOverdue);

  const chart = useMemo(() => {
    const rows: Record<string, { m: string; wedding: number; website: number; ml: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      rows[key] = { m: d.toLocaleString("en", { month: "short", timeZone: "UTC" }), wedding: 0, website: 0, ml: 0 };
    }
    data.payments.forEach((x) => { const r = rows[x.date.slice(0, 7)]; const dv = divOf(x.projectId); if (r && dv) r[dv] += x.amount; });
    return Object.values(rows);
  }, [data]);

  const deadlines = [...active].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5);
  const recent = data.projects.filter((p) => tab === "all" || p.division === tab).slice().reverse().slice(0, 6);

  const now = new Date();
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greeting()}, Biyam! 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening across your studio.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{now.toLocaleDateString("en-GB", { timeZone: "Asia/Kathmandu", weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          <div className="flex rounded-lg border border-border bg-panel p-0.5">
            {RANGES.map((r) => (
              <button key={r.k} onClick={() => setRange(r.k)} className={cn("rounded-md px-2.5 py-1 text-xs transition-colors", range === r.k ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{r.l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FolderKanban} tone="text-primary bg-primary/15" label="Active projects" value={String(active.length)} sub={`${data.projects.length} total · ${overdue.length} overdue`} />
        <Stat icon={Wallet} tone="text-success bg-success/15" label="Received" value={npr(received)} sub={`Profit ${npr(received - spent)} after ${npr(spent)} spent`} />
        <Stat icon={AlertCircle} tone="text-warning bg-warning/15" label="Outstanding" value={npr(outstanding)} sub="Contract value not yet paid" />
        <Stat icon={Users} tone="text-ml bg-ml/15" label="Clients" value={String(data.clients.length)} sub={`${new Set(active.map((p) => p.clientId)).size} with active work`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(DIVISIONS) as Division[]).map((d) => {
          const ps = data.projects.filter((p) => p.division === d);
          const rev = ps.reduce((s, p) => s + paidFor(data, p.id), 0);
          const done = ps.filter((p) => p.status === "completed").length;
          const avg = ps.length ? Math.round(ps.reduce((s, p) => s + progressOf(p), 0) / ps.length) : 0;
          return (
            <Link key={d} to="/projects" search={{ division: d }} className="panel group p-5 transition-colors hover:border-ring/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><DivIcon division={d} /><span className="font-medium">{DIVISIONS[d].label}</span></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-semibold">{ps.length}</span>
                <div className="text-right"><div className="text-[11px] text-muted-foreground">Received</div><div className="text-sm font-medium">{npr(rev)}</div></div>
              </div>
              <ProgressBar value={avg} division={d} className="mt-4" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{done} completed · {ps.length - done} open</span><span>avg {avg}%</span></div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Recent projects</h2>
            <div className="flex gap-1 text-xs">
              {(["all", "wedding", "website", "ml"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-2.5 py-1", tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{t === "all" ? "All" : DIVISIONS[t].short}</button>
              ))}
              <Link to="/projects" className="ml-2 px-2 py-1 text-primary">View all →</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-normal">Project</th><th className="pb-2 font-normal">Progress</th><th className="pb-2 font-normal">Value</th><th className="pb-2 font-normal">Deadline</th><th className="pb-2 font-normal">Status</th><th /></tr></thead>
              <tbody>
                {recent.map((p) => {
                  const pr = progressOf(p);
                  return (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="py-3"><Link to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-3 hover:text-primary"><DivIcon division={p.division} size="sm" /><span><span className="block font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{data.clients.find((c) => c.id === p.clientId)?.name}</span></span></Link></td>
                      <td className="w-40 py-3"><div className="flex items-center gap-2"><ProgressBar value={pr} division={p.division} /><span className="w-9 text-xs text-muted-foreground">{pr}%</span></div></td>
                      <td className="py-3">{npr(p.budget)}</td>
                      <td className="py-3 text-muted-foreground">{p.deadline}</td>
                      <td className="py-3"><StatusBadge status={p.status} overdue={isOverdue(p)} /></td>
                      <td className="py-3"><Link to="/projects/$projectId" params={{ projectId: p.id }}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-semibold">Revenue received</h2>
          <p className="text-xs text-muted-foreground">Last 6 months by division</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <AreaChart data={chart} margin={{ left: -10, right: 4 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => npr(v)} />
                <Area type="monotone" dataKey="wedding" name="Wedding" stackId="1" stroke="var(--wedding)" fill="var(--wedding)" fillOpacity={0.25} />
                <Area type="monotone" dataKey="website" name="Website" stackId="1" stroke="var(--website)" fill="var(--website)" fillOpacity={0.25} />
                <Area type="monotone" dataKey="ml" name="ML/DL" stackId="1" stroke="var(--ml)" fill="var(--ml)" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-around text-xs">
            {(Object.keys(DIVISIONS) as Division[]).map((d) => <span key={d} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", DIV_STYLE[d].bg)} />{DIVISIONS[d].short}</span>)}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Needs attention</h2>
          <div className="space-y-3">
            {deadlines.map((p) => {
              const dl = daysUntil(p.deadline);
              return (
                <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-3 rounded-lg p-1 hover:bg-accent/50">
                  <DivIcon division={p.division} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{p.name}</div>
                    <ProgressBar value={progressOf(p)} division={p.division} className="mt-1.5" />
                  </div>
                  <span className={cn("w-20 text-right text-xs", dl < 0 ? "text-danger" : dl <= 3 ? "text-warning" : "text-muted-foreground")}>{dl < 0 ? `${-dl}d overdue` : dl === 0 ? "Today" : `in ${dl}d`}</span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <ul className="space-y-3">
            {data.activity.length === 0 && <li className="text-sm text-muted-foreground">No activity recorded yet.</li>}
            {data.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><div><div>{a.text}</div><div className="text-xs text-muted-foreground">{new Date(a.date).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div></li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <QA icon={Heart} cls="text-wedding" label="Wedding project" onClick={() => quick("wedding")} />
            <QA icon={Globe} cls="text-website" label="Website project" onClick={() => quick("website")} />
            <QA icon={BrainCircuit} cls="text-ml" label="ML/DL project" onClick={() => quick("ml")} />
            <QA icon={UserPlus} cls="text-success" label="Add client" onClick={() => quick("client")} />
            <QA icon={CreditCard} cls="text-success" label="Record payment" onClick={() => quick("payment")} />
            <QA icon={Receipt} cls="text-warning" label="Record expense" onClick={() => quick("expense")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, sub }: { icon: typeof Wallet; tone: string; label: string; value: string; sub: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3"><span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tone)}><Icon className="h-4.5 w-4.5" /></span><span className="text-sm text-muted-foreground">{label}</span></div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function QA({ icon: Icon, cls, label, onClick }: { icon: typeof Wallet; cls: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-2 rounded-lg border border-border bg-panel p-3 text-left text-xs transition-colors hover:border-ring/50 hover:bg-accent/40">
      <Icon className={cn("h-4 w-4", cls)} />{label}
    </button>
  );
}
