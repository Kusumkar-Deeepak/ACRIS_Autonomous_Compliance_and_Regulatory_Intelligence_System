import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localPython = process.platform === "win32"
  ? path.join(root, ".venv", "Scripts", "python.exe")
  : path.join(root, ".venv", "bin", "python");
const python = existsSync(localPython)
  ? localPython
  : process.env.PYTHON_BIN || "python";

const result = spawnSync(python, ["-m", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Unable to run ${python}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
