import { ClientSecretCredential } from '@azure/identity';
import { AuthenticationConfig } from '.';

const credsCache = new Map<AuthenticationConfig, ClientSecretCredential>();
export const getToken = async (auth: AuthenticationConfig) => {
  if (!credsCache.has(auth)) {
    const creds = new ClientSecretCredential(auth.tenantId, auth.clientId, auth.clientSecret);
    credsCache.set(auth, creds);
  }
  const creds = credsCache.get(auth);
  if (!creds) throw new Error('No creds found');
  return await creds.getToken('https://graph.microsoft.com/.default');
};

export interface GraphResponse<T> {
  '@odata.context': string;
  value: T;
}
