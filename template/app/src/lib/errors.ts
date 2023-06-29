export class CustomError {
  public name: string = 'CustomError';
  public code: number = 500;
  public message: string;
  public stack?: string;

  constructor(message: string) {
    this.message = message;
    this.stack = Error().stack;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      stack: this.stack
    };
  }
}

export class NotFoundError extends CustomError {
  public name: string = 'NotFoundError';
  public code: number = 404;
}

export class BadRequestError extends CustomError {
  public name: string = 'BadRequestError';
  public code: number = 400;
}

export class UnauthorizedError extends CustomError {
  public name: string = 'UnauthorizedError';
  public code: number = 401;
}

export class ForbiddenError extends CustomError {
  public name: string = 'ForbiddenError';
  public code: number = 403;
}

export class CriticalError extends CustomError {
  public name: string = 'CriticalError';
  public code: number = 500;
}
