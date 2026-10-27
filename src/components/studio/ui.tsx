import { Heart, Globe, BrainCircuit } from "lucide-react";
import type { Division, ProjectStatus } from "@/lib/store";
import { STATUSES } from "@/lib/store";
import { cn } from "@/lib/utils";

export const DIV_STYLE: Record<Division, { icon: typeof Heart; text: string; bg: string; soft: string }> = {
  wedding: { icon: Heart, text: "text-wedding", bg: "bg-wedding", soft: "bg-wedding/15" },
  website: { icon: Globe, text: "text-website", bg: "bg-website", soft: "bg-website/15" },
  ml: { icon: BrainCircuit, text: "text-ml", bg: "bg-ml", soft: "bg-ml/15" },
};

export function DivIcon({ division, size = "md" }: { division: Division; size?: "sm" | "md" }) {
  const s = DIV_STYLE[division];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", s.soft, s.text, size === "sm" ? "h-6 w-6" : "h-9 w-9")}>
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
    </span>
  );
}

export function ProgressBar({ value, division, className }: { value: number; division?: Division; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", division ? DIV_STYLE[division].bg : "bg-primary")} style={{ width: `${value}%` }} />
    </div>
  );
}

const STATUS_CLS: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/15 text-warning",
  in_review: "bg-website/15 text-website",
  completed: "bg-success/15 text-success",
  on_hold: "bg-muted text-muted-foreground",
  cancelled: "bg-danger/15 text-danger",
};

export function StatusBadge({ status, overdue }: { status: ProjectStatus; overdue?: boolean }) {
  if (overdue) return <span className="rounded-md bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Overdue</span>;
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS_CLS[status])}>{STATUSES[status]}</span>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
