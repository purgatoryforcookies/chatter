import { RequestHandler } from "express";

export const globalHeaders: RequestHandler = (_req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://key.purgatoryforcookies.com, https://chatter.purgatoryforcookies.com"
  );
  next();
};
