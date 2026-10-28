import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import { useStore, paidFor, outstandingFor, npr } from "@/lib/store";
import { DivIcon, PageHeader } from "@/components/studio/ui";
import { useQuickCreate } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Khaiju Studio" },
      { name: "description", content: "Every Khaiju Studio client with their projects and balances." },
      { property: "og:title", content: "Clients — Khaiju Studio" },
      { property: "og:description", content: "Every Khaiju Studio client with their projects and balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clients,
});

function Clients() {
  const { data } = useStore();
  const quick = useQuickCreate();
  const [q, setQ] = useState("");
  const list = data.clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Clients" subtitle={`${data.clients.length} clients`}>
        <div className="flex gap-2"><Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" /><Button onClick={() => quick("client")}><Plus className="h-4 w-4" /> Add client</Button></div>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const ps = data.projects.filter((p) => p.clientId === c.id);
          const paid = ps.reduce((s, p) => s + paidFor(data, p.id), 0);
          const owed = ps.reduce((s, p) => s + outstandingFor(data, p), 0);
          return (
            <div key={c.id} className="panel p-5">
              <div className="flex items-start justify-between">
                <div><div className="font-medium">{c.name}</div><div className="text-xs capitalize text-muted-foreground">{c.kind}</div></div>
                <span className="text-xs text-muted-foreground">{ps.length} project{ps.length === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</div>}
                {c.location && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{c.location}</div>}
              </div>
              <div className="mt-4 space-y-1.5">
                {ps.map((p) => <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-2 text-sm hover:text-primary"><DivIcon division={p.division} size="sm" />{p.name}</Link>)}
              </div>
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs"><span className="text-success">Paid {npr(paid)}</span><span className={owed ? "text-warning" : "text-muted-foreground"}>Owes {npr(owed)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
