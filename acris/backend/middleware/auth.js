import jwt from "jsonwebtoken";
import config from "../config/index.js";

export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      userId: decoded.userId || null,
      organizationId: decoded.organizationId || null,
      role: decoded.role || null,
      email: decoded.email || null,
      name: decoded.name || decoded.email || "User",
    };

    if (!req.user.userId || !req.user.organizationId || !req.user.role) {
      return res.status(401).json({ message: "Invalid auth token" });
    }

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid auth token" });
  }
}
