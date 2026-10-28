import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Download } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Khaiju Studio" },
      { name: "description", content: "Khaiju Studio workspace settings and data controls." },
      { property: "og:title", content: "Settings — Khaiju Studio" },
      { property: "og:description", content: "Khaiju Studio workspace settings and data controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useStore();
  const { theme, setTheme } = useTheme();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Workspace and data" />
      <section className="space-y-4 border-b border-border py-5">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex gap-2">
          <Button variant={theme === "dark" ? "default" : "secondary"} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon className="h-4 w-4" />Dark</Button>
          <Button variant={theme === "light" ? "default" : "secondary"} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun className="h-4 w-4" />Light</Button>
        </div>
      </section>
      <section className="space-y-4 border-b border-border py-5">
        <h2 className="font-semibold">Profile</h2>
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">BK</span><div><div>Biyam Khaiju</div><div className="text-sm text-muted-foreground">Founder</div></div></div>
        <p className="text-sm text-muted-foreground">Profile picture uploads are unavailable until your account is connected.</p>
      </section>
      <section className="space-y-4 py-5">
        <div>
          <h2 className="font-semibold">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">Not connected to a database. Records remain saved in this browser, including any existing sample records. Back them up before importing into your workspace.</p>
          <p className="mt-2 text-sm text-muted-foreground">Connect your existing project in Lovable’s Settings → General → External Supabase. No records have been imported.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
            const a = document.createElement("a"); a.href = url; a.download = "khaiju-studio-backup.json"; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}><Download className="h-4 w-4" />Download backup</Button>
        </div>
      </section>
    </div>
  );
}
