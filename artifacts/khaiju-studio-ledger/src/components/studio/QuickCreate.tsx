import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIVISIONS, uid, useStore, type Division, type Client } from "@/lib/store";

export type CreateKind = Division | "client" | "payment" | "expense";

const TEMPLATES: Record<Division, string[]> = {
  wedding: ["Requirements gathered", "Design draft", "Couple review", "Revisions", "Final delivery"],
  website: ["Discovery", "Wireframes", "UI design", "Development", "Testing", "Launch"],
  ml: ["Problem definition", "Data collection", "Preprocessing", "Model training", "Evaluation", "Deployment"],
};

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function QuickCreateDialog({ kind, onClose }: { kind: CreateKind | null; onClose: () => void }) {
  const { data, set, log } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const v = (k: string) => f[k] ?? "";
  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const close = () => { setF({}); setErr(""); onClose(); };
  const today = new Date().toISOString().slice(0, 10);
  const isProject = kind === "wedding" || kind === "website" || kind === "ml";

  const submit = () => {
    if (!kind) return;
    if (isProject) {
      if (!v("name").trim() || !v("clientId") || !v("deadline")) return setErr("Name, client and deadline are required.");
      const budget = Number(v("budget") || 0);
      if (budget < 0) return setErr("Budget can't be negative.");
      const id = uid();
      set((d) => ({
        ...d,
        projects: [...d.projects, {
          id, name: v("name").trim(), division: kind, clientId: v("clientId"), status: "planning", budget,
          startDate: today, deadline: v("deadline"), description: v("description"),
          milestones: TEMPLATES[kind].map((t) => ({ id: uid(), title: t, done: false })), manualProgress: 0,
        }],
      }));
      log(`New ${DIVISIONS[kind].short} project created: ${v("name").trim()}`);
      close();
      navigate({ to: "/projects/$projectId", params: { projectId: id } });
      return;
    }
    if (kind === "client") {
      if (!v("name").trim()) return setErr("Name is required.");
      set((d) => ({ ...d, clients: [...d.clients, { id: uid(), name: v("name").trim(), kind: (v("ckind") || "business") as Client["kind"], email: v("email"), phone: v("phone"), location: v("location"), createdAt: today }] }));
      log(`New client registered: ${v("name").trim()}`);
      return close();
    }
    const amount = Number(v("amount"));
    if (!(amount > 0)) return setErr("Enter an amount greater than 0.");
    if (kind === "payment") {
      if (!v("projectId")) return setErr("Choose a project.");
      set((d) => ({ ...d, payments: [...d.payments, { id: uid(), projectId: v("projectId"), amount, date: v("date") || today, note: v("note") }] }));
      log(`Payment received — NPR ${amount.toLocaleString("en-IN")}`);
    } else {
      if (!v("category").trim()) return setErr("Category is required.");
      set((d) => ({ ...d, expenses: [...d.expenses, { id: uid(), projectId: v("projectId") || null, category: v("category").trim(), amount, date: v("date") || today, note: v("note") }] }));
      log(`Expense recorded — NPR ${amount.toLocaleString("en-IN")} (${v("category").trim()})`);
    }
    close();
  };

  const title = !kind ? "" : isProject ? `New ${DIVISIONS[kind as Division].short} project` : kind === "client" ? "New client" : kind === "payment" ? "Record payment" : "Record expense";

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {isProject && (<>
            <Field label="Project name"><Input value={v("name")} onChange={up("name")} /></Field>
            <Field label="Client">
              <select className={sel} value={v("clientId")} onChange={up("clientId")}>
                <option value="">Select client…</option>
                {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contract value (NPR)"><Input type="number" min={0} value={v("budget")} onChange={up("budget")} /></Field>
              <Field label="Deadline"><Input type="date" value={v("deadline")} onChange={up("deadline")} /></Field>
            </div>
            <Field label="Description"><Input value={v("description")} onChange={up("description")} /></Field>
          </>)}
          {kind === "client" && (<>
            <Field label="Name"><Input value={v("name")} onChange={up("name")} /></Field>
            <Field label="Type">
              <select className={sel} value={v("ckind") || "business"} onChange={up("ckind")}>
                <option value="business">Business</option><option value="wedding">Wedding</option><option value="internal">Internal</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><Input value={v("email")} onChange={up("email")} /></Field>
              <Field label="Phone"><Input value={v("phone")} onChange={up("phone")} /></Field>
            </div>
            <Field label="Location"><Input value={v("location")} onChange={up("location")} /></Field>
          </>)}
          {(kind === "payment" || kind === "expense") && (<>
            {kind === "expense" && <Field label="Category"><Input placeholder="Hosting, Software, Cloud GPU…" value={v("category")} onChange={up("category")} /></Field>}
            <Field label={kind === "payment" ? "Project" : "Project (optional)"}>
              <select className={sel} value={v("projectId")} onChange={up("projectId")}>
                <option value="">{kind === "payment" ? "Select project…" : "General / studio-wide"}</option>
                {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (NPR)"><Input type="number" min={0} value={v("amount")} onChange={up("amount")} /></Field>
              <Field label="Date"><Input type="date" value={v("date") || today} onChange={up("date")} /></Field>
            </div>
            <Field label="Note"><Input value={v("note")} onChange={up("note")} /></Field>
          </>)}
          {err && <p className="text-sm text-danger">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
