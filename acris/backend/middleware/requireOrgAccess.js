export default function requireOrgAccess({
  Model,
  idParam = "id",
  orgField = "organizationId",
  resourceName = "resource",
}) {
  return async function orgAccessMiddleware(req, res, next) {
    try {
      const userOrgId = req.user?.organizationId;
      if (!userOrgId) {
        return res.status(403).json({ message: "Missing organization scope" });
      }

      const resourceId = req.params?.[idParam];
      if (!resourceId) {
        return res
          .status(400)
          .json({ message: `${resourceName} id is required` });
      }

      const resource = await Model.findById(resourceId).select(orgField).lean();
      if (!resource) {
        return res.status(404).json({ message: `${resourceName} not found` });
      }

      if (String(resource[orgField] || "") !== String(userOrgId)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
