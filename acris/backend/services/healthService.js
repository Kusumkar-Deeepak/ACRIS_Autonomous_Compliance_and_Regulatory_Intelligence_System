import mongoose from "mongoose";
import net from "net";

import config from "../config/index.js";

function timedProbe(probe, timeoutMs = 1000) {
  return Promise.race([
    probe(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("dependency timeout")), timeoutMs);
    }),
  ]);
}

function probeRedis() {
  const url = new URL(config.redisUrl);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: url.hostname,
      port: Number(url.port || 6379),
    });
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("error", reject);
  });
}

async function probeHttp(url) {
  const response = await globalThis.fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function dependency(probe, extra = {}) {
  const started = Date.now();
  try {
    await timedProbe(probe);
    return { status: "up", latencyMs: Date.now() - started, ...extra };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      reason: error.message,
    };
  }
}

export async function getHealth() {
  const [mongo, redis, chroma, ollama] = await Promise.all([
    dependency(async () => {
      if (mongoose.connection.readyState !== 1)
        throw new Error("not connected");
      await mongoose.connection.db.command({ ping: 1 });
    }),
    dependency(probeRedis),
    dependency(() => probeHttp(`${config.chromaUrl}/api/v1/heartbeat`)),
    dependency(() => probeHttp(`${config.ollamaBaseUrl}/api/tags`), {
      model: config.ollamaModel,
    }),
  ]);
  const dependencies = { mongo, redis, chroma, ollama };

  const healthy = Object.values(dependencies).every(
    ({ status }) => status === "up",
  );
  return {
    status: healthy ? "ok" : "degraded",
    dependencies,
    version: process.env.npm_package_version || "unknown",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
