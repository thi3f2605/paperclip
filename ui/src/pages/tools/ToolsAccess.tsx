import { useEffect } from "react";
import {
  Activity,
  AppWindow,
  ClipboardList,
  Layers,
  Plug,
  ScrollText,
  Server,
  Shield,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "@/lib/router";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./OverviewTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { ConnectionsTab } from "./ConnectionsTab";
import { ProfilesTab } from "./ProfilesTab";
import { PoliciesTab } from "./PoliciesTab";
import { RuntimeTab } from "./RuntimeTab";
import { AuditTab } from "./AuditTab";
import { ExamplesTab } from "./ExamplesTab";

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "applications", label: "Applications", icon: AppWindow },
  { key: "connections", label: "Connections", icon: Plug },
  { key: "profiles", label: "Profiles", icon: Layers },
  { key: "policies", label: "Policies", icon: Shield },
  { key: "runtime", label: "Runtime", icon: Server },
  { key: "audit", label: "Audit", icon: ScrollText },
  { key: "examples", label: "Examples", icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function renderTab(tab: TabKey, companyId: string) {
  switch (tab) {
    case "applications":
      return <ApplicationsTab companyId={companyId} />;
    case "connections":
      return <ConnectionsTab companyId={companyId} />;
    case "profiles":
      return <ProfilesTab />;
    case "policies":
      return <PoliciesTab companyId={companyId} />;
    case "runtime":
      return <RuntimeTab companyId={companyId} />;
    case "audit":
      return <AuditTab companyId={companyId} />;
    case "examples":
      return <ExamplesTab />;
    case "overview":
    default:
      return <OverviewTab companyId={companyId} />;
  }
}

export function ToolsAccess() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const params = useParams<{ tab?: string }>();
  const activeTab = (TABS.find((t) => t.key === params.tab)?.key ?? "overview") as TabKey;

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings", href: "/company/settings" },
      { label: "Tools & Access" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, selectedCompany?.name]);

  if (!selectedCompanyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select a company to manage tools &amp; access.</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Tools &amp; Access</h1>
      </div>
      <p className="-mt-2 max-w-3xl text-sm text-muted-foreground">
        Govern which agents can use which external tools and MCP servers. Access is enforced server-side by the
        tool gateway — these screens configure and observe that enforcement, they do not replace it.
      </p>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              to={`/company/settings/tools/${tab.key}`}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-[300px]">{renderTab(activeTab, selectedCompanyId)}</div>
    </div>
  );
}
