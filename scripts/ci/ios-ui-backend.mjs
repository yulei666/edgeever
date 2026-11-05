// Fork-only CI helper for #652 PR A and PR B iOS UI tests. Never merged upstream.
// Starts the real self-hosted server from this checkout plus a mock OpenAI-compatible
// provider, then seeds an admin account, the mock provider as default model and one note per
// UI case. The note body carries MODE=<case>, which tells the mock how to stream:
//   complete      start marker, text, end marker, finish "stop"
//   length        start marker, text, no end marker, finish "length"
//   unterminated  start marker, text, no end marker, finish "stop" (a gateway that cuts silently)
//   stop          start marker, then one chunk per second for two minutes (the test taps Stop)
//   drop          start marker and two paragraphs, then the connection is cut mid-stream
//   cut           no marker and no finish reason: one fragment, then the stream closes cleanly
//   continue      first request cut at "length"; the continuation (#652 PR B) finishes cleanly
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const TMP = process.env.RUNNER_TEMP ?? "/tmp";
const DATA = join(TMP, "ee-ui-data");
const LOG = join(TMP, "ee-ui-backend.log");
const READY = join(TMP, "ee-ui-backend-ready");
const PORT = 18795;
const MOCK = 19921;
const PASSWORD = "ui-test-652-local-only";
const base = `http://127.0.0.1:${PORT}`;
const log = (line) => { appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`); console.log(line); };

mkdirSync(DATA, { recursive: true });
mkdirSync(join(TMP, "ee-ui-web"), { recursive: true });

const encoder = new TextEncoder();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (content, finish = null) => `data: ${JSON.stringify({ choices: [{ index: 0, delta: content ? { content } : {}, finish_reason: finish }] })}\n\n`;

Bun.serve({
  port: MOCK,
  hostname: "127.0.0.1",
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const text = req.method === "POST" ? await req.text() : "";
    log(`mock ${req.method} ${url.pathname}${text ? ` max_tokens=${JSON.parse(text).max_tokens ?? "omitted"}` : ""}`);
    if (url.pathname === "/v1/models") return Response.json({ object: "list", data: [{ id: "mock-model", object: "model", owned_by: "ci" }] });
    if (url.pathname === "/v1/model/info") return new Response("not found", { status: 404 });
    if (url.pathname !== "/v1/chat/completions") return new Response("unexpected", { status: 404 });
    const mode = text.match(/MODE=(complete|length|unterminated|stop|drop|cut|continue)/)?.[1] ?? "complete";
    const token = text.match(/<edgeever-result-([0-9a-f]+)>/)?.[1];
    const start = token ? `<edgeever-result-${token}>` : "";
    const end = token ? `</edgeever-result-${token}>` : "";
    log(`mock mode=${mode} boundary=${token ? "yes" : "no"}`);
    const stream = new ReadableStream({
      async start(controller) {
        const send = (value) => controller.enqueue(encoder.encode(value));
        if (mode === "cut") {
          // A gateway that forwards a fragment and closes without markers or a finish reason.
          send(chunk("Fragment paragraph one.\n\nFragment paragraph tw"));
          await sleep(300);
          controller.close();
          return;
        }
        send(chunk(`${start}\n`));
        if (mode === "continue") {
          if (text.includes("Response so far")) {
            send(chunk("Continued paragraph three."));
            send(chunk(`\n${end}`));
            send(chunk("", "stop"));
          } else {
            send(chunk("First paragraph one.\n\nFirst paragraph two is cut"));
            send(chunk("", "length"));
          }
          send("data: [DONE]\n\n");
          controller.close();
          return;
        }
        if (mode === "drop") {
          send(chunk("Received paragraph one.\n\nReceived paragraph two.\n\n"));
          await sleep(300);
          // Cut the connection without a finish: the client sees a network error after the text.
          controller.error(new Error("connection dropped by the CI mock"));
          return;
        }
        if (mode === "stop") {
          for (let i = 1; i <= 120; i += 1) {
            send(chunk(`Streaming paragraph ${i}.\n\n`));
            await sleep(1000);
          }
        } else {
          for (const piece of ["Polished paragraph one.", "\n\nPolished paragraph two.", "\n\nPolished paragraph three."]) {
            send(chunk(piece));
            await sleep(150);
          }
        }
        if (mode === "complete") send(chunk(`\n${end}`));
        send(chunk("", mode === "length" ? "length" : "stop"));
        send("data: [DONE]\n\n");
        controller.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
  },
});

const server = Bun.spawn(["bun", "scripts/self-hosted-server.mjs"], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    EDGE_EVER_DATA_DIR: DATA,
    EDGE_EVER_WEB_DIR: join(TMP, "ee-ui-web"),
    EDGE_EVER_PORT: String(PORT),
    EDGE_EVER_HOST: "127.0.0.1",
    EDGE_EVER_AUTH_USERNAME: "admin",
    EDGE_EVER_AUTH_PASSWORD: PASSWORD,
    EDGE_EVER_INSTANCE: "",
  },
});
process.on("exit", () => server.kill());

for (let i = 0; i < 120; i += 1) {
  try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
  await sleep(500);
}

let cookie = "";
const api = async (path, method = "GET", body) => {
  const headers = { "content-type": "application/json", origin: base, ...(cookie ? { cookie } : {}) };
  const res = await fetch(base + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const json = await res.json().catch(() => null);
  log(`seed ${method} ${path} -> ${res.status}`);
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
};

await api("/api/v1/auth/login", "POST", { username: "admin", password: PASSWORD });
const created = await api("/api/v1/ai/providers", "POST", {
  provider: "openai-compatible",
  displayName: "CI mock provider",
  baseUrl: `http://127.0.0.1:${MOCK}/v1`,
  apiKey: "sk-ci-mock",
  isEnabled: true,
  initialModelId: "mock-model",
});
const provider = created.providers.find((item) => item.displayName === "CI mock provider");
await api("/api/v1/ai/default-model", "PUT", { modelConfigId: provider.models[0].id });

const listed = await api("/api/v1/notebooks");
let notebook = (listed.notebooks ?? listed)[0];
if (!notebook) notebook = (await api("/api/v1/notebooks", "POST", { name: "UI tests" })).notebook;
for (const mode of ["complete", "length", "unterminated", "stop", "drop", "cut", "continue"]) {
  await api("/api/v1/memos", "POST", {
    notebookId: notebook.id,
    title: `UI ${mode}`,
    contentMarkdown: `Draft paragraph for the ${mode} case. MODE=${mode}\n\nSecond paragraph that the assistant should polish.`,
  });
}

writeFileSync(READY, JSON.stringify({ base, username: "admin", password: PASSWORD }));
log("ready");
await new Promise(() => {});
