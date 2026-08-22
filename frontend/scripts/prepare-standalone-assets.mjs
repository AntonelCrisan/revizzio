import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(root, ".next", "standalone");
const sourceStaticDir = join(root, ".next", "static");
const targetStaticDir = join(standaloneDir, ".next", "static");
const sourcePublicDir = join(root, "public");
const targetPublicDir = join(standaloneDir, "public");

function copyRequiredDir(source, target, label) {
  if (!existsSync(source)) {
    throw new Error(
      `${label} is missing. Run "npm run build" before "npm run start".`,
    );
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

if (!existsSync(standaloneDir)) {
  throw new Error(
    'Standalone build is missing. Run "npm run build" before "npm run start".',
  );
}

copyRequiredDir(sourceStaticDir, targetStaticDir, ".next/static");
copyRequiredDir(sourcePublicDir, targetPublicDir, "public");
