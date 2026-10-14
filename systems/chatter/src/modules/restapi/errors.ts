export class NotFoundError extends Error {
  readonly status = 404;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends Error {
  readonly status = 400;

  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}
