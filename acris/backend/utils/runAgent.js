import { spawn } from "child_process";
import path from "path";
import { agentsDir, pythonCommand } from "./paths.js";

export function runAgent(scriptName, inputJSON) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(agentsDir, scriptName);
    const childEnv = {
      ...process.env,
      PYTHONIOENCODING: process.env.PYTHONIOENCODING || "utf-8",
      PYTHONUTF8: process.env.PYTHONUTF8 || "1",
    };

    const proc = spawn(pythonCommand, [scriptPath, JSON.stringify(inputJSON)], {
      cwd: agentsDir,
      env: childEnv,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("error", (error) => reject(error));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr || `Agent ${scriptName} exited with code ${code}`),
        );
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Agent output not valid JSON: ${stdout || stderr}`));
      }
    });
  });
}
