import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const backendDir = path.dirname(currentFile);
export const projectRoot = path.resolve(backendDir, "..", "..");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

export function resolveProjectPath(targetPath) {
  if (!targetPath) return projectRoot;
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(projectRoot, targetPath);
}

export const uploadsDir = resolveProjectPath(
  process.env.UPLOADS_DIR || "./uploads",
);
export const reportsDir = resolveProjectPath(
  process.env.REPORTS_DIR || "./reports",
);
export const chromaDir = resolveProjectPath(
  process.env.CHROMA_PERSIST_DIR || "./chroma_db",
);
export const agentsDir = path.resolve(projectRoot, "agents");
export const pythonCommand =
  process.env.PYTHON_BIN ||
  (process.platform === "win32" ? "python" : "python3");

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

ensureDirectory(uploadsDir);
ensureDirectory(reportsDir);
ensureDirectory(chromaDir);
