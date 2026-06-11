import type { Meta, StoryObj } from "@storybook/react-vite";
import type { PipelineHealthWarning } from "@paperclipai/shared";
import { PipelineHealthBar, StageHealthWarnings } from "@/components/PipelineHealthWarnings";
import { PipelineWorkReferences } from "@/components/PipelineWorkReferences";
import { extractWorkReferences } from "@/lib/pipeline-references";

/**
 * Phase 3 (PAP-10941) prosumer surfaces: setup-health warnings on the board
 * header + in stage settings, and typed work references on the case detail
 * panel. These stories are the source for the UXDesigner copy review.
 */

const BOARD_WARNINGS: PipelineHealthWarning[] = [
  {
    code: "paused_agent",
    stageId: "stage-drafting",
    stageKey: "drafting",
    stageName: "Drafting",
    message:
      "This step is assigned to Robin, who's paused right now, so it won't run until they're active again.",
  },
  {
    code: "automation_no_instructions",
    stageId: "stage-assets",
    stageKey: "assets",
    stageName: "Assets",
    message:
      "This step has a teammate assigned but no instructions to follow, so nothing will happen when work arrives here.",
  },
  {
    code: "review_no_approver",
    stageId: "stage-final-review",
    stageKey: "final_review",
    stageName: "Final review",
    message: "This approval step doesn't have anyone set to approve, so work will pile up here. Choose who approves.",
  },
  {
    code: "missing_pipeline_reference",
    stageId: "stage-assets",
    stageKey: "assets",
    stageName: "Assets",
    message:
      "These instructions point to a workflow that's been deleted, so this hand-off won't work. Update the link to an existing workflow.",
  },
  {
    code: "unset_required_variable",
    stageId: "stage-intake",
    stageKey: "intake",
    stageName: "Intake",
    message: 'This step needs "Release notes" filled in before it can run.',
  },
];

const meta: Meta = {
  title: "Pipelines/Setup health",
  parameters: { layout: "padded" },
};
export default meta;

/** The amber warning strip that sits at the top of a pipeline board. */
export const BoardHeaderWarningBar: StoryObj = {
  render: () => (
    <div className="w-full max-w-5xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pipeline</p>
          <h1 className="text-2xl font-semibold text-foreground">Content Production</h1>
          <p className="mt-1 text-xs text-muted-foreground">12 total items</p>
        </div>
      </div>
      <PipelineHealthBar warnings={BOARD_WARNINGS} onSelectStage={() => {}} />
    </div>
  ),
};

/** A single stage's warnings, as shown inside that stage's settings panel. */
export const StageSettingsWarning: StoryObj = {
  render: () => (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
      </div>
      <StageHealthWarnings
        warnings={BOARD_WARNINGS.filter((warning) => warning.stageId === "stage-assets")}
      />
    </div>
  ),
};

/** The "Linked work" section on the case detail panel, rendering typed references. */
export const CaseDetailTypedReferences: StoryObj = {
  render: () => {
    const references = extractWorkReferences({
      workspaceRef: { path: "/content/spring-launch/blog", branch: "feature/spring-blog" },
      fields: {
        draft_doc: { kind: "url", url: "https://docs.example.com/spring-blog-draft", label: "Blog draft" },
        hero_image: "https://cdn.example.com/assets/spring-hero.png",
        work_issue: { issueId: "issue-1", identifier: "PAP-9912", title: "Write the spring launch blog" },
      },
    });
    return (
      <div className="w-full max-w-sm rounded-lg border border-border p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Linked work</h3>
        <PipelineWorkReferences references={references} />
      </div>
    );
  },
};
