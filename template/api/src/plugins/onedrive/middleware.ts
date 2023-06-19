import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BadRequestError, NotAuthorisedError } from '../utils/errors';
import { DriveConfiguration } from '../utils';

const DriveParams = z.object({
  driveId: z.string()
});

const GraphVersionParams = z.object({
  version: z.string()
});

export const verifyDriveAccess =
  (driveConfiguration: DriveConfiguration) => async (request: FastifyRequest, reply: FastifyReply) => {
    const { driveId } = DriveParams.parse(request.params);

    if (!driveConfiguration.drives || !driveConfiguration.drives.includes(driveId)) {
      throw new NotAuthorisedError('You are requesting a drive that is not approved');
    }
  };

export const processGraphVersion = async (request: FastifyRequest, reply: FastifyReply) => {
  const { version } = GraphVersionParams.parse(request.params);
  if (!version) {
    throw new BadRequestError('No version header provided');
  }
  request.version = version;
};
