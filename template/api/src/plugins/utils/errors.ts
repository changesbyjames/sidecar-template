import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { setup, defaultClient } from 'applicationinsights';

if (process.env.APP_INSIGHTS_CONNECTION_STRING) setup(process.env.APP_INSIGHTS_CONNECTION_STRING).start();

export const insights = defaultClient;

export class CustomError extends Error {
  public name: string = 'CustomError';
  public code: number = 500;
  public message: string;
  public stack?: string;

  constructor(message: string) {
    super(message);
    this.message = message;
    this.stack = Error().stack;
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message
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

export class NotAuthorisedError extends CustomError {
  public name: string = 'NotAuthorisedError';
  public code: number = 401;
}

export const fastifyErrorHandler = async function (error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (process.env.NODE_ENV !== 'production') console.error(error);
  if (process.env.NODE_ENV === 'production') defaultClient.trackException({ exception: error });
  if (error instanceof CustomError) {
    return reply.code(error.code).send({ error: error.toJSON() });
  }

  if (error instanceof ZodError) {
    return reply.code(400).send({ error: { name: 'ValidationError', validation: error.flatten() } });
  }
  reply.status(500).send({ ok: false });
};
