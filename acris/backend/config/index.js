import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const backendDir = path.dirname(currentFile);
const projectRoot = path.resolve(backendDir, "..", "..");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/acris",
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_here",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
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