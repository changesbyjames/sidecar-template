import { FastifyInstance } from 'fastify';
import onedriveWebhook, { Event } from '../plugins/webhook';

import { isInFolder } from '../plugins/webhook/utils';
import {
  createCategorySidecarFile,
  createCustomerSidecarFile,
  createSectionSidecarFile,
  createUsersSidecarFile
} from '../services/sidecar-service';

export default async function register(router: FastifyInstance) {
  const sharedFolderId = process.env.SHARED_RESOURCE_FOLDER_ID;
  const customerFolderId = process.env.CUSTOMER_FOLDER_ID;

  if (!sharedFolderId) throw new Error('SHARED_RESOURCE_FOLDER_ID is missing');
  if (!customerFolderId) throw new Error('CUSTOMER_FOLDER_ID is missing');

  router.register(onedriveWebhook, {
    prefix: '/webhook',
    handler: async (event, item, client) => {
      console.log('Webhook event', event, item.id, item.name);
      if (!item.id) throw new Error('Item ID is missing');
      if (event !== Event.FolderCreated) return;
      if (!item.folder) throw new Error('Item is not a folder');

      if (item.id === customerFolderId) return;
      if (item.id === sharedFolderId) return;

      // If the folder is in the customer folder, create a customer sidecar file
      // depth 0 indicates that the folder must be in the customer folder, not a subfolder
      if (await isInFolder(client, item.id, customerFolderId, { depth: 0 })) {
        console.log(`Item ${item.name} is in customer folder at depth 0`);
        console.log(`This is a customer folder, create "Customer.sidecar" & "Users.sidecar"`);
        await createUsersSidecarFile(client, process.env.APPROVED_DRIVE!, item.id, item.name);
        return await createCustomerSidecarFile(client, process.env.APPROVED_DRIVE!, item.id);
      }

      // If the folder is in the customer folder but not at the root, create a section sidecar file
      if (await isInFolder(client, item.id, customerFolderId)) {
        console.log(`Item ${item.name} is in customer folder`);
        console.log(`This is a section folder, create "Section.sidecar"`);
        return await createSectionSidecarFile(client, process.env.APPROVED_DRIVE!, item.id);
      }

      // If the folder is in the shared files folder, create a category sidecar file
      // depth 0 indicates that the folder must be in the shared files folder, not a subfolder
      if (await isInFolder(client, item.id, sharedFolderId, { depth: 0 })) {
        console.log(`Item ${item.name} is in shared folder at depth 0`);
        console.log(`This is a category folder, create "Category.sidecar"`);
        return await createCategorySidecarFile(client, process.env.APPROVED_DRIVE!, item.id);
      }

      // If the folder is in the shared files folder but not at the root, create a section sidecar file
      if (await isInFolder(client, item.id, sharedFolderId)) {
        console.log(`Item ${item.name} is in shared folder`);
        console.log(`This is a section folder, create "Section.sidecar"`);
        return await createSectionSidecarFile(client, process.env.APPROVED_DRIVE!, item.id);
      }

      // If the folder is not in the customer or shared files folder
      console.log(`Item ${item.id} is not in customer or shared folder`);
    }
  });
}
