// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskNoun, type TaskNoun } from "./useTaskNoun";

const mockInstanceSettingsApi = vi.hoisted(() => ({
  getExperimental: vi.fn(),
}));

vi.mock("../api/instanceSettings", () => ({
  instanceSettingsApi: mockInstanceSettingsApi,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

let captured: TaskNoun | null = null;

function Harness() {
  captured = useTaskNoun();
  return null;
}

async function renderHook() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  await flushReact();
  return () => {
    root.unmount();
    container.remove();
  };
}

describe("useTaskNoun", () => {
  beforeEach(() => {
    captured = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("returns the Issue noun when the streamlined-nav flag is OFF (default)", async () => {
    mockInstanceSettingsApi.getExperimental.mockResolvedValue({
      enableStreamlinedLeftNavigation: false,
    });
    const cleanup = await renderHook();
    expect(captured).toEqual({ singular: "Issue", plural: "Issues" });
    cleanup();
  });

  it("returns the Task noun when the streamlined-nav flag is ON", async () => {
    mockInstanceSettingsApi.getExperimental.mockResolvedValue({
      enableStreamlinedLeftNavigation: true,
    });
    const cleanup = await renderHook();
    expect(captured).toEqual({ singular: "Task", plural: "Tasks" });
    cleanup();
  });

  it("falls back to the Issue noun before settings have loaded", async () => {
    // Never resolves — simulates the in-flight state on first render.
    mockInstanceSettingsApi.getExperimental.mockReturnValue(new Promise(() => {}));
    const cleanup = await renderHook();
    expect(captured).toEqual({ singular: "Issue", plural: "Issues" });
    cleanup();
  });
});
