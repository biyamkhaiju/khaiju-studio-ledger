import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/soon/$module")({
  head: () => ({
    meta: [
      { title: "Coming next — Khaiju Studio" },
      { name: "description", content: "This Khaiju Studio module is scheduled for an upcoming phase." },
      { property: "og:title", content: "Coming next — Khaiju Studio" },
      { property: "og:description", content: "This Khaiju Studio module is scheduled for an upcoming phase." },
    ],
  }),
  component: Soon,
});

function Soon() {
  const { module } = Route.useParams();
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <Construction className="mx-auto h-10 w-10 text-warning" />
      <h1 className="mt-4 text-xl font-semibold capitalize">{module.replace(/-/g, " ")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">This module is planned for an upcoming phase. Projects, clients and finance are fully working today.</p>
      <Link to="/" className="mt-6 inline-block text-sm text-primary">Back to dashboard</Link>
    </div>
  );
}
