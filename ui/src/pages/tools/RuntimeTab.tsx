import { useQuery } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { ToolsPageHeader, LoadingState, ErrorState, EmptyState, HealthBadge, RelativeTime } from "./shared";

export function RuntimeTab({ companyId }: { companyId: string }) {
  const slots = useQuery({
    queryKey: queryKeys.tools.runtimeSlots(companyId),
    queryFn: () => toolsApi.listRuntimeSlots(companyId),
    refetchInterval: 15_000,
  });

  if (slots.isLoading) return <LoadingState />;
  if (slots.error) return <ErrorState error={slots.error} onRetry={() => slots.refetch()} />;

  const list = slots.data?.runtimeSlots ?? [];

  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title="Runtime slots"
        description="Managed lifecycle units for local stdio MCP servers and remote sessions. Slots are pooled and supervised — agents never spawn processes directly. Idle local slots shut down automatically."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<Server className="h-6 w-6" />}
          title="No runtime slots"
          description="Local stdio connections lazy-start a runtime slot when a policy-allowed run first needs them. Remote HTTP connections do not use a local process."
        />
      ) : (
        <div className="grid gap-3">
          {list.map((slot) => {
            const supportsControl = slot.runtimeKind === "local_stdio";
            return (
              <Card key={slot.id}>
                <CardContent className="flex flex-wrap items-center gap-3 py-4">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-foreground">
                        {slot.commandTemplateKey ?? slot.providerRef ?? slot.id.slice(0, 8)}
                      </span>
                      <Badge variant="outline">{slot.runtimeKind}</Badge>
                      <Badge variant="secondary">{slot.status}</Badge>
                      <HealthBadge status={slot.healthStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      scope {slot.ownerScopeType}
                      {slot.processId ? ` · pid ${slot.processId}` : ""} · last used{" "}
                      <RelativeTime value={slot.lastUsedAt} />
                      {slot.idleExpiresAt || slot.idleDeadlineAt ? (
                        <>
                          {" "}
                          · idles <RelativeTime value={slot.idleExpiresAt ?? slot.idleDeadlineAt} />
                        </>
                      ) : null}
                      {slot.lastError ? (
                        <span className="text-destructive"> · {slot.lastError}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button size="sm" variant="outline" disabled>
                            Stop
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {supportsControl
                          ? "Stop/restart endpoints land in PAP-10411."
                          : "Remote sessions have no local process to stop."}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button size="sm" variant="outline" disabled>
                            Restart
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Control endpoints tracked in PAP-10411.</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Stop/restart actions are disabled until the control endpoints ship (PAP-10411). Health and
        lifecycle shown here reflect server state.
      </p>
    </div>
  );
}
