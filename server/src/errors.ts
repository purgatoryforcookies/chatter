export class NotFoundError extends Error {
  status = 404;

  constructor(msg = "Not found", cause?: unknown) {
    super(msg);
    this.cause = cause;
  }
}

export class ForbiddenError extends Error {
  status = 403;

  constructor(msg = "No permission", cause?: unknown) {
    super(msg);
    this.cause = cause;
  }
}

export class BadRequestError extends Error {
  status = 400;

  constructor(msg = "Bad request", cause?: unknown) {
    super(msg);
    this.cause = cause;
  }
}
