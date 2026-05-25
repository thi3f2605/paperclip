// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext";
import { Projects } from "./Projects";

const mockProjectsApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockResourceMembershipsApi = vi.hoisted(() => ({
  listMine: vi.fn(),
  updateProject: vi.fn(),
}));

const mockOpenNewProject = vi.hoisted(() => vi.fn());
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialogActions: () => ({ openNewProject: mockOpenNewProject }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

vi.mock("../api/projects", () => ({
  projectsApi: mockProjectsApi,
}));

vi.mock("../api/resourceMemberships", () => ({
  resourceMembershipsApi: mockResourceMembershipsApi,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProject(overrides: Partial<Project>): Project {
  const now = new Date("2026-05-01T00:00:00Z");
  return {
    id: "project-1",
    companyId: "company-1",
    urlKey: "project-1",
    goalId: null,
    goalIds: [],
    goals: [],
    name: "Project",
    description: null,
    status: "in_progress",
    leadAgentId: null,
    targetDate: null,
    color: "#14b8a6",
    env: null,
    pauseReason: null,
    pausedAt: null,
    executionWorkspacePolicy: null,
    codebase: {
      workspaceId: null,
      repoUrl: null,
      repoRef: null,
      defaultRef: null,
      repoName: null,
      localFolder: null,
      managedFolder: "/tmp/project-1",
      effectiveLocalFolder: "/tmp/project-1",
      origin: "managed_checkout",
    },
    workspaces: [],
    primaryWorkspace: null,
    managedByPlugin: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function projectLinkNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href^='/projects/']")).map((link) => {
    const title = link.querySelector("span.truncate");
    return title?.textContent ?? "";
  });
}

describe("Projects", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockProjectsApi.list.mockResolvedValue([
      makeProject({
        id: "project-bravo",
        urlKey: "bravo",
        name: "Bravo",
        description: null,
        updatedAt: new Date("2026-05-02T00:00:00Z"),
      }),
      makeProject({
        id: "project-alpha",
        urlKey: "alpha",
        name: "Alpha",
        description: "First project",
        updatedAt: new Date("2026-05-01T00:00:00Z"),
      }),
      makeProject({
        id: "project-charlie",
        urlKey: "charlie",
        name: "Charlie",
        description: null,
        updatedAt: new Date("2026-05-03T00:00:00Z"),
      }),
    ]);
    mockResourceMembershipsApi.listMine.mockResolvedValue({
      projectMemberships: { "project-bravo": "left" },
      agentMemberships: {},
      updatedAt: null,
    });
    mockResourceMembershipsApi.updateProject.mockResolvedValue({
      resourceType: "project",
      resourceId: "project-bravo",
      state: "joined",
      updatedAt: new Date("2026-05-02T00:00:00Z"),
    });
  });

  afterEach(async () => {
    const currentRoot = root;
    if (currentRoot) {
      await act(async () => {
        currentRoot.unmount();
      });
    }
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function renderProjects() {
    const currentRoot = createRoot(container);
    root = currentRoot;

    await act(async () => {
      currentRoot.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Projects />
          </ToastProvider>
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();
  }

  it("groups joined projects above left projects", async () => {
    await renderProjects();

    const content = container.textContent ?? "";
    expect(content.indexOf("My Projects")).toBeLessThan(content.indexOf("Alpha"));
    expect(content.indexOf("Alpha")).toBeLessThan(content.indexOf("Charlie"));
    expect(content.indexOf("Charlie")).toBeLessThan(content.indexOf("Other Projects"));
    expect(content.indexOf("Other Projects")).toBeLessThan(content.indexOf("Bravo"));
  });

  it("sorts projects by name by default and can switch sort mode", async () => {
    await renderProjects();

    expect(projectLinkNames(container)).toEqual(["Alpha", "Charlie", "Bravo"]);

    const select = container.querySelector("select");
    expect(select).not.toBeNull();

    await act(async () => {
      select!.value = "updated";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(projectLinkNames(container)).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("reserves description line height for projects without descriptions", async () => {
    await renderProjects();

    const bravoLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a")).find((link) =>
      link.textContent?.includes("Bravo"),
    );
    const hiddenDescriptionLine = bravoLink?.querySelector("p[aria-hidden='true']");

    expect(hiddenDescriptionLine).not.toBeNull();
    expect(hiddenDescriptionLine?.className).toContain("min-h-4");
  });
});
