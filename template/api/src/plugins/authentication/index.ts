import { FastifyPluginAsync } from 'fastify';
import { AuthenticationConfig, DriveConfiguration, resolveAuthentication, resolveDrives } from '../utils';
import { Client } from '@microsoft/microsoft-graph-client';
import { getToken } from '../utils/auth';
import { z } from 'zod';

export interface OnedriveProxyOptions {
  prefix?: string;
  auth?: AuthenticationConfig;
  handler: (email: string, client: Client) => Promise<AuthenticationEnrichmentResponse[]>;
}

const AuthenticationEnrichmentBody = z.object({
  email: z.string()
});

export interface AuthenticationEnrichmentResponse {
  id: string;
  value: string;
}

interface APIConnectorResponse {
  version: string;
  action: string;
  [key: string]: string;
}

const plugin: FastifyPluginAsync<OnedriveProxyOptions> = async (server, opts) => {
  const auth = resolveAuthentication(opts.auth);
  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const { token } = await getToken(auth);
        return token;
      }
    },
    defaultVersion: 'v1.0'
  });

  server.post('/', async (request, reply) => {
    const { email } = AuthenticationEnrichmentBody.parse(request.body);
    try {
      const claims = await opts.handler(email, client);
      const response: APIConnectorResponse = {
        version: '1.0.0',
        action: 'Continue'
      };

      claims.forEach(claim => {
        response[claim.id] = claim.value;
      });
      await reply.status(200).send(response);
    } catch (e) {
      await reply.status(200).send({
        version: '1.0.0',
        action: 'ShowBlockPage',
        userMessage: 'You are not authorized to access this resource.'
      });
    }
  });
};

export default plugin;
