import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Khaiju Studio" },
      { name: "description", content: "Khaiju Studio workspace settings and data controls." },
      { property: "og:title", content: "Settings — Khaiju Studio" },
      { property: "og:description", content: "Khaiju Studio workspace settings and data controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, set, reset } = useStore();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Workspace and data" />
      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">Records are saved in this browser. Clear the sample records when you're ready to enter real business data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => confirm("Remove all records and start empty?") && set(() => ({ clients: [], projects: [], payments: [], expenses: [], activity: [] }))}>Start empty</Button>
          <Button variant="secondary" onClick={() => confirm("Restore the sample data?") && reset()}>Restore sample data</Button>
          <Button variant="ghost" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
            const a = document.createElement("a"); a.href = url; a.download = "khaiju-studio-backup.json"; a.click();
          }}>Download backup</Button>
        </div>
      </section>
    </div>
  );
}
