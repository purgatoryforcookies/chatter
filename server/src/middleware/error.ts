import type { ErrorRequestHandler } from "express";
import { JWSSignatureVerificationFailed } from "jose/errors";
import pino from "pino";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";

const logger = pino({ name: "error-handler" });

export const globalErrorHandlerRest: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(`Error from path ${req.url}`, err);

  if (err instanceof NotFoundError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof BadRequestError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof JWSSignatureVerificationFailed) {
    res.status(403).json({ message: err.message });
    return;
  }
  logger.error(err, "Unexpected error");

  res.status(500).json({ message: "Unexpected error occured." });
};
