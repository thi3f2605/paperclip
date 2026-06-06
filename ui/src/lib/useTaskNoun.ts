import { useQuery } from "@tanstack/react-query";
import { instanceSettingsApi } from "../api/instanceSettings";
import { queryKeys } from "./queryKeys";

export interface TaskNoun {
  /** "Task" when the streamlined-nav flag is ON, "Issue" when OFF. */
  singular: string;
  /** "Tasks" when the streamlined-nav flag is ON, "Issues" when OFF. */
  plural: string;
}

const ISSUE_NOUN: TaskNoun = { singular: "Issue", plural: "Issues" };
const TASK_NOUN: TaskNoun = { singular: "Task", plural: "Tasks" };

/**
 * Returns the user-facing noun for a unit of work, gated on the
 * `enableStreamlinedLeftNavigation` experimental flag (PAP-80 D1 → option A).
 *
 * Flag ON  → { singular: "Task",  plural: "Tasks"  }
 * Flag OFF → { singular: "Issue", plural: "Issues" } (default)
 *
 * Intended only for the high-visibility surfaces (sidebar/mobile nav labels,
 * the New-Task button, the tasks-list title/breadcrumb). Deeper copy stays
 * on the already-renamed "Task" wording.
 */
export function useTaskNoun(): TaskNoun {
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  return experimentalSettings?.enableStreamlinedLeftNavigation === true
    ? TASK_NOUN
    : ISSUE_NOUN;
}
