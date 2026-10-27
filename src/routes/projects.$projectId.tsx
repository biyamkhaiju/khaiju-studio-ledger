import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { DIVISIONS, STATUSES, useStore, progressOf, paidFor, outstandingFor, isOverdue, npr, uid, type Project, type ProjectStatus } from "@/lib/store";
import { DivIcon, ProgressBar, StatusBadge } from "@/components/studio/ui";
import { useQuickCreate } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project details — Khaiju Studio" },
      { name: "description", content: "Project milestones, finances and status." },
      { property: "og:title", content: "Project details — Khaiju Studio" },
      { property: "og:description", content: "Project milestones, finances and status." },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { data, set, log } = useStore();
  const navigate = useNavigate();
  const quick = useQuickCreate();
  const [newMs, setNewMs] = useState("");
  const p = data.projects.find((x) => x.id === projectId);
  if (!p) return <div className="p-10 text-center text-muted-foreground">Project not found. <Link to="/projects" className="text-primary">Back to projects</Link></div>;

  const update = (patch: Partial<Project>) => set((d) => ({ ...d, projects: d.projects.map((x) => (x.id === p.id ? { ...x, ...patch } : x)) }));
  const client = data.clients.find((c) => c.id === p.clientId);
  const paid = paidFor(data, p.id);
  const spent = data.expenses.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.amount, 0);
  const pr = progressOf(p);
  const history = [
    ...data.payments.filter((x) => x.projectId === p.id).map((x) => ({ ...x, type: "Payment" as const })),
    ...data.expenses.filter((x) => x.projectId === p.id).map((x) => ({ ...x, type: "Expense" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link to="/projects" search={{ division: p.division }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {DIVISIONS[p.division].label}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <DivIcon division={p.division} />
          <div>
            <input value={p.name} onChange={(e) => update({ name: e.target.value })} className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none" />
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">{client?.name} · <StatusBadge status={p.status} overdue={isOverdue(p)} /></div>
          </div>
        </div>
        <Button variant="ghost" className="text-danger" onClick={() => {
          if (!confirm("Delete this project and its payments/expenses?")) return;
          set((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== p.id), payments: d.payments.filter((x) => x.projectId !== p.id), expenses: d.expenses.filter((x) => x.projectId !== p.id) }));
          log(`Project deleted: ${p.name}`);
          navigate({ to: "/projects" });
        }}><Trash2 className="h-4 w-4" /> Delete</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Progress" value={`${pr}%`}><ProgressBar value={pr} division={p.division} className="mt-2" /></Kpi>
        <Kpi label="Contract value" value={npr(p.budget)} />
        <Kpi label="Received" value={npr(paid)} sub={`Outstanding ${npr(outstandingFor(data, p))}`} />
        <Kpi label="Profit so far" value={npr(paid - spent)} sub={`${npr(spent)} expenses`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Milestones</h2>
          <p className="mb-4 text-xs text-muted-foreground">Progress is calculated from completed milestones.</p>
          <ul className="space-y-1">
            {p.milestones.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/40">
                <Checkbox checked={m.done} onCheckedChange={(c) => {
                  const milestones = p.milestones.map((x) => (x.id === m.id ? { ...x, done: !!c } : x));
                  const all = milestones.every((x) => x.done);
                  update({ milestones, status: all ? "completed" : p.status === "completed" ? "in_progress" : p.status === "planning" && c ? "in_progress" : p.status });
                  if (c) log(`${p.name}: "${m.title}" completed`);
                }} />
                <span className={m.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{m.title}</span>
                <button className="opacity-0 group-hover:opacity-100" onClick={() => update({ milestones: p.milestones.filter((x) => x.id !== m.id) })} aria-label="Remove"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newMs.trim()) return; update({ milestones: [...p.milestones, { id: uid(), title: newMs.trim(), done: false }] }); setNewMs(""); }}>
            <Input placeholder="Add milestone…" value={newMs} onChange={(e) => setNewMs(e.target.value)} />
            <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /></Button>
          </form>
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Details</h2>
          <Row label="Status">
            <select value={p.status} onChange={(e) => { update({ status: e.target.value as ProjectStatus }); log(`${p.name} moved to ${STATUSES[e.target.value as ProjectStatus]}`); }} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Row>
          <Row label="Client">
            <select value={p.clientId} onChange={(e) => update({ clientId: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Row>
          <Row label="Contract value (NPR)"><Input type="number" min={0} value={p.budget} onChange={(e) => update({ budget: Math.max(0, Number(e.target.value)) })} /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Start"><Input type="date" value={p.startDate} onChange={(e) => update({ startDate: e.target.value })} /></Row>
            <Row label="Deadline"><Input type="date" value={p.deadline} onChange={(e) => update({ deadline: e.target.value })} /></Row>
          </div>
          <Row label="Description"><textarea value={p.description} onChange={(e) => update({ description: e.target.value })} rows={3} className="w-full rounded-md border border-input bg-background p-2 text-sm" /></Row>
        </section>
      </div>

      <section className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Payments & expenses</h2>
          <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => quick("payment")}>Record payment</Button><Button size="sm" variant="secondary" onClick={() => quick("expense")}>Record expense</Button></div>
        </div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
          <table className="w-full text-sm">
            <tbody>{history.map((h) => (
              <tr key={h.id} className="border-t border-border/60 [&>td]:py-2.5">
                <td className="text-muted-foreground">{h.date}</td><td>{h.type}</td><td className="text-muted-foreground">{h.note}</td>
                <td className={h.type === "Payment" ? "text-right text-success" : "text-right text-danger"}>{h.type === "Payment" ? "+" : "−"}{npr(h.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return <div className="panel p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div>{sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}{children}</div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>;
}
