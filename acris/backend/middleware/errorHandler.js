export default function errorHandler(error, req, res, next) {
  console.error("[ACRIS][ERROR]", {
    method: req.method,
    url: req.originalUrl,
    message: error?.message,
    stack: error?.stack,
  });

  const status = error?.statusCode || error?.status || 500;
  const payload = {
    message: error?.message || "Internal server error",
  };

  if (process.env.NODE_ENV === "development") {
    payload.details = error?.details || undefined;
  }

  return res.status(status).json(payload);
}
