import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppWindow, Plug, Server, ScrollText, ShieldAlert, Shield } from "lucide-react";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, LoadingState, RelativeTime, DecisionBadge } from "./shared";

function StatCard({
  icon,
  label,
  value,
  to,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  to: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="text-muted-foreground">{icon}</div>
          <div>
            <div className="text-2xl font-semibold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const DENY_ACTIONS = new Set(["tool_gateway.call_denied", "tool_gateway.call_failed"]);

export function OverviewTab({ companyId }: { companyId: string }) {
  const apps = useQuery({
    queryKey: queryKeys.tools.applications(companyId),
    queryFn: () => toolsApi.listApplications(companyId),
  });
  const connections = useQuery({
    queryKey: queryKeys.tools.connections(companyId),
    queryFn: () => toolsApi.listConnections(companyId),
  });
  const slots = useQuery({
    queryKey: queryKeys.tools.runtimeSlots(companyId),
    queryFn: () => toolsApi.listRuntimeSlots(companyId),
  });
  const trustRules = useQuery({
    queryKey: queryKeys.tools.trustRules(companyId),
    queryFn: () => toolsApi.listTrustRules(companyId),
  });
  const audit = useQuery({
    queryKey: queryKeys.tools.audit(companyId, 100),
    queryFn: () => toolsApi.listAudit(companyId, 100),
  });

  const anyError = apps.error || connections.error || slots.error || audit.error || trustRules.error;
  if (anyError) {
    return (
      <ErrorState
        error={anyError}
        onRetry={() => {
          apps.refetch();
          connections.refetch();
          slots.refetch();
          trustRules.refetch();
          audit.refetch();
        }}
      />
    );
  }
  if (apps.isLoading || connections.isLoading || slots.isLoading || audit.isLoading) {
    return <LoadingState />;
  }

  const activeConnections = (connections.data?.connections ?? []).filter(
    (c) => c.enabled && (c.status ?? "active") !== "archived",
  ).length;
  const recentDenials = (audit.data ?? []).filter((row) => DENY_ACTIONS.has(row.action)).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<AppWindow className="h-5 w-5" />}
          label="Applications"
          value={apps.data?.applications.length ?? 0}
          to="/company/settings/tools/applications"
        />
        <StatCard
          icon={<Plug className="h-5 w-5" />}
          label="Active connections"
          value={activeConnections}
          to="/company/settings/tools/connections"
        />
        <StatCard
          icon={<Server className="h-5 w-5" />}
          label="Runtime slots"
          value={slots.data?.runtimeSlots.length ?? 0}
          to="/company/settings/tools/runtime"
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Trust rules"
          value={trustRules.data?.trustRules.length ?? 0}
          to="/company/settings/tools/policies"
        />
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Recent denials &amp; failures
            <Link
              to="/company/settings/tools/audit"
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              View full audit →
            </Link>
          </div>
          {recentDenials.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No denied or failed tool calls in the last {audit.data?.length ?? 0} audit events.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentDenials.map((row) => {
                const tool =
                  (row.details?.tool as string | undefined) ??
                  (row.details?.toolName as string | undefined) ??
                  "—";
                return (
                  <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
                    <DecisionBadge decision={row.action.endsWith("denied") ? "deny" : "block"} />
                    <span className="font-mono text-xs text-foreground">{tool}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {(row.details?.reasonCode as string | undefined) ?? row.action}
                    </span>
                    <span className="ml-auto shrink-0 text-xs">
                      <RelativeTime value={row.createdAt} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ScrollText className="h-3.5 w-3.5" />
        Counts reflect server state. Enforcement happens in the tool gateway, not in this UI.
      </p>
    </div>
  );
}
