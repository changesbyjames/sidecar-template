import { FastifyPluginAsync } from 'fastify';
import { AuthenticationConfig, DriveConfiguration, resolveAuthentication } from '../utils';
import { Client } from '@microsoft/microsoft-graph-client';
import { getToken } from '../utils/auth';
import { z } from 'zod';
import { isAfter } from 'date-fns';
import { DriveItem } from '@microsoft/microsoft-graph-types';
import { getWebhookRegistration, updateWebhookRegistration } from './register';
import { insights } from '../utils/errors';
import { promiseStatus, PromiseStatuses } from 'promise-status-async';

export enum Event {
  FileCreated = 'File.Created',
  FileUpdated = 'File.Updated',
  FileDeleted = 'File.Deleted',
  FolderCreated = 'Folder.Created',
  FolderUpdated = 'Folder.Updated',
  FolderDeleted = 'Folder.Deleted'
}

export interface OnedriveProxyOptions {
  prefix?: string;
  auth?: AuthenticationConfig;
  driveConfiguration?: DriveConfiguration;
  handler: (event: Event, item: DriveItem, client: Client) => Promise<void>;
}

interface DeltaResponse {
  '@odata.context': string;
  '@odata.deltaLink'?: string;
  '@odata.nextLink'?: string;
  value: DriveItem[];
}

const WebhookParams = z.object({
  validationToken: z.string().optional()
});

const Notification = z.object({
  resource: z.string()
});

type Notification = z.infer<typeof Notification>;

const WebhookBody = z.object({
  value: z.array(Notification)
});

const fileId = process.env.WEBHOOK_REGISTRATION_FILE_ID;
if (!fileId) throw new Error('WEBHOOK_REGISTRATION_FILE_ID not set');

const getChanges = async (client: Client, resource: string, token: string): Promise<[DriveItem[], string]> => {
  const delta: DeltaResponse = await client.api(`${resource}/delta?token=${token}`).get();
  let changes = delta.value;
  let deltaLink = delta['@odata.deltaLink'];

  const nextLink = delta['@odata.nextLink'];
  if (nextLink) {
    const url = new URL(nextLink);
    const token = url.searchParams.get('token');
    if (!token) throw new Error(`No token in nextLink ${nextLink}`);
    const [additionalChanges, additionalDeltaLink] = await getChanges(client, resource, token);
    changes = [...changes, ...additionalChanges];
    deltaLink = additionalDeltaLink;
  }

  if (!deltaLink) throw new Error(`No deltaLink in delta response. Possibly too many changes.`);
  return [changes, deltaLink];
};

const filterOperationalChanges = (changes: DriveItem[]) =>
  changes.filter(change => {
    const isOperationalChange =
      !!change.root || change.name === 'System configuration (readonly)' || change.id === fileId;
    if (isOperationalChange) console.log(`Skipping operational change ${change.id}`);
    return !isOperationalChange;
  });

const receiveAndBookmarkDelta = async (client: Client, resource: string) => {
  const matches = resource.match(/\/drives\/([\S]+)\/root/);
  if (!matches) throw new Error(`Invalid resource ${resource}`);
  const driveId = matches[1];
  const registration = await getWebhookRegistration(client, driveId, fileId, resource);
  if (!registration) throw new Error(`No registration for ${resource}`);
  const lastChecked = registration.lastChecked ? new Date(registration.lastChecked) : new Date();
  const token = registration.token;

  console.log(`Receiving delta for ${resource} from ${lastChecked}`);
  const [changes, deltaLink] = await getChanges(client, resource, token);
  const filteredChanges = filterOperationalChanges(changes);
  if (filteredChanges.length > 0) {
    const url = new URL(deltaLink);
    const updatedToken = url.searchParams.get('token');
    if (!updatedToken) throw new Error(`No token in deltaLink ${deltaLink}`);
    await updateWebhookRegistration(client, driveId, fileId, resource, updatedToken, new Date());
  }
  return [filteredChanges, lastChecked] as const;
};

const processWebhook = async (client: Client, notifications: Notification[], handler: any) => {
  try {
    const [notification] = notifications;
    const [items, lastChecked] = await receiveAndBookmarkDelta(client, notification.resource);

    await Promise.all(
      items.map(async item => {
        if (item.deleted) return await handler(item.file ? Event.FileDeleted : Event.FolderDeleted, item, client);

        if (!item.createdDateTime) throw new Error(`Item ${item.id} (${item.name}) has no createdDateTime`);
        const createdDateTime = new Date(item.createdDateTime);
        const justCreated = isAfter(createdDateTime, lastChecked);

        if (item.folder) return await handler(justCreated ? Event.FolderCreated : Event.FolderUpdated, item, client);
        if (item.file) return await handler(justCreated ? Event.FileCreated : Event.FileUpdated, item, client);
      })
    );
  } catch (e) {
    if (e instanceof Error) {
      insights.trackException({ exception: e });
    }
    console.error('Error processing webhook', e);
  }
};

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

  const map = new Map<string, Promise<void>>();
  const DEFAULT_KEY = 'default';

  server.post('/', async (request, reply) => {
    insights.trackEvent({ name: `WEBHOOK:received` });
    console.log('Webhook request received', `${request.ip} ${request.method} ${request.url}`);
    const { validationToken } = WebhookParams.parse(request.query);
    if (validationToken) return validationToken;

    // If we're already processing a webhook, return 200 to avoid duplicate processing
    // This has a flaw in that only the first delta token will be respected
    // This means that we won't ever lose a change, but we might not process it
    // until the next change is made.

    // TODO: Debouncing may be a better solution here but I'm not sure how to implement it
    if (map.has(DEFAULT_KEY)) {
      const status = promiseStatus(map.get(DEFAULT_KEY));
      if (status === PromiseStatuses.PROMISE_PENDING) {
        return reply.status(200).send();
      }
    }

    const body = WebhookBody.parse(request.body);
    // Specifically not awaiting this to allow the request to return asap
    const promise = processWebhook(client, body.value, opts.handler);
    map.set(DEFAULT_KEY, promise);
    reply.status(200).send();
  });
};

export default plugin;
