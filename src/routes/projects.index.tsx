import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DIVISIONS, STATUSES, useStore, progressOf, paidFor, isOverdue, npr, type Division, type ProjectStatus } from "@/lib/store";
import { DivIcon, PageHeader, ProgressBar, StatusBadge } from "@/components/studio/ui";
import { useQuickCreate } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Search = { division?: Division | undefined; status?: ProjectStatus | undefined };

export const Route = createFileRoute("/projects/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    division: ["wedding", "website", "ml"].includes(s["division"] as string) ? (s["division"] as Division) : undefined,
    status: (s["status"] as string) in STATUSES ? (s["status"] as ProjectStatus) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Projects — Khaiju Studio" },
      { name: "description", content: "All wedding, website and ML/DL projects with progress, value and deadlines." },
      { property: "og:title", content: "Projects — Khaiju Studio" },
      { property: "og:description", content: "All wedding, website and ML/DL projects with progress, value and deadlines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { data } = useStore();
  const { division, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/" });
  const quick = useQuickCreate();
  const list = data.projects.filter((p) => (!division || p.division === division) && (!status || p.status === status));

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title={division ? DIVISIONS[division].label : "All projects"} subtitle={`${list.length} projects`}>
        <Button onClick={() => quick(division ?? "website")}><Plus className="h-4 w-4" /> New project</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {([undefined, "wedding", "website", "ml"] as const).map((d) => (
          <button key={d ?? "all"} onClick={() => navigate({ search: (p) => ({ ...p, division: d }) })} className={cn("rounded-lg border border-border px-3 py-1.5 text-sm", division === d ? "bg-accent" : "text-muted-foreground hover:text-foreground")}>{d ? DIVISIONS[d].short : "All"}</button>
        ))}
        <select value={status ?? ""} onChange={(e) => navigate({ search: (p) => ({ ...p, status: (e.target.value || undefined) as ProjectStatus | undefined }) })} className="ml-auto h-9 rounded-lg border border-border bg-panel px-3 text-sm">
          <option value="">Any status</option>
          {Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-normal"><th>Project</th><th>Client</th><th>Progress</th><th>Value</th><th>Paid</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const pr = progressOf(p);
              return (
                <tr key={p.id} className="cursor-pointer border-t border-border/60 hover:bg-accent/30 [&>td]:px-4 [&>td]:py-3" onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}>
                  <td><Link to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-3 font-medium"><DivIcon division={p.division} size="sm" />{p.name}</Link></td>
                  <td className="text-muted-foreground">{data.clients.find((c) => c.id === p.clientId)?.name}</td>
                  <td className="w-40"><div className="flex items-center gap-2"><ProgressBar value={pr} division={p.division} /><span className="w-9 text-xs text-muted-foreground">{pr}%</span></div></td>
                  <td>{npr(p.budget)}</td>
                  <td className="text-success">{npr(paidFor(data, p.id))}</td>
                  <td className="text-muted-foreground">{p.deadline}</td>
                  <td><StatusBadge status={p.status} overdue={isOverdue(p)} /></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No projects match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
