import { AppShell } from "@/components/app/AppShell";
import { WorkspaceProvider } from "@/components/app/WorkspaceProvider";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
