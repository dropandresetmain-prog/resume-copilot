import { notFound } from "next/navigation";

import { DevToolsPageClient } from "@/components/pages/DevToolsPageClient";

export default function DevToolsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DevToolsPageClient />;
}
