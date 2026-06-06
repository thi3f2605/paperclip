import { ToolsPageHeader, PendingBackendNotice } from "./shared";

export function ExamplesTab() {
  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title="Examples & smoke tests"
        description="One-click safe fixtures (echo, calculator, read-only Paperclip self) to prove governance works, plus a smoke runner for allow/deny/audit paths."
      />
      <PendingBackendNotice
        title="Example installer API not available yet"
        body="Phase 1 shipped a script-based fixture smoke harness (scripts/mcp-fixtures + scripts/smoke), but there is no board API to install an example fixture or trigger a smoke run from the UI. The 'fresh user enables a safe read-only example and sees an agent use it' acceptance criterion depends on that endpoint."
        issue={{ identifier: "PAP-10409", href: "/PAP/issues/PAP-10409" }}
      />
    </div>
  );
}
