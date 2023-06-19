import { Client } from '@microsoft/microsoft-graph-client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotAuthorisedError } from '../../utils/errors';
import { AuthenticationConfig, DriveConfiguration, ItemAccessConfiguration } from '../../utils';
import { verifyDriveAccess } from '../middleware';
import { preparePath, prepareRequestHeaders, prepareResponseHeaders, isInFolder } from '../utils';

export default function configure(
  client: Client,
  driveConfiguration: DriveConfiguration,
  auth: AuthenticationConfig,
  prefix?: string,
  getUserAccessConfiguration?: (request: FastifyRequest) => Promise<ItemAccessConfiguration>
) {
  const getUserAccessConfig = async (request: FastifyRequest): Promise<ItemAccessConfiguration> => {
    if (!getUserAccessConfiguration) return { read: [], write: [] };
    return await getUserAccessConfiguration(request);
  };

  return async function register(router: FastifyInstance) {
    // This is a middleware that is applied to all routes in this router
    // It checks the driveId parameter and verifies that it is an approved drive

    router.route({
      url: '/$batch',
      method: ['POST'],
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.from(preparePath(request, prefix), {
          rewriteRequestHeaders: await prepareRequestHeaders(auth),
          rewriteHeaders: prepareResponseHeaders
        });
      }
    });
  };
}
