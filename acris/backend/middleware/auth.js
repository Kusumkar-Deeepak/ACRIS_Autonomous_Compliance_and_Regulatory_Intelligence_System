import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_here",
    );
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid auth token" });
  }
}
