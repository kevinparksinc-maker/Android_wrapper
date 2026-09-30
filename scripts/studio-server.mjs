import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const studioRoot = join(root, "studio");
const assetsRoot = join(root, "assets");
const configPath = join(root, "launcher_config.json");
const port = Number(process.env.PORT || 4177);
const exec = promisify(execFile);
let buildState = { status: "idle", message: "Ready to build", startedAt: null, finishedAt: null, outputPath: null, log: "" };

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
  if (Buffer.isBuffer(body) || typeof body === "string") return res.end(body);
  res.end(JSON.stringify(body));
}

async function readConfig() {
  return JSON.parse(await readFile(configPath, "utf8"));
}

function validateConfig(config) {
  if (!config || !config.launcher_settings || !Array.isArray(config.my_portfolio_apps)) throw new Error("Add at least one valid launcher configuration section.");
  const ids = new Set();
  for (const app of config.my_portfolio_apps) {
    if (!app.app_id || !app.display_name || !app.target_live_url) throw new Error("Every app needs an ID, name, and live URL.");
    if (ids.has(app.app_id)) throw new Error(`Duplicate app ID: ${app.app_id}`);
    ids.add(app.app_id);
    const url = new URL(app.target_live_url);
    if (url.protocol !== "https:") throw new Error(`${app.display_name} must use an HTTPS URL.`);
  }
  return config;
}

function runBuild() {
  if (buildState.status === "building") return;
  buildState = { status: "building", message: "Preparing your signed APK…", startedAt: new Date().toISOString(), finishedAt: null, outputPath: null, log: "" };
  const child = spawn("pnpm", ["build:android"], { cwd: root, env: { ...process.env, CI: "1", FORCE_COLOR: "0" } });
  child.stdout.on("data", (chunk) => { buildState.log += chunk.toString(); });
  child.stderr.on("data", (chunk) => { buildState.log += chunk.toString(); });
  child.on("close", (code) => {
    buildState.finishedAt = new Date().toISOString();
    if (code === 0) {
      buildState.status = "success";
      buildState.message = "APK ready to install";
      buildState.outputPath = join(root, "android/app/build/outputs/apk/release/app-release.apk");
    } else {
      buildState.status = "error";
      buildState.message = "Build failed — see the details below";
    }
  });
}

async function handle(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === "GET" && url.pathname === "/api/config") return send(res, 200, await readConfig());
  if (req.method === "GET" && url.pathname === "/api/status") return send(res, 200, { ...buildState, projectPath: root });
  if (req.method === "POST" && url.pathname === "/api/config") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const config = validateConfig(JSON.parse(body));
        await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
        send(res, 200, { ok: true, config });
      } catch (error) {
        send(res, 400, { ok: false, error: error instanceof Error ? error.message : "Invalid configuration" });
      }
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/build") {
    runBuild();
    return send(res, 202, { ok: true, status: buildState });
  }
  if (req.method === "GET") {
    if (url.pathname.startsWith("/assets/")) {
      const assetPath = normalize(join(root, url.pathname));
      if (!assetPath.startsWith(assetsRoot)) return send(res, 403, "Forbidden", "text/plain");
      try { return send(res, 200, await readFile(assetPath), mime[extname(assetPath)] || "application/octet-stream"); } catch { return send(res, 404, "Not found", "text/plain"); }
    }
    const relative = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(studioRoot, relative));
    if (!filePath.startsWith(studioRoot)) return send(res, 403, "Forbidden", "text/plain");
    try { return send(res, 200, await readFile(filePath), mime[extname(filePath)] || "application/octet-stream"); } catch { return send(res, 404, "Not found", "text/plain"); }
  }
  return send(res, 404, { error: "Not found" });
}

await mkdir(studioRoot, { recursive: true });
createServer((req, res) => handle(req, res).catch((error) => send(res, 500, { error: error.message }))).listen(port, "127.0.0.1", () => {
  console.log(`Launcher Studio: http://127.0.0.1:${port}`);
  console.log(`Project: ${root}`);
});
