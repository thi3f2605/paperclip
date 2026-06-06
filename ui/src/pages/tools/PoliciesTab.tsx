import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Shield, ShieldX } from "lucide-react";
import type { ToolAccessDecision } from "@paperclipai/shared";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { agentsApi } from "@/api/agents";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/context/ToastContext";
import {
  ToolsPageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  DecisionBadge,
  RelativeTime,
  PendingBackendNotice,
} from "./shared";

function PolicySimulator({ companyId }: { companyId: string }) {
  const { pushToast } = useToast();
  const [agentId, setAgentId] = useState<string>("");
  const [toolName, setToolName] = useState("");
  const [result, setResult] = useState<ToolAccessDecision | null>(null);

  const agents = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
  });

  const test = useMutation({
    mutationFn: () =>
      toolsApi.testPolicy(companyId, {
        actor: { actorType: "agent", actorId: agentId, agentId },
        request: { toolName: toolName.trim() },
      }),
    onSuccess: (res) => setResult(res.decision),
    onError: (err) => {
      setResult(null);
      pushToast({
        title: "Policy test failed",
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      });
    },
  });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="h-4 w-4" />
          Decision simulator
        </div>
        <p className="text-sm text-muted-foreground">
          Evaluate what the policy engine would decide for an agent + tool, using authoritative server
          state. This calls the same engine the gateway uses — it does not grant or change access.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {(agents.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-tool">Tool name</Label>
            <Input
              id="sim-tool"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. echo"
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={!agentId || !toolName.trim() || test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? "Evaluating…" : "Evaluate decision"}
        </Button>

        {result ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <DecisionBadge decision={result.decision} />
              <span className="font-mono text-xs text-muted-foreground">{result.reasonCode}</span>
            </div>
            <p className="mt-1.5 text-foreground">{result.explanation}</p>
            {result.matchedPolicyIds.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                matched {result.matchedPolicyIds.length} policy/policies · {result.effectiveProfileIds.length}{" "}
                effective profile(s)
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PoliciesTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const trustRules = useQuery({
    queryKey: queryKeys.tools.trustRules(companyId),
    queryFn: () => toolsApi.listTrustRules(companyId),
  });

  const revoke = useMutation({
    mutationFn: (policyId: string) => toolsApi.revokeTrustRule(companyId, policyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tools.trustRules(companyId) });
      pushToast({ title: "Trust rule revoked", tone: "success" });
    },
    onError: (err) =>
      pushToast({
        title: "Revoke failed",
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title="Policies"
        description="Server-evaluated rules that allow, block, redact, rate-limit, or require approval for tool calls. Default posture is deny — agents see no external tools until a profile or policy grants access."
      />

      <PolicySimulator companyId={companyId} />

      <PendingBackendNotice
        title="Full policy builder pending generic policy CRUD"
        body="The decision engine, policy test, and trust-rules are shipped. Selector-based allow/block/redact/rate-limit/approval rule editing needs the generic policy CRUD endpoints. The simulator above and trust rules below are the MVP."
        issue={{ identifier: "PAP-10410", href: "/PAP/issues/PAP-10410" }}
      />

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Shield className="h-4 w-4" />
          Trust rules
        </h3>
        {trustRules.isLoading ? (
          <LoadingState />
        ) : trustRules.error ? (
          <ErrorState error={trustRules.error} onRetry={() => trustRules.refetch()} />
        ) : (trustRules.data?.trustRules ?? []).length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            title="No trust rules"
            description="Trust rules are created by promoting a repeated approved action into a scoped auto-allow. They appear here once created."
          />
        ) : (
          <div className="grid gap-2">
            {(trustRules.data?.trustRules ?? []).map((rule) => (
              <Card key={rule.id}>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline">priority {rule.priority}</Badge>
                      {!rule.enabled ? <Badge variant="outline">disabled</Badge> : null}
                    </div>
                    {rule.description ? (
                      <p className="truncate text-xs text-muted-foreground">{rule.description}</p>
                    ) : null}
                  </div>
                  <span className="ml-auto text-xs">
                    <RelativeTime value={rule.updatedAt} />
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!rule.enabled || revoke.isPending}
                    onClick={() => revoke.mutate(rule.id)}
                  >
                    <ShieldX className="mr-1 h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
