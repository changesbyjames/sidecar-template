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

<% if (components.includes('webhooks')) { %>
import webhookRouter from './routes/webhook-router';
server.register(webhookRouter);
<% } %>

import Bree from 'bree';
import TSBree from '@breejs/ts-worker';
import Graceful from '@ladjs/graceful';
Bree.extend(TSBree);

const bree = new Bree({
  jobs: [
    {
      name: 'webhook-heartbeat',
      cron: '0 * * * *',
      closeWorkerAfterMs: 1000 * 60 * 5
    }
  ],
  errorHandler(error, workerMetadata) {
    insights.trackException({ exception: error });
    console.log(`Error in worker ${workerMetadata.name}: ${error.message}`);
  },
  workerMessageHandler: ({ name, message }) => {
    console.log(`Message from worker "${name}": ${message}`);
    if (message.startsWith('event/')) {
      const event = message.replace('event/', '');
      insights.trackEvent({ name: event });
    }
  },
  defaultExtension: 'ts',
  root: path.join(__dirname, 'jobs')
});

bree.on('worker created', name => insights.trackEvent({ name: 'WorkerCreated', properties: { name } }));
bree.on('worker deleted', name => insights.trackEvent({ name: 'WorkerDeleted', properties: { name } }));

const graceful = new Graceful({ brees: [bree], customHandlers: [() => insights.flush()] });


const port = Number(process.env.PORT);
const host = process.env.HOST;
if (!port || !host) {
  throw new Error('Missing PORT or HOST environment variable');
}

server.listen({ port, host }, async (err, address) => {
  if (err) throw err;
  console.log(`Server is now listening on ${address}`);
});
