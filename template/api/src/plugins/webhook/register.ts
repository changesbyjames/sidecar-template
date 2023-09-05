import { Client } from '@microsoft/microsoft-graph-client';
import { DriveItem, FieldValueSet, Subscription } from '@microsoft/microsoft-graph-types';
import { randomUUID } from 'crypto';
import produce from 'immer';

export interface OnedriveWebhookRegistration {
  registrationId: string;
  driveId: string;
  resource: string;
  token: string;
  nonce: string;
  expirationDateTime: string;
  lastChecked?: string;
}

interface OnedriveWebhookMetadata {
  registrations: OnedriveWebhookRegistration[];
}

interface DriveItemWithCheckoutMetadata extends DriveItem {
  listItem?: {
    fields?: FieldValueSet & {
      CheckoutUserLookupId?: number;
    };
  };
}

export const hasFileBeenCheckedOut = async (client: Client, driveId: string, fileId: string): Promise<boolean> => {
  const file: DriveItemWithCheckoutMetadata = await client
    .api(`/drives/${driveId}/items/${fileId}`)
    .expand('listItem')
    .get();
  const userWithCheckoutLock = file.listItem?.fields?.CheckoutUserLookupId;
  return !!userWithCheckoutLock;
};

export const checkOutFile = async (client: Client, driveId: string, fileId: string): Promise<void> => {
  await client.api(`/drives/${driveId}/items/${fileId}/checkout`).post({});
};

export const checkInFile = async (client: Client, driveId: string, fileId: string): Promise<void> => {
  await client.api(`/drives/${driveId}/items/${fileId}/checkin`).post({});
};

export const createOrUpdateWebhookRegistration = async (
  client: Client,
  driveId: string,
  fileId: string,
  resource: string
): Promise<OnedriveWebhookRegistration> => {
  const metadata = await getWebhookRegistration(client, driveId, fileId, resource);
  if (metadata) {
    console.log(`Existing subscription found for ${resource}: ${metadata.registrationId}`);
    const expirationDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    return await refreshWebhookRegistration(client, driveId, fileId, resource, expirationDateTime);
  }

  const expirationDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
  const subscription = await createSubscription(client, resource, expirationDateTime, {
    host: `${process.env.CONTAINER_APP_NAME}.${process.env.CONTAINER_APP_ENV_DNS_SUFFIX}`,
    path: `/webhook`,
    secure: true
  });

  console.log(`Subscription created for ${resource}: ${subscription.id}`);
  console.log(`Creating registration for ${resource}...`);

  if (!subscription.clientState) throw new Error('No client state returned from subscription creation');
  if (!subscription.id) throw new Error('No subscription id returned from subscription creation');

  return await createWebhookRegistration(
    client,
    driveId,
    fileId,
    subscription.id,
    subscription.clientState,
    resource,
    expirationDateTime,
    'latest'
  );
};

export const getWebhookMetadata = async (
  client: Client,
  driveId: string,
  fileId: string
): Promise<OnedriveWebhookMetadata> => {
  return await client.api(`/drives/${driveId}/items/${fileId}/content`).get();
};

export const getWebhookRegistration = async (client: Client, driveId: string, fileId: string, resource: string) => {
  const metadata: OnedriveWebhookMetadata = await getWebhookMetadata(client, driveId, fileId);
  return metadata.registrations.find(reg => reg.resource === resource);
};

export const createWebhookRegistration = async (
  client: Client,
  driveId: string,
  fileId: string,
  subscriptionId: string,
  nonce: string,
  resource: string,
  expirationDateTime: string,
  token: string
) => {
  const metadata: OnedriveWebhookMetadata = await getWebhookMetadata(client, driveId, fileId);
  const registration: OnedriveWebhookRegistration = {
    registrationId: subscriptionId,
    driveId,
    resource,
    expirationDateTime,
    token,
    nonce
  };
  metadata.registrations.push(registration);

  await client
    .api(`/drives/${driveId}/items/${fileId}/content`)
    .header('Content-Type', 'application/json')
    .put(metadata);

  return registration;
};

export const deleteWebhookRegistration = async (client: Client, driveId: string, fileId: string, resource: string) => {
  const metadata: OnedriveWebhookMetadata = await getWebhookMetadata(client, driveId, fileId);
  metadata.registrations = metadata.registrations.filter(reg => reg.resource !== resource);
  await client
    .api(`/drives/${driveId}/items/${fileId}/content`)
    .header('Content-Type', 'application/json')
    .put(metadata);
};

export const updateWebhookRegistration = async (
  client: Client,
  driveId: string,
  fileId: string,
  resource: string,
  token: string,
  lastChecked: Date
) => {
  const metadata: OnedriveWebhookMetadata = await getWebhookMetadata(client, driveId, fileId);
  const updated = produce(metadata, draft => {
    const index = draft.registrations.findIndex(reg => reg.resource === resource);
    if (index === -1) throw new Error('No registration found');
    draft.registrations[index].token = token;
    draft.registrations[index].lastChecked = lastChecked.toISOString();
  });
  await client
    .api(`/drives/${driveId}/items/${fileId}/content`)
    .header('Content-Type', 'application/json')
    .put(updated);
  const registration = updated.registrations.find(reg => reg.resource === resource);
  if (!registration) throw new Error('No registration found');
  return registration;
};

export const refreshWebhookRegistration = async (
  client: Client,
  driveId: string,
  fileId: string,
  resource: string,
  expirationDateTime: string
) => {
  const metadata: OnedriveWebhookMetadata = await getWebhookMetadata(client, driveId, fileId);
  const updated = produce(metadata, draft => {
    const index = draft.registrations.findIndex(reg => reg.resource === resource);
    if (index === -1) throw new Error('No registration found');
    draft.registrations[index].expirationDateTime = expirationDateTime;
  });
  await client
    .api(`/drives/${driveId}/items/${fileId}/content`)
    .header('Content-Type', 'application/json')
    .put(updated);
  const registration = updated.registrations.find(reg => reg.resource === resource);
  if (!registration) throw new Error('No registration found');
  return registration;
};

interface Server {
  secure: boolean;
  host: string;
  path: string;
}

export const createSubscription = async (
  client: Client,
  resource: string,
  expirationDateTime: string,
  server: Server
): Promise<Subscription> => {
  const subscription = {
    changeType: 'updated',
    notificationUrl: `${server.secure ? 'https' : 'http'}://${server.host}${server.path}`,
    resource,
    expirationDateTime,
    clientState: randomUUID()
  };
  return await client.api(`/subscriptions`).post(subscription);
};

export const updateSubscription = async (
  client: Client,
  driveId: string,
  expirationDateTime: string,
  subscriptionId: string
) => {
  const subscription = {
    expirationDateTime
  };
  return await client.api(`/drives/${driveId}/subscriptions/${subscriptionId}`).put(subscription);
};
