export default function requireRole(...allowedRoles) {
  const roleSet = new Set(allowedRoles);

  return function roleMiddleware(req, res, next) {
    const role = req.user?.role;
    if (!role || !roleSet.has(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}
