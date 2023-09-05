import { Inputs } from '@pulumi/pulumi';
import { Client } from '@microsoft/microsoft-graph-client';
import * as isEqual from 'fast-deep-equal';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import fetch from 'cross-fetch';
import { Queue } from 'async-await-queue';
import { createHash } from 'crypto';

const clients: Record<string, Client> = {};
const queues: Record<string, Queue> = {};

export const createOrGetClient = (
  clientId: string,
  clientSecret: string,
  tenantId: string,
  version = 'beta'
): Client => {
  global.fetch = async (url, options) => {
    if (!queues[tenantId]) queues[tenantId] = new Queue(1, 1000);
    const queue = queues[tenantId];
    const hash = createHash('sha256').update(JSON.stringify(options)).digest('hex');
    const me = `${options?.method}: ${url} //${hash}`;
    await queue.wait(me);
    return fetch(url, options).then(res => {
      console.log(`${options?.method}: ${url} [${res.status}]`);
      queue.end(me);
      return res;
    });
  };
  const key = `${clientId}-${tenantId}-${version}`;

  if (clients[key]) {
    const client = clients[key];
    if (!client) throw new Error('Client is not defined');
    return client;
  }

  const creds = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(creds, {
    scopes: ['https://graph.microsoft.com/.default']
  });
  const client = Client.initWithMiddleware({ authProvider, defaultVersion: version });
  clients[key] = client;
  return client;
};

export const isDifferent = (a: unknown, b: unknown) => {
  return !isEqual(a, b);
};

export function checkForChanges<K extends string>(olds: Inputs, news: Inputs, properties: K[]): K[] {
  return properties.filter(p => isDifferent(olds[p], news[p]));
}
