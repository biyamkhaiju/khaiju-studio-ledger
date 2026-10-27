import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LockKeyhole, Mail, Mountain, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthScreen({
  client,
  onPreview,
}: {
  client: SupabaseClient;
  onPreview: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("Khaiju Studio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              workspace_name: workspace.trim() || "Khaiju Studio",
            },
          },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Account created. Check your email to confirm the address, then sign in.");
        } else {
          setMessage("Your studio workspace is being prepared…");
        }
      } else {
        const { error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-panel p-7 shadow-2xl shadow-black/20 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Mountain className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">KHAIJU STUDIO</p>
            <p className="text-sm text-muted-foreground">Build · Create · Grow</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to your studio" : "Create your studio account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Use your account to access your private workspace."
            : "Your account starts a private workspace protected by row-level security."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <Field label="Your name" icon={<UserRound className="h-4 w-4" />}>
                <Input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field label="Studio name" icon={<Mountain className="h-4 w-4" />}>
                <Input value={workspace} onChange={(event) => setWorkspace(event.target.value)} required />
              </Field>
            </>
          )}
          <Field label="Email address" icon={<Mail className="h-4 w-4" />}>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password" icon={<LockKeyhole className="h-4 w-4" />}>
            <Input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {mode === "signup" && <span className="text-[11px] text-muted-foreground">Use at least 8 characters.</span>}
          </Field>

          {message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{message}</p>}
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Khaiju Studio?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
              setError("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-5 text-center">
            <button type="button" onClick={onPreview} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Preview the sample dashboard
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </span>
    </label>
  );
}
