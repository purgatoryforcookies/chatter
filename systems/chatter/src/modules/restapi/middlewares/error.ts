import type { ErrorRequestHandler } from "express";
import { JOSEError } from "jose/errors";
import pino from "pino";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors.js";

const logger = pino({ name: "error-handler" });

export const globalErrorHandlerRest: ErrorRequestHandler = (
  err,
  req,
  res,
  _next
) => {
  logger.debug(err, `Error from path ${req.url}`);

  if (
    err instanceof NotFoundError ||
    err instanceof ForbiddenError ||
    err instanceof BadRequestError
  ) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof JOSEError) {
    res.status(403).json({ message: err.message });
    return;
  }
  logger.error(err, "Unexpected error");

  res.status(500).json({ message: "Unexpected error occured." });
};
