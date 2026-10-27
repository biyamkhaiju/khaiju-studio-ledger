import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Client, Data, Expense, Payment, Project } from "./store";

export interface WorkspaceInfo {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  role: "admin" | "member";
}

type Row = Record<string, unknown>;

const asRows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
const asText = (value: unknown) => (value == null ? "" : String(value));
const asNumber = (value: unknown) => Number(value ?? 0);

function failIfError(error: { message: string } | null, label: string): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function loadWorkspace(client: SupabaseClient): Promise<WorkspaceInfo> {
  const membershipResult = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .order("created_at", { ascending: true })
    .limit(1);
  failIfError(membershipResult.error, "Could not load workspace membership");

  const membership = asRows(membershipResult.data)[0];
  if (!membership) {
    throw new Error("No studio workspace is linked to this account. Apply the Supabase migration, then reload.");
  }

  const workspaceResult = await client
    .from("workspaces")
    .select("id, name, currency, time_zone")
    .eq("id", asText(membership.workspace_id))
    .single();
  failIfError(workspaceResult.error, "Could not load studio workspace");

  const workspace = workspaceResult.data as Row;
  const role = asText(membership.role);
  return {
    id: asText(workspace.id),
    name: asText(workspace.name),
    currency: asText(workspace.currency) || "NPR",
    timeZone: asText(workspace.time_zone) || "Asia/Kathmandu",
    role: role === "admin" ? "admin" : "member",
  };
}

export async function loadWorkspaceData(client: SupabaseClient, workspaceId: string): Promise<Data> {
  const [clientResult, projectResult, milestoneResult, paymentResult, expenseResult, activityResult] =
    await Promise.all([
      client.from("clients").select("*").eq("workspace_id", workspaceId).order("created_at"),
      client.from("projects").select("*").eq("workspace_id", workspaceId).order("created_at"),
      client.from("project_milestones").select("*").eq("workspace_id", workspaceId).order("position"),
      client.from("payments").select("*").eq("workspace_id", workspaceId).order("date", { ascending: false }),
      client.from("expenses").select("*").eq("workspace_id", workspaceId).order("date", { ascending: false }),
      client.from("activity_log").select("*").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(100),
    ]);

  failIfError(clientResult.error, "Could not load clients");
  failIfError(projectResult.error, "Could not load projects");
  failIfError(milestoneResult.error, "Could not load project milestones");
  failIfError(paymentResult.error, "Could not load payments");
  failIfError(expenseResult.error, "Could not load expenses");
  failIfError(activityResult.error, "Could not load activity");

  const milestonesByProject = new Map<string, Row[]>();
  for (const milestone of asRows(milestoneResult.data)) {
    const projectId = asText(milestone.project_id);
    milestonesByProject.set(projectId, [...(milestonesByProject.get(projectId) ?? []), milestone]);
  }

  const clients: Client[] = asRows(clientResult.data).map((row) => ({
    id: asText(row.id),
    name: asText(row.name),
    kind: asText(row.kind) as Client["kind"],
    email: asText(row.email),
    phone: asText(row.phone),
    location: asText(row.location),
    createdAt: asText(row.created_at),
    createdBy: asText(row.created_by),
  }));

  const projects: Project[] = asRows(projectResult.data).map((row) => ({
    id: asText(row.id),
    name: asText(row.name),
    division: asText(row.division) as Project["division"],
    clientId: asText(row.client_id),
    status: asText(row.status) as Project["status"],
    budget: asNumber(row.budget),
    startDate: asText(row.start_date),
    deadline: asText(row.deadline),
    description: asText(row.description),
    manualProgress: asNumber(row.manual_progress),
    createdBy: asText(row.created_by),
    milestones: (milestonesByProject.get(asText(row.id)) ?? []).map((milestone) => ({
      id: asText(milestone.id),
      title: asText(milestone.title),
      done: Boolean(milestone.done),
      createdBy: asText(milestone.created_by),
    })),
  }));

  const payments: Payment[] = asRows(paymentResult.data).map((row) => ({
    id: asText(row.id),
    projectId: asText(row.project_id),
    amount: asNumber(row.amount),
    date: asText(row.date),
    note: asText(row.note),
    createdBy: asText(row.created_by),
  }));

  const expenses: Expense[] = asRows(expenseResult.data).map((row) => ({
    id: asText(row.id),
    projectId: row.project_id == null ? null : asText(row.project_id),
    category: asText(row.category),
    amount: asNumber(row.amount),
    date: asText(row.date),
    note: asText(row.note),
    createdBy: asText(row.created_by),
  }));

  const activity: Activity[] = asRows(activityResult.data).map((row) => ({
    id: asText(row.id),
    text: asText(row.text),
    date: asText(row.occurred_at),
    createdBy: asText(row.created_by),
  }));

  return { clients, projects, payments, expenses, activity };
}

function changed<T extends { id: string }>(before: T[], after: T[]): T[] {
  const previous = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
  return after.filter((item) => previous.get(item.id) !== JSON.stringify(item));
}

function removed<T extends { id: string }>(before: T[], after: T[]): string[] {
  const nextIds = new Set(after.map((item) => item.id));
  return before.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
}

async function upsertRows(client: SupabaseClient, table: string, rows: Row[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await (client as unknown as { from: (name: string) => any })
    .from(table)
    .upsert(rows, { onConflict: "id" });
  failIfError(error, `Could not save ${table}`);
}

async function deleteRows(client: SupabaseClient, table: string, workspaceId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await (client as unknown as { from: (name: string) => any })
    .from(table)
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", ids);
  failIfError(error, `Could not delete ${table}`);
}

const clientRow = (item: Client, workspaceId: string, userId: string): Row => ({
  id: item.id,
  workspace_id: workspaceId,
  created_by: item.createdBy || userId,
  name: item.name,
  kind: item.kind,
  email: item.email,
  phone: item.phone,
  location: item.location,
  created_at: item.createdAt,
});

const projectRow = (item: Project, workspaceId: string, userId: string): Row => ({
  id: item.id,
  workspace_id: workspaceId,
  created_by: item.createdBy || userId,
  name: item.name,
  division: item.division,
  client_id: item.clientId,
  status: item.status,
  budget: item.budget,
  start_date: item.startDate,
  deadline: item.deadline,
  description: item.description,
  manual_progress: item.manualProgress,
});

const paymentRow = (item: Payment, workspaceId: string, userId: string): Row => ({
  id: item.id,
  workspace_id: workspaceId,
  created_by: item.createdBy || userId,
  project_id: item.projectId,
  amount: item.amount,
  date: item.date,
  note: item.note,
});

const expenseRow = (item: Expense, workspaceId: string, userId: string): Row => ({
  id: item.id,
  workspace_id: workspaceId,
  created_by: item.createdBy || userId,
  project_id: item.projectId,
  category: item.category,
  amount: item.amount,
  date: item.date,
  note: item.note,
});

const activityRow = (item: Activity, workspaceId: string, userId: string): Row => ({
  id: item.id,
  workspace_id: workspaceId,
  created_by: item.createdBy || userId,
  text: item.text,
  occurred_at: item.date,
});

export async function persistDataDiff(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  before: Data,
  after: Data,
): Promise<void> {
  const changedClients = changed(before.clients, after.clients);
  const changedProjects = changed(before.projects, after.projects);
  const beforeMilestones = before.projects.flatMap((project) => project.milestones);
  const afterMilestones = after.projects.flatMap((project) =>
    project.milestones.map((milestone) => ({ ...milestone, projectId: project.id, projectCreatedBy: project.createdBy })),
  );
  const changedMilestones = changed(beforeMilestones, afterMilestones);
  const removedMilestones = removed(beforeMilestones, afterMilestones);
  const changedPayments = changed(before.payments, after.payments);
  const changedExpenses = changed(before.expenses, after.expenses);
  const changedActivity = changed(before.activity, after.activity);

  await upsertRows(client, "clients", changedClients.map((item) => clientRow(item, workspaceId, userId)));
  await upsertRows(client, "projects", changedProjects.map((item) => projectRow(item, workspaceId, userId)));
  await upsertRows(client, "project_milestones", changedMilestones.map((item) => ({
    id: item.id,
    workspace_id: workspaceId,
    created_by: item.createdBy || item.projectCreatedBy || userId,
    project_id: item.projectId,
    title: item.title,
    done: item.done,
    position: afterMilestones.findIndex((milestone) => milestone.id === item.id),
  })));
  await upsertRows(client, "payments", changedPayments.map((item) => paymentRow(item, workspaceId, userId)));
  await upsertRows(client, "expenses", changedExpenses.map((item) => expenseRow(item, workspaceId, userId)));
  await upsertRows(client, "activity_log", changedActivity.map((item) => activityRow(item, workspaceId, userId)));

  await deleteRows(client, "payments", workspaceId, removed(before.payments, after.payments));
  await deleteRows(client, "expenses", workspaceId, removed(before.expenses, after.expenses));
  await deleteRows(client, "project_milestones", workspaceId, removedMilestones);
  await deleteRows(client, "activity_log", workspaceId, removed(before.activity, after.activity));
  await deleteRows(client, "projects", workspaceId, removed(before.projects, after.projects));
  await deleteRows(client, "clients", workspaceId, removed(before.clients, after.clients));
}
