import type { RequestHandler } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "../errors.js";

export const validateRequest =
  ({
    params,
    query,
    body,
  }: {
    params?: z.ZodType;
    query?: z.ZodType;
    body?: z.ZodType;
  }): RequestHandler =>
  (req, _res, next) => {
    try {
      params?.parse(req.params);
      query?.parse(req.query);
      body?.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestError(
          error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")
        );
      }
      throw error;
    }
    next();
  };
