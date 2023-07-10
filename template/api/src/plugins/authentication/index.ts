import { FastifyPluginAsync } from 'fastify';
import { AuthenticationConfig, resolveAuthentication } from '../utils';
import { Client } from '@microsoft/microsoft-graph-client';
import { getToken } from '../utils/auth';
import { z } from 'zod';
import { insights } from '../utils/errors';
import { User } from '@microsoft/microsoft-graph-types';

export interface OnedriveProxyOptions {
  prefix?: string;
  auth?: AuthenticationConfig;
  handler: (email: string, client: Client) => Promise<AuthenticationEnrichmentResponse[]>;
}

const AuthenticationEnrichmentBody = z.object({
  objectId: z.string()
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

  const b2cAuth = AuthenticationConfig.parse({
    clientId: process.env.B2C_CLIENT_ID,
    clientSecret: process.env.B2C_CLIENT_SECRET,
    tenantId: process.env.B2C_TENANT_ID
  });

  const b2cClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const { token } = await getToken(b2cAuth);
        return token;
      }
    },
    defaultVersion: 'beta'
  });

  server.post('/', async (request, reply) => {
    insights.trackEvent({ name: 'AuthenticationRequestReceived' });
    try {
      const { objectId } = AuthenticationEnrichmentBody.parse(request.body);
      const { identities }: Pick<User, 'identities'> = await b2cClient
        .api(`/users/${objectId}`)
        .select(['identities'])
        .get();

      const email = identities?.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId;
      if (!email) throw new Error('No email address found for user');
      
      const claims = await opts.handler(email, client);
      const response: APIConnectorResponse = {
        version: '1.0.0',
        action: 'Continue'
      };

      claims.forEach(claim => {
        response[claim.id] = claim.value;
      });
      insights.trackEvent({ name: 'AuthenticationRequestSuccess' });
      await reply.status(200).send(response);
    } catch (e) {
      const exception = e as Error;
      insights.trackException({ exception });
      await reply.status(200).send({
        version: '1.0.0',
        action: 'ShowBlockPage',
        userMessage: 'You are not authorized to access this resource.'
      });
    }
  });
};

export default plugin;
