import { describe, expect, test } from "bun:test";
import {
  downloadGithubReleaseAsset,
  downloadGithubReleaseAssetByTag,
  readGithubReleaseByTag,
  readGithubRepositoryManifestText,
} from "./plugin-distribution-routes.ts";

describe("GitHub plugin release asset proxy", () => {
  test("downloads a supported release asset on the server", async () => {
    const calls = [];
    const buffer = await downloadGithubReleaseAsset({
      owner: "example",
      repository: "edgeever-plugin",
      assetId: "42",
      assetName: "main.js",
      request: async (input) => {
        calls.push(String(input));
        return new Response("export default {};", { headers: { "content-length": "18" } });
      },
    });

    expect(new TextDecoder().decode(buffer)).toBe("export default {};");
    expect(calls).toEqual(["https://api.github.com/repos/example/edgeever-plugin/releases/assets/42"]);
  });

  test("rejects an oversized release asset", async () => {
    await expect(downloadGithubReleaseAsset({
      owner: "example",
      repository: "edgeever-plugin",
      assetId: "42",
      assetName: "manifest.json",
      request: async () => new Response("", { headers: { "content-length": String(300 * 1024) } }),
    })).rejects.toThrow("exceeds the allowed package size");
  });

  test("downloads a public release asset without consuming the GitHub REST API quota", async () => {
    const calls = [];
    const buffer = await downloadGithubReleaseAssetByTag({
      owner: "example",
      repository: "edgeever-plugin",
      releaseTag: "v1.2.3-preview.1",
      assetName: "main.js",
      request: async (input) => {
        calls.push(String(input));
        return new Response("export default {};", { headers: { "content-length": "18" } });
      },
    });

    expect(new TextDecoder().decode(buffer)).toBe("export default {};");
    expect(calls).toEqual([
      "https://github.com/example/edgeever-plugin/releases/download/v1.2.3-preview.1/main.js",
    ]);
  });

  test("rejects release coordinates that could escape the GitHub download path", async () => {
    await expect(downloadGithubReleaseAssetByTag({
      owner: "example",
      repository: "edgeever-plugin",
      releaseTag: "../../latest",
      assetName: "main.js",
      request: async () => new Response("should not be fetched"),
    })).rejects.toThrow("Invalid GitHub release coordinates");

    await expect(downloadGithubReleaseAssetByTag({
      owner: "example",
      repository: "..",
      releaseTag: "v1.2.3",
      assetName: "main.js",
      request: async () => new Response("should not be fetched"),
    })).rejects.toThrow("Invalid GitHub release coordinates");
  });

  test("reads the raw repository manifest for live official plugin resolution", async () => {
    const text = await readGithubRepositoryManifestText({
      owner: "example",
      repository: "edgeever-plugin",
      request: async () => new Response("{\"version\":\"0.5.4\"}", { headers: { "content-length": "20" } }),
    });
    expect(text).toBe("{\"version\":\"0.5.4\"}");
  });

  test("reads a GitHub release by tag without exposing unrelated fields", async () => {
    const release = await readGithubReleaseByTag({
      owner: "example",
      repository: "edgeever-plugin",
      releaseTag: "v0.5.4",
      request: async () => Response.json({
        tag_name: "v0.5.4",
        draft: false,
        extra: "omit",
        assets: [{
          id: 9,
          name: "main.js",
          size: 12,
          url: "https://api.github.com/assets/9",
          browser_download_url: "https://github.com/download/main.js",
          digest: "sha256:abc",
        }],
      }),
    });
    expect(release).toEqual({
      tag_name: "v0.5.4",
      draft: false,
      assets: [{
        id: 9,
        name: "main.js",
        size: 12,
        url: "https://api.github.com/assets/9",
        browser_download_url: "https://github.com/download/main.js",
        digest: "sha256:abc",
      }],
    });
  });
});
