const attempts = new Map();
const windowMs = 15 * 60 * 1000;
const maxAttempts = 10;

function keyFor(req) {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  return `${req.ip}:${email}`;
}

export default function loginRateLimit(req, res, next) {
  const key = keyFor(req);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recent.length >= maxAttempts) {
    res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
    return res.status(429).json({ message: "Too many login attempts" });
  }

  recent.push(now);
  attempts.set(key, recent);
  return next();
}
