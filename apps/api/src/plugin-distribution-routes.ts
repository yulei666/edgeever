import type { Hono } from "hono";
import type { AppEnv } from "./api-context";
import { apiError, badRequest, notFound } from "./http-errors";

const GITHUB_API_VERSION = "2022-11-28";
const OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const REPOSITORY_PATTERN = /^[a-z0-9._-]+$/i;
const ASSET_ID_PATTERN = /^\d+$/;
const RELEASE_TAG_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;
const ASSET_LIMITS = {
  "manifest.json": 256 * 1024,
  "main.js": 5 * 1024 * 1024,
  "styles.css": 1024 * 1024,
} as const;

type SupportedPluginAssetName = keyof typeof ASSET_LIMITS;

const hasValidRepositoryCoordinates = (owner: string, repository: string) =>
  OWNER_PATTERN.test(owner)
  && REPOSITORY_PATTERN.test(repository)
  && repository !== "."
  && repository !== "..";

const readBoundedAsset = async (response: Response, assetName: SupportedPluginAssetName) => {
  if (!response.ok) throw new Error(`GitHub asset ${assetName} failed with HTTP ${response.status}.`);
  const maximumBytes = ASSET_LIMITS[assetName];
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > maximumBytes) throw new Error(`${assetName} exceeds the allowed package size.`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maximumBytes) throw new Error(`${assetName} exceeds the allowed package size.`);
  return buffer;
};

export const downloadGithubReleaseAsset = async ({
  owner,
  repository,
  assetId,
  assetName,
  request = fetch,
}: {
  owner: string;
  repository: string;
  assetId: string;
  assetName: SupportedPluginAssetName;
  request?: typeof fetch;
}) => {
  const response = await request(`https://api.github.com/repos/${owner}/${repository}/releases/assets/${assetId}`, {
    redirect: "follow",
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "EdgeEver",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
  return readBoundedAsset(response, assetName);
};

class GithubUpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GithubUpstreamError";
    this.status = status;
  }
}

export const readGithubRepositoryManifestText = async ({
  owner,
  repository,
  request = fetch,
}: {
  owner: string;
  repository: string;
  request?: typeof fetch;
}) => {
  if (!hasValidRepositoryCoordinates(owner, repository)) throw new Error("Invalid GitHub repository coordinates.");
  const response = await request(`https://api.github.com/repos/${owner}/${repository}/contents/manifest.json`, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "EdgeEver",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
  if (response.status === 404) throw new GithubUpstreamError("Repository manifest was not found.", 404);
  if (!response.ok) throw new Error(`Repository manifest request failed with HTTP ${response.status}.`);
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > ASSET_LIMITS["manifest.json"]) {
    throw new Error("manifest.json exceeds the allowed package size.");
  }
  return text;
};

export const readGithubReleaseByTag = async ({
  owner,
  repository,
  releaseTag,
  request = fetch,
}: {
  owner: string;
  repository: string;
  releaseTag: string;
  request?: typeof fetch;
}) => {
  if (!hasValidRepositoryCoordinates(owner, repository) || !RELEASE_TAG_PATTERN.test(releaseTag)) {
    throw new Error("Invalid GitHub release coordinates.");
  }
  const response = await request(
    `https://api.github.com/repos/${owner}/${repository}/releases/tags/${encodeURIComponent(releaseTag)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "EdgeEver",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    },
  );
  if (response.status === 404) throw new GithubUpstreamError("GitHub release was not found.", 404);
  if (!response.ok) throw new Error(`GitHub release request failed with HTTP ${response.status}.`);
  const release = await response.json() as {
    tag_name?: unknown;
    draft?: unknown;
    assets?: unknown;
  };
  if (typeof release.tag_name !== "string" || !Array.isArray(release.assets)) {
    throw new Error("GitHub release response is invalid.");
  }
  return {
    tag_name: release.tag_name,
    draft: release.draft === true,
    assets: release.assets.flatMap((asset) => {
      if (!asset || typeof asset !== "object") return [];
      const record = asset as Record<string, unknown>;
      if (typeof record.id !== "number" || typeof record.name !== "string" || typeof record.size !== "number") return [];
      if (typeof record.url !== "string" || typeof record.browser_download_url !== "string") return [];
      return [{
        id: record.id,
        name: record.name,
        size: record.size,
        url: record.url,
        browser_download_url: record.browser_download_url,
        ...(typeof record.digest === "string" ? { digest: record.digest } : {}),
      }];
    }),
  };
};

const githubUpstreamError = (context: Parameters<typeof apiError>[0], error: unknown) => {
  if (error instanceof GithubUpstreamError && error.status === 404) return notFound(context, error.message);
  return apiError(
    context,
    "github_metadata_request_failed",
    error instanceof Error ? error.message : "GitHub plugin metadata request failed.",
    502,
  );
};

export const downloadGithubReleaseAssetByTag = async ({
  owner,
  repository,
  releaseTag,
  assetName,
  request = fetch,
}: {
  owner: string;
  repository: string;
  releaseTag: string;
  assetName: SupportedPluginAssetName;
  request?: typeof fetch;
}) => {
  if (!hasValidRepositoryCoordinates(owner, repository) || !RELEASE_TAG_PATTERN.test(releaseTag)) {
    throw new Error("Invalid GitHub release coordinates.");
  }
  const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(assetName)}`;
  const response = await request(url, {
    redirect: "follow",
    headers: { "User-Agent": "EdgeEver" },
  });
  return readBoundedAsset(response, assetName);
};

export const registerPluginDistributionRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/v1/plugins/github/:owner/:repository/manifest", async (context) => {
    const owner = context.req.param("owner");
    const repository = context.req.param("repository");
    if (!hasValidRepositoryCoordinates(owner, repository)) {
      return badRequest(context, "Invalid GitHub repository coordinates.");
    }
    try {
      const text = await readGithubRepositoryManifestText({ owner, repository });
      return context.text(text, 200, {
        "Cache-Control": "private, max-age=60",
        "Content-Type": "application/json; charset=utf-8",
      });
    } catch (error) {
      return githubUpstreamError(context, error);
    }
  });

  app.get("/api/v1/plugins/github/:owner/:repository/releases/tags/:releaseTag", async (context) => {
    const owner = context.req.param("owner");
    const repository = context.req.param("repository");
    const releaseTag = context.req.param("releaseTag");
    if (!hasValidRepositoryCoordinates(owner, repository) || !RELEASE_TAG_PATTERN.test(releaseTag)) {
      return badRequest(context, "Invalid GitHub release coordinates.");
    }
    try {
      const release = await readGithubReleaseByTag({ owner, repository, releaseTag });
      context.header("Cache-Control", "private, max-age=60");
      return context.json(release);
    } catch (error) {
      return githubUpstreamError(context, error);
    }
  });

  app.get("/api/v1/plugins/github/:owner/:repository/releases/:releaseTag/assets/:assetName", async (context) => {
    const owner = context.req.param("owner");
    const repository = context.req.param("repository");
    const releaseTag = context.req.param("releaseTag");
    const assetName = context.req.param("assetName");
    if (!hasValidRepositoryCoordinates(owner, repository) || !RELEASE_TAG_PATTERN.test(releaseTag)) {
      return badRequest(context, "Invalid GitHub release coordinates.");
    }
    if (!(assetName in ASSET_LIMITS)) return badRequest(context, "Unsupported plugin release asset.");

    try {
      const buffer = await downloadGithubReleaseAssetByTag({
        owner,
        repository,
        releaseTag,
        assetName: assetName as SupportedPluginAssetName,
      });
      return context.body(buffer, 200, {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "application/octet-stream",
      });
    } catch (error) {
      return apiError(
        context,
        "github_asset_download_failed",
        error instanceof Error ? error.message : "GitHub release asset download failed.",
        502,
      );
    }
  });

  app.get("/api/v1/plugins/github/:owner/:repository/assets/:assetId/:assetName", async (context) => {
    const owner = context.req.param("owner");
    const repository = context.req.param("repository");
    const assetId = context.req.param("assetId");
    const assetName = context.req.param("assetName");
    if (!hasValidRepositoryCoordinates(owner, repository) || !ASSET_ID_PATTERN.test(assetId)) {
      return badRequest(context, "Invalid GitHub release asset coordinates.");
    }
    if (!(assetName in ASSET_LIMITS)) return badRequest(context, "Unsupported plugin release asset.");

    try {
      const buffer = await downloadGithubReleaseAsset({
        owner,
        repository,
        assetId,
        assetName: assetName as SupportedPluginAssetName,
      });
      return context.body(buffer, 200, {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "application/octet-stream",
      });
    } catch (error) {
      return apiError(
        context,
        "github_asset_download_failed",
        error instanceof Error ? error.message : "GitHub release asset download failed.",
        502,
      );
    }
  });
};
