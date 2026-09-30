import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "launcher_config.json");
const destination = resolve(root, "client/public/launcher_config.json");
const assetsSource = resolve(root, "assets");
const assetsDestination = resolve(root, "client/public/assets");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
await rm(assetsDestination, { recursive: true, force: true });
await cp(assetsSource, assetsDestination, { recursive: true });
console.log(`Synchronized ${source} and assets → client/public`);
