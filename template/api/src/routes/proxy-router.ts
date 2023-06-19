import { FastifyInstance } from 'fastify';
import fetch from 'node-fetch';
import onedriveProxy from '../plugins/onedrive';
import { JWK, JWS } from 'node-jose';

let b2cTokenStore: JWK.KeyStore | undefined;

interface WellknownResponse {
  jwks_uri: string;
}

export default async function register(router: FastifyInstance) {
  router.register(onedriveProxy, {
    prefix: '/proxy',
    getUserAccessConfiguration: async request => {
      const access = { read: [], write: [] };
      const token = request.headers['authorization'];
      if (!token) return access;

      const [, accessToken] = token.split(' ');
      if (!accessToken) return access;

      if (!b2cTokenStore) {
        const url = process.env.OPENID_CONFIGURATION_URL;
        if (!url) throw new Error('OPENID_CONFIGURATION_URL not set');
        const wellknownResponse = await fetch(url);
        const wellknown = (await wellknownResponse.json()) as WellknownResponse;
        const jwksResponse = await fetch(wellknown.jwks_uri);
        const jwks = (await jwksResponse.json()) as object;
        b2cTokenStore = await JWK.asKeyStore(jwks);
      }
      try {
        const decoded = await JWS.createVerify(b2cTokenStore).verify(accessToken);
        const payload = JSON.parse(decoded.payload.toString());
        const read = payload['extension_ApprovedReadItems'];
        const write = payload['extension_ApprovedWriteItems'];

        if (read) access.read = read.split(',');
        if (write) access.write = write.split(',');

        return access;
      } catch (e) {
        return access;
      }
    }
  });
}
