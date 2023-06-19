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
    router.addHook('onRequest', verifyDriveAccess(driveConfiguration));

    // If the request is trying to operate on a folder within the drive
    const handlerItemRequest = async (request: FastifyRequest, reply: FastifyReply) => {
      const userAccessConfig = await getUserAccessConfig(request);

      const OneDriveItemParams = z.object({
        itemId: z.string()
      });
      const { itemId } = OneDriveItemParams.parse(request.params);

      if (request.method === 'GET' && !(await isInFolder(client, itemId, userAccessConfig.read))) {
        throw new NotAuthorisedError('You do not have permission to access this folder');
      }

      if (
        (request.method === 'PUT' || request.method === 'POST' || request.method === 'DELETE') &&
        !(await isInFolder(client, itemId, userAccessConfig.write))
      ) {
        throw new NotAuthorisedError('You do not have permission to access & edit this folder');
      }

      return reply.from(preparePath(request, prefix), {
        rewriteRequestHeaders: await prepareRequestHeaders(auth),
        rewriteHeaders: prepareResponseHeaders
      });
    };

    router.route({
      url: '/items/:itemId/*',
      method: ['GET', 'PUT', 'POST', 'DELETE'],
      handler: handlerItemRequest
    });

    router.route({
      url: '/items/:itemId',
      method: ['GET', 'PUT', 'POST', 'DELETE'],
      handler: handlerItemRequest
    });

    // If the request is trying to operate on the root of the drive
    const handleDriveRequest = async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.method === 'GET' && !driveConfiguration.read)
        throw new NotAuthorisedError('You do not have permission to access this drive');
      if (
        (request.method === 'PUT' || request.method === 'POST' || request.method === 'DELETE') &&
        !driveConfiguration.write
      )
        throw new NotAuthorisedError('You do not have permission to access & edit this drive');
      return reply.from(preparePath(request, prefix), {
        rewriteRequestHeaders: await prepareRequestHeaders(auth),
        rewriteHeaders: prepareResponseHeaders
      });
    };

    router.route({
      url: '/*',
      method: ['GET', 'PUT', 'POST', 'DELETE'],
      handler: handleDriveRequest
    });

    router.route({
      url: '/',
      method: ['GET', 'PUT', 'POST', 'DELETE'],
      handler: handleDriveRequest
    });
  };
}
