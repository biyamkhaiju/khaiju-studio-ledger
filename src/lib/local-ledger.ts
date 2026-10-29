import { z } from "zod";

export const LEDGER_KEY = "khaiju-studio-data-v1";
export const emptyLedger = () => ({ clients: [], projects: [], payments: [], expenses: [], activity: [] });

const text = z.string();
const amount = z.number().finite().nonnegative();
const client = z.object({ id: text, name: text, kind: z.enum(["wedding", "business", "internal"]), email: text, phone: text, location: text, createdAt: text }).passthrough();
const milestone = z.object({ id: text, title: text, done: z.boolean() }).passthrough();
const project = z.object({
  id: text, name: text, division: z.enum(["wedding", "website", "ml"]), clientId: text,
  status: z.enum(["planning", "in_progress", "in_review", "completed", "on_hold", "cancelled"]),
  budget: amount, startDate: text, deadline: text, description: text,
  milestones: z.array(milestone), manualProgress: z.number().finite().min(0).max(100),
}).passthrough();
const payment = z.object({ id: text, projectId: text, amount, date: text, note: text }).passthrough();
const expense = z.object({ id: text, projectId: text.nullable(), category: text, amount, date: text, note: text }).passthrough();
const ledgerSchema = z.object({
  clients: z.array(client), projects: z.array(project), payments: z.array(payment),
  expenses: z.array(expense), activity: z.array(z.object({ id: text, text, date: text }).passthrough()),
}).passthrough();

/** Reject unsupported local copies without mutating or replacing the original. */
export function readLocalLedger(raw: string | null) {
  if (raw === null) return { data: emptyLedger(), error: null };
  try {
    return { data: ledgerSchema.parse(JSON.parse(raw)), error: null };
  } catch {
    return { data: null, error: "Your saved browser records could not be read. The original copy has not been changed. Download it before making any changes." };
  }
}