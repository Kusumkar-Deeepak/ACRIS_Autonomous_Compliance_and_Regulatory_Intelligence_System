export default function errorHandler(error, req, res, _next) {
  console.error("[ACRIS][ERROR]", {
    method: req.method,
    url: req.originalUrl,
    message: error?.message,
    stack: error?.stack,
  });

  const status = error?.statusCode || error?.status || 500;
  const message = error?.message || "Internal server error";
  const code = error?.code || "INTERNAL_SERVER_ERROR";
  const payload = {
    message,
    code,
    error: {
      code,
      message,
      requestId: req.id || undefined,
    },
  };

  if (process.env.NODE_ENV === "development") {
    payload.details = error?.details || undefined;
    payload.error.details = error?.details || undefined;
  }

  return res.status(status).json(payload);
}
