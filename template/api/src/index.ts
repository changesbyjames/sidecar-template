import { config } from 'dotenv';
config();
import Fastify from 'fastify';
import cors from '@fastify/cors';

import 'cross-fetch/polyfill';

import { fastifyErrorHandler } from './plugins/utils/errors';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const getHTTPSOptions = () => {
  try {
    const key = readFileSync(join(__dirname, '..', 'certs', 'localhost-key.pem'));
    const cert = readFileSync(join(__dirname, '..', 'certs', 'localhost.pem'));
    return { key, cert };
  } catch {
    return null;
  }
};

const https = getHTTPSOptions();

const server = Fastify({ https });
server.setErrorHandler(fastifyErrorHandler);
server.register(cors, {
  origin: '*',
  methods: 'GET,PUT,POST,DELETE,OPTIONS'
});

<% if (components.includes('auth')) { %>
import authenticationRouter from './routes/authentication-router';
server.register(authenticationRouter);
<% } %>

<% if (components.includes('proxy')) { %>
import proxyRouter from './routes/proxy-router';
server.register(proxyRouter);
<% } %>

const port = Number(process.env.PORT);
const host = process.env.HOST;
if (!port || !host) {
  throw new Error('Missing PORT or HOST environment variable');
}

server.listen({ port, host }, async (err, address) => {
  if (err) throw err;
  console.log(`Server is now listening on ${address}`);
});
