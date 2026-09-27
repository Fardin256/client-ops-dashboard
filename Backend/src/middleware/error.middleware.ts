import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("[Error]", err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message || "Internal server error";

  return res.status(status).json({
    error: message,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({ error: "Route not found" });
}