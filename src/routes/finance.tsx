import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, paidFor, outstandingFor, npr } from "@/lib/store";
import { DivIcon, PageHeader } from "@/components/studio/ui";
import { useQuickCreate } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Khaiju Studio" },
      { name: "description", content: "Contracted, received, outstanding, expenses and profit per project in NPR." },
      { property: "og:title", content: "Finance — Khaiju Studio" },
      { property: "og:description", content: "Contracted, received, outstanding, expenses and profit per project in NPR." },
    ],
  }),
  component: Finance,
});

function Finance() {
  const { data, set } = useStore();
  const quick = useQuickCreate();
  const contracted = data.projects.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.budget, 0);
  const received = data.payments.reduce((s, x) => s + x.amount, 0);
  const spent = data.expenses.reduce((s, x) => s + x.amount, 0);
  const owed = data.projects.reduce((s, p) => s + outstandingFor(data, p), 0);
  const pname = (id: string | null) => data.projects.find((p) => p.id === id)?.name ?? "Studio-wide";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Financial overview" subtitle="All amounts in Nepalese Rupees">
        <div className="flex gap-2"><Button variant="secondary" onClick={() => quick("expense")}>Record expense</Button><Button onClick={() => quick("payment")}>Record payment</Button></div>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <K l="Contracted" v={npr(contracted)} c="" />
        <K l="Received" v={npr(received)} c="text-success" />
        <K l="Outstanding" v={npr(owed)} c="text-warning" />
        <K l="Expenses" v={npr(spent)} c="text-danger" />
        <K l="Net profit" v={npr(received - spent)} c={received - spent >= 0 ? "text-success" : "text-danger"} />
      </div>

      <section className="panel overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Project profitability</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="[&>th]:pb-2 [&>th]:font-normal"><th>Project</th><th className="text-right">Contract</th><th className="text-right">Received</th><th className="text-right">Outstanding</th><th className="text-right">Expenses</th><th className="text-right">Profit</th><th className="text-right">Margin</th></tr></thead>
          <tbody>
            {data.projects.map((p) => {
              const r = paidFor(data, p.id);
              const e = data.expenses.filter((x) => x.projectId === p.id).reduce((s, x) => s + x.amount, 0);
              const profit = r - e;
              return (
                <tr key={p.id} className="border-t border-border/60 [&>td]:py-2.5">
                  <td><Link to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-2 hover:text-primary"><DivIcon division={p.division} size="sm" />{p.name}</Link></td>
                  <td className="text-right">{npr(p.budget)}</td>
                  <td className="text-right text-success">{npr(r)}</td>
                  <td className="text-right text-warning">{npr(outstandingFor(data, p))}</td>
                  <td className="text-right text-danger">{npr(e)}</td>
                  <td className={profit >= 0 ? "text-right font-medium" : "text-right font-medium text-danger"}>{npr(profit)}</td>
                  <td className="text-right text-muted-foreground">{r ? `${Math.round((profit / r) * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ledger title="Payments" rows={data.payments.map((x) => ({ id: x.id, date: x.date, label: pname(x.projectId), note: x.note, amount: x.amount }))} cls="text-success"
          onDelete={(id) => set((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== id) }))} />
        <Ledger title="Expenses" rows={data.expenses.map((x) => ({ id: x.id, date: x.date, label: `${x.category} · ${pname(x.projectId)}`, note: x.note, amount: x.amount }))} cls="text-danger"
          onDelete={(id) => set((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }))} />
      </div>
    </div>
  );
}

function K({ l, v, c }: { l: string; v: string; c: string }) {
  return <div className="panel p-4"><div className="text-xs text-muted-foreground">{l}</div><div className={`mt-1 text-xl font-semibold ${c}`}>{v}</div></div>;
}

function Ledger({ title, rows, cls, onDelete }: { title: string; rows: { id: string; date: string; label: string; note: string; amount: number }[]; cls: string; onDelete: (id: string) => void }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <table className="w-full text-sm"><tbody>
        {[...rows].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
          <tr key={r.id} className="group border-t border-border/60 [&>td]:py-2">
            <td className="w-24 text-muted-foreground">{r.date}</td>
            <td><div>{r.label}</div><div className="text-xs text-muted-foreground">{r.note}</div></td>
            <td className={`text-right ${cls}`}>{npr(r.amount)}</td>
            <td className="w-8 text-right"><button className="text-xs text-muted-foreground opacity-0 hover:text-danger group-hover:opacity-100" onClick={() => confirm("Delete this entry?") && onDelete(r.id)}>✕</button></td>
          </tr>
        ))}
      </tbody></table>
    </section>
  );
}
