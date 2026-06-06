import { ToolsPageHeader, PendingBackendNotice } from "./shared";

export function ProfilesTab() {
  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title="Access profiles"
        description="Reusable bundles of allowed applications, connections, and tools, assignable to agents, projects, routines, or issues."
      />
      <PendingBackendNotice
        title="Profile management API not available yet"
        body="The data model for profiles, profile entries, and bindings shipped in Phase 2, but the board endpoints that read and edit them are not exposed yet. Building the profile builder against a guessed contract would risk UI-only assumptions, so it is intentionally deferred until the API lands."
        issue={{ identifier: "PAP-10408", href: "/PAP/issues/PAP-10408" }}
      />
    </div>
  );
}
