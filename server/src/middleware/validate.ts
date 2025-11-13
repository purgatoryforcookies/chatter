import { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "../errors";

/**
 * <3
 *
 * https://jakerobins.com/blog/using-zod-to-provide-typesafe-express-requests
 */

export type HandlerType<T, Q, B> = Request<T, any, Q, B, any>;

export function validateRequest<
  SParams extends z.ZodObject | undefined,
  SQuery extends z.ZodObject | undefined,
  SBody extends z.ZodObject | undefined,
  TParams extends z.infer<SParams extends z.ZodObject ? SParams : any>,
  TQuery extends z.infer<SQuery extends z.ZodObject ? SQuery : any>,
  TBody extends z.infer<SBody extends z.ZodObject ? SBody : any>
>(schema: { params?: SParams; query?: SQuery; body?: SBody }) {
  return (
    req: HandlerType<TParams, TBody, TQuery>,
    res: Response,
    next: NextFunction
  ) => {
    // console.log(req.method, req.url, req.body);
    try {
      schema.params?.parse(req.params || {});

      schema.query?.parse(req.query || {});

      schema.body?.parse(req.body || {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestError(error.message);
      } else {
        throw error;
      }
    }
  };
}
