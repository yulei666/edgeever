import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Xcode Cloud control", () => {
  test("exposes start, wait, and VALID-build resolution for store delivery", () => {
    const script = readFileSync(
      new URL("./xcode-cloud-control.py", import.meta.url),
      "utf8",
    );
    const workflow = readFileSync(
      new URL("../.github/workflows/store-delivery.yml", import.meta.url),
      "utf8",
    );
    const cloudWorkflow = readFileSync(
      new URL("../.github/workflows/ios-xcode-cloud.yml", import.meta.url),
      "utf8",
    );

    expect(script).toContain('sub.add_parser("start"');
    expect(script).toContain('sub.add_parser("wait"');
    expect(script).toContain("--wait-valid");
    expect(script).toContain("--require-sha");
    expect(script).toContain("sourceBranchOrTag");
    expect(script).toContain("processingState");
    expect(script).toContain('emit("build_number"');
    expect(script).not.toContain("APP_STORE_BUILD_NUMBER: \"49\"");

    expect(workflow).toContain(".edgeever-ci/scripts/xcode-cloud-control.py");
    expect(workflow).toContain("--wait-valid");
    expect(workflow).toContain("--require-sha");

    expect(cloudWorkflow).toContain("scripts/xcode-cloud-control.py");
    expect(cloudWorkflow).not.toContain("submit-review");
    expect(cloudWorkflow).not.toContain('APP_STORE_BUILD_NUMBER: "49"');
  });
});
