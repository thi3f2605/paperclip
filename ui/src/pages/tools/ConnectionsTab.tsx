import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw, Stethoscope, ListTree } from "lucide-react";
import type { ToolConnection } from "@paperclipai/shared";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/context/ToastContext";
import {
  ToolsPageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  HealthBadge,
  RiskBadge,
  CapabilityBadges,
  RelativeTime,
} from "./shared";

function CatalogDialog({
  connection,
  onClose,
}: {
  connection: ToolConnection;
  onClose: () => void;
}) {
  const catalog = useQuery({
    queryKey: queryKeys.tools.catalog(connection.id),
    queryFn: () => toolsApi.listCatalog(connection.id),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tool catalog — {connection.name}</DialogTitle>
        </DialogHeader>
        {catalog.isLoading ? (
          <LoadingState />
        ) : catalog.error ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
        ) : (catalog.data?.catalog ?? []).length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No tools discovered yet. Use “Refresh catalog” to discover tools from this connection.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {(catalog.data?.catalog ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="font-mono text-sm text-foreground">{entry.toolName}</span>
                <RiskBadge risk={entry.riskLevel} />
                <CapabilityBadges
                  isReadOnly={entry.isReadOnly}
                  isWrite={entry.isWrite}
                  isDestructive={entry.isDestructive}
                />
                {entry.status === "quarantined" ? (
                  <Badge variant="destructive">quarantined</Badge>
                ) : null}
                {entry.description ? (
                  <p className="w-full truncate text-xs text-muted-foreground">{entry.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [catalogFor, setCatalogFor] = useState<ToolConnection | null>(null);

  const connections = useQuery({
    queryKey: queryKeys.tools.connections(companyId),
    queryFn: () => toolsApi.listConnections(companyId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.tools.connections(companyId) });

  const healthCheck = useMutation({
    mutationFn: (id: string) => toolsApi.checkConnectionHealth(id),
    onSuccess: (res) => {
      invalidate();
      pushToast({
        title: `Health: ${res.connection.healthStatus}`,
        body: res.connection.healthMessage ?? undefined,
        tone: res.connection.healthStatus === "error" ? "error" : "success",
      });
    },
    onError: (err) =>
      pushToast({
        title: "Health check failed",
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  const refresh = useMutation({
    mutationFn: (id: string) => toolsApi.refreshCatalog(id),
    onSuccess: (res) => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.tools.catalog(res.connection.id) });
      pushToast({
        title: `Discovered ${res.discoveredCount} tools`,
        body: res.quarantinedCount > 0 ? `${res.quarantinedCount} quarantined for review` : undefined,
        tone: "success",
      });
    },
    onError: (err) =>
      pushToast({
        title: "Catalog refresh failed",
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  if (connections.isLoading) return <LoadingState />;
  if (connections.error) return <ErrorState error={connections.error} onRetry={() => connections.refetch()} />;

  const list = (connections.data?.connections ?? []).filter((c) => (c.status ?? "active") !== "archived");

  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title="Connections"
        description="Managed credentials and transport for each application. Credentials are stored as secret references and only resolve at gateway/runtime use time — never sent to agents."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<Plug className="h-6 w-6" />}
          title="No connections yet"
          description="Add a connection to an application to configure credentials and discover its tools. (Create + mcp.json import wire to POST /tools/connections and /tools/mcp/import-json.)"
        />
      ) : (
        <div className="grid gap-3">
          {list.map((conn) => (
            <Card key={conn.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <Plug className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{conn.name}</span>
                    <Badge variant="outline">{conn.transport ?? "—"}</Badge>
                    <HealthBadge status={conn.healthStatus} />
                    {!conn.enabled ? <Badge variant="outline">disabled</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(conn.credentialRefs?.length ?? 0) + conn.credentialSecretRefs.length} credential
                    ref(s) · last refresh{" "}
                    <RelativeTime value={conn.lastCatalogRefreshAt ?? conn.updatedAt} />
                    {conn.lastError ? <span className="text-destructive"> · {conn.lastError}</span> : null}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={healthCheck.isPending}
                    onClick={() => healthCheck.mutate(conn.id)}
                  >
                    <Stethoscope className="mr-1 h-3.5 w-3.5" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={refresh.isPending}
                    onClick={() => refresh.mutate(conn.id)}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCatalogFor(conn)}>
                    <ListTree className="mr-1 h-3.5 w-3.5" />
                    Tools
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {catalogFor ? <CatalogDialog connection={catalogFor} onClose={() => setCatalogFor(null)} /> : null}
    </div>
  );
}
