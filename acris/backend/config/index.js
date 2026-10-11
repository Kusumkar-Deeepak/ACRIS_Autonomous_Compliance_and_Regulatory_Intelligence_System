import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const backendDir = path.dirname(currentFile);
const projectRoot = path.resolve(backendDir, "..", "..");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
const isDevelopment = ["development", "test"].includes(nodeEnv);

function resolveJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (configuredSecret) {
    if (["your_jwt_secret_here", "changeme", "secret"].includes(configuredSecret.toLowerCase())) {
      if (isDevelopment) {
        return `development-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      }

      throw new Error("JWT_SECRET contains a placeholder value and must be changed before use");
    }

    if (configuredSecret.length < 32 && !isDevelopment) {
      throw new Error("JWT_SECRET must be at least 32 characters long");
    }

    return configuredSecret;
  }

  if (isDevelopment) {
    return `development-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  throw new Error("JWT_SECRET is required outside development and test environments");
}

const jwtSecret = resolveJwtSecret();

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/acris",
  jwtSecret,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3:latest",
  ollamaEmbeddingModel:
    process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
  chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
  uploadsDir: process.env.UPLOADS_DIR || path.resolve(projectRoot, "uploads"),
  reportsDir: process.env.REPORTS_DIR || path.resolve(projectRoot, "reports"),
  chromaDir:
    process.env.CHROMA_PERSIST_DIR || path.resolve(projectRoot, "chroma_db"),
};

export default config;


// for creating new user
// curl -X POST http://localhost:5000/api/auth/bootstrap \
//   -H "Content-Type: application/json" \
//   -d '{"email": "admin@example.com", "password": "password123", "role": "admin", "organizationName": "Your Organization"}'

// {"email": "admin@example.com", "password": "password123", "role": "admin", "organizationName": "Your Organization"}