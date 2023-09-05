import { parentPort } from 'worker_threads';
import { resolveAuthentication, resolveDrives } from '../plugins/utils';
import { getToken } from '../plugins/utils/auth';
import { Client } from '@microsoft/microsoft-graph-client';

// Environment setup
import 'cross-fetch/polyfill';
import { config } from 'dotenv';
config();

import {
  createOrUpdateWebhookRegistration,
  checkInFile,
  checkOutFile,
  hasFileBeenCheckedOut
} from '../plugins/webhook/register';

const driveConfiguration = resolveDrives();
const auth = resolveAuthentication();

const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const { token } = await getToken(auth);
      return token;
    }
  },
  defaultVersion: 'beta'
});

const exit = () => {
  if (parentPort) parentPort.postMessage('done');
  else process.exit(0);
};

const event = async (name: string) => {
  if (parentPort) parentPort.postMessage(`event/${name}`);
  else console.log(`event/${name}`);
};

const controller = new AbortController();

const cancel = async () => {
  controller.abort();
  event(`WEBHOOK:heartbeat:cancelled`);
  console.log('Cancelling webhook registration job');
  for (const driveId of driveConfiguration.drives) {
    const fileId = process.env.WEBHOOK_REGISTRATION_FILE_ID;
    if (!fileId) throw new Error('WEBHOOK_REGISTRATION_FILE_ID not set');
    console.log(`Checking in file ${fileId} for ${driveId}.`);
    try {
      await checkInFile(client, driveId, fileId);
      console.log(`File checked in.`);
      console.log('Webhook registration job cancelled');
    } catch {
      console.log(`File could not be checked in. Possibly never checked out.`);
    }
    if (parentPort) parentPort.postMessage('cancelled');
  }
};

if (parentPort) {
  parentPort.once('message', async message => {
    if (message === 'cancel') await cancel();
  });
}

(async () => {
  event(`WEBHOOK:heartbeat:started`);
  console.log('Starting webhook registration job');
  const [driveId] = driveConfiguration.drives;

  console.log(`Receiving delta for ${driveId} to initialize checkpoint`);
  const fileId = process.env.WEBHOOK_REGISTRATION_FILE_ID;
  if (!fileId) throw new Error('WEBHOOK_REGISTRATION_FILE_ID not set');

  console.log(`Creating webhook registration for ${driveId} & ${fileId}.`);
  const hasBeenCheckedOut = await hasFileBeenCheckedOut(client, driveId, fileId);
  if (hasBeenCheckedOut) {
    console.log(`File has already been checkout by another process. Skipping on this worker.`);
    event(`WEBHOOK:heartbeat:retreated`);
    exit();
  }
  console.log(`File is not locked. Checking out file...`);

  if (controller.signal.aborted) {
    console.log(`Job was cancelled. Exiting...`);
    exit();
  }

  await checkOutFile(client, driveId, fileId);
  console.log(`File checked out.`);
  // Do work here that can't be overwritten by another worker
  const registration = await createOrUpdateWebhookRegistration(client, driveId, fileId, `/drives/${driveId}/root`);
  console.log(`Webhook registration refreshed for ${driveId} & ${fileId}.`);
  console.log(`Expiry: ${registration.expirationDateTime}`);
  console.log(`Last checked: ${registration.lastChecked}`);
  console.log(`Resource: ${registration.resource}`);
  console.log(`Work is complete. Checking file back in...`);
  await checkInFile(client, driveId, fileId);
  event(`WEBHOOK:heartbeat:completed`);

  exit();
})();
