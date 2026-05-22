import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest, {
  BRIEFING_ANALYST_AGENT_KEY,
  BRIEFS_MANAGED_ROUTINE_KEYS,
  BRIEFS_MANAGED_SKILL_CANONICAL_KEYS,
  BRIEFS_MANAGED_SKILL_KEYS,
  BRIEFS_PROJECT_KEY,
  MANUAL_REFRESH_ROUTINE_KEY,
} from "../src/manifest.js";
import plugin from "../src/worker.js";

const companyId = "11111111-1111-4111-8111-111111111111";
const bridgeActor = {
  actorType: "user" as const,
  actorId: "signed-in-user",
  userId: "signed-in-user",
  agentId: null,
  runId: null,
  source: "session",
};

describe("Briefs managed resources", () => {
  it("declares the Briefing Analyst, skills, routines, and agent tools", () => {
    expect(manifest.capabilities).toEqual(expect.arrayContaining([
      "agents.managed",
      "skills.managed",
      "routines.managed",
      "agent.tools.register",
    ]));
    expect(manifest.agents?.[0]).toMatchObject({
      agentKey: BRIEFING_ANALYST_AGENT_KEY,
      displayName: "Briefing Analyst",
      status: "paused",
      adapterConfig: {
        paperclipSkillSync: {
          desiredSkills: BRIEFS_MANAGED_SKILL_CANONICAL_KEYS,
        },
      },
      permissions: {
        pluginTools: [manifest.id],
      },
    });
    expect(manifest.skills?.map((skill) => skill.skillKey)).toEqual([...BRIEFS_MANAGED_SKILL_KEYS]);
    expect(manifest.routines?.map((routine) => routine.routineKey)).toEqual([...BRIEFS_MANAGED_ROUTINE_KEYS]);
    expect(manifest.routines?.find((routine) => routine.routineKey === MANUAL_REFRESH_ROUTINE_KEY)).toMatchObject({
      assigneeRef: { resourceKind: "agent", resourceKey: BRIEFING_ANALYST_AGENT_KEY },
      projectRef: { resourceKind: "project", resourceKey: BRIEFS_PROJECT_KEY },
      issueTemplate: {
        surfaceVisibility: "plugin_operation",
        billingCode: "plugin-briefs:manual-refresh",
      },
    });
    expect(manifest.tools?.map((tool) => tool.name)).toEqual([
      "briefs_list_cards",
      "briefs_save_card",
      "briefs_refresh_issue_tree",
    ]);
  });

  it("reconciles resources in dependency order so routines resolve their managed refs", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);

    const result = await harness.performAction<{
      managedProject: { status: string; projectId: string | null };
      managedAgent: { status: string; agentId: string | null };
      managedSkills: Array<{ status: string; skillId: string | null }>;
      managedRoutines: Array<{ status: string; routineId: string | null; missingRefs: unknown[] }>;
    }>("reconcile-managed-resources", { companyId });

    expect(result.managedProject).toMatchObject({ status: "created" });
    expect(result.managedAgent).toMatchObject({ status: "created" });
    expect(result.managedSkills.map((skill) => skill.status)).toEqual(["created", "created"]);
    expect(result.managedRoutines).toHaveLength(3);
    for (const routine of result.managedRoutines) {
      expect(routine.status).toBe("created");
      expect(routine.routineId).toBeTruthy();
      expect(routine.missingRefs).toEqual([]);
    }
  });

  it("rejects user-scoped UI bridge calls for a different user", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);
    const victimParams = { companyId, userId: "victim-user" };
    const context = { actor: bridgeActor };

    await expect(harness.getData("page", victimParams, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.getData("preferences", victimParams, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.performAction("pin-card", {
      ...victimParams,
      cardId: "card-1",
      pinned: true,
    }, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.performAction("update-preferences", {
      ...victimParams,
      cadence: "daily",
    }, context)).rejects.toThrow("Briefs user scope mismatch");
  });
});
