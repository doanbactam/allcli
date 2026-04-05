import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runTypeCheck } from "../src/gates/typecheck-gate.js";
import { runLint } from "../src/gates/lint-gate.js";
import { runTest } from "../src/gates/test-gate.js";
import { runBuild } from "../src/gates/build-gate.js";
import type { ExecutionWorkspace } from "@allcli/core";
import type { ExecFileException, ExecFileOptionsWithStringEncoding } from "node:child_process";
import type ChildProcess from "node:child_process";

const mockWorkspace: ExecutionWorkspace = {
  rootPath: "/test/workspace",
  mode: "default"
};

// Mock child_process module
vi.mock("node:child_process", () => ({
  execFile: vi.fn()
}));

import { execFile } from "node:child_process";

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Define the callback type matching execFile signature
type ExecFileCallback = (
  error: ExecFileException | null,
  stdout: string,
  stderr: string
) => void;

// Helper to create a mock implementation
function mockSuccess(stdout = "", stderr = "") {
  mockExecFile.mockImplementation(
    // Type assertion needed due to complex vitest mock types
    ((_file: string, _args: unknown, _options: unknown, callback: ExecFileCallback) => {
      callback(null, stdout, stderr);
      return {} as ChildProcess.ChildProcess;
    }) as typeof execFile
  );
}

function mockFailure(stdout: string, stderr: string, code = 1) {
  const error = new Error("Command failed") as ExecFileException;
  error.code = code;
  mockExecFile.mockImplementation(
    ((_file: string, _args: unknown, _options: unknown, callback: ExecFileCallback) => {
      callback(error, stdout, stderr);
      return {} as ChildProcess.ChildProcess;
    }) as typeof execFile
  );
}

describe("runTypeCheck", () => {
  it("returns passed=true when tsc succeeds", async () => {
    mockSuccess();

    const result = await runTypeCheck(mockWorkspace);

    expect(result.passed).toBe(true);
    expect(result.gate).toBe("typecheck");
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(mockExecFile).toHaveBeenCalledWith(
      "pnpm",
      ["tsc", "-b", "--pretty", "false"],
      { cwd: mockWorkspace.rootPath, shell: true },
      expect.any(Function)
    );
  });

  it("returns passed=false when tsc fails", async () => {
    mockFailure("src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.", "", 2);

    const result = await runTypeCheck(mockWorkspace);

    expect(result.passed).toBe(false);
    expect(result.gate).toBe("typecheck");
    expect(result.output).toContain("error TS2322");
  });

  it("captures stdout and stderr in output", async () => {
    mockFailure("stdout content", "stderr content");

    const result = await runTypeCheck(mockWorkspace);

    expect(result.output).toBe("stdout contentstderr content");
  });

  it("does not include output when stdout and stderr are empty", async () => {
    mockSuccess();

    const result = await runTypeCheck(mockWorkspace);

    expect(result.output).toBeUndefined();
  });
});

describe("runLint", () => {
  it("returns passed=true when eslint succeeds", async () => {
    mockSuccess();

    const result = await runLint(mockWorkspace);

    expect(result.passed).toBe(true);
    expect(result.gate).toBe("lint");
    expect(mockExecFile).toHaveBeenCalledWith(
      "pnpm",
      ["eslint", ".", "--ext", ".ts,.tsx"],
      { cwd: mockWorkspace.rootPath, shell: true },
      expect.any(Function)
    );
  });

  it("returns passed=false when eslint finds issues", async () => {
    mockFailure("src/index.ts\n  10:5  error  'x' is not defined  no-undef", "");

    const result = await runLint(mockWorkspace);

    expect(result.passed).toBe(false);
    expect(result.gate).toBe("lint");
    expect(result.output).toContain("no-undef");
  });

  it("captures combined output from eslint", async () => {
    mockFailure("eslint output", "warning info");

    const result = await runLint(mockWorkspace);

    // (stdout + stderr).trim() concatenates without newline
    expect(result.output).toBe("eslint outputwarning info");
  });
});

describe("runTest", () => {
  it("returns passed=true when vitest succeeds", async () => {
    mockSuccess("Test Files  5 passed");

    const result = await runTest(mockWorkspace);

    expect(result.passed).toBe(true);
    expect(result.gate).toBe("test");
    expect(mockExecFile).toHaveBeenCalledWith(
      "pnpm",
      ["vitest", "run"],
      { cwd: mockWorkspace.rootPath, shell: true },
      expect.any(Function)
    );
  });

  it("returns passed=false when vitest finds failures", async () => {
    mockFailure("FAIL src/utils.test.ts > should work", "");

    const result = await runTest(mockWorkspace);

    expect(result.passed).toBe(false);
    expect(result.gate).toBe("test");
    expect(result.output).toContain("FAIL");
  });

  it("captures test output with failure details", async () => {
    mockFailure("AssertionError: expected 1 to equal 2", "");

    const result = await runTest(mockWorkspace);

    expect(result.output).toContain("AssertionError");
  });
});

describe("runBuild", () => {
  it("returns passed=true when tsc build succeeds", async () => {
    mockSuccess();

    const result = await runBuild(mockWorkspace);

    expect(result.passed).toBe(true);
    expect(result.gate).toBe("build");
    expect(mockExecFile).toHaveBeenCalledWith(
      "pnpm",
      ["tsc", "-b"],
      { cwd: mockWorkspace.rootPath, shell: true },
      expect.any(Function)
    );
  });

  it("returns passed=false when build fails", async () => {
    mockFailure("", "Build failed with 3 errors");

    const result = await runBuild(mockWorkspace);

    expect(result.passed).toBe(false);
    expect(result.gate).toBe("build");
    expect(result.output).toContain("Build failed");
  });

  it("captures build errors in output", async () => {
    mockFailure("", "error TS18003: No inputs were found in config file");

    const result = await runBuild(mockWorkspace);

    expect(result.output).toContain("TS18003");
  });
});

describe("gate workspace handling", () => {
  it("uses workspace rootPath as cwd for typecheck", async () => {
    const customWorkspace: ExecutionWorkspace = {
      rootPath: "/custom/project/path",
      mode: "worktree",
      worktreeId: "feature-branch"
    };

    mockSuccess();

    await runTypeCheck(customWorkspace);

    expect(mockExecFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ cwd: "/custom/project/path" }),
      expect.any(Function)
    );
  });

  it("uses workspace rootPath as cwd for lint", async () => {
    const customWorkspace: ExecutionWorkspace = {
      rootPath: "/another/path",
      mode: "default"
    };

    mockSuccess();

    await runLint(customWorkspace);

    expect(mockExecFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ cwd: "/another/path" }),
      expect.any(Function)
    );
  });
});
