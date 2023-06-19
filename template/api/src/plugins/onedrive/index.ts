import { FastifyRequest } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import ReplyFrom from '@fastify/reply-from';
import {
  AuthenticationConfig,
  DriveConfiguration,
  ItemAccessConfiguration,
  resolveAuthentication,
  resolveDrives
} from '../utils';
import { processGraphVersion } from './middleware';

import driveProxy from './proxies/drive-proxy';
import batchProxy from './proxies/batch-proxy';
import { Client } from '@microsoft/microsoft-graph-client';
import { getToken } from '../utils/auth';

declare module 'fastify' {
  interface FastifyRequest {
    version: string;
  }
}

export interface OnedriveProxyOptions {
  prefix?: string;
  auth?: AuthenticationConfig;
  driveConfiguration?: Partial<DriveConfiguration>;
  getUserAccessConfiguration?: (request: FastifyRequest) => Promise<ItemAccessConfiguration>;
}

const plugin: FastifyPluginAsync<OnedriveProxyOptions> = async (server, opts) => {
  const auth = resolveAuthentication(opts.auth);
  const driveConfiguration = resolveDrives(opts.driveConfiguration);
  const getUserAccessConfiguration = opts.getUserAccessConfiguration;
  const prefix = opts.prefix;

  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const { token } = await getToken(auth);
        return token;
      }
    },
    defaultVersion: 'v1.0'
  });

  server.register(async router => {
    server.addHook('onRequest', processGraphVersion);
    server.register(ReplyFrom, {
      base: 'https://graph.microsoft.com/',
      logLevel: 'trace'
    });

    server.register(driveProxy(client, driveConfiguration, auth, prefix, getUserAccessConfiguration), {
      prefix: '/:version/drives/:driveId'
    });

    server.register(batchProxy(client, driveConfiguration, auth, prefix, getUserAccessConfiguration), {
      prefix: '/:version'
    });
  });
};

export default plugin;
